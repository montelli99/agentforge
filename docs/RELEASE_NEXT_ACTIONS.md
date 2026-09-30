# Release next actions

The local release and hosted build gates are passing. AgentForge is an
upcoming release candidate; the following are optional follow-up actions and
the separate owner-controlled publication step.

## 1. Optional live provider acceptance

Use disposable sandbox targets and private environment variables. Do not put
tokens, message bodies, phone numbers, workspace identifiers, or account names
in the repository.

For each enabled provider, record only the readiness result, normalized inbound
event ID, outbound provider message ID, and clean shutdown result:

- Telegram: follow `LIVE_PROVIDER_ACCEPTANCE.md` and choose BotFather, MTProto,
  or the optional relay path.
- Discord: follow `DISCORD_SETUP.md`, use an isolated test server, and verify a
  Gateway v10 inbound event plus one approved outbound event.
- Slack: follow `SLACK_SETUP.md`, use a disposable Socket Mode app, and verify
  one inbound event plus one approved outbound event.

The acceptance is complete only when the provider reports ready, each event is
observed exactly once, the approved outbound action is observed, and shutdown
returns the provider to stopped without replay.

## 2. Hosted deployment evidence

Record the hosted CI run URL and commit SHA in `RELEASE_VERIFICATION_LOG.md`.
Verify the deployed site returns HTTP 200 for `/`, `/404.html`, `/robots.txt`,
and `/sitemap.xml`, and confirm the deployed homepage contains the current
responsive layout.

## 3. Publication

Run `pnpm release:audit`, inspect the package archive, and calculate its digest
from a clean checkout. Publishing to npm or another registry is a separate,
explicitly authorized action. After publication, record the registry version,
provenance result, and archive digest without recording credentials.

## 4. Final release decision

The release candidate may be announced as upcoming without Discord or Slack
live evidence. A passing local audit or fixture test must still never be
described as a live provider result.

## 5. Repeatable operator sequence

Run these checks from a clean release checkout before requesting publication:

```text
pnpm verify:public
pnpm test:website
pnpm test:registry:preflight
pnpm test:research:all
```

Then run the provider-specific procedure in
[`LIVE_PROVIDER_ACCEPTANCE.md`](LIVE_PROVIDER_ACCEPTANCE.md) with disposable
targets and private runtime secrets. Capture only the readiness snapshot,
normalized inbound event ID, outbound provider message ID, and clean shutdown
result. Never copy tokens, private message bodies, or account identifiers into
the evidence file.

The final publication step is intentionally owner-controlled. The preflight
must report `passed: true`, the archive fingerprint must be recorded, and the
owner must explicitly authorize the registry command. No CI job or local audit
performs publication automatically.
