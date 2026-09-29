# Model route readiness

Updated: 2026-09-29

This is an operational readiness record, not an approval to spend money or publish results.

| Track | Route evidence in current environment | Status | Next required input |
|---|---|---|---|
| MiMo | `MIMO_API_KEY` is present; `mimo-v2.5` and `mimo-v2.5-pro` smoke artifacts validate through the real adapter | Smoke verified; comparative run not started | Freeze replicate count, hard ceiling, and exact study manifest |
| Luna | No Luna route variable or endpoint is configured | Not runnable from this checkout | Exact provider/model identifier and route configuration |
| GPT-5.5 | No OpenAI/GPT route variable or endpoint is configured | Not runnable from this checkout | Exact provider/model identifier and route configuration |
| Qwen | Explicitly excluded by the approved research policy | Prohibited | None |

The Codex coding plan provides model access inside the development conversation, but it is not an API credential or endpoint that the repository runner can call. Therefore a GPT-5.5 or Luna result cannot be claimed from this checkout until a provider route is explicitly configured. The coding plan is complete for route policy, isolation, accounting, evidence capture, and acceptance gates. A comparative paper result must not be generated from a smoke check or from a missing route. Once the exact routes and budget are frozen, the runner can execute matched B0, B1, and AgentForge tracks without changing the protocol.
