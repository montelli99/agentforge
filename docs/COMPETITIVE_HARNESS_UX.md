# AgentForge — Competitive Harness UX Matrix & Design Brief

> Research date: 2026-09-20
> Purpose: Inform AgentForge UI design decisions by studying current professional agent harnesses, orchestration platforms, and developer tools.
> Status: DESIGN RESEARCH — NO IMPLEMENTATION. Product facts and feature comparisons are a dated research snapshot, not independently reverified current-market claims; verify them before using them for product or purchasing decisions.

## September 23, 2026 Market Review — Current Interface Patterns

This section supersedes the earlier unverified product snapshots below for current UI decisions. It is based on current first-party product material and the actual AgentForge staging screens available during this review. Feature coverage and community reports are expanded in [`AGENT_QUALITY_FLYWHEEL.md`](AGENT_QUALITY_FLYWHEEL.md). The earlier sections remain historical research notes, not verified claims about products today.

| Product | Current interface pattern | What it teaches AgentForge |
|---|---|---|
| [Grok Bot](https://x.ai/news/designing-grok-bot) | Persistent named Bots are the primary object. Chats stay attached to the same Bot; a mixed transcript can contain conversation, actions, routines, and structured cards. Presence answers who is working and whether the user needs to look. | Make the durable teammate and its ongoing work visible. Keep state concise; reveal the computer, detailed activity, and controls only when asked. |
| [Codex app](https://openai.com/index/introducing-the-codex-app/) and [recent Codex workflow guidance](https://developers.openai.com/blog/automating-repetitive-work-at-openai-with-codex) | Long-running threads are grouped by projects; parallel work is isolated; changes are reviewed in context. Scheduled work returns to a review queue. Durable goals and evidence help work continue across sessions. | Organize around projects, durable work threads, and an obvious review queue. Keep the plan, output, and proof attached to the work item. |
| [OpenHands Agent Canvas](https://www.openhands.dev/product/canvas) | Local visual workspace for parallel agents and automations. It can connect to existing agent harnesses, isolate work, and switch local/remote execution backends from the interface. | Make the execution provider portable and show the selected environment where it matters, without turning every page into system settings. |
| [DeepSeek Harness](https://www.deepseek.com/harness/en/) | Developer-preview workspace with composable plugins and Standard, Code, Minimal, and Creator modes. Its trajectory view exposes a detailed event stream that can be inspected, searched, replayed, or forked. | Keep a deep technical run inspector available for debugging and proof, but do not make its dense trace the default experience for a business user. |
| [Open Harness](https://open-harness.app/) | Early-access team builder organized around a lead agent and specialist roles, explicit boundaries, visual playbooks, human checkpoints, automations, and evidence from prior runs. The site labels examples as seeded. | A clear team hierarchy, visible permission boundaries, repeatable playbooks, and checkpoint decisions can make agent coordination understandable to non-developers. Treat the public examples as product demonstrations, not independent proof of shipped performance. |
| [Hermes Desktop](https://hermes-agent.nousresearch.com/docs/user-guide/desktop) | Native chat-first desktop app sharing the same sessions, skills, memory, configuration, and providers as its CLI and gateway. It offers live tool summaries, previews, file browsing, voice, and multi-agent chats. | AgentForge must make the canonical workspace the source of truth across every surface, then exceed chat convenience with guided team assembly, nested departments, process-to-agent execution boundaries, evidence, drift correction, and cost-aware routing. |

### Name clarification

“Open Harness” is used by more than one current project. The team-builder interface above is [open-harness.app](https://open-harness.app/). [openharness.ai](https://openharness.ai/) is a universal API for adapting agents to multiple runtimes rather than a comparable end-user desktop workspace. A separate [OpenHarness desktop project](https://github.com/knightfolk/open-harness) focuses on provider routing and run evidence. Do not treat these as one product or attribute one project's features to another.

### AgentForge screens observed

The available browser screens were several AgentForge builds, not live windows for the named competitor applications. Older AgentForge variants contain seeded or example activity, while the current staging home is accurate about the disconnected runtime but presents empty KPI cards and a dense icon-only control rail. This makes the product look like an unfinished admin dashboard and hides its intended team/workflow value. Sample activity must never be presented as live production work.

### Recommended direction: Persistent Team Room + Reviewable Work

AgentForge should combine the persistent-team model from Grok Bot and Open Harness with Codex’s project threads and review queue. The first screen should answer three questions at a glance: **Who is on my team? What work is active? What needs my decision?** A selected agent opens its durable conversation; task plans, evidence, drafts, and approvals appear inline in that work thread. A collapsible inspector holds the full run trace, model/provider route, tool calls, and recovery details for technical review.

The product should present four plain-language areas first: **Team**, **Work**, **Playbooks**, and **Connections**. Advanced configuration—models, harness providers, tools, memory, compute, benchmarks, and migration—belongs under a clearly labeled management area. Show only live, sourced state. If no worker is connected, say so beside the action that connects one; never fill the home screen with invented counts, fake agents, or demo activity.

AgentForge’s adoption wedge is the combination: persistent AI teammates, repeatable business playbooks, portable runtimes, and evidence-backed human checkpoints in one local-first workspace. Copying another dark metrics dashboard or another chat clone would leave that value hidden.

### Hermes comparison: where AgentForge must win

Hermes’s desktop application establishes the minimum bar for a polished local
agent experience: a chat-first native window, shared state across its desktop,
CLI, and gateway surfaces, streaming tool activity, a preview rail, file
browser, voice, and fast first-run setup. AgentForge should not imitate the
visual treatment or claim parity until it is independently tested. Its product
edge must be that a user can describe an outcome and receive a working local
workforce structure, including department hierarchy, repeatable playbooks,
explicit authority, proof, and recovery—not a collection of separately
configured chats and profiles.

The implementation priorities are therefore:

1. One conversation and project record that survives every AgentForge surface
   and every connected channel.
2. An embedded guide that creates a sandboxed team and identifies only the
   configuration decisions that require the owner.
3. A visible work thread where plans, tool activity, outputs, approvals,
   evidence, corrections, and memory provenance stay together.
4. A nontechnical default workspace, with run traces and provider details
   available only when a user opens the technical inspector.
5. Quality controls that measure regressions, preserve corrections, and keep
   a model or tool from silently becoming less reliable over time.

### Release acceptance bar for the Hermes comparison

AgentForge is not ready to claim a competitive desktop experience until the
following can be demonstrated from a clean public install:

- A first-time user can describe an outcome and reach a prepared workspace
  without manually creating agents, projects, providers, or memory records.
- The same conversation, task state, and evidence remain visible after a
  restart and when the user opens the corresponding browser or channel view.
- A running task shows readable progress, the current agent, the next decision,
  and the output. Technical traces are available through an inspector without
  replacing the normal chat view.
- A user can create a department and nested subgroup, assign a playbook, and
  inspect each agent's authority and current work from one team view.
- A correction can be recorded once, linked to the affected run, and reused by
  later executions. The quality view must show the correction and its outcome.
- Disconnected providers are reported as disconnected with a direct setup path;
  seeded activity and private production records are never presented as live.
- The product remains usable with keyboard, narrow desktop, and reduced-motion
  settings, with no horizontal overflow or clipped primary actions.

### Current product references

- xAI, “Designing Grok Bot for a world of persistent agents,” September 3, 2026: https://x.ai/news/designing-grok-bot
- OpenAI, “Introducing the Codex app,” with Windows availability update: https://openai.com/index/introducing-the-codex-app/
- OpenAI, “Automating repetitive work at OpenAI with Codex,” August 25, 2026: https://developers.openai.com/blog/automating-repetitive-work-at-openai-with-codex
- OpenHands Agent Canvas: https://www.openhands.dev/product/canvas
- DeepSeek Harness developer preview: https://www.deepseek.com/harness/en/
- Open Harness early-access product: https://open-harness.app/
- Open Harness universal API: https://openharness.ai/

---

## Products Studied

| Product | Category | URL |
|---|---|---|
| CrewAI | Enterprise agent build + runtime platform | crewai.com |
| AutoGen (Microsoft) | Multi-agent framework + Studio UI | microsoft.github.io/autogen |
| LangGraph / LangSmith | Agent orchestration + observability platform | langchain.com |
| Dify | Visual workflow + agent platform (open source) | dify.ai |
| n8n | Workflow automation with AI agent support | n8n.io |
| Flowise | Visual agent/chatflow builder (open source) | flowiseai.com |
| AgentOps | Agent observability + debugging | agentops.ai |
| Composio | Tool integration layer for agents (1,500+ apps) | composio.dev |
| Chroma | Vector/search infrastructure for agents | trychroma.com |

---

## 1. CrewAI — Enterprise Agent Build & Runtime

### What they do well
- **Enterprise positioning**: "Build agents while giving platform teams the control to govern them"
- **Crews + Flows**: Multi-agent orchestration (crews) combined with deterministic workflow steps (flows)
- **Guardrails, memory, knowledge baked in**: Not bolted-on; integrated from the start
- **Enterprise console**: Team management, RBAC, deployment, monitoring
- **Triggers**: Gmail, Slack, Salesforce, Outlook — agents fire automatically
- **MCP support**: McpWorkbench for Model-Context Protocol servers
- **Community + docs**: Strong cookbook/examples ecosystem
- **65% Fortune 500 claim**: Enterprise traction

### What users struggle with
- Python-only; no TypeScript/JS runtime
- Enterprise features gated behind paid plans
- Debugging multi-agent flows is complex
- Memory/knowledge setup has learning curve
- No native Telegram/Discord integration

### How agents are represented
- Agents defined in Python with role, goal, backstory, tools, memory, knowledge
- Agents compose into Crews (teams)
- Flows orchestrate crews with deterministic steps
- No visual agent builder (code-first)

### How sessions are represented
- Session = crew execution
- LangSmith-style tracing available
- No persistent workspace concept

### How tools are managed
- @tool decorator pattern
- CrewAI Tools library
- MCP integration
- Custom tools via Python functions

### How memory is managed
- Short-term (conversation), long-term (cross-session), entity memory
- Knowledge bases (RAG) integrated
- Memory persists across crew executions

### How permissions work
- Enterprise RBAC on CrewAI Platform
- No per-agent execution contracts visible

### How execution is inspected
- Tracing via LangSmith or CrewAI's own observability
- Step-by-step execution logs
- No visual timeline/inspector UI

### How channels are handled
- No native messaging channel support
- Integrations via triggers (Slack, email)
- No Telegram/Discord native

### How remote control works
- Enterprise console for deployment/monitoring
- No mobile/Telegram control plane

### How models are selected
- Configured per-agent in Python
- Supports OpenAI, Anthropic, local models
- No visual model policy UI

### How extensions are installed
- pip/uv packages
- Community extensions
- MCP servers

### How onboarding works
- `crewai create` CLI scaffolding
- Quickstart docs + cookbooks
- Enterprise demo booking

### What AgentForge can improve
- **Visual agent builder** — CrewAI is code-only; AgentForge can offer both
- **Native messaging channels** — Telegram/Discord as first-class transports
- **Execution contracts** — Per-agent authority boundaries (CrewAI has none)
- **Cross-platform** — AgentForge is TypeScript/Node, runs on Windows natively
- **Process → Agent** — SOP ingestion is unique to AgentForge

---

## 2. AutoGen (Microsoft) — Multi-Agent Framework

### What they do well
- **AutoGen Studio**: No-code web UI for prototyping agents
- **AgentChat**: High-level conversational agent API
- **Core**: Event-driven, scalable multi-agent runtime
- **Extensions**: MCP, Docker code execution, distributed gRPC runtime
- **Multi-language**: Python + .NET
- **Microsoft backing**: Enterprise credibility

### What users struggle with
- Fragmented docs (v0.2 vs v0.4 vs AgentChat vs Core)
- Studio is prototype-grade, not production UI
- No persistent workspace or channel model
- Complex setup for distributed agents
- No native tool marketplace

### How agents are represented
- AssistantAgent, UserProxyAgent, GroupChat patterns
- Agents defined in code (Python/.NET)
- Studio provides visual agent creation (basic)

### How sessions are represented
- Chat sessions between agents
- No workspace/project abstraction

### How tools are managed
- Function decorators
- MCP extensions
- Docker code executor

### How memory is managed
- Chat history (in-memory)
- No persistent memory system built-in

### How permissions work
- No per-agent permission system
- Docker sandboxing for code execution

### How execution is inspected
- Chat logs
- Studio has basic execution viewer
- No timeline/trace UI

### How channels are handled
- No messaging channel abstraction
- Agents communicate via message passing

### How remote control works
- Studio web UI (local)
- No mobile/Telegram control

### How models are selected
- Configured per-agent in code
- OpenAI, Azure, local models

### How extensions are installed
- pip packages
- Community extensions registry

### How onboarding works
- `pip install autogenstudio`
- `autogenstudio ui --port 8080`
- Visual prototyping in browser

### What AgentForge can improve
- **Production-grade UI** — AutoGen Studio is prototype-only
- **Workspace/channel model** — AutoGen has no persistent workspace
- **Execution contracts** — No authority boundaries
- **Process → Agent** — No SOP ingestion
- **Multi-channel** — No Telegram/Discord

---

## 3. LangGraph / LangSmith — Agent Orchestration + Observability

### What they do well
- **LangGraph**: Low-level agent runtime with durable execution, streaming, human-in-the-loop
- **LangSmith**: Observability platform — traces, evaluations, prompts, deployment
- **LangSmith Engine**: Detects issues in traces and proposes fixes
- **LangSmith Fleet**: No-code agent builder for templates
- **Deep Agents**: Planning, subagents, filesystem tools, context management
- **Enterprise adoption**: Klarna, Uber, J.P. Morgan, Nvidia, Coinbase
- **Mix deterministic + agentic**: Hand-coded steps with LLM-driven steps in same graph

### What users struggle with
- LangGraph is very low-level; steep learning curve
- LangSmith is a separate paid platform
- No native messaging channel support
- Python-centric ecosystem
- Complex for simple use cases

### How agents are represented
- StateGraph with nodes (functions) and edges (transitions)
- Agents are graphs, not first-class entities
- No agent identity/role/metadata model

### How sessions are represented
- Thread-based persistence (checkpointers)
- State snapshots at each graph step

### How tools are managed
- LangChain tool abstractions
- MCP support
- Custom tool functions

### How memory is managed
- Short-term (thread state) + long-term (store)
- Cross-session memory via LangGraph Store
- Memory is graph-level, not agent-level

### How permissions work
- Human-in-the-loop interrupts
- No per-agent permission model

### How execution is inspected
- **LangSmith is the standout**: Full traces, state transitions, latency, cost, evaluations
- Visual graph execution viewer
- Time-travel debugging (rewind/replay)
- Best-in-class observability

### How channels are handled
- No native messaging channels
- API-first; integrate via code

### How remote control works
- LangSmith web platform
- No mobile/Telegram

### How models are selected
- LangChain model abstractions
- Configured per-node in graph
- LLM Gateway for centralized control

### How extensions are installed
- pip packages
- LangChain integrations

### How onboarding works
- `pip install langgraph`
- LangChain Academy courses
- Quickstart templates

### What AgentForge can improve
- **Agent identity** — LangGraph has no agent concept; AgentForge has full agent profiles
- **Workspace/channel model** — LangGraph is graph-only
- **Execution contracts** — No authority boundaries
- **Process → Agent** — No SOP ingestion
- **Native channels** — No Telegram/Discord
- **Cross-platform** — AgentForge is TypeScript, runs everywhere

### What AgentForge should learn from LangSmith
- **Trace visualization** — Timeline of every decision, tool call, state change
- **Time-travel debugging** — Rewind and replay agent runs
- **Evaluation framework** — Score and improve agent performance
- AgentForge's Run Inspector should match LangSmith quality

---

## 4. Dify — Visual Workflow + Agent Platform

### What they do well
- **Visual Workflow Studio**: Drag-and-drop agent/workflow builder
- **Knowledge Pipeline**: RAG with file/website/drive ingestion
- **Marketplace**: Plugin marketplace for models, tools, integrations
- **Multi-deploy**: Cloud, VPC, self-hosted (Docker)
- **Enterprise**: SSO, RBAC, audit logs, SOC 2, ISO 27001
- **156K GitHub stars**: Massive open-source community
- **No-code + code**: Visual builder with code nodes

### What users struggle with
- Workflow-centric, not agent-centric
- No persistent workspace/channel model
- No native Telegram/Discord
- Agent model is simple (single-agent, not multi-agent teams)
- No execution contracts/authority boundaries

### How agents are represented
- Agent = configured chatbot with tools + knowledge
- Can be embedded in workflows as nodes
- No multi-agent team composition

### How sessions are represented
- Conversation sessions
- No workspace/project abstraction

### How tools are managed
- Visual tool nodes in workflow
- Marketplace plugins
- MCP integration
- Custom API tools

### How memory is managed
- Conversation history
- Knowledge bases (RAG)
- No operational/episodic memory

### How permissions work
- Workspace-level RBAC (Enterprise)
- No per-agent execution contracts

### How execution is inspected
- Workflow execution logs
- Node-by-node execution view
- No timeline/trace visualization

### How channels are handled
- Web app, API, embed, MCP
- No native Telegram/Discord

### How remote control works
- Cloud dashboard
- No mobile/Telegram

### How models are selected
- Visual model selector per node
- 100+ LLMs supported
- Model provider marketplace

### How extensions are installed
- Marketplace (visual)
- Plugin system

### How onboarding works
- Cloud signup or Docker deploy
- Visual workflow builder
- Templates gallery

### What AgentForge can improve
- **Agent-as-entity** — Dify treats agents as chatbots; AgentForge treats them as team members
- **Multi-agent teams** — Dify is single-agent; AgentForge supports agent hierarchies
- **Execution contracts** — Dify has no authority boundaries
- **Process → Agent** — No SOP ingestion
- **Channel model** — No Telegram/Discord as workspace transports
- **Agent Command Center** — Dify has no agent runtime dashboard

### What AgentForge should learn from Dify
- **Visual workflow builder** — AgentForge should consider visual process editing
- **Marketplace UX** — Plugin discovery/install experience
- **Multi-deploy options** — Cloud, self-hosted, VPC

---

## 5. n8n — Workflow Automation with AI Agents

### What they do well
- **Visual workflow canvas**: Best-in-class drag-and-drop automation
- **500+ integrations**: Native app connectors
- **AI agents in workflows**: Agent nodes with tool calling, memory, RAG
- **Human-in-the-loop**: Approval steps in workflows
- **Self-hosted + cloud**: Docker, npm, or n8n.cloud
- **Code + visual**: JavaScript/Python code nodes alongside visual builder
- **Enterprise**: SSO, RBAC, audit logs, Git-based version control
- **205K GitHub stars**: Massive community

### What users struggle with
- Not agent-first; agents are workflow nodes
- No persistent agent identity/memory across workflows
- No messaging channel model
- Complex for simple agent use cases
- No execution contracts

### How agents are represented
- AI Agent node in workflow
- Configured with tools, memory, model
- No persistent agent identity

### How sessions are represented
- Workflow executions
- No workspace/channel model

### How tools are managed
- 500+ built-in nodes
- HTTP Request node for custom APIs
- MCP support

### How memory is managed
- Window buffer memory per agent node
- No cross-workflow agent memory

### How permissions work
- Workflow-level RBAC
- No per-agent execution contracts

### How execution is inspected
- **Excellent execution view**: Node-by-node, inputs/outputs visible
- Logs, error traces, retry capability
- Real-time execution monitoring

### How channels are handled
- No native messaging channels
- Webhook-based triggers

### How remote control works
- Web dashboard
- No mobile/Telegram

### How models are selected
- Model selector per agent node
- Supports OpenAI, Anthropic, local models

### How extensions are installed
- Community nodes (npm)
- Built-in 500+ integrations

### How onboarding works
- Cloud signup or Docker/npm
- Template gallery
- Visual builder

### What AgentForge can improve
- **Agent-first** — n8n is workflow-first; AgentForge is agent-first
- **Persistent agents** — n8n agents are ephemeral; AgentForge agents persist
- **Channel model** — No Telegram/Discord
- **Execution contracts** — No authority boundaries
- **Process → Agent** — No SOP ingestion

### What AgentForge should learn from n8n
- **Execution visualization** — Node-by-node, inputs/outputs
- **Integration breadth** — 500+ connectors
- **Human-in-the-loop UX** — Approval steps in workflows

---

## 6. Flowise — Visual Agent Builder

### What they do well
- **Visual drag-and-drop**: Agentflow (multi-agent) + Chatflow (single-agent)
- **Human-in-the-loop**: Feedback loop for agent tasks
- **Execution traces**: Full observability with Prometheus/OpenTelemetry
- **API/SDK/Embed**: REST API, TypeScript/Python SDK, embedded chat widget
- **100+ LLMs**: Supports all major providers
- **Self-hosted + cloud**: Docker or Flowise Cloud

### What users struggle with
- Being sunset (Flowise announced sunset)
- No persistent workspace/channel model
- No execution contracts
- No native Telegram/Discord
- Simple agent model (no teams/hierarchies)

### What AgentForge can learn
- Visual agent building is compelling for non-developers
- Execution traces are essential
- Embedded chat widgets extend reach

---

## 7. AgentOps — Agent Observability

### What they do well
- **Trace visualization**: Visual tracking of LLM calls, tools, multi-agent interactions
- **Time-travel debugging**: Rewind and replay agent runs
- **Cost tracking**: Token counts, spend monitoring across 400+ LLMs
- **Session replay**: Full execution replay
- **Framework agnostic**: Works with CrewAI, AutoGen, LangChain, etc.

### What users struggle with
- Observability-only; not an agent runtime
- No agent building/management
- No workspace/channel model

### What AgentForge should learn
- **Time-travel debugging** is a killer feature for agent harnesses
- **Cost visibility** per-agent, per-task, per-model
- **Session replay** for understanding agent behavior
- AgentForge should build observability into the harness, not as a separate tool

---

## 8. Composio — Tool Integration Layer

### What they do well
- **1,500+ app integrations**: Gmail, Slack, GitHub, Notion, Salesforce, etc.
- **Managed auth**: OAuth, API keys, token refresh handled
- **Context-aware sessions**: Sandbox state, files, progress persist
- **One-click connections**: End-user auth flows
- **Works with any harness**: Claude, ChatGPT, Hermes, Grok Bot, OpenClaw, custom
- **SOC 2 compliant**: Enterprise security

### What users struggle with
- Tool layer only; not an agent runtime
- No agent building/management
- No workspace/channel model

### What AgentForge should learn
- **Tool marketplace** should be as easy as Composio's one-click
- **Managed auth** for tool connections
- **MCP support** for extensibility
- AgentForge marketplace should support Composio-style tool connectors

---

## 9. Chroma — Vector/Search Infrastructure

### What they do well
- **Search infrastructure**: Vector, full-text, regex, metadata search
- **Built on object storage**: 10x cheaper than memory-based solutions
- **Serverless**: Auto-scales, no ops
- **Research-driven**: Context engineering, chunking strategies, embedding adapters

### What AgentForge should learn
- AgentForge's memory system should be honest about embedding quality
- Context engineering research should inform memory bypass decisions

---

## Competitor Weaknesses / Opportunities

| Weakness | Who has it | AgentForge opportunity |
|---|---|---|
| No persistent agent identity | LangGraph, n8n, Flowise | Agents are first-class entities with role, tools, memory, contracts |
| No workspace/channel model | All competitors | Canonical workspace with Web/Telegram/Discord as transports |
| No execution contracts | All competitors | Per-agent authority boundaries below the model layer |
| No native Telegram/Discord | All competitors | First-class bidirectional channel mirroring |
| No SOP → Agent pipeline | All competitors | Process compiler with unresolved business rules |
| No migration center | All competitors | Safe onboarding from OpenClaw, Hermes, Grok, generic |
| No cross-platform native | CrewAI, LangGraph, Dify | TypeScript/Node runs on Windows, macOS, Linux |
| No model-agnostic harness | CrewAI, Dify | Provider-neutral; MiMo, Ollama, OpenAI, future providers |
| Code-only agent definition | CrewAI, LangGraph, AutoGen | Both visual and code-based agent creation |
| No visual execution timeline | Dify, AutoGen Studio | Run Inspector with timeline, tool calls, state changes |
| No per-agent cost tracking | Most competitors | Cost ledger per-agent, per-task, per-model |

---

## AgentForge Information Architecture

### Primary Navigation (Compact Rail)

```
HOME
WORKSPACE
  Messages
  Channels
  Files
  Activity
WORK
  Projects
  Tasks
  Approvals
  Schedules
AGENTS
  Agents
  Teams
  Sessions
  Runs
BUILD
  Processes
  Skills
  Tools
  Connectors
  Templates
MARKETPLACE
SYSTEM
  Models
  Harnesses
  Memory
  Voice
  Migration
  Benchmarks
  Optimization
  Settings
```

### Context Navigation

Context changes based on selected primary item:
- Selecting an Agent → shows Agent Command Center
- Selecting a Channel → shows Messages view
- Selecting a Task → shows Run Inspector
- Selecting a Process → shows Process Compiler

### Agent Hierarchy

```
Workspace
  Space (Telegram group, Discord server, native)
    Channel (topic, thread, native channel)
      Messages (human, agent, tool, system events)
  Agent
    Role, Model Policy, Harness, Tools, Skills, Memory
    ExecutionContract (authority boundaries)
    Tasks (assigned work)
    Evidence (completion proof)
  Task
    Agent, Process, Contract, Status, Timeline
    Approval (if required)
    Evidence Pack
```

### Workspace Hierarchy

```
Workspace (AgentForge)
  Space: Native
    Channel: General, Development, Tasks, Alerts, Calls
  Space: Telegram Group
    Channel: Topic 1, Topic 2, ...
  Space: Discord Server
    Channel: #general, #development, ...
```

---

## AgentForge Design Thesis

**AgentForge is a professional AI agent harness — not a chatbot UI, not an admin dashboard, not a generic AI workspace.**

The design must communicate:
1. **Control** — You govern what agents can do
2. **Visibility** — You see everything agents are doing
3. **Safety** — Authority boundaries are explicit and enforced
4. **Professionalism** — This is infrastructure, not a demo

### Design Principles

1. **Agent-centric, not chat-centric**: Agents are entities with identity, not just chat windows
2. **Harness, not framework**: AgentForge runs agents; it doesn't just define them
3. **Evidence, not claims**: Every completion produces inspectable proof
4. **Authority is visible**: ExecutionContracts are first-class UI elements
5. **Channels are transports**: Web/Telegram/Discord are views into the same workspace
6. **Observability is built-in**: Not a separate tool; part of the harness
7. **Migration is onboarding**: Switching harnesses should feel safe
8. **Professional density**: Information-dense, not empty-space-heavy

---

## Component / Design System Proposal

### Typography
- **Primary**: Inter (sans-serif) — professional, readable, modern
- **Monospace**: JetBrains Mono — code, IDs, technical values only
- **Headings**: Inter 600-700, not oversized
- **Body**: Inter 400, 13-14px

### Color
- **Background**: Layered dark surfaces (#09090b → #111113 → #18181b)
- **Text**: High contrast (#fafafa primary, #a1a1aa secondary, #52525b muted)
- **Brand accent**: Purple (#8b5cf6) — used sparingly for active states, CTAs
- **Semantic**: Green (success), Amber (warning), Red (error), Blue (informational)
- **No rainbow telemetry colors everywhere**

### Icons
- **No emoji in navigation** — use proper icon set (Lucide, Phosphor, or custom)
- **Consistent iconography**: 16px inline, 20px navigation, 24px headers
- **Status indicators**: Colored dots, not badges everywhere

### Density
- **Information-dense**: Cards sized to content, not 500px empty panels
- **Responsive grids**: 2-4 columns depending on content
- **Progressive disclosure**: Summary → detail on click
- **No giant empty black space**

### Panels
- **Three-column where appropriate**: Messages (channels/conversation/context)
- **Two-column for detail views**: List/detail
- **Single column for focused views**: Settings, forms
- **Collapsible context panels**: Right panel can collapse

### Motion
- **Minimal**: Transitions for state changes, not decoration
- **Fast**: <200ms for most transitions
- **Purposeful**: Only animate to show state change or relationship

---

## Three Visual Directions

### Direction A: Operations Command Center

**Concept**: AgentForge as a mission-control interface for AI workforce operations. Inspired by operations centers, flight decks, and monitoring dashboards. The primary metaphor is "you are running an AI workforce and you need to see everything."

**Characteristics**:
- Dense information layout with status panels
- Real-time updating metrics and state indicators
- Agent status board (like a team roster)
- Task timeline with execution traces
- Approval queue as a first-class panel
- Channel/activity feed as a live stream
- Minimal chrome; maximum signal
- Monospace used for technical values, not headings

**Strengths**:
- Communicates "professional infrastructure" immediately
- Information density matches the complexity of agent management
- Works well for operators managing multiple agents
- Distinctive — doesn't look like any other AI product

**Weaknesses**:
- Can feel overwhelming for new users
- Requires progressive disclosure to avoid information overload
- Mobile responsiveness is challenging with dense layouts

**Professional harness score**: 9/10
**Distinctiveness**: 8/10

---

### Direction B: Workspace / Team Platform

**Concept**: AgentForge as a team collaboration platform where agents are team members. Inspired by Linear, Notion, and Slack. The primary metaphor is "your AI team works here alongside you."

**Characteristics**:
- Clean sidebar navigation with workspace/channel tree
- Messages as the primary interaction surface
- Agent profiles like team member profiles
- Task boards like project management
- Approval cards like pull request reviews
- Activity feed like team activity
- Modern sans-serif typography throughout
- Subtle depth with layered surfaces

**Strengths**:
- Familiar to users of Slack/Discord/Linear
- Easy onboarding — "it's like Slack but for AI agents"
- Agent-as-teammate metaphor is intuitive
- Works well on mobile

**Weaknesses**:
- May look too much like existing products
- Could undersell the "harness" differentiator
- Risk of feeling like "another chat app"

**Professional harness score**: 7/10
**Distinctiveness**: 6/10

---

### Direction C: Developer Harness / IDE

**Concept**: AgentForge as a developer tool for building and operating agents. Inspired by VS Code, Cursor, and terminal-based development environments. The primary metaphor is "this is where you build, test, and run agents."

**Characteristics**:
- Split-pane layout (tree + editor + output)
- Agent configuration as code with visual preview
- Run Inspector as the primary execution view
- Process Compiler as a visual flow editor
- Terminal-style logs alongside visual timelines
- Command palette (Ctrl+K) as primary navigation
- Dense, keyboard-driven interface
- Dark theme with syntax-highlighting colors

**Strengths**:
- Appeals to developer audience directly
- Keyboard-driven workflow is efficient
- Command palette is powerful
- Feels like a real tool, not a demo

**Weaknesses**:
- Excludes non-developer users
- Terminal aesthetic can feel hostile
- Harder to communicate safety/authority visually
- Mobile experience is poor

**Professional harness score**: 8/10
**Distinctiveness**: 7/10

---

## Recommendation

**Chosen direction: Hybrid of A (Operations Command Center) + B (Workspace Platform)**

### Why it can compete
1. **Distinctive**: Doesn't look like generic AI SaaS, chatbot UI, or admin dashboard
2. **Professional**: Communicates "serious infrastructure" from first glance
3. **Agent-centric**: Agents are entities, not chat windows
4. **Harness-first**: ExecutionContracts, authority boundaries, evidence are visible
5. **Familiar enough**: Workspace/channel metaphor is intuitive
6. **Dense enough**: Information density matches the complexity

### Why it does NOT look like generic AI SaaS
- No emoji navigation icons
- No giant purple gradient buttons
- No dashboard card spam
- No "AI assistant" chatbot aesthetic
- No empty black space
- No robot graphics
- No neon/glow effects

### Signature AgentForge interactions
1. **Agent Command Center**: Opening an agent shows identity, authority, current execution, tools, evidence — like opening a worker's control panel
2. **Run Inspector**: Every task has a timeline showing memory retrieval, model calls, tool activity, approvals, evidence — more useful than terminal logs
3. **Approval Gate**: Shows intent, scope, allowed/blocked actions, risk, evidence — semantic approvals, not shell command hashes

### 1366x768 primary navigation scrollbar
**NONE** — compact rail fits without scrolling

### Emoji navigation icons
**0** — proper icon set used throughout

---

## READY FOR OWNER VISUAL REVIEW: YES

## FULL IMPLEMENTATION: NOT STARTED

---

## Appendix: Feature Matrix

| Feature | CrewAI | AutoGen | LangGraph | Dify | n8n | AgentForge |
|---|---|---|---|---|---|---|
| Agent identity/role | Yes | Basic | No | Basic | No | Yes |
| Multi-agent teams | Yes | Yes | Yes | No | No | Yes |
| Visual builder | No | Studio | No | Yes | Yes | Planned |
| Execution contracts | No | No | No | No | No | Yes |
| Process → Agent | No | No | No | No | No | Yes |
| Native Telegram | No | No | No | No | No | Yes |
| Native Discord | No | No | No | No | No | Yes |
| Workspace model | No | No | No | No | No | Yes |
| Channel model | No | No | No | No | No | Yes |
| Migration center | No | No | No | No | No | Yes |
| Model independence | Yes | Yes | Yes | Yes | Yes | Yes |
| Harness independence | No | No | No | No | No | Yes |
| Visual execution | Traces | Logs | LangSmith | Logs | Canvas | Inspector |
| Tool marketplace | No | Extensions | Integrations | Marketplace | 500+ | Marketplace |
| Memory system | Yes | Basic | Store | RAG | Basic | Yes |
| Observability | Traces | Logs | LangSmith | Logs | Logs | Built-in |
| Human-in-the-loop | Yes | Yes | Yes | Yes | Yes | Yes |
| Self-hosted | Yes | Yes | Yes | Yes | Yes | Yes |
| Cross-platform | Python | Python/.NET | Python | Docker | Node | TypeScript |
