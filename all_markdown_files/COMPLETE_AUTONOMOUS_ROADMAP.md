AGENTFORGE — COMPLETE AUTONOMOUS ROADMAP TO PUBLIC RELEASE
RC2 → RC3 → RC4 → ... → AS MANY RELEASE CYCLES AS REQUIRED

THIS IS THE MASTER GOAL.

DO NOT STOP AFTER RC2.
DO NOT STOP AFTER RC3.
DO NOT STOP AFTER AN ARBITRARY RELEASE-CANDIDATE NUMBER.

CREATE ADDITIONAL RC CHECKPOINTS YOURSELF AS NECESSARY.

BASELINE NOTE (2026-09-22): The commit IDs, test counts, “RC1 already includes” list, and completion claims below are historical reports from an earlier phase. They are not proof of the current checkout's state. Revalidate against current source, tests, and runtime. The vNext launcher now uses a versioned JSON snapshot including the event ledger and external bindings, with tested backup recovery; live-server, crash, concurrency, cross-platform, secret-isolation, production-isolation, and provider-readiness gates remain unaccepted. Do not treat historical roadmap claims alone as proof.

CONTINUE UNTIL:

A. ALL SAFE WORK IN THIS SPECIFICATION IS COMPLETE,

OR

B. THE ONLY REMAINING ITEMS REQUIRE:
   - owner credentials,
   - payment,
   - production access,
   - production cutover,
   - external publishing,
   - unavailable hardware/platform,
   - legal/license decision,
   - or another explicit owner decision.

DO NOT RETURN EVERY 20–30 MINUTES ASKING WHAT TO DO NEXT.

CHECKPOINT INTERNALLY.
COMMIT COHERENTLY.
CONTINUE.

RETURN TO THE OWNER ONLY WHEN:

1. THE MASTER GOAL IS COMPLETE, OR
2. A TRUE HARD BLOCKER PREVENTS MEANINGFUL FURTHER PROGRESS.

============================================================
CURRENT BASELINE
============================================================

WORKSPACE:

C:\Users\mscott\AI_Workspace\AgentForge-Staging

BRANCH:

vnext

KNOWN-GOOD RC1:

6a17da8

REPORTED BASELINE:

125 / 125 tests PASS
11 / 11 suites PASS
working tree clean

RC1 ALREADY INCLUDES:

canonical workspace

execution contracts

evidence

approvals

process/SOP architecture

Scribe file ingestion

voice architecture

marketplace/package architecture

migration center

legacy/current OpenClaw migration concepts

Hermes/Grok migration adapters

Telegram ownership-conflict protection

secret isolation

provider readiness

adversarial tests

atomic persistence

Web UI

CLI

CI scaffolding

open-source documentation

DO NOT REBUILD COMPLETED COMPONENTS.

============================================================
GLOBAL AUTONOMY RULE
============================================================

FOR EVERY RC:

1. verify previous checkpoint
2. run regression
3. perform scoped work
4. adversarially test it
5. browser/integration test where applicable
6. update readiness
7. update docs
8. commit coherent checkpoint
9. CONTINUE AUTOMATICALLY TO NEXT RC

Never wait for owner merely because an RC completed.

============================================================
HARD STOP CONDITIONS
============================================================

STOP ONLY IF REQUIRED FOR:

PAID PURCHASE

PRODUCTION CREDENTIAL

UNAVAILABLE REQUIRED CREDENTIAL

PRODUCTION CUTOVER

REAL SELLER/CUSTOMER ACTION

IRREVERSIBLE DESTRUCTIVE ACTION

PUBLISHING PUBLICLY

PUSHING TO OWNER'S PUBLIC GITHUB

NPM PUBLICATION

MARKETPLACE PAYMENT ACTIVATION

LEGAL/LICENSE OWNER DECISION

SECURITY INCIDENT

REAL SECRET DISCOVERED IN GIT HISTORY REQUIRING ROTATION

Otherwise continue.

If ONE provider is blocked:

MARK IT BLOCKED.

CONTINUE EVERYTHING ELSE.

============================================================
ABSOLUTE PRODUCTION ISOLATION
============================================================

DO NOT MODIFY:

production OpenClaw

prolificcapital-recovery / PPC

production Telegram bot

production Discord

JustCall

GoHighLevel

Hermes production

Orion/VCS

production databases

production queues

production credentials

AgentForge development remains isolated.

============================================================
RC2 — REAL PRODUCT PROOF
============================================================

GOAL:

Prove AgentForge actually works as a product rather than merely passing unit tests.

FIRST:

verify 125/125 baseline.

Then launch:

npm run serve

Open:

http://127.0.0.1:3456

Use actual browser testing.

Test EVERY view:

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
Migration
Benchmarks
Activity
Settings

Verify:

rendering
navigation
empty states
loading states
errors
responsive behavior
console errors
broken controls

Capture screenshots.

Fix defects.

Perform actual synthetic user journey:

create workspace

create channel

create agent

select process

import SOP

detect unresolved rule

configure permissions

create task

execute safe task

approval gate

approve

complete

EvidencePack

Activity

marketplace package install

migration dry run

voice simulation

No direct database shortcuts where UI/API behavior is being claimed.

CHECKPOINT.

CONTINUE.

============================================================
RC3 — REAL OLLAMA / LOCAL AI
============================================================

GOAL:

Make AgentForge genuinely useful without paid inference.

Detect real local Ollama independently of OpenClaw.

DO NOT read OpenClaw credentials/config.

Test:

/api/version
/api/tags

dynamic model discovery

generation

streaming

structured output

missing model

daemon unavailable

timeout

cancellation where supported

model metadata

Actual path must be:

AgentForge
→ ModelRouter
→ OllamaModelProvider
→ Ollama
→ response
→ canonical events/evidence

No OpenClaw proxy.

First-run UI:

LOCAL AI DETECTED

show models

select model

test model

If Ollama absent:

show installation/configuration instructions.

No local model name hardcoded as universal default.

Promote readiness based on evidence.

CHECKPOINT.

CONTINUE.

============================================================
RC4 — PI HARNESS REAL INTEGRATION
============================================================

CRITICAL:

IDENTIFY THE EXACT OFFICIAL PI PROJECT FIRST.

DO NOT INSTALL RANDOM PACKAGES SUCH AS:

@mariofg/pi

pi-ai

unless authoritative upstream documentation proves that is the intended project.

Research authoritative upstream.

Record:

official project
repository
maintainer/org
package
license
current version
SDK
RPC
sessions
tools
extensions
provider support

Compare against HarnessProvider.

If license-compatible:

implement through official supported API.

Test:

session creation
resume
task input
stream
tool event
structured output
timeout
cancel
error
cleanup

If capabilities incomplete:

PARTIAL_INTEGRATION.

Do not lie.

CHECKPOINT.

CONTINUE.

============================================================
RC5 — PYDANTIC HARNESS
============================================================

Pydantic remains OPTIONAL.

AgentForge must run without Python.

Determine clean boundary:

subprocess
RPC
service
official SDK bridge

Install only if free/license-compatible and safe.

Test synthetic workload.

If unavailable:

NOT_CONFIGURED.

Do not block release.

CHECKPOINT.

CONTINUE.

============================================================
RC6 — AGENTFORGE NATIVE HARNESS HARDENING
============================================================

Native Harness must justify its existence through governance.

Test:

ExecutionContract

filesystem boundaries

tool permissions

network restrictions

timeouts

cancellation

evidence

events

approval gates

budget

failure recovery

path traversal

symlink escape

protected files

destructive shell

No prompt may override contract.

Fuzz/adversarial test.

CHECKPOINT.

CONTINUE.

============================================================
RC7 — MODEL PROVIDER ECOSYSTEM
============================================================

Harden provider-neutral GenerativeModelProvider.

Support architecture for:

Ollama

OpenAI

OpenAI-compatible

Anthropic

OpenRouter

Vercel

LocalAI

vLLM

future providers

Do NOT require all real credentials.

Implement adapters where public interfaces and local tests permit.

Use mocks otherwise.

Model identifiers must NOT leak into core business logic.

CHECKPOINT.

CONTINUE.

============================================================
RC8 — JEV SYSTEM-1
============================================================

Jev remains DecisionProvider, not generative model.

AgentForge must have independent configuration.

DO NOT steal OpenClaw's Vercel credential.

If independent credential unavailable:

TEST_IMPLEMENTATION remains accurate.

Fully test:

schema

classification

confidence

timeout

429

invalid response

provider down

fallback

DecisionProvider must never automatically acquire production authority.

CHECKPOINT.

CONTINUE.

============================================================
RC9 — SCRIBE / PROCESS KNOWLEDGE
============================================================

Separate Scribe readiness by capability:

FILE IMPORT

MCP

LIVE SYNC

Prove file flow through actual UI:

SOP
→ ProcessKnowledgeProvider
→ ProcessDefinition
→ ProcessCompiler
→ unresolved rules
→ AgentSpecification

Support safe import where implemented:

Markdown
HTML
DOCX/PDF if real

MCP only REAL if actually tested.

No overclaiming.

CHECKPOINT.

CONTINUE.

============================================================
RC10 — PROCESS-TO-AGENT PRODUCTIZATION
============================================================

Build polished workflow:

"SHOW AGENTFORGE HOW YOU DO THE JOB"

Process import

→ steps

→ decisions

→ tools

→ permissions

→ missing business rules

→ clarification

→ AgentSpecification

→ ExecutionContract

→ tests

→ draft agent

Use synthetic business example.

Demonstrate:

SOP IS NOT AUTHORITY.

Example:

"Refund customer"

must generate unresolved authorization rule.

CHECKPOINT.

CONTINUE.

============================================================
RC11 — TELEGRAM SANDBOX INTEGRATION
============================================================

DO NOT USE PRODUCTION BOT.

Support:

Connect Existing Bot

Connect Test Bot

Migration Existing Bot

Before consumer:

inspect webhook

detect ownership

polling/webhook mode

pending updates

provider health

Permanent regression fixture:

external webhook already owns bot.

Expected:

BLOCK competing consumer.

Show:

Inspect
Prepare Migration
Cancel

No automatic destructive takeover.

If no test token:

use full mock/sandbox and mark accordingly.

CHECKPOINT.

CONTINUE.

============================================================
RC12 — TELEGRAM WORKSPACE MIRROR
============================================================

Fully test bidirectional canonical semantics:

Telegram group/forum
↔ AgentForge Workspace/Space

Topic
↔ Channel

Message
↔ Message

Reply
↔ relationship

media metadata

rename

open/close

approvals

remote commands

Test:

duplicate events

out-of-order

replay

provider timeout

loop suppression

unauthorized user

RBAC

No duplicates.

CHECKPOINT.

CONTINUE.

============================================================
RC13 — DISCORD
============================================================

Same canonical model.

Guild

Channel

Thread

Message

Interactions

Approvals

Remote commands

Do not duplicate Telegram business logic.

Use sandbox if independently available.

Otherwise mocks.

CHECKPOINT.

CONTINUE.

============================================================
RC14 — UNIVERSAL REMOTE CONTROL
============================================================

Web/Telegram/Discord must manipulate SAME canonical state.

Test:

/status

/tasks

/agents

/approvals

/models

/compute

pause

resume

cancel

retry

diff

evidence

ask

approve

reject

Identity and permissions follow user across interfaces.

CHECKPOINT.

CONTINUE.

============================================================
RC15 — UNIFIED INBOX
============================================================

Harden actionable inbox.

Aggregate:

messages

approvals

agent questions

task failure

task completion

voice event

provider error

security warning

Use deterministic classification initially.

Optional DecisionProvider assistance later.

No autonomous high-risk action.

CHECKPOINT.

CONTINUE.

============================================================
RC16 — RETELL VOICE
============================================================

Retell currently SKELETON.

Do not purchase anything.

Build/test everything possible without paid call:

API contract

webhook validation

event normalization

transcript schema

tool invocation schema

recording metadata

transfer state

usage/cost schema

failure behavior

If staging credential absent:

BLOCKED_CREDENTIAL.

Create exact sandbox promotion checklist.

CHECKPOINT.

CONTINUE.

============================================================
RC17 — AGNI VOICE
============================================================

FIRST identify exact Agni product.

Authoritative source required.

Do not guess.

Determine:

API
voice capabilities
telephony
tools
webhooks
pricing model
license/terms
sandbox

If exact product cannot be verified:

UNVERIFIED_PRODUCT_IDENTITY.

Do not fabricate adapter.

Continue.

CHECKPOINT.

============================================================
RC18 — VOICE BENCHMARK FRAMEWORK
============================================================

Create frozen provider-neutral voice benchmark.

Metrics:

latency
turn-taking
barge-in
silence
noise
names
numbers
addresses
tool accuracy
structured extraction
transfer
failure recovery
webhook reliability
transcripts
recordings
concurrency
cost

Retell vs Agni only compared when BOTH have real measured runs.

No simulated score presented as measured.

CHECKPOINT.

CONTINUE.

============================================================
RC19 — MEMORY PROVIDER SYSTEM
============================================================

Harden native operational memory.

Focus:

tasks
projects
repos
commits
tests
failures
approvals
deployments
do-not-repeat
constraints

MemoryProvider supports future:

Mem0
Graphiti
Letta
MCP memory

Do not integrate everything merely because it exists.

Build capability contract + tests.

CHECKPOINT.

CONTINUE.

============================================================
RC20 — CONTEXT / MEMORY EVALUATION
============================================================

Benchmark native memory on:

retrieval precision

irrelevant retrieval

duplicate memory

stale memory

project isolation

agent isolation

token overhead

large history

session recovery

Do not let memory silently override current durable state.

CHECKPOINT.

CONTINUE.

============================================================
RC21 — MIGRATION: LEGACY OPENCLAW
============================================================

Use sanitized OpenClaw 2026.2.22 fixture.

Perform:

discover
inspect
normalize
plan
dry run
validate
verify
compare

Preserve/map:

agents
models
fallbacks
Ollama
Telegram
topics
tools
MCP
memory metadata
projects
jobs
System-1
permissions
safety invariants

No production access.

Generate compatibility report.

CHECKPOINT.

CONTINUE.

============================================================
RC22 — MIGRATION: CURRENT OPENCLAW
============================================================

Use disposable current upstream fixture.

Never upgrade production.

Separate result:

LEGACY OPENCLAW

CURRENT OPENCLAW

Do not collapse them into one compatibility claim.

CHECKPOINT.

CONTINUE.

============================================================
RC23 — OPENCLAW SHADOW COMPARISON
============================================================

Using fixtures/synthetic events:

same event

→ expected legacy behavior

→ AgentForge behavior

Compare:

routing

agent

model policy

tool intent

safety

task state

memory

Telegram mapping

Flag critical differences.

No live production tap required.

CHECKPOINT.

CONTINUE.

============================================================
RC24 — HERMES MIGRATION
============================================================

Use sanitized fixture.

Map actual exportable structures.

Do not invent unsupported functionality.

DIRECT

TRANSFORM

MANUAL_REVIEW

UNSUPPORTED

SECRET_REQUIRED

DANGEROUS

CHECKPOINT.

CONTINUE.

============================================================
RC25 — GROK BOT MIGRATION
============================================================

Only documented/exportable/user-provided state.

Do not reverse engineer private APIs.

Anything inaccessible:

MANUAL_REVIEW

or

UNSUPPORTED.

Create guided migration path.

CHECKPOINT.

CONTINUE.

============================================================
RC26 — GENERIC MIGRATION SDK
============================================================

Finalize:

agentforge-migration.json

schema

validation

examples

MigrationProvider SDK

Third parties should be able to build:

CrewAI

LangGraph

AutoGen

n8n

custom migration

without core modification.

CHECKPOINT.

CONTINUE.

============================================================
RC27 — MIGRATION CENTER UX
============================================================

Browser-test:

source selection

inspection

counts

compatibility

conflicts

secrets

plan

dry run

verification

cutover plan

rollback plan

NO LIVE CUTOVER.

CHECKPOINT.

CONTINUE.

============================================================
RC28 — TELEGRAM MIGRATION CUTOVER MODEL
============================================================

State machine:

SOURCE_AUTHORITATIVE

AGENTFORGE_SHADOW

CUTOVER_READY

AGENTFORGE_AUTHORITATIVE

ROLLBACK

Existing bot identity preserved.

Never allow competing consumers where provider forbids it.

No actual cutover.

CHECKPOINT.

CONTINUE.

============================================================
RC29 — DURABILITY
============================================================

Stress current atomic JSON persistence.

Test:

restart

corruption

backup recovery

concurrent events

event growth

crash during write

crash during approval

crash during task

crash during migration

If JSON insufficient for alpha:

migrate behind persistence interface to SQLite.

No Redis/Postgres.

If retained:

document explicit limits.

CHECKPOINT.

CONTINUE.

============================================================
RC30 — SQLITE MIGRATION IF REQUIRED
============================================================

ONLY if RC29 proves necessary.

Implement transactional persistence.

Migration from JSON.

Backup.

Rollback.

Tests.

Do not migrate merely because SQLite sounds better.

CHECKPOINT.

CONTINUE.

============================================================
RC31 — EXECUTION CONTRACT SECURITY
============================================================

Attack:

path traversal

symlink escape

protected files

shell destruction

force push

network escape

secret access

deployment

timeout

budget escape

tool alias bypass

encoded commands

nested shell

Model/harness cannot bypass.

CHECKPOINT.

CONTINUE.

============================================================
RC32 — PACKAGE SECURITY
============================================================

Attack marketplace packages:

postinstall

preinstall

binary

path escape

symlink

network wildcard

secret request

production deploy

force push

dependency cycle

oversize

malformed manifest

unexpected executable

Reject unsafe package.

CHECKPOINT.

CONTINUE.

============================================================
RC33 — WEB SECURITY
============================================================

Test:

XSS

HTML injection

CSRF posture

malformed JSON

oversized payload

unauthorized API

role escalation

session spoofing

directory traversal

unsafe file rendering

UI hiding a button does NOT count as authorization.

CHECKPOINT.

CONTINUE.

============================================================
RC34 — SECRET MANAGEMENT
============================================================

SecretProvider must separate secrets from workspace exports.

Audit:

workspace JSON

migration bundle

package

logs

EvidencePack

screenshots

API responses

No raw secrets.

Prefer:

environment refs

OS credential storage if practical

Do not invent weak crypto.

CHECKPOINT.

CONTINUE.

============================================================
RC35 — AUTHENTICATION REALITY
============================================================

Determine actual Web auth.

If localhost single-user with no login:

state honestly.

Do NOT claim Internet-safe multi-user auth.

Design future auth boundary.

Remote binding remains opt-in.

CHECKPOINT.

CONTINUE.

============================================================
RC36 — LOCALHOST / NETWORK SECURITY
============================================================

Default:

127.0.0.1

not:

0.0.0.0

Remote exposure requires explicit configuration.

Document TLS/auth/reverse proxy requirements.

No accidental LAN exposure.

CHECKPOINT.

CONTINUE.

============================================================
RC37 — COMPUTE PROVIDERS
============================================================

Harden abstraction:

local

Docker

remote node

cloud computer

Implement safe local provider.

Docker if available/free.

Remote/cloud may remain skeleton.

Do not build distributed compute unnecessarily.

CHECKPOINT.

CONTINUE.

============================================================
RC38 — AGENT COMPUTER
============================================================

Agent compute policy:

None

Local Sandbox

Docker

Remote

Cloud

Capabilities:

browser

terminal

filesystem

network

computer use

ExecutionContract still governs authority.

CHECKPOINT.

CONTINUE.

============================================================
RC39 — MULTI-AGENT COLLABORATION
============================================================

Synthetic channel:

Planner

Developer

Reviewer

Test:

task decomposition

handoff

shared channel

isolated memory

worktree separation

review

approval

EvidencePack

Prevent agents from silently escalating each other's authority.

CHECKPOINT.

CONTINUE.

============================================================
RC40 — WORKTREE ENGINE
============================================================

Stress:

create

resume

parallel worktrees
