# First Tester Guide

Thank you for testing AgentForge. This guide explains what to test, how to connect your app, and what feedback to send.

## What AgentForge Is

AgentForge is an **LLM VPN / token-elimination layer**. It sits between your app and your LLM provider (OpenAI, Anthropic, etc.) and:

1. Detects repeated or unchanged context across requests
2. Safely removes known tokens before they reach the model
3. Skips provider calls when memory confidence is high
4. Shows you exactly how many tokens and dollars you saved

**The value proposition**: Send the same large context twice, pay for it once.

## What to Test

### Test 1: Basic Connectivity

```bash
curl -s http://localhost:3000/health
curl -s http://localhost:3000/version
curl -s http://localhost:3000/dashboard.json
```

All three should return JSON with `200 OK`.

### Test 2: OpenAI Compatibility

Send a request exactly like you would to OpenAI:

```bash
curl -s http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role":"system","content":"You are a helpful assistant."},
      {"role":"user","content":"What is the capital of France?"}
    ]
  }'
```

The response shape should match OpenAI's API exactly, plus an `agentforge` field.

### Test 3: Token Savings (The Real Test)

This is where you prove the value. Send the same large context twice:

**Request 1** (baseline):
```bash
curl -s http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role":"system","content":"You are a helpful assistant."},
      {"role":"user","content":"Summarize this code:\n[PASTE 5000+ TOKENS OF CODE HERE]"}
    ]
  }'
```

**Request 2** (same payload):
Send the exact same request again.

Compare `agentforge.tokensPrevented` in both responses. Request 2 should show tokens prevented > 0.

### Test 4: Partial Context Changes

Send request 1 with a large context. Then send request 2 with one file changed. AgentForge should:
- Detect the change
- Only include the changed content in full
- Reference unchanged chunks by ID

### Test 5: Dashboard After Requests

After sending several requests, check:

```bash
curl -s http://localhost:3000/dashboard.json
```

You should see:
- `requests` matching your call count
- `tokensPrevented` > 0
- `providerCallsAvoided` >= 0

## How to Connect Your App

AgentForge is a drop-in replacement for OpenAI's API. Change your base URL:

**Before** (direct to OpenAI):
```python
client = OpenAI(api_key="sk-...", base_url="https://api.openai.com/v1")
```

**After** (through AgentForge):
```python
client = OpenAI(api_key="sk-...", base_url="http://localhost:3000/v1")
```

That's it. Your app sends requests to AgentForge, AgentForge optimizes and forwards them.

### Python Example

```python
from openai import OpenAI

client = OpenAI(
    api_key="your-key",
    base_url="http://localhost:3000/v1"  # point to AgentForge
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}]
)

print(response.choices[0].message.content)

# Check AgentForge metadata
if hasattr(response, 'agentforge'):
    print(f"Tokens prevented: {response.agentforge.tokens_prevented}")
```

### JavaScript/TypeScript Example

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "your-key",
  baseURL: "http://localhost:3000/v1",  // point to AgentForge
});

const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello" }],
});

console.log(response.choices[0].message.content);
```

## What Metrics to Screenshot

After running your tests, screenshot:

1. **Terminal output** from `npm run demo` showing all 3 scenarios
2. **Dashboard** at `http://localhost:3000/dashboard` showing totals
3. **curl output** showing `agentforge` metadata in a response

## How to Tell If Savings Are Real

1. Check `agentforge.tokensPrevented` in responses — this is tokens that never reached the provider
2. Check `agentforge.providerCallSkipped` — `true` means no provider call was made
3. Check `agentforge.estimatedCostSaved` — estimated dollars not spent
4. Run `npm run benchmark` — shows savings across controlled scenarios

**Important**: Savings are estimated based on token counts (chars/4). Real savings depend on your provider's actual tokenization.

## What Feedback to Send

Fill out [TESTER_FEEDBACK.md](TESTER_FEEDBACK.md) with:

1. **Setup experience** — how long did it take? Any blockers?
2. **What you tested** — which scenarios, what context sizes
3. **Results** — tokens before/after, cost saved
4. **Bugs** — anything broken or unexpected
5. **Confusing parts** — anything unclear
6. **Would you pay** — is $19/month for this worth it?

## Need Help?

- Check [QUICKSTART.md](QUICKSTART.md) for common errors
- Open a GitHub issue
- Reach out on Discord (link in README)
