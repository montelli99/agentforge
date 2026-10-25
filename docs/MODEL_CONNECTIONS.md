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

1. **ChatGPT / Codex:** sign in through official `codex login` using a dedicated
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

The official [Sign in with ChatGPT integration guide](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt) documents dynamic registration and authorized plan usage. AgentForge already contains isolated OAuth verification and a direct planner abstraction, but its sign-in command discards session tokens and never installs an active provider. The server has no completed owner-facing connection, refresh and model-selection lifecycle for this route. These components are not a working subscription-chat connection.

The remaining integration must use the authorized grant and model catalog, preserve per-profile identity, handle renewal and revocation, and keep sign-in separate from consent to inference. Existing API connections must not be used as a fallback. No imported browser session, consumer cookie or unrelated application token is needed.
