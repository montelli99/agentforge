# Mission Control Resume Prompt

Use this message to force Orion into API-backed board tracking on every run:

```text
Read these in order now:
1) C:/Users/mscott/.openclaw/PERSISTENT_SETTINGS.md
2) C:/Users/mscott/AI_Workspace/openclaw-mission-control/docs/runtime/MULTIAPP_CHECKPOINT.md
3) C:/Users/mscott/.openclaw/OVERNIGHT_STATUS.md
4) C:/Users/mscott/AI_Workspace/MISSION_CONTROL_BIBLE.md
5) C:/Users/mscott/AI_Workspace/AUTONOMY_MODE.md

Operate in strict autonomy mode.

Mission Control requirements (mandatory):
- API-first tracking with Bearer token from PERSISTENT_SETTINGS.
- For every new instruction I send, create or update a board task first.
- Post progress comments at each major step.
- Mirror the same checkpoint facts to BOTH file checkpoints.

Do not ask me to do setup unless blocked by missing secret/approval/irreversible action.
Before asking, attempt 3 fixes and continue all non-blocked work.

Now: return
1) Active board id
2) Task id you created/updated
3) Next action you are executing
```
