# Deployment acceptance checklist

This checklist separates local proof from deployment proof. It must be completed for each release target; local tests alone do not satisfy these items.

## Provider acceptance

- Configure a test-only Telegram, Slack, Discord, or other channel credential outside the repository.
- Start only the selected native AgentForge transport.
- Verify inbound delivery, outbound delivery, reconnect, stop, restart, and duplicate-event handling.
- Verify the linked owner identity and role permissions through the real provider.
- Export the resulting audit entries and verify the local hash chain after restart.

## Governed execution acceptance

- Configure an approved model route and an isolated compute backend.
- Prepare a process run and inspect its contract before approval.
- Approve with an authenticated reviewer.
- Verify the backend executes only contract-authorized steps.
- Verify blocked, failed, cancelled, and resumed runs preserve task state and evidence.
- Verify the resulting evidence pack digest and replay the verification independently.

## Retention and tamper controls

- Store snapshots, audit exports, evidence packs, and backups in an encrypted deployment-managed location.
- Define retention and deletion periods for each artifact class.
- Keep an immutable or append-only copy of audit and evidence exports.
- Periodically restore a backup into an isolated workspace and run audit-chain and evidence-integrity verification.
- Record the deployment, provider versions, model route, and verification timestamp with each release evidence pack.

A release may claim production-provider readiness only when the target deployment has recorded all applicable results, not merely when the local suite passes.

