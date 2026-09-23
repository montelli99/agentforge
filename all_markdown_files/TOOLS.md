# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

## Orion Meme Trader

### Credentials
- Email: autonomousconsultinggroup@gmail.com
- Password: Prolific2026!
- Platform: Axiom Trade (axiom.trade)

### Files
- Research: AI_Workspace/Orion/
- Strategy: Orion/strategy_acid_test.md
- Axiom guide: Orion/axiom_complete_features.md
- Skill: .openclaw/skills/orion-meme-trader/

### Key Rules
1. Max 2% per trade
2. Always run ACID test
3. Take profits at 2x, 5x
4. Stop loss at -20%
5. Quality over quantity

---

## Resources

- **Awesome OpenClaw Skills**: github.com/VoltAgent/awesome-openclaw-skills
- Skill availability must be validated at runtime with `openclaw skills list` before use.

## Axiom Browser Control

### Setup (One-time)
1. Browser tool uses profile: `user` 
2. Profile path: `C:\Users\mscott\.openclaw\browser\user\user-data`
3. CDP port: 9222
4. Montelli logs into Axiom once, session persists in this profile

### After Every Session Restart
1. `browser action=start target=host profile=user` — launches Chrome from the axiom profile
2. Wait for Montelli to navigate to Axiom in that Chrome if session expired
3. Use `browser action=tabs` to find the Axiom tab
4. Use `targetId` from the Axiom tab for all subsequent actions

### Important Rules
- NEVER close the browser tool window while Axiom is open — it restarts fresh and loses session
- If session expired, Axiom shows a "connect wallet" screen — Montelli needs to reconnect
- Screenshot before any trade to confirm state
- DOM snapshot gives full text access to all page elements

### Files
- Browser config: `AI_Workspace/browser_config.json`
- Screenshots: `AI_Workspace/browser_screenshots/`
- Axiom logged in as: montelliscottrei@gmail.com (Digital Doctor Solutions profile)

### Verified Working
- 2026-08-16: Full DOM access, screenshot, click, navigation all working
