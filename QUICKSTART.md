# AgentForge Quickstart

Get AgentForge running in under 10 minutes.

## Prerequisites

- Node.js 18+ (20+ recommended)
- npm or pnpm

## 1. Clone and Install

```bash
git clone https://github.com/your-org/agentforge.git
cd agentforge
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

**Option A: OpenAI API key**
```
OPENAI_API_KEY=sk-your-key-here
```

**Option B: Ollama (local, no API key needed)**
```
AGENTFORGE_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
AGENTFORGE_MODEL=llama3.1:8b
```

**Option C: Mock mode (no key, no Ollama)**
Server works without an API key in mock mode — optimization runs, responses are simulated.

## 3. Start the Server

```bash
npm run start
```

You should see:

```
[AgentForge] Server running on http://localhost:3000
[AgentForge] Optimization: enabled
[AgentForge] Provider: openai/gpt-4o-mini
[AgentForge] API Key: configured
[AgentForge] Dashboard: http://localhost:3000/dashboard
```

## 4. Verify It Works

```bash
curl -s http://localhost:3000/health
```

Expected: `{"status":"ok",...}`

## 5. Send a Request

```bash
curl -s http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role":"user","content":"Say hello from AgentForge"}
    ]
  }'
```

You get an OpenAI-compatible response with `agentforge` metadata showing tokens prevented.

## 6. Run the Demo

```bash
npm run demo
```

This sends 3 requests and shows you the savings:

1. **Baseline** — first request, full context
2. **Same request** — should hit cache/memory
3. **One file changed** — partial context elimination

## 7. View the Dashboard

Open in browser: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

The dashboard auto-refreshes via Server-Sent Events (SSE). No page reload needed.

**All monitoring endpoints:**

| Endpoint | Description |
|----------|-------------|
| `GET /dashboard` | Live HTML dashboard with auto-refresh |
| `GET /dashboard.json` | JSON metrics (latest 50 requests, last-hour stats) |
| `GET /events` | SSE stream — real-time request events |
| `GET /metrics.csv` | CSV export of all request logs |
| `GET /summary/daily` | Daily summary: requests, savings, top models, top types |
| `GET /health` | Health check with provider/memory/optimization status |
| `GET /version` | Version, git commit, build date |

**Quick curl examples:**

```bash
# Live metrics
curl -s http://localhost:3000/dashboard.json | jq

# Daily summary
curl -s http://localhost:3000/summary/daily | jq

# Export CSV
curl -s http://localhost:3000/metrics.csv -o metrics.csv

# SSE stream (Ctrl+C to stop)
curl -N http://localhost:3000/events
```

## 8. Run the Benchmark

```bash
npm run benchmark
```

Shows savings across 6 scenarios (repo unchanged, one file changed, one line changed, new file, conversation, RAG).

## 9. Run Tests

```bash
npm test
```

All tests should pass.

## Common Errors

### `EADDRINUSE: address already in use :::3000`

Another process is using port 3000. Either kill it or change ports:

```bash
export AGENTFORGE_PORT=3001
npm run start
```

### `Provider API key not configured`

You sent a request but didn't set `OPENAI_API_KEY` or `AGENTFORGE_PROVIDER=ollama`. Either:

1. Set the key: `export OPENAI_API_KEY=sk-...`
2. Use Ollama: `export AGENTFORGE_PROVIDER=ollama`
3. Or accept mock responses (optimization still works, responses are simulated)

### `ECONNREFUSED` (Ollama)

Ollama isn't running. Start it first: `ollama serve`

### `ECONNREFUSED` (general)

Server isn't running. Start it first: `npm run start`

### `Cannot find module`

Run `npm install` first.

## Docker

```bash
docker build -t agentforge .
docker run --env-file .env -p 3000:3000 agentforge
```

## Ollama Setup (Local LLM, No API Key)

1. Install Ollama: https://ollama.com
2. Pull a model: `ollama pull llama3.1:8b`
3. Start Ollama: `ollama serve`
4. Configure AgentForge:
   ```
   AGENTFORGE_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   AGENTFORGE_MODEL=llama3.1:8b
   ```
5. Start AgentForge: `npm run start`
6. Test: `curl http://localhost:3000/health`

## Next Steps

- Read [FIRST_TESTER_GUIDE.md](FIRST_TESTER_GUIDE.md) for what to test
- Fill out [TESTER_FEEDBACK.md](TESTER_FEEDBACK.md) with your results
