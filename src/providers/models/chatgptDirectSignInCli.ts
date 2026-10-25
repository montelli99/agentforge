import { randomUUID } from 'node:crypto';
import { exchangeDirectCallback } from './chatgptDirectExchange.js';
import type { DirectTokenExchangeTransport, SessionCredentials } from './chatgptDirectExchange.js';
import type { IdentityTokenVerifier, ValidatedCallback } from './chatgptDirectOAuth.js';
import { listedDirectModelSlugs } from './chatgptDirectModel.js';
import { prepareChatGPTSignIn } from './chatgptDirectSignIn.js';
import type { DirectSignInSession } from './chatgptDirectSignIn.js';
import { getDefaultChatGPTDirectRegistrationDirectory } from './chatgptDirectRegistrationStore.js';
import type { ChatGPTDirectRegistrationStore } from './chatgptDirectRegistrationStore.js';

interface SignInCliBaseOptions {
  verifierRuntime: string;
  timeoutMs: number;
}

export interface ReturningSignInCliOptions extends SignInCliBaseOptions {
  mode: 'returning';
  hostId: string;
  clientId: string;
}

export interface FirstRegistrationCliOptions extends SignInCliBaseOptions {
  mode: 'first-registration';
  registrationDirectory: string;
}

export interface CatalogInspectionCliOptions extends SignInCliBaseOptions {
  mode: 'inspect-models';
  registrationDirectory: string;
}

export type SignInCliOptions = ReturningSignInCliOptions | FirstRegistrationCliOptions | CatalogInspectionCliOptions;

export const signInCliHelp = `AgentForge isolated sign-in verification
Usage: node --import tsx scripts/chatgpt-direct-signin.ts --help
       node --import tsx scripts/chatgpt-direct-signin.ts --begin-registration --verifier-runtime <verified-runtime-directory> [--timeout-ms 120000]
       node --import tsx scripts/chatgpt-direct-signin.ts --begin-sign-in --host-id <stable-host-id> --client-id <issued-client-id> --verifier-runtime <verified-runtime-directory> [--timeout-ms 120000]
       node --import tsx scripts/chatgpt-direct-signin.ts --inspect-models --verifier-runtime <verified-runtime-directory> [--timeout-ms 120000]

Only an explicit action mode starts a browser/loopback session. First registration
uses the official dynamic client entrypoint and atomically stores only this host's
nonsecret stable host ID and callback-issued client ID in AgentForge's data
directory. Returning sign-in preserves the explicit issued-client mode. Enter
credentials and consent yourself in the official OpenAI page. Tokens stay in
session memory, are discarded on exit, and are never stored or logged. Registration
and returning sign-in do not list models. No mode activates a provider, refreshes
tokens, runs inference, or changes the server.

--inspect-models loads the existing nonsecret host/client registration, requires
a fresh owner-operated browser sign-in because prior session tokens are not kept,
sends exactly one bounded GET https://api.openai.com/v1/models, prints only the
displayable model slugs in server order, and then discards the new session tokens.
It performs no inference, refresh, model selection, provider activation or retry.
`;

export function parseSignInCliArguments(args: readonly string[],
  registrationDirectory?: string): SignInCliOptions | undefined {
  if (!args.length || (args.length === 1 && args[0] === '--help')) return undefined;
  const mode = args[0];
  if (mode !== '--begin-sign-in' && mode !== '--begin-registration' && mode !== '--inspect-models') throw Error('Explicit sign-in mode is required. Use --help.');
  const values = new Map<string, string>();
  const allowed = new Set(mode === '--begin-sign-in'
    ? ['--host-id', '--client-id', '--verifier-runtime', '--timeout-ms']
    : ['--verifier-runtime', '--timeout-ms']);
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    if (!allowed.has(key) || values.has(key) || !value || value.startsWith('--')) throw Error('Invalid sign-in arguments. Use --help.');
    values.set(key, value);
  }
  const verifierRuntime = values.get('--verifier-runtime');
  const timeoutText = values.get('--timeout-ms') ?? '120000';
  if (!verifierRuntime || !/^\d+$/.test(timeoutText)) throw Error('Missing or invalid sign-in arguments. Use --help.');
  const options: SignInCliOptions = mode === '--begin-sign-in'
    ? { mode: 'returning', hostId: values.get('--host-id') ?? '', clientId: values.get('--client-id') ?? '',
      verifierRuntime, timeoutMs: Number(timeoutText) }
    : { mode: mode === '--begin-registration' ? 'first-registration' : 'inspect-models',
      registrationDirectory: registrationDirectory ?? getDefaultChatGPTDirectRegistrationDirectory(), verifierRuntime, timeoutMs: Number(timeoutText) };
  validateOptions(options);
  return options;
}

function validateOptions(options: SignInCliOptions): void {
  const returningInvalid = options.mode === 'returning' && (!/^[A-Za-z0-9:._-]{1,256}$/.test(options.hostId)
    || !/^[A-Za-z0-9_-]{1,256}$/.test(options.clientId) || options.clientId === 'dynamic_agent_client');
  const registrationInvalid = options.mode !== 'returning' && !options.registrationDirectory;
  if (returningInvalid || registrationInvalid || !options.verifierRuntime || !Number.isSafeInteger(options.timeoutMs)
    || options.timeoutMs < 1000 || options.timeoutMs > 600000) throw Error('Invalid isolated sign-in configuration.');
}

export interface SignInCliDependencies {
  prepare?: typeof prepareChatGPTSignIn;
  openBrowser(url: string, signal: AbortSignal): Promise<void>;
  transport(signal: AbortSignal): DirectTokenExchangeTransport;
  verifier(callback: ValidatedCallback, signal: AbortSignal): Promise<IdentityTokenVerifier>;
  exchange?: typeof exchangeDirectCallback;
  inspectCatalog?: (accessToken: string, signal: AbortSignal) => Promise<unknown>;
  registrationStore?: ChatGPTDirectRegistrationStore;
  write(text: string): void;
}

/** The session ends after verification; no token or identity is returned to a caller. */
export async function runIsolatedSignIn(options: SignInCliOptions, deps: SignInCliDependencies,
  signal?: AbortSignal): Promise<void> {
  validateOptions(options);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  let session: DirectSignInSession | undefined;
  let sessionCancellation: Promise<void> | undefined;
  let credentials: SessionCredentials | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectCancelled: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => { rejectCancelled = () => reject(Error('Sign-in cancelled or timed out.')); });
  void cancelled.catch(() => undefined);
  const cancelSession = (): Promise<void> => {
    if (!session) return Promise.resolve();
    sessionCancellation ??= session.cancel().catch(() => undefined);
    return sessionCancellation;
  };
  const onAbort = () => { rejectCancelled?.(); void cancelSession(); };
  controller.signal.addEventListener('abort', onAbort, { once: true });
  const step = <T>(operation: Promise<T>): Promise<T> => Promise.race([operation, cancelled]);
  try {
    if (controller.signal.aborted) throw Error('cancelled');
    timer = setTimeout(() => controller.abort(), options.timeoutMs);
    const registrationStore = options.mode === 'returning' ? undefined : deps.registrationStore;
    if (options.mode !== 'returning' && !registrationStore) throw Error('missing registration store');
    const registration: { hostId: string; clientId?: string } | undefined = options.mode === 'first-registration'
      ? await step(registrationStore!.prepareFirstRegistration(controller.signal))
      : options.mode === 'inspect-models' ? await step(registrationStore!.load()) : undefined;
    if (options.mode === 'inspect-models' && (!registration?.hostId || !registration.clientId)) {
      throw Error('Completed direct registration is required before model inspection.');
    }
    const hostId = options.mode === 'returning' ? options.hostId : registration!.hostId;
    const clientId = options.mode === 'returning' ? options.clientId
      : options.mode === 'inspect-models' ? registration!.clientId : undefined;
    // Preparation creates only this command's ephemeral loopback listener.
    session = await (deps.prepare ?? prepareChatGPTSignIn)({ hostId, clientId, agentName: 'AgentForge' });
    if (controller.signal.aborted) throw Error('cancelled');
    deps.write('Continue with ChatGPT in your browser. Complete login and consent yourself.');
    await step(deps.openBrowser(session.authorizationUrl, controller.signal));
    const callback = await step(session.waitForCallback());
    const verifier = await step(deps.verifier(callback, controller.signal));
    const exchange = (deps.exchange ?? exchangeDirectCallback)(callback, deps.transport(controller.signal), verifier, randomUUID());
    // If cancellation wins while validation is finishing, discard late results too.
    void exchange.then(result => { if (controller.signal.aborted) result.discard(); }, () => undefined);
    credentials = await step(exchange);
    if (controller.signal.aborted) throw Error('cancelled');
    if (options.mode === 'first-registration') {
      const save = registrationStore!.saveIssuedClientId(hostId, callback.clientId, controller.signal);
      void save.catch(() => undefined);
      try {
        await step(save);
      } catch (error) {
        if (controller.signal.aborted) {
          await save.catch(() => undefined);
          const state = await registrationStore!.load().catch(() => undefined);
          if (state?.hostId === hostId && state.clientId === callback.clientId) {
            deps.write('Nonsecret registration identifiers were saved before cancellation. Session is closing; no provider activated.');
          }
        }
        throw error;
      }
      if (controller.signal.aborted) {
        const state = await registrationStore!.load().catch(() => undefined);
        if (state?.hostId === hostId && state.clientId === callback.clientId) {
          deps.write('Nonsecret registration identifiers were saved before cancellation. Session is closing; no provider activated.');
        }
        throw Error('cancelled');
      }
    }
    if (options.mode === 'inspect-models') {
      if (!deps.inspectCatalog) throw Error('Model catalog transport unavailable.');
      const catalog = await step(deps.inspectCatalog(credentials.credentials.accessToken, controller.signal));
      if (controller.signal.aborted) throw Error('cancelled');
      const slugs = listedDirectModelSlugs(catalog);
      if (!slugs) throw Error('Model catalog response was malformed.');
      deps.write('Current account catalog model slugs:');
      for (const slug of slugs) deps.write(slug);
      deps.write('Catalog inspection completed. This was not inference and does not prove a future response will succeed.');
    }
    credentials.discard();
    credentials = undefined;
    deps.write(options.mode === 'inspect-models'
      ? 'Session credentials discarded. No model selected and no provider activated.'
      : 'Sign-in and permissions verified. Session credentials discarded. No provider activated.');
  } catch {
    throw Error(controller.signal.aborted ? 'Sign-in cancelled or timed out; session closed.' : 'Sign-in verification failed; session closed. No credentials saved.');
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
    credentials?.discard();
    await cancelSession();
    signal?.removeEventListener('abort', cancel);
    controller.signal.removeEventListener('abort', onAbort);
  }
}
