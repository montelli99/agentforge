# AgentForge Launch Checklist

Use this checklist before sharing AgentForge with first users.

## Installation

- [ ] `npm install` completes without errors
- [ ] No peer dependency warnings
- [ ] `node_modules` size is reasonable

## Tests

- [ ] `npm test` passes all tests (0 failures)
- [ ] Server tests pass
- [ ] Broker tests pass
- [ ] Phase 3D tests pass

## Server

- [ ] `npm run start` starts server on port 3000
- [ ] Server logs show optimization status
- [ ] Server logs show API key status (configured or NOT SET)

## Endpoints

- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] `GET /health` shows `provider.available: false` without API key
- [ ] `GET /health` shows `provider.available: true` with API key
- [ ] `GET /dashboard` returns HTML page
- [ ] `GET /dashboard.json` returns metrics JSON
- [ ] `POST /v1/chat/completions` accepts OpenAI request shape
- [ ] `POST /v1/chat/completions` returns OpenAI response shape
- [ ] Response includes `agentforge` metadata when enabled
- [ ] Response excludes `agentforge` metadata when `AGENTFORGE_METADATA=false`

## Provider Behavior

- [ ] Without API key: returns 503 with clear error message
- [ ] Without API key: memory bypass still works if cached
- [ ] With API key: forwards to provider and returns response
- [ ] With API key: logs request with latency

## Demo

- [ ] `npm run demo` completes without errors
- [ ] Demo shows 3 scenarios (baseline, same request, one file changed)
- [ ] Demo shows tokens prevented for each scenario
- [ ] Demo shows dashboard summary at end

## Dashboard

- [ ] Dashboard loads in browser at `http://localhost:3000/dashboard`
- [ ] Dashboard shows Total Tokens Prevented
- [ ] Dashboard shows Estimated $ Saved
- [ ] Dashboard shows Provider Calls Avoided
- [ ] Dashboard shows Avg Reduction %
- [ ] Dashboard updates after new requests

## Documentation

- [ ] README quickstart is copy/paste usable
- [ ] curl examples work
- [ ] `.env.example` exists and is documented
- [ ] LAUNCH_CHECKLIST.md exists

## Benchmark

- [ ] `npx tsx src/benchmark-quick.ts` runs successfully
- [ ] Benchmark shows savings for unchanged context (88%+)
- [ ] Benchmark shows savings for changed context (60%+)

## Final Verification

- [ ] All items above are checked
- [ ] No console errors during normal operation
- [ ] Server handles Ctrl+C gracefully
