# First Tester Guide

Thank you for testing AgentForge vNext. This guide covers the local control plane and clearly separates local fixture behavior from live integrations.

## Before you start

- Node.js 22 or later
- pnpm 10 or later
- A clean development checkout

Install and run the current checks:

```sh
pnpm install
pnpm check
pnpm dev
```

The vNext server normally listens at `http://127.0.0.1:3460`. Port 3000 is deliberately reserved for unrelated local applications. Check the startup output for the actual address. The launcher writes local versioned JSON workspace snapshots under the current user's `.agentforge` data directory; set `AGENTFORGE_DATA_DIR` to use a separate test directory. This is staging persistence, not production-grade or encrypted storage.

## What to test

Try the workspace navigation and the workflows currently exposed in the UI: messages, tasks, agents, processes, approvals, models, harnesses, memory, voice simulation, tools, compute, marketplace, activity, and settings. Record the exact steps, expected result, actual result, and any visible error.

Use synthetic information only. Do not connect a production provider account, channel, email account, customer system, or credential. Provider entries marked mock, test, skeleton, not configured, or unimplemented are not live integrations. A local mock result is useful UI/test evidence but is not proof that its real service works.

## Report your findings

Use [TESTER_FEEDBACK.md](TESTER_FEEDBACK.md). Include the AgentForge commit, operating system, Node version, workflow, provider readiness label, and whether the provider was a mock or a real service. Attach sanitized logs or screenshots where useful. Never include tokens, passwords, private seller/customer data, or production account details.

## Current limits

- Verify state restoration by restarting with the same `AGENTFORGE_DATA_DIR`; the current store is single-process staging storage and has not passed the complete release durability gate.
- There is no verified end-to-end live Telegram/Discord migration or production cutover.
- Do not infer release readiness from a passing unit suite; browser acceptance, persistence recovery, and security gates are tracked separately.
- No pricing or token-savings claim is being tested by this guide.
