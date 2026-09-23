# Browser Trading Playbook
## Axiom Browser + Orion/VCS Tools Hybrid System

**Last Updated:** 2026-08-16
**Status:** Active - Requires User Approval for All Entries

---

## SYSTEM ARCHITECTURE

| Component | Role | Tools |
|-----------|------|-------|
| **BRAIN** | Signal detection, cluster analysis, decision logic | Orion/VCS tools (MURAD, KOFI, confidence scoring) |
| **COCKPIT** | Visual confirmation, execution, position management | Axiom browser |

**Critical Rule:** Axiom is NEVER the brain. Tools are the brain. Axiom is only for:
- Visual confirmation of token details
- Manual/supervised execution
- Position review
- Exit clicking after approval

---

## DECISION PIPELINE

```
1. Axiom browser finds candidate token
2. Extract mint address
3. Verify token is pump.fun-native or properly stage-labeled
4. Check Orion MURAD status (alpha wallet signal)
5. Check quote freshness and first-observation health
6. Check holder %, bundle %, liquidity, buy/sell ratio, market cap, age
7. Check KOFI only if wallet feed has valid data
8. Label: NO_TRADE / WATCH / HUMAN_APPROVAL / PAPER_VALIDATION
9. Show full TOKEN TRADE REVIEW
10. Wait for explicit user approval before any real buy
```

---

## TOKEN TRADE REVIEW FORMAT

Every candidate must produce this output:

```
TOKEN TRADE REVIEW
- token: [name]
- mint: [address]
- source/stage: [pump.fun | raydium | bonk] / [new | migration | established]
- Axiom metrics:
  - market_cap: $
  - liquidity: $
  - volume_24h: $
  - top_holder: %
  - bundle: %
  - buy/sell: ##/##
  - age: Xm
- MURAD status: [status] - [signal]
- KOFI status: [status] - [signal]
- holder/bundle risk: [LOW | MEDIUM | HIGH | CRITICAL]
- liquidity risk: [LOW | MEDIUM | HIGH | CRITICAL]
- quote freshness: [FRESH | STALE]
- entry size proposed: [amount] SOL
- slippage preset: [conservative | normal | emergency]
- exit plan: [conservative_scalp | scalp | momentum]
- decision: [NO_TRADE | WATCH | HUMAN_APPROVAL | PAPER_VALIDATION]
- reason: [list of reasons]
- user approval required: YES
```

---

## DECISION GATES

### HARD REJECTIONS (NO_TRADE always)
- Source not verified (not pump.fun, raydium, bonk, or established DEX)
- Top holder > 40% (honeypot risk)
- Bundle % > 25% (cluster manipulation)
- Token age < 3 minutes (clone/honeypot risk)
- Market cap < $25K
- Liquidity < $10K
- Quote data stale
- KOFI shows coordinated flow (cluster manipulation)

### ENTRY CONDITIONS

| Condition | Minimum | Notes |
|-----------|---------|-------|
| Market cap | $25K | Hard minimum |
| Liquidity | $10K | Hard minimum |
| Token age | 3+ minutes | Hard minimum |
| Top holder | < 30% preferred, < 40% max | Soft gate |
| Bundle % | < 15% preferred, < 25% max | Soft gate |
| Buy ratio | > 50% preferred | Soft gate |
| Liquidity/MC ratio | > 50% preferred | Soft gate |

### SIGNAL TIER

| Tier | MURAD | KOFI | Decision |
|------|-------|------|---------|
| 1 | HIGH_CONVICTION (3+ wallets, score 70+) | Clean | HUMAN_APPROVAL |
| 2 | ALPHA (1+ wallets) | Available, clean | HUMAN_APPROVAL |
| 3 | ALPHA | NOT available | PAPER_VALIDATION |
| 4 | None | Coordinated flow | NO_TRADE |
| 5 | None | N/A | WATCH or NO_TRADE |

---

## ENTRY SIZING

**Current wallet:** ~0.171 SOL (~$12.85)

| Size | Amount | When to Use |
|------|--------|-------------|
| Proof-of-skill | 0.005-0.01 SOL | Until workflow proven |
| Standard | 0.02-0.03 SOL | After proven track record |
| Full | 0.05+ SOL | Only after consistent success |

**Rules:**
- NO 0.05 SOL as default on 0.171 SOL wallet (that's 29% of wallet)
- No averaging down
- No martingale
- Max ONE test position until workflow proven

---

## SLIPPAGE PRESETS

| Preset | Range | When to Use |
|--------|-------|-------------|
| Conservative | 5-10% | Strong signal, larger size |
| Normal meme | 10-15% | Standard meme entry |
| Emergency chase | 20-25% | Very strong signal ONLY, tiny size |

**Exit slippage:** 10-20% depending on liquidity

**Note:** Do NOT use 25% as casual default. It's for emergencies only.

---

## EXIT PLANS

### Conservative Scalp (Recommended for proof-of-skill)
```
- 40% of position at +50% -> trailing stop on remaining 60%
- 30% of position at +2x -> trailing stop on remaining 30%
- 30% of position rides to +5x OR hard stop at -15%
- Hard stop: -15% from entry
- Max hold: 30 minutes
- Quote failure exit: If quote unavailable >30s, exit full position
```

### Scalp
```
- 50% at +50% -> take profit
- 30% at +2x -> take profit
- 20% at +3x OR hard stop at -15%
- Max hold: 30 minutes
```

### Momentum
```
- 30% at +100%
- 30% at +3x -> trailing stop at +2x
- 20% at +5x -> trailing stop at +3x
- 20% rides to +10x
- Hard stop: -15%, move to breakeven after +50%
- Max hold: 2 hours
```

**HOLD_TO_PEAK is NOT executable.** All exits must be defined before entry.

---

## SLIPPAGE + EXIT SETTINGS

From Axiom settings screenshot:
- Slippage: 10% (consider raising to 15% for meme coins)
- Network Fee: Normal (Fast for entry, Normal for exit)
- Spread: 0.5%
- Auto-Retries: On (3 max)
- Auto-Refund: On
- Fast Mode: On
- Auto-Approve: On

---

## KOFI STATUS NOTES

KOFI (KOordinated Flow Identification) requires Helius wallet data.
- KOFI is unavailable when `wallet_events` has no data for the token
- Axiom bundle % is a PROXY only, not full wallet-cluster proof
- KOFI cannot be used as hard approval gate until validatable clusters exist
- When KOFI is unavailable, rely on Axiom bundle % and holder %

---

## MARSCOIN EXAMPLE (from 2026-08-16 scan)

```
TOKEN TRADE REVIEW - MARSCOIN
- token: MARSCOIN (Stonkfun)
- mint: GgRnMShKjdvzKzWBNmg2tRSo9YDMLVg56M1QVMMSpump
- source/stage: pump.fun / new

AXIOM METRICS:
- Market Cap: $37,700
- Liquidity: $18,500 (49% ratio - borderline)
- Volume 24h: $43,900 (strong)
- Top Holder: 20.1% [LOW risk]
- Bundle: 1.7% [LOW risk]
- Buy/Sell: 581/380 (60% buy ratio) [LOW risk]
- Age: 2m 0s [FAIL - must be 3+ minutes]

MURAD STATUS: UNKNOWN - NO_SIGNAL
KOFI STATUS: UNAVAILABLE - using Axiom bundle % as proxy

DECISION: NO_TRADE
REASONS:
  - Token < 3 minutes old - clone/honeypot risk too high
  - Liquidity/MC ratio 49.1% < 50% - monitor

USER APPROVAL REQUIRED: YES
```

---

## WORKFLOW COMMANDS

To run a trade review:
```bash
python axiom_trade_review.py
```

Or import into any script:
```python
from axiom_trade_review import build_trade_review, format_review
review = build_trade_review(
    token_symbol="TOKENNAME",
    token_mint="...",
    source="pump.fun",
    stage="new",
    market_cap=50000,
    liquidity=25000,
    volume_24h=30000,
    top_holder_pct=15.0,
    bundle_pct=5.0,
    buy_count=200,
    sell_count=100,
    age_seconds=300,
    price_usd=0.0001,
    change_1h_pct=50.0,
)
print(format_review(review))
```

---

## PROOF-OF-SKILL RULES

Until the browser workflow and exits are proven:
1. Paper trades only (0.00 SOL actual)
2. Track all paper trades with entry/exit prices
3. Compare to actual market outcomes
4. Graduate to real trades only after 5+ successful paper trades
5. Start real trades at minimum size (0.005-0.01 SOL)
