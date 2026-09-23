# AgentForge Lab Report
Generated: 2026-08-23T14:22:00.272Z
> Scope: historical local lab scenarios. PASS means the scenario matched its expected result; it is not evidence of a live provider, real migration, production security, or external-system behavior.
Model: minimax/MiniMax-M2.7
Image model: ollama/qwen3.5:397b-cloud
Passed: yes
Scenarios: 30
Failed: 0

- S1 OpenClaw local only: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=minimax/MiniMax-M2.7 | transport=stdio | headers=7
- S2 Hermes private mesh: PASS
  expected=pass actual=pass
  notes=runtime=hermes | model=minimax/MiniMax-M2.7 | transport=mesh | headers=7
- S3 Public ingress private origin: PASS
  expected=pass actual=pass
  notes=runtime=other | model=minimax/MiniMax-M2.7 | transport=public-ingress | headers=7
- S4 Secure MCP tunnel: PASS
  expected=pass actual=pass
  notes=runtime=other | model=minimax/MiniMax-M2.7 | transport=tunnel | headers=7
- S5 Side effecting request: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=minimax/MiniMax-M2.7 | transport=stdio | headers=8
- S6 Ambiguous runtime match: PASS
  expected=reject actual=reject
  notes=no deterministic runtime choice
- S7 Adapter schema drift: PASS
  expected=reject actual=reject
  notes=canonical envelope failed adapter translation
- S8 Authentication failure: PASS
  expected=reject actual=reject
  notes=transport authentication failed
- S9 Partial runtime response: PASS
  expected=quarantine actual=quarantine
  notes=stream ended before terminal signal
- S10 Conflicting reflection verdicts: PASS
  expected=quarantine actual=quarantine
  notes=post-result reflection vetoed output
- S11 Audit store failure: PASS
  expected=fail-closed actual=fail-closed
  notes=audit store unavailable for side effecting request
- S12 Concurrent run isolation: PASS
  expected=pass actual=pass
  notes=runtime=hermes | model=anthropic/claude-opus-4-6 | transport=mesh | headers=5
- S13 Fallback exhaustion: PASS
  expected=reject actual=reject
  notes=no deterministic runtime choice
- S14 Preflight revision request: PASS
  expected=reroute actual=reroute
  notes=explicit preflight revise
- S15 Optimization enabled - cost-aware routing: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=anthropic/claude-opus-4-6 | transport=stdio | headers=7
- S16 Optimization enabled - compression: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=minimax/MiniMax-M2.7 | transport=stdio | headers=7
- S17 Optimization enabled - cache hit: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=minimax/MiniMax-M2.7 | transport=stdio | headers=7
- S18 Optimization enabled - explicit model respected: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=anthropic/claude-opus-4-6 | transport=stdio | headers=7
- S19 Optimization enabled - provider failover: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=anthropic/claude-opus-4-6 | transport=stdio | headers=7
- S20 Optimization disabled - no-op: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=minimax/MiniMax-M2.7 | transport=stdio | headers=7
- S21 Optimization - policy blocks cheaper model: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=anthropic/claude-opus-4-6 | transport=stdio | headers=7
- S22 Optimization - high complexity task: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=minimax/MiniMax-M2.7 | transport=stdio | headers=7
- S23 Delta transmission - multi-turn conversation: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=minimax/MiniMax-M2.7 | transport=stdio | headers=7
- S24 Semantic memory - cross-request similarity: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=minimax/MiniMax-M2.7 | transport=stdio | headers=7
- S25 Provider-specific optimization - Claude: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=anthropic/claude-sonnet-4-6 | transport=stdio | headers=7
- S26 Provider-specific optimization - OpenAI: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=openai/gpt-4o | transport=stdio | headers=7
- S27 Speculative execution - cheapest-first: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=minimax/MiniMax-M2.7 | transport=stdio | headers=7
- S28 Cost ledger - tenant tracking: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=minimax/MiniMax-M2.7 | transport=stdio | headers=7
- S29 Context fingerprinting - similarity matching: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=minimax/MiniMax-M2.7 | transport=stdio | headers=7
- S30 Full Phase 2 optimization stack: PASS
  expected=pass actual=pass
  notes=runtime=openclaw | model=minimax/MiniMax-M2.7 | transport=stdio | headers=7
