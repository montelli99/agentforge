# Private-chat latency diagnostic, 2026-09-30

The first live AgentForge private-chat reply through MiMo 2.5 Pro took about
47 seconds from inbound message audit to outgoing Telegram reply audit. This
interval includes model work and outbound delivery; the build used for that
test did not record those components separately. The owner confirmed receipt.

To inform the chat default, `scripts/measure-chat-model-latency.ts` sent two
short, synthetic, text-only prompts to each authorized MiMo route. It used
the same provider adapter, temperature 0, and a 400-token output limit. The
second prompt reversed model order. No business data or reply text is in the
public record; the per-call artifact is stored privately outside the repo.

| Prompt | MiMo 2.5 | MiMo 2.5 Pro |
| --- | ---: | ---: |
| One-sentence explanation | 4.7 s, complete | 3.9 s, complete |
| Two-sentence safe first step | 6.4 s, complete | 29.9 s, complete |

All four calls completed. This tiny diagnostic measures neither sustained
latency nor answer quality, provider billing, or concurrent load. It cannot
establish a universal model ranking. It does justify a provisional product
default: when both MiMo models are explicitly allowed, AgentForge chooses
the regular MiMo 2.5 model for private Telegram conversation. Operators may
explicitly select Pro. Local answers for a few workspace questions bypass
both models. The next live acceptance should check user-visible latency and
the separate model/send timings added after the first live exchange.
