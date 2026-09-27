AGENTFORGE VNEXT — EXTENSION GUIDE
PROCESS-TO-AGENT + VOICE + MARKETPLACE + COMMERCIAL ECOSYSTEM

THIS GUIDE EXTENDS THE EXISTING AGENTFORGE VNEXT MASTER SPECIFICATION.

IT DOES NOT REPLACE IT.

Continue using all previously established architectural requirements, especially:

- complete isolation from unrelated production systems
- canonical AgentForge workspace
- bidirectional Web/Telegram/Discord mirroring
- Pi as initial default harness candidate
- Pydantic AI Harness as second supported harness
- pluggable models/harnesses/memory/channels/compute
- execution contracts
- evidence packs
- Git/worktree isolation
- durable event ledger
- provider-neutral architecture
- no production cutover
- no production credentials
- no live seller/customer actions

============================================================
1. PRODUCT DIRECTION
============================================================

AgentForge is evolving into:

AN OPEN-SOURCE AI WORKFORCE PLATFORM.

The product should enable a business or developer to:

1. capture how work is performed
2. convert processes/SOPs into structured operational knowledge
3. create/configure AI agents around those processes
4. connect agents to tools
5. connect agents to communication channels
6. optionally give agents voice capability
7. enforce permissions/execution contracts
8. test agents before deployment
9. operate agents through Web/Telegram/Discord
10. package successful agents/processes
11. publish packages to a future marketplace
12. monetize packages/services

The platform itself does NOT need to own a foundation model.

AgentForge is:

model-neutral
harness-neutral
channel-neutral
voice-provider-neutral
memory-neutral
compute-neutral

============================================================
2. COMMERCIAL MODEL — DESIGN FOR IT, DO NOT BUILD BILLING YET
============================================================

AgentForge Community is intended to be genuinely useful and open source.

Potential future commercial layers include:

A. CUSTOM AGENT SERVICES

Example commercial model:

Custom Agent:
starting around $5,000 implementation

Managed service:
approximately $497/month

AI Team / advanced managed service:
approximately $999+/month

Enterprise:
custom

THESE ARE BUSINESS IDEAS, NOT HARD-CODED PRICES.

Do not embed these prices into product logic.

B. AGENTFORGE CLOUD

Managed hosted AgentForge.

C. AGENTFORGE TEAMS / ENTERPRISE

Potential features:

SSO
RBAC
organization management
central policies
shared agents
audit retention
fleet management
managed secrets
approval chains
usage budgets
compliance controls

D. MARKETPLACE

Developers publish AgentForge packages and may charge users.

AgentForge may eventually collect a percentage of marketplace transactions.

Do not implement payments during Foundation Pass.

Architect so this is possible later.

============================================================
3. MARKETPLACE IS A FIRST-CLASS FUTURE PLATFORM
============================================================

The marketplace should NOT be limited to "agents."

Future marketplace categories:

Agents
Agent Teams
Skills
Tools
Connectors
Workflows
Processes
SOP Packs
Execution Contracts
Policy Packs
Memory Providers
Harness Adapters
Model Adapters
Voice Providers
Channel Providers
Compute Providers
UI Extensions
Vertical Solution Packs

Examples:

Real Estate Acquisition Team

Dental Claims Agent

Shopify Support Agent

Software Development Team

Property Management Agent

Customer Support Team

============================================================
4. AGENTFORGE PACKAGE STANDARD
============================================================

Design a first-class versioned package format NOW.

Do not build the public marketplace yet.

Conceptual package:

agentforge-pack/
│
├── manifest.yaml
│
├── agents/
├── processes/
├── skills/
├── workflows/
├── tools/
├── channels/
├── voice/
├── policies/
├── contracts/
├── memory/
├── ui/
├── tests/
└── README.md

Package manifest should eventually describe:

name
publisher
version
description
license

AgentForge version requirements

capabilities

dependencies

requested permissions

required integrations

model capability requirements

harness capability requirements

voice requirements

channel requirements

compute requirements

tests

pricing metadata where applicable

DO NOT tie packages to a specific model unless genuinely necessary.

Prefer capability declarations.

Example:

model_requirements:

structured_output: true
tool_calling: true
minimum_context: 32000
quality_class: standard

Instead of:

requires GPT-X.

============================================================
5. MARKETPLACE DOMAIN MODEL
============================================================

Design domain/schema support for future:

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

Potential PackageSource values:

LOCAL

GITHUB

REGISTRY

MARKETPLACE

PRIVATE_REGISTRY

The open-source package system MUST work without the commercial marketplace.

============================================================
6. DEVELOPER ECONOMY
============================================================

Future developers should be able to:

create package

test package

publish package

set price

release updates

see installations

see compatibility

see benchmark results

receive marketplace revenue

Potential pricing models:

FREE

ONE_TIME

SUBSCRIPTION

USAGE_BASED

PER_SEAT

FREEMIUM

OPEN_SOURCE_SUPPORT

Do not implement transaction processing now.

Design for future MarketplaceBillingProvider and MarketplacePayoutProvider.

============================================================
7. PERMISSION MANIFEST
============================================================

Marketplace packages can be dangerous.

A package may request:

filesystem
terminal
Git
browser
network
CRM
email
messaging
deployment
secrets

Every package needs a declarative PermissionManifest.

Example:

filesystem:
  workspace:
    read: true
    write: true

  home:
    read: false

git:
  read: true
  branch: true
  commit: true
  force_push: false

messaging:
  draft: true
  send: false

deployment:
  production: false

AgentForge must eventually show requested permissions BEFORE installation.

ExecutionContract still controls actual runtime authority.

A package manifest NEVER overrides the owner's execution contract.

============================================================
8. MARKETPLACE VERIFICATION
============================================================

Design future verification records.

Potential verification dimensions:

publisher identity

package signature

malware/security scan

permission-manifest validation

AgentForge compatibility

model compatibility

harness compatibility

unit tests

integration tests

benchmark performance

resource requirements

known failures

AgentForge Verified should eventually mean something measurable.

Do not implement certification claims now.

============================================================
9. PROCESS KNOWLEDGE — FIRST CLASS
============================================================

Businesses often cannot clearly explain their workflows.

They can SHOW the workflow.

AgentForge should support:

SHOW US HOW YOU DO THE JOB
→ CAPTURE PROCESS
→ STRUCTURE PROCESS
→ FIND MISSING RULES
→ BUILD AGENT

Create:

ProcessKnowledgeProvider

Initial reference provider:

SCRIBE

Future providers:

Tango
Notion
Confluence
Google Docs
Markdown
HTML
DOCX
PDF
Video
Manual
AgentForge Capture

Do not make Scribe mandatory.

============================================================
10. SCRIBE
============================================================

Architect a ScribeProvider.

Potential ingestion methods:

Scribe MCP where available/authorized

Markdown export/import

HTML export/import

DOCX/PDF import

Scribe URL/embed metadata where appropriate

No real Scribe credentials required during Foundation Pass.

Do not assume every user has Scribe Enterprise.

============================================================
11. PROCESS DOMAIN
============================================================

Create/design:

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

Example conceptual flow:

Scribe SOP
    ↓
ProcessKnowledgeProvider
    ↓
ProcessDefinition
    ↓
Process Compiler
    ↓
tool requirements
decision points
permissions
exceptions
inputs/outputs
missing rules
    ↓
Agent Specification
    ↓
Skills
Execution Contract
Tests
Agent Draft

============================================================
12. CRITICAL — SOP IS NOT AUTHORITY
============================================================

An SOP describes how someone performs work.

It does NOT automatically establish why an action is authorized.

Example:

SOP:

"Move lead to Ready To Underwrite."

AgentForge must NOT conclude that any agent can perform that action.

Process compiler must be capable of detecting:

UNRESOLVED BUSINESS RULE:

"What conditions authorize Ready To Underwrite?"

Owner supplies rule.

Then:

ProcessDefinition
+
ExecutionContract
+
deterministic policy

control the action.

SOP cannot override:

permissions
compliance
execution contract
deterministic safety

============================================================
13. PROCESS CHANGE MANAGEMENT
============================================================

Future behavior:

Scribe/SOP changes
       ↓
ProcessVersion changes
       ↓
ProcessDiff
       ↓
affected agents identified
       ↓
proposed agent/workflow update
       ↓
tests
       ↓
human approval
       ↓
deployment

NEVER:

SOP changed
→ silently mutate production agent.

============================================================
14. PROCESS UI
============================================================

Add first-class navigation:

Processes

Process view should eventually show:

name

source

source provider

version

last synchronized

process graph

steps

decision points

exceptions

tools

permissions

inputs

outputs

unresolved business rules

agents using process

change history

test coverage

Example:

SELLER QUALIFICATION

Source:
Scribe

Process:

Lead
 ↓
Search CRM
 ↓
Review seller
 ↓
Photos complete?
 ├─ NO → Request missing information
 └─ YES
       ↓
Qualification complete?
 ├─ NO → Human qualification
 └─ YES → Underwriting review

Unresolved Rules:

⚠ Definition of usable interior photos

============================================================
15. PROCESS-TO-AGENT BUILDER
============================================================

Design future AgentBuilder pipeline.

Input may include:

ProcessDefinitions

business rules

existing tools

communication channels

examples

historical outcomes

permissions

owner preferences

Output:

AgentSpecification

required skills

required tools

required integrations

ExecutionContract template

test scenarios

channel bindings

voice requirements

memory requirements

Do not implement autonomous production agent creation during Foundation Pass.

Architect it.

============================================================
16. VOICE — FIRST CLASS PROVIDER
============================================================

Add:

VoiceProvider

Voice must NOT be hardcoded to one vendor.

Current candidates for future evaluation include:

Retell

Agni
(exact product/provider must be verified before implementation)

future providers

custom voice provider

SIP/custom telephony adapters

DO NOT assume Agni capabilities without authoritative verification.

============================================================
17. VOICE PROVIDER CONTRACT
============================================================

Design a normalized contract conceptually capable of:

getCapabilities()

createVoiceAgent()

updateVoiceAgent()

deleteVoiceAgent()

startOutboundCall()

handleInboundCall()

transferCall()

endCall()

registerTool()

streamEvents()

getCall()

getCallStatus()

getTranscript()

getRecording()

getUsage()

getCost()

getHealth()

Exact implementation may differ by provider.

Do not force provider-specific concepts into AgentForge core.

============================================================
18. VOICE CAPABILITY MODEL
============================================================

Voice providers should advertise capabilities.

Examples:

inbound_call

outbound_call

SIP

custom_telephony

phone_numbers

call_transfer

DTMF

voicemail_detection

voicemail_action

recording

transcription

real_time_events

tool_calls

custom_llm

multilingual

background_noise_handling

concurrency

simulation

Do not assume every provider supports everything.

============================================================
19. VOICE DOMAIN
============================================================

Design canonical:

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

Call state examples:

CREATED

QUEUED

RINGING

ANSWERED

IN_PROGRESS

TRANSFERRED

COMPLETED

FAILED

CANCELED

Provider-specific states normalize into canonical states.

============================================================
20. CALLS ARE WORKSPACE EVENTS
============================================================

Voice must not become an isolated subsystem.

Calls should appear inside AgentForge workspace/channel context.

Example:

external workflow
├── Seller Responses
├── Underwriting
└── Calls
     ├── Jane Smith
     │    duration
     │    transcript
     │    recording
     │    outcome
     │    tasks
     │
     └── Bob Jones

Call completion can emit canonical events.

Example:

CALL_COMPLETED

AgentForge may then create:

transcript

summary

extracted commitments

follow-up tasks

approval requests

memory candidates

Do NOT make production decisions automatically during Foundation Pass.

============================================================
21. VOICE + TELEGRAM
============================================================

Voice events may surface through Telegram.

Example future notification:

Seller call completed

Duration:
4m 32s

Outcome:
Interested

Photos:
Promised

Human review:
Required

Actions:

[Transcript]

[Recording]

[Create Task]

[Assign Agent]

This must use the SAME canonical workspace/event/permission system as Web.

============================================================
22. VOICE TESTING — MANDATORY BEFORE RECOMMENDATION
============================================================

NO voice provider becomes the recommended/default provider based on marketing claims.

AgentForge should eventually have a Voice Benchmark Suite.

Candidate providers receive identical scenarios.

Measure:

CONVERSATION

latency

natural turn-taking

interruptions/barge-in

silence

numbers

names

addresses

accents

noise

multilingual behavior

TOOL RELIABILITY

tool selection

tool arguments

structured extraction

failure recovery

hallucinations

transfer behavior

TELEPHONY

inbound

outbound

SIP

caller ID

DTMF

transfer

voicemail/AMD where supported

recording

OPERATIONS

API quality

webhook reliability

idempotency

retry behavior

transcripts

recordings

analytics

observability

concurrency

rate limits

ECONOMICS

voice cost

LLM cost

telephony cost

number cost

concurrency cost

add-ons

Do not implement the full benchmark now.

Create benchmark specification/schema.

============================================================
23. TEST EVERYTHING PHILOSOPHY
============================================================

This is a core AgentForge principle:

DO NOT TRUST PROVIDER CLAIMS.

MEASURE.

AgentForge should eventually benchmark:

MODELS

HARNESSES

MEMORY SYSTEMS

VOICE PROVIDERS

TOOLS

COMPUTE

MARKETPLACE PACKAGES

Same workload.

Same expected result.

Measured:

quality

latency

reliability

resource use

cost

safety

AgentForge can eventually route based on empirical evidence.

============================================================
24. BENCHMARK DOMAIN
============================================================

Design reusable domain objects:

BenchmarkSuite

BenchmarkCase

BenchmarkRun

BenchmarkTarget

BenchmarkMetric

BenchmarkResult

CompatibilityResult

QualityThreshold

BenchmarkArtifact

Possible target types:

MODEL

HARNESS

VOICE_PROVIDER

MEMORY_PROVIDER

TOOL

PACKAGE

COMPUTE

============================================================
25. MARKETPLACE + BENCHMARKS
============================================================

Future marketplace listings may show VERIFIED measured compatibility.

Example:

Dental Receptionist Pro

Voice:

Retell
✓ Tested

Other provider
✓ Tested

Models:

GPT
✓

Qwen Local
✓

Harnesses:

Pi
✓

Pydantic
✓

Tests:

428 / 428

Permission Level:

Medium

Do not implement public claims before the verification system is trustworthy.

============================================================
26. CUSTOM AGENT SERVICE WORKFLOW
============================================================

Design AgentForge so the commercial service can eventually operate like:

CUSTOMER
   ↓
Process Discovery
   ↓
Scribe / SOP / Documents
   ↓
Process Compiler
   ↓
Clarification Questions
   ↓
Agent Builder
   ↓
Tool Connections
   ↓
Voice / Messaging Connections
   ↓
Execution Contract
   ↓
Synthetic Tests
   ↓
Shadow Test
   ↓
Human Approval
   ↓
Controlled Deployment
   ↓
Monitoring
   ↓
Managed Service

This should reuse the SAME open-source platform.

Do not create a separate services-only product.

============================================================
27. SERVICE → MARKETPLACE FLYWHEEL
============================================================

Architect for reuse.

A custom $5K+ implementation may produce reusable GENERIC components.

Example:

customer-specific dental claims agent

after removing:

customer identity
credentials
patient data
customer-specific configuration
proprietary customer information

generic components may become:

Dental Claims Agent Pack

ONLY if:

contracts/IP rights permit reuse.

Never assume customer-specific work can automatically be republished.

============================================================
28. MARKETPLACE DEVELOPER EXPERIENCE
============================================================

Future CLI concept:

agentforge developer login

agentforge pack init

agentforge pack validate

agentforge pack inspect-archive <package-directory> <archive.zip>

agentforge pack test

agentforge pack benchmark

agentforge pack publish

Do not implement remote publishing now.

Local:

pack init
validate
test

may be scaffolded if appropriate.

============================================================
29. REMOTE / PROPRIETARY MARKETPLACE AGENTS
============================================================

Future marketplace must support both:

A. LOCAL/HOSTED PACKAGE

logic executes inside AgentForge

B. REMOTE SERVICE

developer operates proprietary backend

AgentForge installs connector/interface.

This lets SaaS companies participate without open-sourcing proprietary systems.

Design:

RemoteCapabilityProvider

or equivalent generic abstraction if appropriate.

Do not build commercial remote billing now.

============================================================
30. FUTURE AGENT-TO-AGENT MARKETPLACE
============================================================

Do NOT implement now.

But avoid architecture that prevents future:

agent requests specialized capability
→ marketplace discovery
→ user budget/policy check
→ specialist capability invoked
→ usage metered

Potential future controls:

daily marketplace budget

per-call limit

auto-approve under threshold

require approval above threshold

This is long-term architecture only.

============================================================
31. WEB UI UPDATES
============================================================

Navigation should now account for:

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

MARKETPLACE may initially be a placeholder/architecture shell.

VOICE may initially show provider/call mock states.

PROCESSES should have actual domain/UI scaffolding.

============================================================
32. AGENT DETAIL PAGE
============================================================

Agent detail should eventually expose:

Identity

Role

Status

Channels

Processes

Tools

Voice

Model Policy

Harness Policy

Decision Policy

Memory

Compute

Permissions

Execution Contract

Tasks

Benchmarks

Evidence

Activity

Do not overwhelm normal users.

Advanced sections may be collapsible.

============================================================
33. CREATE AGENT UX
============================================================

Long-term UX should make creation easy.

Potential wizard:

CREATE AGENT

1. What should this agent do?

2. Process

   Import Scribe
   Upload SOP
   Select existing Process
   Describe manually
   Skip

3. Channels

   Web
   Telegram
   Discord
   Voice

4. Tools

5. Permissions

6. Model

   Automatic recommended
   Local
   Cloud
   Advanced

7. Harness

   Automatic
   Pi
   Pydantic

8. Test Agent

9.
