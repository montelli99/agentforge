# AI REI Pipeline — Kayla & Jaxon Reference

## What This System Does

Telegram chatbot manages the entire lead pipeline. No GHL clicking. No spreadsheet tracking. No missed follow-ups.

---

## The Pipeline (9 Stages)

| Stage | What Happens | Auto-Action |
|-------|-------------|-------------|
| 🆕 New Lead | Lead received, not contacted | INT text generated, population alert |
| ✅ Qualified | Call done, data collected | LOI email drafted to Seth |
| 📤 LOI Requested | Waiting on Seth | Reminder at 48hr if no response |
| 👍 LOI Approved | Seth approved, ready to offer | GCJ text generated, Jaxon looped in |
| 📨 Offer Sent | Jaxon presented offer | 48-hour follow-up timer starts |
| 🔄 Negotiating | Gathering feedback | Stall alert if >3 days no progress |
| 📝 Under Contract | PSA signed, TC engaged | 7-day check-in, "any other properties?" |
| 🏁 Closed | Escrow closed, funds wired | Archive, double-dip prompt |
| ⚰️ Dead | Declined, expired | SD text, DOM-181 calendar alert |

---

## Text Shortcuts (Auto-Generated)

| Shortcut | When | Auto? |
|----------|------|-------|
| INT | Before every call | ✅ Generated on lead create |
| CCC | After every call | ✅ On qualify |
| GCJ | Offer ready | ✅ On LOI approved |
| SD | Declined | ✅ On mark dead |
| LOI | 48hr check-in | ✅ Cron auto-alert |

---

## Mentee's Job (Handled by System)

1. Lead arrives → system posts INT text + property details
2. Mentee copies text → sends → makes call
3. After call: taps "Qualified" → system drafts LOI to Seth
4. System alerts when follow-ups are due
5. System posts EOD report to Kayla + Jaxon

---

## What Mentees NEVER Do

- Send agreements or contracts
- Underwrite deals (Seth's job)
- Negotiate terms (Jaxon's job)
- Close deals (Kayla's job)
- Say "just checking in" — system uses "realign/finding time"

---

## Kayla's View

- Each mentee has isolated pipeline
- Admin panel: add/remove/suspend mentees
- See: leads per mentee, stage distribution, stalled deals
- GHL integration: webhook syncs stage changes bidirectionally

---

## Tech Stack

- Telegram bot (already live in Ai Rei group)
- Pipeline engine (Express + Node.js)
- Neon Postgres (isolated per user)
- Deploy: VPS → Render (always-on)
- Cost: $7/mo hosting + $20/mo LLM per 10 mentees
