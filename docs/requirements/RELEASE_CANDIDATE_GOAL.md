AGENTFORGE VNEXT — AUTONOMOUS RELEASE CANDIDATE GOAL

BASELINE NOTE (2026-09-22): The commit hash, expected test count, and previously reported UI/persistence state below are historical assertions, not current evidence. Check the current source tree and runtime; do not infer a release candidate from that prior report.
REAL INTEGRATIONS + CLEAN INSTALL + UX + MIGRATION VALIDATION

CONTINUE ONLY IN:

AgentForge-Staging

BRANCH:

vnext

CURRENT KNOWN-GOOD CHECKPOINT:

commit:
5d2df73

reported baseline:
112 / 112 tests PASS
10 / 10 suites PASS
working tree clean

THIS IS A RELEASE-HARDENING PHASE.

DO NOT EXPAND THE PRODUCT HORIZONTALLY.

DO NOT INVENT MORE LARGE SUBSYSTEMS.

THE OBJECTIVE IS TO TURN WHAT EXISTS INTO A CREDIBLE OPEN-SOURCE RELEASE CANDIDATE.

AUTONOMOUSLY CONTINUE THROUGH ALL PHASES.

DO NOT STOP AFTER EACH PHASE.

STOP ONLY FOR:

- required paid purchase
- unavailable required credential
- destructive irreversible operation
- licensing/legal blocker
- production access requirement
- action requiring owner's explicit authorization
- unresolved security issue that makes continuation unsafe

============================================================
0. ABSOLUTE PRODUCTION ISOLATION
============================================================

DO NOT MODIFY OR CONNECT TO:

production OpenClaw
unrelated production repository
production Telegram bot
production Telegram groups/topics
production Discord
external communications provider
GHL
Hermes production
Orion
production databases
production credentials

DO NOT:

cut over anything
send seller messages
copy production secrets
upgrade production OpenClaw
change production model configuration
stop production services

AgentForge remains completely separate.

============================================================
1. BASELINE VERIFICATION
============================================================

Before changes:

git status --short
git branch --show-current
git rev-parse HEAD
git log -n 5 --oneline

Require expected checkpoint or explain legitimate difference.

Run:

npx vitest run src --maxWorkers=1

Expected:

112 / 112 PASS

If baseline fails:

STOP RELEASE WORK.

Fix/reconcile baseline first.

Never weaken tests merely to restore green.

============================================================
2. PROVIDER READINESS AUDIT
============================================================

The current registry honestly reports varying readiness.

Audit every provider.

For each classify:

REAL_INTEGRATION

PARTIAL_INTEGRATION

TEST_IMPLEMENTATION

SKELETON

MOCK

UNIMPLEMENTED

At minimum audit:

PiHarnessProvider
PydanticHarnessProvider
AgentForgeNativeHarnessProvider

JevDecisionProvider

OllamaModelProvider
OpenAIModelProvider

TelegramMirrorProvider
DiscordMirrorProvider
NativeWebChannelProvider

ScribeProcessProvider

RetellVoiceProvider
MockVoiceProvider

Memory providers

Compute providers

Migration providers

Do not promote readiness based on interfaces existing.

Require actual execution evidence.

============================================================
3. PI — PROMOTE TOWARD REAL INTEGRATION
============================================================

Pi is intended to be AgentForge's default harness candidate.

Inspect current official Pi package/runtime/API available in the development environment.

Do NOT fork Pi.

Do NOT copy large portions of Pi source.

Implement the smallest clean adapter through supported public interfaces.

Target capabilities:

start session

resume session where supported

send task/input

stream events

tool invocation

cancel

retrieve state/result

error propagation

timeout

shutdown

Use safe synthetic tasks only.

No production repository.

If real Pi integration cannot be completed:

leave readiness honest.

Document exact blocker.

============================================================
4. PYDANTIC HARNESS — REALITY VALIDATION
============================================================

Do not force a Python dependency into every AgentForge installation unnecessarily.

Determine best integration boundary:

local subprocess

service adapter

RPC

other official supported interface

Create/validate the cleanest optional adapter.

Pydantic remains OPTIONAL.

AgentForge must run without Python/Pydantic installed.

If absent:

provider status:
NOT_CONFIGURED

not:
BROKEN.

============================================================
5. NATIVE HARNESS
============================================================

Audit AgentForgeNativeHarnessProvider.

Prove:

ExecutionContract enforced below model

tool permissions

timeouts

cancellation

event streaming

evidence capture

error propagation

Do not duplicate Pi functionality without reason.

Native Harness should exist because of AgentForge-specific governance requirements, not because we wanted another agent loop.

============================================================
6. OLLAMA — REAL LOCAL PROVIDER
============================================================

Ollama should become one of the strongest release integrations.

Use local Ollama development runtime if available.

Do not use production OpenClaw config.

Test:

discovery

model list

health

simple generation

streaming

structured output where supported

model unavailable

Ollama unavailable

timeout

cancellation

resource metadata where available

Do NOT assume qwen2.5:3b exists on every user's machine.

Provider must discover dynamically.

============================================================
7. OPENAI-COMPATIBLE PROVIDER CONTRACT
============================================================

Ensure AgentForge can support:

OpenAI

OpenRouter

Vercel-compatible routes where appropriate

LocalAI

vLLM

other OpenAI-compatible endpoints

through clean provider abstraction.

No production OpenAI credential required.

Use mock/test endpoint where needed.

Do not hardcode GPT model names into AgentForge business logic.

============================================================
8. JEV PROVIDER
============================================================

Jev currently reports TEST_IMPLEMENTATION.

Promote only if it can be independently configured in AgentForge without stealing credentials from OpenClaw.

Required architecture:

AgentForge-owned credential reference

provider health

classification

timeout

429 handling

invalid response

cost/usage metadata

DecisionProvider semantics

If credential unavailable:

keep TEST_IMPLEMENTATION.

Do NOT copy Vercel credentials from OpenClaw.

============================================================
9. SCRIBE PROVIDER
============================================================

An earlier registry labeled Scribe file import REAL_INTEGRATION. As of 2026-09-22, the registry labels local file parsing TEST_IMPLEMENTATION; it does not represent a live Scribe connection.

VERIFY THAT CLAIM.

Separate capabilities:

FILE IMPORT

Markdown
HTML
DOCX/PDF if implemented

MCP

live Scribe retrieval

sync/change detection

If only file/SOP parsing exists:

do NOT label the entire Scribe integration REAL.

Use capability-level readiness.

Example:

Scribe file import:
REAL

Scribe MCP:
NOT_CONFIGURED / SKELETON

Scribe live sync:
UNIMPLEMENTED

Accuracy matters more than marketing.

============================================================
10. VOICE
============================================================

Retell currently:
SKELETON

KEEP IT SKELETON unless real sandbox credentials already exist and testing can occur without purchase or production impact.

Do NOT purchase anything.

Do NOT make phone calls.

Do NOT claim production readiness.

MockVoiceProvider remains the release demo provider.

AGNI:

Do not implement speculative integration.

Create provider slot only.

Document:

EXACT AGNI PRODUCT NOT YET VERIFIED.

Future benchmark candidate.

============================================================
11. TELEGRAM SANDBOX STRATEGY
============================================================

DO NOT USE PRODUCTION TELEGRAM BOT.

Implement/document support for a TEST bot.

If no test bot credential exists:

do not request production token.

Keep Telegram provider testable via:

fixture
mock
sandbox adapter

Create clear setup workflow:

Connect Existing Bot

Create New Bot

For development:

Test Bot

Telegram setup UI should explain:

Bot token

group/forum access

topic discovery

polling vs webhook

current webhook state

consumer conflict detection

============================================================
12. TELEGRAM OWNERSHIP CONFLICT GUARD
============================================================

Use the real OpenClaw/GoldenHerd incident as a sanitized test case.

AgentForge MUST inspect Telegram webhook/polling state before assuming ownership.

Fixture:

bot currently has external webhook

AgentForge attempts polling takeover

Expected:

DO NOT START COMPETING CONSUMER

show:

TELEGRAM OWNERSHIP CONFLICT

existing webhook:
<sanitized provider>

options:

Inspect

Prepare Migration

Cancel

No automatic destructive takeover.

============================================================
13. TELEGRAM CUTOVER SAFETY
============================================================

Migration workflow must model:

SOURCE AUTHORITATIVE

AGENTFORGE SHADOW

CUTOVER READY

AGENTFORGE AUTHORITATIVE

ROLLBACK

Never allow both production consumers simultaneously when Telegram architecture forbids it.

No real cutover during this phase.

============================================================
14. DISCORD
============================================================

Same philosophy.

No production server.

Validate provider contract with mocks/fixtures.

If sandbox credential exists independently:

safe sandbox only.

Test:

server/channel/thread mapping

messages

replies

interactions

approval actions

RBAC

provider failure

============================================================
15. MIGRATION CENTER — OPENCLAW LEGACY
============================================================

AgentForge already has version-aware migration architecture.

Now ingest the sanitized legacy OpenClaw fixture produced by the OpenClaw workstream.

DO NOT access production OpenClaw directly.

Fixture represents:

OpenClaw 2026.2.22

Test complete dry run.

Verify:

agents

models

fallbacks

channels

Telegram bindings

tools

MCP metadata

memory metadata

projects

jobs

System-1 config

safety invariants

Classify every item:

DIRECT

TRANSFORM

MANUAL_REVIEW

UNSUPPORTED

SECRET_REQUIRED

DANGEROUS

============================================================
16. MIGRATION CENTER — CURRENT OPENCLAW
============================================================

Use disposable/current fixture for upstream OpenClaw.

Never upgrade production.

Test separately.

Report:

LEGACY compatibility

CURRENT compatibility

Do not combine scores.

============================================================
17. HERMES MIGRATION
============================================================

Validate HermesMigrationProvider against sanitized fixture.

Do NOT touch production Hermes.

Verify what actually migrates.

Anything unsupported must remain honestly classified.

============================================================
18. GROK BOT MIGRATION
============================================================

Validate GrokBotMigrationProvider.

Do NOT invent private/undocumented APIs.

Only support:

documented export

user-provided export

manual migration

where actually possible.

Unsupported proprietary state:

MANUAL_REVIEW

or:

UNSUPPORTED.

============================================================
19. GENERIC MIGRATION MANIFEST
============================================================

Finalize documented:

agentforge-migration.json

or equivalent.

Schema should support:

agents

channels

threads

models

tools

memory metadata

processes

projects

tasks

schedules

permissions

external bindings

provider requirements

secrets required

Validate malformed manifests safely.

============================================================
20. MIGRATION ACCEPTANCE REPORT
============================================================

For every provider output:

items discovered

direct

transformed

manual review

unsupported

secrets required

dangerous

conflicts

dry-run result

No migration provider gets a blanket PASS.

============================================================
21. DATABASE / DURABILITY DECISION
============================================================

The vNext launcher now wires versioned JSON snapshots with backup recovery, including canonical collections, event-ledger records, and external bindings. Focused restart, idempotency, corruption-recovery, and schema-fallback tests pass. Live-server restart, injected interrupted writes, concurrent-writer behavior, cross-platform guarantees, and secret-export review are still open; durability is not fully release-accepted.

Determine whether this is sufficient for:

single-user local alpha

or whether SQLite should become default BEFORE public release.

Evaluate:

concurrent events

event ledger growth

crash consistency

query requirements

migration transactions

marketplace installations

message history

Do not add PostgreSQL/Redis.

If JSON is clearly insufficient:

migrate persistence behind existing interface to SQLite.

Use transaction boundaries.

Add migration tests.

If JSON is sufficient for alpha:

document explicit scalability limit and defer SQLite.

Make evidence-based decision.

============================================================
22. CLEAN INSTALL TEST
============================================================

Create a disposable clean installation environment.

Do NOT rely on:

global packages accidentally installed

OpenClaw files

production .env

existing databases

user-specific absolute paths

Test:

clone/copy clean source

install dependencies

run tests

launch AgentForge

open UI

create demo workspace

No external credentials required.

Document:

Windows installation

============================================================
23. WINDOWS FIRST-CLASS
============================================================

Owner is on Windows.

AgentForge must be excellent on Windows.

Test:

PowerShell

paths with spaces

Windows filesystem separators

process termination

browser launch

SQLite/JSON persistence

Git worktree operations

Ollama detection

No WSL requirement.

============================================================
24. MACOS / LINUX PORTABILITY AUDIT
============================================================

Without requiring physical machines if unavailable:

audit for:

hardcoded C:\\ paths

PowerShell-only runtime logic

Windows-only process assumptions

path separators

shell commands

file permissions

Use Node/platform abstractions where possible.

Create CI plan for:

windows-latest

ubuntu-latest

macos-latest

============================================================
25. GITHUB ACTIONS
============================================================

Create safe CI workflow.

On PR/push:

install

typecheck

lint if configured

tests

build

package validation

No production secrets.

No live external calls.

Matrix where practical:

Windows

Ubuntu

macOS

Do not make CI depend on Ollama being installed unless a dedicated optional integration job handles it.

============================================================
26. WEB UI BROWSER VERIFICATION
============================================================

Launch actual Web UI.

Do not validate only through REST tests.

Browser-test:

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

Capture screenshots.

Check:

layout

scrolling

navigation

empty states

error states

loading states

mobile/responsive behavior

console errors

broken buttons

============================================================
27. UI POLISH
============================================================

Do NOT redesign entire application.

Fix obvious:

spacing

overflow

broken navigation

inconsistent labels

unreadable text

missing empty states

missing loading states

missing error states

poor responsive behavior

UI should look like a product, not a test harness.

============================================================
28. WORKSPACE MIRROR UX
============================================================

Make channel mirroring understandable.

UI should distinguish:

AgentForge Native

Telegram

Discord

Each external channel shows:

provider

sync status

direction

last event

conflict state

agent binding

Do not imply a mock provider is live.

============================================================
29. CREATE AGENT WIZARD
============================================================

Run actual browser journey.

Verify all steps:

Identity

Process

Channels

Tools

Voice

Permissions

Model

Harness

Memory

Compute

Test

Review

Create

No dead controls.

No provider marked available when it isn't.

============================================================
30. PROCESS-TO-AGENT UX
============================================================

Use synthetic Scribe/SOP fixture.

User flow:

Import Process

→ inspect process

→ unresolved rules

→ resolve one rule

→ generate AgentSpecification

→ review requested tools

→ review permissions

→ generate draft agent

No production deployment.

============================================================
31. APPROVAL UX
============================================================

Test:

approval created

Web displays it

authorized user approves

task resumes

unauthorized user rejected

evidence records origin

mock Telegram approval appears in same canonical state

============================================================
32. VOICE UX
============================================================

Mock only.

Demonstrate:

call starts

live state

transcript

tool event

call ends

summary

outcome

cost marked MOCK

Never display fake Retell measurements as real.

============================================================
33. MARKETPLACE UX
============================================================

Test:

browse

listing

permissions

install

reject privilege escalation

installed package

uninstall where supported

developer package validation

All commerce:

DEMO / NOT ENABLED

No fake checkout.

============================================================
34. MIGRATION UX
============================================================

Browser-test:

choose OpenClaw

legacy/current distinction

inspect

plan

dry run

conflicts

secret reconnect requirements

Telegram ownership conflict

cutover plan

rollback plan

NO LIVE CUTOVER.

============================================================
35. SECURITY — WEB
============================================================

Test:

XSS

CSRF posture

unsafe HTML

path traversal

malformed JSON

oversized payload

unauthorized API request

role escalation

session spoofing where applicable

Do not rely on UI hiding buttons for authorization.

============================================================
36. SECURITY — LOCAL API
============================================================

Determine network binding.

For default local installation:

prefer localhost-only unless explicitly configured otherwise.

Do not expose AgentForge unauthenticated to LAN/Internet by default.

Document remote-access security model.

============================================================
37. SECRET STORAGE
============================================================

Do not store provider secrets in normal WorkspaceStore JSON.

Design/use SecretProvider.

For alpha:

environment reference
OS credential store if already practical
encrypted local secret store if safely implemented

Never invent home-grown crypto casually.

At minimum keep secrets separated from exported workspace/package/migration data.

============================================================
38. PACKAGE SECURITY
============================================================

Expand adversarial package tests:

path traversal

symlink escape

postinstall scripts

unexpected executable files

secret requests

network wildcard

production deployment

force push

malformed manifest

dependency cycle

oversized package

Package installation cannot expand authority.

============================================================
39. DEPENDENCY / LICENSE AUDIT
============================================================

This is intended for open-source release.

Inventory direct dependencies.

Record licenses.

Flag:

GPL/AGPL/copyleft implications

unknown licenses

non-commercial licenses

proprietary SDK restrictions

Do NOT claim license compatibility without evidence.

Recommend AgentForge license separately.

Do not change license if owner has not chosen one.

============================================================
40. OPEN-SOURCE README
============================================================

Create professional README draft.

Include:

what AgentForge is

why it exists

screenshots

features

architecture overview

quick start

local models

cloud models

Telegram/Discord concept

execution contracts

process-to-agent

migration

marketplace vision

security

development

contributing

roadmap

status labels

Clearly identify:

ALPHA

EXPERIMENTAL

MOCK

PLANNED

No exaggerated claims.

============================================================
41. CONTRIBUTING
============================================================

Create:

CONTRIBUTING.md

Include:

setup

branching

tests

provider adapters

migration adapters

package development

security rules

code style

PR expectations

============================================================
42. SECURITY POLICY
============================================================

Create:

SECURITY.md

Include:

responsible disclosure

supported versions

secret handling

unsafe package reporting

provider adapter risks

execution-contract expectations

Do not invent an email address if one isn't configured.

Use placeholder clearly marked if needed.

============================================================
43. CODE OF CONDUCT
============================================================

Add standard recognized open-source Code of Conduct only if appropriate and license-compatible.

Do not invent custom legal text unnecessarily.

============================================================
44. LICENSE DECISION SUPPORT
============================================================

DO NOT automatically choose license.

Prepare comparison for owner:

MIT

Apache-2.0

AGPL-3.0

potential open-core implications

marketplace implications

commercial hosting implications

contributor implications

Recommend but DO NOT apply without owner decision.

============================================================
45. MARKETPLACE ARCHITECTURE FREEZE
============================================================

Do not build payments.

Ensure package standard supports future:

free

one-time

subscription

usage

per-seat

remote proprietary capability

private registry

Do not hardcode platform percentage.

============================================================
46. CUSTOM AGENT SERVICE READINESS
============================================================

Create DEMO workflow for:

business SOP

→ process import

→ unresolved rules

→ agent specification

→ permissions

→ test

→ evidence

→ deployment plan

This becomes future $5K+ custom-agent service demonstration.

No real customer data.

============================================================
47. BENCHMARK HONESTY
============================================================

Benchmark pages must distinguish:

MEASURED

SIMULATED

ESTIMATED

CONFIGURED

UNKNOWN

Never display simulated data as measured.

Never label provider "best" without comparable benchmark evidence.

============================================================
48. RELEASE STATUS MODEL
============================================================

Define statuses:

EXPERIMENTAL

ALPHA

BETA

STABLE

for:

AgentForge overall

providers

migration adapters

marketplace packages

harnesses

voice integrations
