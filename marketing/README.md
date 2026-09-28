# AgentForge marketing workspace

This workspace produces reviewable launch assets without becoming a runtime dependency of AgentForge.

## Production flow

1. Start from the verified public feature inventory and record the source paths used for every claim.
2. Draft the brief, script, captions, and post copy in `drafts/`.
3. Run a factual review against the public manifest and release-readiness checks.
4. Render approved demonstrations in 16:9 and 9:16 with Remotion.
5. Inspect sampled frames, captions, audio, links, and accessibility before approval.
6. Move approved assets to `approved/` and keep publishing credentials outside this repository.

The workspace never contains owner accounts, tokens, customer records, or private channel history. Social publishing remains an explicit, operator-approved action. Composio may be added later as an optional publishing adapter after its current scopes and actions are verified.

The Remotion project and its commands will be added only after the dependencies and licensing terms are verified. Until then, this README is the bounded operating contract for the marketing workspace; it does not claim that rendering or publishing is complete.
