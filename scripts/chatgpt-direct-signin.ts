// Standalone owner-run verification. Importing this script never loads the server.
import { parseSignInCliArguments, runIsolatedSignIn, signInCliHelp } from '../src/providers/models/chatgptDirectSignInCli.js';
import { createIsolatedCatalogTransport, createIsolatedIdentityVerifier, createIsolatedTokenTransport, loadVerifiedSignInRuntime, openOfficialSignInBrowser } from '../src/providers/models/chatgptDirectSignInRuntime.js';
import { FileChatGPTDirectRegistrationStore } from '../src/providers/models/chatgptDirectRegistrationStore.js';

async function main(): Promise<void> {
  const options = parseSignInCliArguments(process.argv.slice(2));
  if (!options) { process.stdout.write(signInCliHelp); return; }
  const factory = await loadVerifiedSignInRuntime(options.verifierRuntime);
  const registrationStore = options.mode !== 'returning'
    ? new FileChatGPTDirectRegistrationStore(options.registrationDirectory)
    : undefined;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    await runIsolatedSignIn(options, {
      openBrowser: openOfficialSignInBrowser,
      transport: createIsolatedTokenTransport,
      verifier: (callback, signal) => createIsolatedIdentityVerifier(factory, callback, signal),
      inspectCatalog: options.mode === 'inspect-models'
        ? (accessToken, signal) => createIsolatedCatalogTransport(signal).list(accessToken)
        : undefined,
      registrationStore,
      write: text => process.stdout.write(`${text}\n`),
    }, controller.signal);
  } finally {
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
  }
}

void main().catch(() => {
  // Never log provider errors, token response bodies, callback URLs or stack traces.
  process.stderr.write('Isolated sign-in could not complete. Check arguments/runtime or cancel and try again. No credentials saved.\n');
  process.exitCode = 1;
});
