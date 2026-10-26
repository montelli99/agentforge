# Model connection plan and setup

AgentForge distinguishes API billing, local compute, and subscription access
through a provider's own client. A subscription is not an API key. Configuration
never silently falls back to another provider or billing account.

## API and local connections: implemented

In Models, choose **Connect your model**, enter an available model ID and a
dedicated API key, and choose **Save and connect**. An authenticated AgentForge
owner or administrator is required. Choose a private-store passphrase of 16–1024
characters; it is never persisted and cannot be recovered. Connection profiles
and keys are saved together with authenticated encryption next to the server
settings file, outside any Git repository. Do not place the server settings
directory inside a project repository. This portable store uses passphrase
encryption, not an operating-system keychain.

After a service restart, use **Unlock saved connections**. This activates the
saved web-chat connection set without restarting. Active responses prevent
connection changes. Failed unlocks preserve the current configuration and saved
file. Saving adds/replaces a provider in the saved set; activation replaces any
startup-only web-chat routes. Task-planning and external-channel routes remain
separately configured. Save/unlock does not contact a model, validate quota, or
prove live credentials. Send a short conversation message to check the selected
provider, with its normal usage charges.

For manual deployment configuration instead, create a JSON file outside the
repository. It contains routing metadata and
environment-variable names only, never secret values. Point
`AGENTFORGE_MODEL_CONNECTIONS_FILE` at its absolute path and restart the server.

```json
[
  {"id":"openai","provider":"openai","models":["YOUR_MODEL_ID"],"apiKeyEnv":"AGENTFORGE_KEY_OPENAI"},
  {"id":"claude","provider":"anthropic","models":["YOUR_MODEL_ID"],"apiKeyEnv":"AGENTFORGE_KEY_CLAUDE"},
  {"id":"gemini","provider":"google","models":["YOUR_MODEL_ID"],"apiKeyEnv":"AGENTFORGE_KEY_GEMINI"},
  {"id":"deepseek","provider":"deepseek","models":["YOUR_MODEL_ID"],"apiKeyEnv":"AGENTFORGE_KEY_DEEPSEEK"},
  {"id":"grok","provider":"xai","models":["YOUR_MODEL_ID"],"apiKeyEnv":"AGENTFORGE_KEY_GROK"},
  {"id":"local","provider":"local","models":["YOUR_INSTALLED_MODEL"]}
]
```

Include only connections you intend to use. Supply each named credential through
the server's private environment or deployment secret manager. Missing required
credentials stop startup rather than selecting a different billing account.
The composer shows `connection-id::model-id`; changing that selection keeps the
conversation and its scoped memory. The default API plan-draft model is the first
configured route unless the separate explicit planning route is configured.

| Provider | Connection | Important boundary |
| --- | --- | --- |
| OpenAI | OpenAI API key | Separate API billing from a ChatGPT subscription |
| Anthropic | Claude API key, official OpenAI compatibility endpoint | Compatibility mode, not every native Claude feature; use workspace-scoped keys |
| Google | Gemini API key, official OpenAI compatibility endpoint | API project quota/billing is distinct from Gemini CLI account entitlements |
| DeepSeek | DeepSeek API key | Model identifiers must be available to that API account |
| xAI | xAI API key | Grok consumer subscriptions are not API keys |
| Local | Loopback compatible server, default Ollama port 11434 | Select an installed tool-capable model; cloud-backed models may still incur charges |
| Custom | `provider: "compatible"`, explicit `baseUrl` and secret reference | HTTPS required except loopback HTTP; compatibility must be verified |

Open Models in the UI for provider-specific profiles and official documentation.
The existing single-route `AGENTFORGE_CHAT_*` configuration remains supported when
no multi-connection file is supplied. Existing MiMo configuration is unchanged.

## Subscription connections: separate integration tracks

1. **ChatGPT:** the guided Windows connection uses official OpenAI sign-in and
   account-scoped models; see the setup and verification limits below.
   **Codex CLI**, separately: sign in through official `codex login` using a dedicated
   `CODEX_HOME`. AgentForge's existing `codex-cli` adapter is a bounded plan-draft
   route configured with `AGENTFORGE_PLAN_PROVIDER` and
   `AGENTFORGE_PLAN_CLI_CONFIG`. It is not a general chat subscription bridge.
2. **Claude:** the user signs in through the unmodified Claude Code client.
   AgentForge must not collect Claude account tokens or repurpose them as API
   credentials. A managed official-client worker is not implemented here.
3. **Google:** Gemini CLI supports Google-account sign-in, including eligible Pro
   and Ultra accounts. A managed Gemini CLI worker is not implemented here; the
   Gemini API connection above is a separate route.
4. **Other consumer subscriptions:** no undocumented cookie or token bridges.
   Use a documented API or official client rather than claiming subscription
   interoperability that has not been implemented and verified.

For managed official-client workers, remaining acceptance work includes explicit
client installation and sign-in, isolation of workspace access, stop/reconnect
semantics, tool/effect mapping to approval receipts, and an authenticated test.
These are tracked limitations, not connected-state claims.

## Verification

Automated tests cover selected endpoint/model/key routing, rejection of embedded
credentials, dedicated secret references, local-only endpoint boundaries,
duplicate routes, and no billing fallback. Synthetic protocol tests do not prove
account entitlement, live quota, tool capability of every model, or provider quality.
Account owners complete provider sign-in; passwords and tokens never go in chat,
project configuration, workspace exports, or release artifacts.

## Official sources checked October 25, 2026

- [OpenAI authentication](https://learn.chatgpt.com/docs/auth)
- [Claude authentication and credential use](https://code.claude.com/docs/en/legal-and-compliance)
- [Claude API compatibility](https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk)
- [Gemini CLI authentication](https://geminicli.com/docs/get-started/authentication/)
- [Gemini API compatibility](https://ai.google.dev/gemini-api/docs/openai)
- [DeepSeek API](https://api-docs.deepseek.com/)
- [xAI API](https://docs.x.ai/)
- [Ollama compatibility](https://docs.ollama.com/api/openai-compatibility)

## ChatGPT plan integration status

The web setup now implements official sign-in, model selection, chat/tool requests,
plan drafting, protected saved-account restoration, renewal, and sign-out on
Windows. Live account lifecycle and clean-install browser acceptance remain
unproven. This implementation status is not a claim of production readiness.

1. Sign in to AgentForge as an owner or administrator. Open **Models**, choose
   **Use a subscription**, and continue to **Connect your model**.
2. Select **Set up subscription**, choose an account, and start secure sign-in.
   Open **Continue to OpenAI**; complete authentication there. Never paste a
   password or token into AgentForge chat.
3. Return and select **Check sign-in**. Choose an account-provided model and
   **Use this model**. This installs the route; send a short message to verify
   an actual response. Inference uses your ChatGPT plan allowance.
4. After a server restart, choose the saved account and **Restore saved account**.
   Restoration checks protected credentials and the account catalog. If the
   session cannot be safely renewed, start a fresh sign-in for that saved account.
5. Finish or stop active responses before signing out. Sign-out disables the
   selected account's local providers and removes its stored tokens. The UI
   distinguishes confirmed revocation from unconfirmed remote removal. For the
   latter, disconnect the app in ChatGPT Settings. Registration metadata remains
   so returning sign-in can reuse the account/client mapping.

Windows credentials use current-user DPAPI outside the repository; this does not
isolate them from other processes running as that Windows user. Mac/Linux protected
storage is not implemented. The older command-line sign-in verification command
still discards its tokens; use the web flow to configure chat. No imported browser
session, unrelated application token, or automatic API-billing fallback is used.

Protocol reference: [OpenAI accounts and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions).

## Managed Claude worker implementation requirements

Status: researched, not implemented or accepted. Checked October 25, 2026.

Use the unmodified official client with the user's own authentication. Do not collect or proxy subscription tokens, hide client authentication choices, or silently switch billing routes. The provider's commercial conditions apply to embedding the client. See [official integration and credential rules](https://code.claude.com/docs/en/legal-and-compliance).

The [official CLI reference](https://code.claude.com/docs/en/cli-reference) distinguishes built-in tools from MCP tools: an empty built-in tool list does not disable MCP. Restricted/safe modes retain some managed policy behavior. Therefore these flags alone are not proof of isolation.

AgentForge acceptance requirements:

- Probe the installed executable's version and supported controls without inference; reject unsupported configurations before a paid request.
- Keep planning separate from execution. A proposed command must pass AgentForge's existing approval and isolated execution path.
- Verify empty built-in and external tool exposure, disabled customizations, and absence of unsolicited hooks using synthetic hostile configuration fixtures. Inspect effective managed configuration; refuse an unverified setup.
- Preserve the official authentication flow outside AgentForge. Never copy credentials into workspaces, logs, fixtures, exports or packages.
- Bound duration and output, propagate cancellation, retain durable invocation receipts, and treat lost responses as unknown outcomes without automatic retry.
- Parse structured results and usage strictly; reject unexpected activity. Output inspection is evidence, not prevention of a side effect that already happened.
- Prove restart recovery, account expiration, denied tools and the complete approval-to-verification workflow before advertising managed subscription execution.

The existing external-client guidance remains the supported Claude subscription route until this acceptance is complete; API chat remains a separate connection.

### Inspect an official Claude client without inference

Run `agentforge connections inspect-claude <absolute-official-client-path>` to inspect a trusted, unmodified installed client. The check runs only version/help, with a fresh temporary configuration and no inherited account credentials, bounded output and deadlines. It reports required control flags and a version, explicitly separating advertised controls from authentication and isolation proof. It does not authenticate, configure a worker, or make a model request. Select the actual regular executable rather than a shell wrapper or symlink.

### Explicit Claude account-status inspection

Run `agentforge connections claude-status <absolute-official-client-path> <absolute-profile-directory>` to ask the selected official client whether that profile is signed in. The command returns only `loggedIn`, `connectionKind`, and `inferenceVerified: false`; it never reads token files or returns account identifiers. A signed-out profile exits with code 1. This is an authentication-status check, not proof of model entitlement, inference, or execution isolation. Select only a trusted official executable and a profile you intend to inspect.

The guided subscription setup includes **Check Claude client account**. Host operators opt in by setting `AGENTFORGE_CLAUDE_EXECUTABLE` and `AGENTFORGE_CLAUDE_PROFILE_DIRECTORY` to explicit absolute paths before starting the service. The browser cannot choose either path. The check requires an authenticated owner or administrator with settings permission, permits one check at a time, and does not activate a chat model. Do not configure an executable you do not trust.

Account status distinguishes `subscription` (the official client's `claude.ai` auth method), `api`, `third-party`, `signed-out`, and `unverified`. An OAuth-token or unrecognized method is not classified as a verified subscription. This classification describes the reported authentication method, not quota, entitlement or a successful model request. See the official [auth status reference](https://code.claude.com/docs/en/cli-reference).

### Explicit Codex planner model selection

The optional `codex-cli` planner configuration accepts an explicit `gpt-*` model identifier rather than forcing one historical model. Choose an identifier available in your official client's model picker. `listModels()` reports the configured selection, not an entitlement lookup. AgentForge passes that selection through `-m`, keeps the existing medium reasoning/default tier and approval boundaries, and does not fall back to another model or API billing. Invalid identifiers fail before launch. See the [official CLI model flag](https://learn.chatgpt.com/docs/developer-commands?surface=cli).

### Managed planner implementation status

The internal Claude draft adapter now checks the selected official profile,
requires subscription authentication, bounds the process, propagates cancellation,
and validates initialization/activity/result events. It rejects exposed tools,
tool activity and ambiguous results, and preserves validated usage on failures.
Synthetic validation and a real signed-out refusal have passed. Signed-in
inference, managed-policy isolation and the complete approval journey have not.
It is therefore not activated by the server or advertised as a working connection.
Event rejection detects activity; it cannot reverse an already performed effect.

Gemini managed planning remains disabled and incomplete. Its internal stream
validator now checks a single initialization, the exact requested model and
prompt, assistant text deltas, a final successful result and zero tool calls.
It rejects unexpected activity and retains valid usage when rejecting a result.
Synthetic protocol checks passed; this is not live inference or isolation proof.
The implementation must use a
deliberately selected official-client profile; headless mode can reuse an
existing login, but a missing login must not trigger an API or Vertex fallback.
See [Gemini authentication](https://geminicli.com/docs/get-started/authentication/).
Select the profile with `GEMINI_CLI_HOME`, which contains the client's `.gemini`
directory. Verify effective settings, hooks, extensions, environment loading and
tool policy before inference; a separate home alone is not isolation proof.
The inspected official 0.65.0 client also processes `@` file references before
inference. Model tool denial does not prevent that preprocessing. Managed
activation must prevent unintended prompt-driven file expansion and verify the
effective input, rather than treating a zero-tool transcript as proof that no
files were accessed. The internal prompt encoder now places text messages in a
JSON envelope with literal `@` characters represented as JSON Unicode escapes.
Decoding the envelope preserves the original message data exactly. A direct
check against the official 0.65.0 preprocessing function passed without path
resolution or input transformation. This covers prompt-driven expansion only;
it does not prove that settings, hooks or account startup cannot read files.
The encoder is not yet connected to a managed worker, and no credentials are copied.
See [Gemini configuration](https://geminicli.com/docs/reference/configuration/).
Consume the documented initialization, message, tool, error and result events;
retain usage and reject unexpected activity or uncertain outcomes without retry.
See [Gemini headless output](https://geminicli.com/docs/cli/headless/).
Both managed routes must feed the same explicit plan review and isolated worker
as other providers. They must not execute proposed commands in the CLI process.

### Inspect an official Gemini client without inference

To prepare a dedicated profile, run
`agentforge connections prepare-gemini <absolute-new-home-directory>`.
The parent directory must already exist; the requested directory must not exist.
This creates only Google-login settings with hooks and telemetry disabled. It
does not import credentials, modify an existing profile, sign in, or enable the
managed planner. Use the returned home as `GEMINI_CLI_HOME` for the official
client's sign-in. The command reports authentication as false until separately
verified. Filesystem mode requests do not establish Windows ACL protection.

Run `agentforge connections inspect-gemini <absolute-official-client-bundle>`
with the installed package's `bundle/gemini.js` file, not an npm command shim.
AgentForge uses its current Node runtime and a fresh temporary home to inspect
version/help only. It does not inherit account credentials or API-key variables.
The report separates advertised controls from authentication, isolation and
inference; all three remain unverified. Version 0.65.0 passed this inspection.
Only select a trusted official bundle: this command executes that JavaScript
file, and is not a code-authenticity scanner. No managed Gemini worker is enabled.

The negative integration probe `scripts/gemini-auth-boundary-acceptance.ts`
requires an explicit official bundle and uses only a synthetic empty profile.
On Windows with official 0.65.0, it exposed a rejected configuration: system
settings/defaults redirected to a user-owned temporary directory are ignored
because the client requires trusted administrator ownership. That probe failed;
it did not establish authentication enforcement. Do not activate a managed route
on the assumption that these environment overrides are effective, and do not
relax filesystem permissions or the client's ownership checks to make it pass.
Account selection and effective policy still need a supported, verified route.

Run the same probe with a final `user` argument to test the documented user
profile settings instead of administrative settings. With official 0.65.0 on
Windows, this variant passed: `.gemini/settings.json` selected API-key auth
while requiring `oauth-personal`, and the real headless client rejected that
mismatch. It used an empty disposable home with no credentials. This proves
that specific user-setting rejection, not login, paid subscription entitlement,
tool denial, or successful inference. A dedicated AgentForge profile can use
this supported setting location; it must not mutate an existing private profile
or describe user-editable settings as an administrator-enforced security boundary.

### Experimental Claude subscription planner

The server launcher accepts `AGENTFORGE_PLAN_PROVIDER=claude-cli` together with
`AGENTFORGE_PLAN_CLAUDE_CONFIG`, an absolute path to a private JSON file containing
exactly `executablePath`, `configurationDirectory`, and `model`. Select the trusted
official executable and the profile you intend to use; all paths must be absolute,
and the model identifier must start with `claude-`. Do not put API keys or account
tokens in this file. AgentForge does not discover profiles or copy their credentials.

Configuration loading does not launch the client. A draft request checks advertised
client controls and official subscription authentication, then requests a bounded
plan-only invocation with tools/MCP disabled and no session persistence. Missing
controls, API authentication, malformed results and unknown usage fail closed; no
API fallback or automatic retry is supplied. The host-configured planner is used
when a plan request does not explicitly select a different connected model.
Review and approval remain required before governed Docker execution.

This route is experimental: live subscription inference, effective client isolation,
and the complete user journey have not been accepted. Requested client flags and
transcript checks are not an OS sandbox. This is a planner route, not streaming
Claude chat or permission to run the official client against private repositories.

Use the exact resolved home returned by prepare-gemini for GEMINI_CLI_HOME and the planner homeDirectory. On systems where temporary directories have filesystem aliases, this resolves the newly created location; the planner still refuses linked profile paths.

### Experimental Gemini subscription planner

Prepare a new dedicated profile with `agentforge connections prepare-gemini`,
then use its returned physical home for official Google sign-in. Do not select
an existing personal profile. AgentForge does not collect account passwords or
copy credentials. The profile disables hooks, extensions, MCP and skills.

The launcher accepts `AGENTFORGE_PLAN_PROVIDER=gemini-cli` and
`AGENTFORGE_PLAN_GEMINI_CONFIG`, an absolute path to a private JSON file with
exactly these fields:

```json
{
  "bundlePath": "/absolute/path/to/official/bundle/gemini.js",
  "homeDirectory": "/absolute/physical/path/to/dedicated-home",
  "model": "gemini-YOUR-AVAILABLE-MODEL"
}
```

On Windows use absolute Windows paths, escaping backslashes in JSON. No API key
or account token belongs in this file. Use an account-supported model identifier;
the placeholder above is not a model recommendation. The client must advertise
the required controls, and the profile must retain the prepared restrictions.

This route drafts a plan for review. It does not provide streaming chat or run
proposed commands. Approved execution goes through AgentForge's governed worker.
Cancellation rejects the response, retains valid reported usage when available,
and never automatically retries or falls back to API billing.

Official 0.65.0 user-setting authentication mismatch rejection and policy-engine
tool denial have been exercised without an account. Complete live login,
inference and full-client enforcement remain acceptance work; engine checks
and requested flags are not an operating-system sandbox.
