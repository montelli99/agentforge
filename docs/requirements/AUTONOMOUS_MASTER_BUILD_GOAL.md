AGENTFORGE VNEXT — AUTONOMOUS MASTER BUILD GOAL
OPEN-SOURCE AI WORKFORCE PLATFORM

EXECUTE THIS PROJECT AUTONOMOUSLY THROUGH ALL PHASES.

DO NOT STOP AFTER EACH PHASE TO ASK FOR PERMISSION.

DO NOT ASK OPTIONAL QUESTIONS.

MAKE SAFE, REVERSIBLE ENGINEERING DECISIONS WHEN DETAILS ARE UNSPECIFIED.

USE TESTS, ISOLATION, CHECKPOINTS, FEATURE FLAGS, MOCK PROVIDERS, AND GIT COMMITS TO CONTROL RISK.

STOP ONLY FOR:

1. a production-safety boundary
2. a required secret/credential not already authorized
3. a paid purchase
4. a destructive irreversible operation
5. a licensing/legal blocker
6. an architectural contradiction that cannot safely be resolved
7. baseline regression that cannot be isolated without touching production
8. explicit user authorization required for a real external action

Otherwise:

CONTINUE UNTIL THE DEFINITION OF DONE IS SATISFIED.

============================================================
0. ABSOLUTE PRODUCTION ISOLATION
============================================================

ALL DEVELOPMENT OCCURS ONLY IN:

AgentForge-Staging

Current intended branch:

vnext

Known checkpoint from prior phase:

a5cae16

Current known test baseline:

84 PASS
0 FAIL

BASELINE NOTE (2026-09-22): Commit IDs and pass counts above are historical handoff values. Recheck the live checkout before relying on them. This master specification is the requirement source; its “completed” claims are not acceptance evidence.

Before continuing verify actual state.

THE FOLLOWING ARE PRODUCTION / EXTERNAL SYSTEMS AND ARE OFF LIMITS:

OpenClaw production repository

unrelated production repository

Hermes

Orion/VCS

production Telegram

production Discord

external communications provider

external CRM

production databases

production durable queues

production credentials

production deployments

Do NOT modify them.

Do NOT stop them.

Do NOT migrate them.

Do NOT copy their secrets.

Do NOT write to them.

Read-only inspection of public architecture/source is permitted only when necessary.

AgentForge vNext is developed in parallel.

Migration philosophy:

BUILD
→ TEST
→ BENCHMARK
→ SHADOW
→ COMPARE
→ MIGRATION PLAN
→ EXPLICIT OWNER AUTHORIZATION
→ CONTROLLED CUTOVER

THIS MASTER GOAL DOES NOT AUTHORIZE CUTOVER.

============================================================
1. PRODUCT MISSION
============================================================

Build AgentForge into a publishable open-source AI workforce platform.

AgentForge is:

an AI team workspace

an execution control plane

a provider-neutral agent platform

a human/agent collaboration environment

a safe engineering execution system

a marketplace platform

a process-to-agent platform

It is NOT:

another chatbot

another prompt wrapper

another generic ReAct loop

an OpenClaw fork

a Pi fork

a Pydantic fork

a proprietary-model dependency

============================================================
2. COMPETITIVE PRODUCT TARGET
============================================================

Product goal:

GROK BOT EASE OF USE

+

BUZZ HUMAN/AGENT COLLABORATION

+

OPENMAUSBOT LOCAL/OPEN FLEXIBILITY

+

AGENTFORGE EXECUTION SAFETY

+

UNIVERSAL CHANNEL MIRRORING

+

MODEL/HARNESS NEUTRALITY

+

EMPIRICAL ROUTING

+

MARKETPLACE ECOSYSTEM

Users should eventually be able to:

install AgentForge

choose local/cloud models

connect Telegram/Discord

create an AI teammate

give it processes/tools

control permissions

test it

operate from Web or mobile messaging

and get useful work done quickly.

============================================================
3. CORE ARCHITECTURAL LAW
============================================================

AGENTFORGE OWNS CANONICAL STATE.

Everything else is a provider.

Provider categories:

HarnessProvider

GenerativeModelProvider

DecisionProvider

MemoryProvider

ChannelProvider

ProcessKnowledgeProvider

VoiceProvider

ComputeProvider

SandboxProvider

ToolProvider

SecretProvider

StorageProvider

PackageProvider

BenchmarkTarget

External providers must not dictate AgentForge's domain model.

============================================================
4. HARNESS STRATEGY
============================================================

TOP INITIAL HARNESS TARGETS:

1. PI
2. PYDANTIC AI HARNESS

Pi:

default lightweight execution candidate.

Pydantic:

second supported runtime/capability architecture.

Future adapters:

DeepSeek Harness

OpenHarness

Goose/ACP

other harnesses

Do NOT tightly couple AgentForge to one harness.

Do NOT fork/vendor entire harness projects unless later evidence requires it.

AgentForge may eventually have a Native Harness, but do not reinvent commodity functionality without reason.

============================================================
5. MODEL STRATEGY
============================================================

Separate:

GenerativeModelProvider

from:

DecisionProvider.

Generative providers may include:

Ollama

OpenAI

Anthropic

OpenRouter

Vercel

custom OpenAI-compatible providers

Decision providers may include:

Jev

future System-1 models

Do not treat Jev as a conversational LLM.

Routing architecture:

TIER 0
deterministic logic

TIER 1
decision/System-1

TIER 2
fast local generative model

TIER 3
strong local generative model

TIER 4
frontier cloud model

Long-term goal:

use the cheapest demonstrated-capable model for each task.

Do not hardcode current benchmark winners.

============================================================
6. CANONICAL WORKSPACE
============================================================

Implement canonical hierarchy:

Workspace

Space

Channel

Thread

Message

Associated canonical objects:

User

ExternalIdentity

Agent

Task

Project

Repository

Worktree

Approval

Process

Call

File/Artifact

Evidence

Activity

ProviderBinding

ExternalBinding

Event

Package

Benchmark

AgentForge owns IDs.

External provider IDs map onto canonical objects.

============================================================
7. UNIVERSAL WORKSPACE MIRROR
============================================================

HARD REQUIREMENT.

Web, Telegram, Discord and future channels are interfaces into the SAME AgentForge workspace.

TELEGRAM EXAMPLE:

Telegram forum/supergroup:

AgentForge Development

General

UI

Backend

Bugs

Releases

Web must represent the same hierarchy.

TELEGRAM → WEB:

group/topic creation

topic rename

topic open/close

messages

replies

files/media

supported reactions/metadata

WEB → TELEGRAM:

mirrored channel creation

rename

message

reply

supported lifecycle operations

Use durable external IDs.

Never synchronize by name alone.

============================================================
8. DISCORD
============================================================

Normalize:

Guild

Channel

Thread

Message

into the same canonical graph.

Do not make AgentForge internally Telegram-shaped.

============================================================
9. NATIVE CHANNELS
============================================================

AgentForge must work without external messaging systems.

Native workspaces/channels are first-class.

External providers are optional mirrors.

============================================================
10. REMOTE CONTROL
============================================================

Telegram and Discord are not notification sinks.

They are remote AgentForge control surfaces.

Future supported operations:

status

tasks

agents

approvals

models

compute

pause

resume

cancel

approve

reject

view diff

view evidence

ask agent

retry

All actions go through canonical:

identity

authorization

policy

execution contract

audit

A Telegram user ID alone does not imply authority.

============================================================
11. IDENTITY + RBAC
============================================================

Implement/design:

AgentForgeUser

ExternalIdentity

Role

Permission

Policy

Identity links:

Web

Telegram

Discord

API

Same human across interfaces maps to same canonical user.

Authorization is server-side.

============================================================
12. DURABLE EVENT LEDGER
============================================================

Mandatory.

Inbound:

provider event

→ dedupe

→ normalize

→ persist

→ state transition

→ realtime publication

Outbound:

canonical action

→ persist

→ provider submission

→ provider result

→ binding

→ final state

Support:

idempotency

replay

retry

pending

accepted

applied/delivered

failed

dead-letter/manual review

Do not equate submission with successful completion.

============================================================
13. REAL-TIME WEB
============================================================

Use WebSocket or SSE.

Do not build polling-only architecture.

Realtime events include:

messages

channels

agent state

tasks

approvals

calls

tests

provider health

compute health

marketplace/package changes

============================================================
14. WEB UI
============================================================

AgentForge owns its Web UI.

Target quality:

Discord

Slack

Telegram Desktop

Linear

GitHub

modern SaaS

Do not copy proprietary assets.

Primary navigation:

Home

Inbox

Messages

Projects

Tasks

Agents

Processes

Approvals

Models

Harnesses

Memory

Voice

Tools

Compute

Marketplace

Activity

Settings

============================================================
15. MESSAGE UI
============================================================

Three-column desktop:

LEFT:

provider/workspace/channel tree

CENTER:

conversation

RIGHT:

context

Context:

agent

model

harness

permissions

processes

tasks

files

approvals

activity

Responsive mobile layout required.

============================================================
16. UNIFIED INBOX
============================================================

Aggregate actionable events:

message requiring attention

approval needed

agent question

task failed

task completed

system warning

voice event

provider error

Use deterministic classification initially.

System-1 can assist later.

============================================================
17. AGENTS
============================================================

Canonical Agent:

name

avatar

role

description

status

model policy

harness policy

decision policy

memory namespace

compute policy

tools

permissions

channel bindings

process bindings

default execution contract

Normal UI shows human-friendly identity.

Advanced implementation details remain inspectable.

============================================================
18. CREATE AGENT EXPERIENCE
============================================================

Build polished wizard:

1. Identity

2. Process/SOP

3. Channels

4. Tools

5. Voice

6. Permissions

7. Model Policy

8. Harness

9. Memory

10. Compute

11. Test

12. Review/Create

Automatic/recommended options should exist.

Advanced users can override.

============================================================
19. PROCESS KNOWLEDGE
============================================================

Create first-class:

ProcessKnowledgeProvider

Initial reference:

Scribe

Future:

Tango

Notion

Confluence

Google Docs

Markdown

HTML

DOCX

PDF

Video

manual

AgentForge Capture

============================================================
20. SCRIBE
============================================================

Support architecture for:

Scribe MCP

Markdown import

HTML import

DOCX/PDF import

Scribe source metadata

No production credential required for development.

Scribe is optional.

============================================================
21. PROCESS DOMAIN
============================================================

Implement:

ProcessDefinition

ProcessVersion

ProcessSource

ProcessStep

ProcessDecision

ProcessException

ProcessToolRequirement

ProcessPermissionRequirement

ProcessInput

ProcessOutput

ProcessEvidence

ProcessDiff

ProcessAgentBinding

============================================================
22. SOP IS NOT AUTHORITY
============================================================

Fundamental safety rule.

SOP:

"Deploy to production."

does NOT mean:

agent may deploy.

Compiler identifies missing authorization/business rule.

Process knowledge informs behavior.

ExecutionContract determines authority.

============================================================
23. PROCESS-TO-AGENT
============================================================

Build safe staged pipeline:

SOP/process

→ ingestion

→ normalized process

→ decisions

→ tools

→ permissions

→ unresolved business rules

→ clarification

→ AgentSpecification

→ Skills

→ ExecutionContract

→ tests

→ agent draft

No autonomous production deployment.

============================================================
24. PROCESS CHANGE MANAGEMENT
============================================================

Process source update

→ ProcessVersion

→ ProcessDiff

→ affected agents

→ proposed update

→ tests

→ approval

→ future deployment

Never silently mutate production agent behavior.

============================================================
25. VOICE
============================================================

Voice is first-class and provider-neutral.

Create:

VoiceProvider

Candidates for later real benchmarking:

Retell

Agni — exact product must be authoritatively identified before real integration

future providers

custom telephony/SIP

Do not declare a default before benchmarking.

============================================================
26. VOICE CONTRACT
============================================================

Normalize capabilities around:

create/update voice agent

inbound calls

outbound calls

transfer

end call

tool registration

event stream

transcript

recording

usage

cost

health

Provider-specific differences stay inside adapter.

============================================================
27. CALL DOMAIN
============================================================

Canonical:

VoiceAgentBinding

Call

CallParticipant

CallEvent

CallTranscript

CallTranscriptSegment

CallRecording

CallToolInvocation

CallTransfer

CallOutcome

VoiceUsage

VoiceProviderBinding

Normalize provider states.

============================================================
28. CALLS AS WORKSPACE EVENTS
============================================================

Calls appear in channels/workspace.

Call completion may generate:

transcript

summary

commitments

tasks

approval request

memory candidate

activity event

No uncontrolled production action.

============================================================
29. VOICE BENCHMARKING
============================================================

Design benchmark suite before recommending providers.

Measure:

conversation quality

latency

barge-in

silence

noise

names

numbers

addresses

accents

multilingual

tool reliability

structured extraction

transfer

failure recovery

telephony capabilities

webhook/API reliability

transcripts

recordings

concurrency

rate limits

cost

No marketing-based winner.

============================================================
30. EXECUTION CONTRACT
============================================================

CORE DIFFERENTIATOR.

ExecutionContract controls:

repository

base SHA

worktree

allowed paths

protected paths

tools

network

messaging

production writes

deployments

force push

required tests

required evidence

approval gates

completion requirements

Model/harness cannot override contract.

============================================================
31. GIT / WORKTREE
============================================================

First-class:

Project

Repository

Task

Worktree

Branch

Base SHA

Session

Commit

Test

Artifact

Deployment

Evidence

Concurrent coding agents should normally use isolated worktrees.

============================================================
32. APPROVALS
============================================================

Canonical Approval object.

Available through:

Web

Telegram

Discord

Same state.

Record:

requester

action

risk

evidence

approver

decision

origin

timestamp

============================================================
33. EVIDENCE PACK
============================================================

Generate:

objective

execution contract

base SHA

final SHA

files changed

diff

commands

tests

build/lint

artifacts

screenshots

provider actions

approvals

deployment state

AgentForge must answer:

what happened?

why?

what changed?

what verified it?

who approved it?

============================================================
34. ACTIVITY / AUDIT
============================================================

Audit important state-changing events.

Record origin:

WEB

TELEGRAM

DISCORD

AGENT

SYSTEM

API

============================================================
35. MEMORY
============================================================

Provide native useful memory.

Also create:

MemoryProvider

Future:

Mem0

Graphiti

Letta

MCP memory

custom

Prioritize operational memory:

tasks

repos

commits

tests

failures

approvals

deployments

do-not-repeat operations

constraints

============================================================
36. COMPUTE
============================================================

Create:

ComputeProvider

SandboxProvider

Support architecture for:

local

Docker

remote node

cloud computer

future local compute fabric

Do not build distributed inference in this goal unless necessary for core functionality.

============================================================
37. UNIFIED AI MEMORY R&D
============================================================

Preserve FUTURE R&D concept:

software/runtime for commodity PCs that intelligently uses system RAM for local AI workloads.

Target separate 32GB mini-PC investigation.

Potential research:

shared iGPU memory

RAM budgeting

KV budgeting

tensor placement

memory pressure

predictive paging

quantization planning

GGUF

Vulkan/DirectML/oneAPI/ROCm

This is NOT required for v0.1 completion.

Document only.

============================================================
38. PACKAGE STANDARD
============================================================

Create versioned AgentForge Pack.

Structure concept:

manifest

agents

processes

skills

workflows

tools

channels

voice

policies

contracts

memory

ui

tests

README

Packages declare capabilities, not vendor lock-in.

============================================================
39. MARKETPLACE DOMAIN
============================================================

Design/implement foundation:

Package

PackageVersion

PackageSource

Publisher

PublisherAccount

Capability

Dependency

PermissionManifest

Installation

InstallationState

Entitlement

License

PricingPlan

UsageMeter

VerificationResult

MarketplaceListing

Review

Sources:

LOCAL

GITHUB

REGISTRY

MARKETPLACE

PRIVATE_REGISTRY

Open-source package installation must work without commercial marketplace.

============================================================
40. MARKETPLACE SECURITY
============================================================

Every package declares permissions.

Examples:

filesystem

Git

network

browser

messaging

CRM

email

deployment

secrets

Owner reviews permissions.

ExecutionContract remains final authority.

Package cannot escalate itself.

============================================================
41. MARKETPLACE DEVELOPER ECONOMY
============================================================

Future developer pricing:

free

one-time

subscription

usage-based

per-seat

freemium

open-source/support

Design architecture.

Do NOT implement paid transactions yet.

Future:

MarketplaceBillingProvider

MarketplacePayoutProvider

AgentForge may take percentage of marketplace transactions.

Do not hardcode percentage.

============================================================
42. MARKETPLACE UX
============================================================

Create usable marketplace shell.

Categories:

Agents

Teams

Skills

Tools

Processes

Connectors

Voice

Harnesses

Policies

Templates

Installed

Developer

Support local/demo packages.

No payment processing required.

============================================================
43. PACKAGE DEVELOPER UX
============================================================

Support local development workflow:

agentforge pack init

agentforge pack validate

agentforge pack inspect-archive <package-directory> <archive.zip>

agentforge pack test

agentforge pack benchmark

Remote publish can remain future.

Web Developer area:

My Packages

Create

Validate

Test

Benchmark

============================================================
44. REMOTE COMMERCIAL CAPABILITIES
============================================================

Marketplace must eventually support:

LOCAL PACKAGE

and

REMOTE PROPRIETARY SERVICE

so developers can sell integrations without open-sourcing backend IP.

Design clean remote capability abstraction.

No billing required now.

============================================================
45. CUSTOM AGENT SERVICES
============================================================

Architect open-source platform to support commercial services.

Potential service concept:

custom agents starting around $5K

managed plans around $497 / $999+

These are business concepts, NOT product constants.

Custom service pipeline:

process discovery

Scribe/SOP

process compiler

clarification

agent builder

integrations

voice/channels

execution contract

tests

shadow

approval

controlled deployment

monitoring

============================================================
46. SERVICES → MARKETPLACE
============================================================

Reusable generic components from custom builds may become packages ONLY when IP/contracts permit and customer-specific information is removed.

Never assume customer work is republishable.

============================================================
47. BENCHMARK EVERYTHING
============================================================

Core philosophy:

DO NOT TRUST PROVIDER CLAIMS.

MEASURE.

Benchmark target types:

MODEL

HARNESS

VOICE_PROVIDER

MEMORY_PROVIDER

TOOL

PACKAGE

COMPUTE

Potential metrics:

quality

accuracy

latency

reliability

cost

resource use

safety

schema compliance

tool use

============================================================
48. BENCHMARK DOMAIN
============================================================

Implement:

BenchmarkSuite

BenchmarkCase

BenchmarkRun

BenchmarkTarget

BenchmarkMetric

BenchmarkResult

CompatibilityResult

QualityThreshold

BenchmarkArtifact

Design so marketplace verification and routing can consume results later.

============================================================
49. EMPIRICAL ROUTING
============================================================

Future selector goal:

task

→ classify requirements/risk

→ find compatible providers

→ consult measured benchmark results

→ choose cheapest option above required quality threshold

Do not fully automate high-risk routing in v0.1.

Build architecture/data required.

============================================================
