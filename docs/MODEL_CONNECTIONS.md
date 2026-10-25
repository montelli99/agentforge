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
