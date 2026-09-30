import { parseMessageAttachments } from "./messageAttachments.js";
import { connectProjectFolder, listProjectFiles, readProjectFile, ProjectFileError } from "./projectFiles.js";
import { ConversationRuntime, type ConversationConfiguration } from "./conversationRuntime.js";
import { renderWorkspaceApp } from "./ui/workspaceApp.js";
/**
 * AgentForge Web Server & Control Plane
 * Sections 13, 14, 15, 16, 18, 28, 31, 32, 42
 *
 * Local control plane with REST/SSE endpoints and the AgentForge workspace UI.
 * External execution and live channel integrations remain opt-in and fail
 * closed until their runtime credentials and provider sessions are supplied.
 */

import http from "node:http";
import fs from "node:fs";
import pathModule from "node:path";
import { URL } from "node:url";
import crypto from "node:crypto";
import { getDefaultWorkspaceFilePath, globalStore, WorkspaceStore } from "../core/store/workspaceStore.js";
import { CompletionEngine } from "../core/completion/completionEngine.js";
import { ScribeProcessProvider } from "../providers/process/scribeProvider.js";
import { ProcessCompiler } from "../providers/process/processCompiler.js";
import type { ProcessSourceType } from "../core/types/process.js";
import { MockVoiceProvider } from "../providers/voice/mockVoiceProvider.js";
import { LocalPackageProvider } from "../providers/marketplace/localPackageProvider.js";
import { BenchmarkRunner } from "../providers/benchmark/benchmarkRunner.js";
import { EmpiricalRouter, type TaskRequirements } from "../core/router/empiricalRouter.js";
import { OpenClawMigrationProvider } from "../providers/migration/openclawMigrationProvider.js";
import { HermesMigrationProvider } from "../providers/migration/hermesMigrationProvider.js";
import { GrokBotMigrationProvider } from "../providers/migration/grokBotMigrationProvider.js";
import { GenericMigrationProvider } from "../providers/migration/genericMigrationProvider.js";
import { PROVIDER_READINESS_REGISTRY } from "../core/types/providerReadiness.js";
import { TelegramMirrorProvider } from "../providers/channels/telegramMirror.js";
import { inspectTelegramSessionConfig } from "../providers/channels/telegramSessionConfig.js";
import { inspectTelegramBotConfig } from "../providers/channels/telegramBotConfig.js";
import { inspectDiscordBotConfig } from "../providers/channels/discordBotConfig.js";
import { DiscordMirrorProvider } from "../providers/channels/discordMirror.js";
import { SlackMirrorProvider } from "../providers/channels/slackMirror.js";
import { IsolatedSecretStore } from "../core/secret/secretStore.js";
import { redactRuntimeError } from "../core/secret/runtimeRedaction.js";
import { verifyEvidencePackIntegrity } from "../core/evidence/evidencePackIntegrity.js";
import type { AuditEntry } from "../core/types/audit.js";
import type { PermissionManifest } from "../core/types/package.js";
import type { ExecutionContract, VerificationCheckType } from "../core/types/contract.js";
import type { AgentTeammate, HarnessPolicy, ModelPolicy, DecisionPolicy, ComputePolicy } from "../core/types/agent.js";
import type { TaskPriority, TaskStatus } from "../core/types/task.js";
import { UniversalMirrorRouter } from "../core/mirror/universalMirrorRouter.js";
import { OperationalMemoryProvider } from "../providers/memory/operationalMemory.js";
import type { MemoryCategory } from "../core/providers/memory.js";
import { TaskWorkerRuntime } from "../core/runtime/taskWorkerRuntime.js";
import { ApprovedPlanProvider, executionContractDigest, type ApprovedPlanRecord } from "../core/runtime/approvedPlanProvider.js";
import { DriftMonitor } from "../core/drift/driftMonitor.js";
import { CorrectionRegistry } from "../core/quality/correctionRegistry.js";
import { hasPermission } from "../core/auth/authService.js";
import type { AgentForgeUser, UserRole } from "../core/types/identity.js";
import { CallLifecycleManager } from "../core/voice/callLifecycleManager.js";
import { LocalSandboxComputeProvider } from "../core/compute/localSandboxComputeProvider.js";
import { DockerComputeProvider } from "../core/compute/dockerComputeProvider.js";
import { buildAgentProvisionDrafts, buildCoreSystemAgentDrafts, proposeCapabilitySetup, proposeSetupPlan, summarizeSetupReadiness } from "../setupOrchestrator.js";
import { CapabilitySetupExecutor } from "../capabilitySetupExecutor.js";
import { ChannelConnectionRegistry } from "../channelConnectionRegistry.js";
import { ChannelRuntimeRegistry } from "../channelRuntimeRegistry.js";
import { AgentForgeController } from "../controller/agentController.js";
import { PUBLIC_SYSTEM_MANIFEST } from "../publicSystemManifest.js";
import { JevUltrafastBrowserPolicy, type BrowserAction, type BrowserObservation } from "../providers/browser/jevUltrafastBrowser.js";
import { BrowserSessionRegistry } from "../providers/browser/browserSessionRegistry.js";
import { WorkflowEngine } from "../workflowEngine.js";
import { buildReleaseReadiness } from "../releaseReadiness.js";
import { ProcessAgentBridge } from "../processAgentBridge.js";
import { NativeAgentForgeGateway } from "../nativeGateway.js";
import type { ModelPlanDraftProvider } from "../core/runtime/modelPlanDraftProvider.js";
import { inspectSlackSocketModeConfig } from "../providers/channels/slackSocketModeConfig.js";

const MAX_REQUEST_BODY_BYTES = 8 * 1024 * 1024;
const PRODUCT_DOCUMENTATION_ROOT = pathModule.join(process.cwd(), "docs");
const SESSION_COOKIE_NAME = "agentforge_session";

function sessionTokenFromCookie(header: string | undefined): string | undefined {
  if (!header) return undefined;
  for (const item of header.split(";")) {
    const [name, ...parts] = item.trim().split("=");
    if (name !== SESSION_COOKIE_NAME || parts.length === 0) continue;
    try {
      return decodeURIComponent(parts.join("="));
    } catch {
      return undefined;
    }
  }
  return undefined;
}


type ProductDocumentation = {
  name: string;
  fullPath: string;
};

/**
 * The documentation explorer is deliberately limited to this repository's
 * public docs tree. It must never fall back to a user-created export bundle,
 * which may contain private operating notes from another workspace.
 */
function listProductDocumentation(): ProductDocumentation[] {
  if (!fs.existsSync(PRODUCT_DOCUMENTATION_ROOT)) return [];

  const discovered: ProductDocumentation[] = [];
  const names = new Set<string>();
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = pathModule.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

      // The client accepts a filename, so omit ambiguous duplicates rather
      // than allowing one document to shadow another in a nested directory.
      if (names.has(entry.name)) continue;
      names.add(entry.name);
      discovered.push({ name: entry.name, fullPath });
    }
  };
  walk(PRODUCT_DOCUMENTATION_ROOT);
  return discovered.sort((left, right) => left.name.localeCompare(right.name));
}

function findProductDocumentation(name: string): ProductDocumentation | undefined {
  return listProductDocumentation().find((document) => document.name === name);
}

const SENSITIVE_SETTINGS_KEYS = new Set([
  "openaiApiKey",
  "ollamaApiKey",
  "mimoApiKey",
  "anthropicApiKey",
]);

type SettingsRecord = Record<string, unknown>;

function isSensitiveSettingsKey(key: string): boolean {
  if (SENSITIVE_SETTINGS_KEYS.has(key)) return true;
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return normalized.includes("apikey")
    || normalized.includes("accesstoken")
    || normalized.includes("authtoken")
    || normalized.includes("credential")
    || normalized.includes("secret")
    || normalized.includes("password");
}

function defaultSettingsFilePath(): string {
  return process.env.AGENTFORGE_SETTINGS_FILE
    || pathModule.join(pathModule.dirname(getDefaultWorkspaceFilePath()), "settings.json");
}

function withoutSensitiveSettings(value: SettingsRecord): SettingsRecord {
  const filtered: SettingsRecord = {};
  for (const [key, nested] of Object.entries(value)) {
    if (isSensitiveSettingsKey(key)) continue;
    filtered[key] = isRecord(nested) ? withoutSensitiveSettings(nested) : nested;
  }
  return filtered;
}

function hasSensitiveSettings(value: SettingsRecord): boolean {
  return Object.entries(value).some(([key, nested]) =>
    isSensitiveSettingsKey(key) || (isRecord(nested) && hasSensitiveSettings(nested)),
  );
}

function settingsSection(value: unknown): SettingsRecord {
  return isRecord(value) ? value : {};
}

function isLoopbackHttpEndpoint(value: string): boolean {
  try {
    const endpoint = new URL(value);
    return endpoint.protocol === "http:"
      && !endpoint.username
      && !endpoint.password
      && ["localhost", "127.0.0.1", "::1"].includes(endpoint.hostname);
  } catch {
    return false;
  }
}

class RequestBodyError extends Error {
  constructor(message: string, public readonly statusCode: 400 | 413) {
    super(message);
    this.name = "RequestBodyError";
  }
}

function isTaskRequirements(value: unknown): value is TaskRequirements {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const taskTypes = ["code_generation", "bug_fix", "refactor", "sop_compilation", "general_qa", "voice_agent"];
  const risks = ["low", "medium", "high", "critical"];
  return taskTypes.includes(String(record.taskType))
    && risks.includes(String(record.risk))
    && typeof record.complexityScore === "number"
    && Number.isFinite(record.complexityScore)
    && record.complexityScore >= 1
    && record.complexityScore <= 10
    && typeof record.contextTokens === "number"
    && Number.isSafeInteger(record.contextTokens)
    && record.contextTokens >= 0
    && (record.structuredOutputRequired === undefined || typeof record.structuredOutputRequired === "boolean")
    && (record.toolUseRequired === undefined || typeof record.toolUseRequired === "boolean")
    && (record.generativeModelRequired === undefined || typeof record.generativeModelRequired === "boolean")
    && (record.maxLatencyMs === undefined || (typeof record.maxLatencyMs === "number" && Number.isFinite(record.maxLatencyMs) && record.maxLatencyMs > 0));
}

const harnessIds = new Set(["pi", "pydantic", "native"]);
const computeEnvironments = new Set(["none", "local_workspace", "local_sandbox", "docker", "cloud"]);
const taskStatuses = new Set<TaskStatus>(["backlog", "ready"]);
const taskPriorities = new Set<TaskPriority>(["low", "medium", "high", "critical"]);
const verificationTypes = new Set<VerificationCheckType>([
  "unit_tests", "regression_tests", "diff_scope", "lint", "build", "security_scan", "custom_script",
]);
const processSourceTypes = new Set<ProcessSourceType>([
  "scribe", "tango", "notion", "confluence", "markdown", "html", "pdf", "manual", "agentforge_capture",
]);
const workspaceProviders = new Set(["agentforge", "telegram", "discord", "slack", "web", "cli", "api"]);
const channelVisibilities = new Set(["public", "private", "agent_only"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isStringList(value: unknown, maxItems = 32): value is string[] {
  return Array.isArray(value) && value.length <= maxItems && value.every(item => isBoundedString(item, 200));
}

function isExecutionContract(value: unknown): value is ExecutionContract {
  if (!isRecord(value)) return false;
  const scope = value.scope;
  const authority = value.authority;
  const repository = value.repository;
  const workspace = value.workspace;
  const completion = value.completion;
  const checks = value.requiredChecks;
  const budget = value.budget;
  if (!isRecord(scope) || !isRecord(authority) || !isRecord(repository) || !isRecord(workspace) || !isRecord(completion)) return false;
  const authorityKeys = ["externalMessage", "productionWrite", "deployment", "forcePush", "deleteFiles", "networkOutbound"];
  const optionalPositive = (record: Record<string, unknown>, key: string) =>
    record[key] === undefined || (typeof record[key] === "number" && Number.isFinite(record[key]) && record[key] > 0);
  if (!isBoundedString(value.id, 120) || !isBoundedString(value.taskId, 120)
    || typeof value.version !== "number" || !Number.isSafeInteger(value.version) || value.version < 1
    || !isBoundedString(repository.baseBranch, 200) || !isBoundedString(repository.baseSha, 200)
    || typeof workspace.requireIsolatedWorktree !== "boolean"
    || (workspace.worktreePath !== undefined && !isBoundedString(workspace.worktreePath, 500))
    || !isStringList(scope.allowedPaths) || !isStringList(scope.protectedPaths)
    || !optionalPositive(scope, "maxFilesChanged") || !optionalPositive(scope, "maxLinesChanged")
    || authorityKeys.some(key => typeof authority[key] !== "boolean")
    || typeof completion.requireEvidencePack !== "boolean" || typeof completion.requireHumanApproval !== "boolean"
    || !Array.isArray(checks) || checks.length > 20 || !isBoundedString(value.createdAt, 64)
    || !Number.isFinite(Date.parse(value.createdAt))) return false;
  if (checks.some(check => !isRecord(check) || !verificationTypes.has(check.type as VerificationCheckType)
    || typeof check.required !== "boolean"
    || (check.command !== undefined && (typeof check.command !== "string" || check.command.length > 5000))
    || (check.timeoutMs !== undefined && (typeof check.timeoutMs !== "number" || !Number.isFinite(check.timeoutMs) || check.timeoutMs <= 0)))) return false;
  if (budget !== undefined && (!isRecord(budget) || !optionalPositive(budget, "maxSpendUsd") || !optionalPositive(budget, "maxDurationSeconds"))) return false;
  return true;
}

function requestsNoExecutionAuthority(contract: ExecutionContract): boolean {
  return !Object.values(contract.authority).some(Boolean);
}

function setupGuideReply(
  prompt: string,
  pending: readonly string[],
  requirementTitles: readonly string[],
  runtimeNextAction?: string,
): string {
  const normalized = prompt.trim().toLowerCase();
  const nextDecisions = pending.length ? pending.join(", ") : "review the task-specific boundaries, checks, and approval";
  const requirements = requirementTitles.length
    ? `The saved plan has ${requirementTitles.length} reviewable requirement${requirementTitles.length === 1 ? "" : "s"}.`
    : "The saved plan does not have requirements yet.";
  const next = pending.length
    ? `Next, ${nextDecisions}.`
    : "Next, review task boundaries, checks, and approval before any work runs.";
  if (/\b(can you|help me|set up|setup|prepare|organize|create)\b/.test(normalized)) {
    return `I can prepare the project, private channel, durable guide conversation, and reviewable plan from your stated outcome. I do not connect providers or run work without the required decisions. ${next}`;
  }
  if (/\b(plan|requirement|deliverable|outcome)\b/.test(normalized)) {
    const preview = requirementTitles.slice(0, 3).join("; ");
    return `${requirements}${preview ? ` It includes ${preview}.` : ""} ${next}`;
  }
  if (/\b(run|start|execute|work)\b/.test(normalized)) {
    return pending.length
      ? `The workspace is ready to organize and review work, but not to run a task yet. ${next}`
      : "The shared runtime gates are ready. Running work still requires explicit task boundaries, command review, and approval.";
  }
  if (/\b(missing|need|remain\w*|setup|configure|blocked)\b/.test(normalized)) {
    return pending.length
      ? `I have the project, private channel, guide conversation, and requirement plan organized. ${next}${runtimeNextAction ? ` Local readiness: ${runtimeNextAction}` : ""}`
      : `The shared runtime gates are ready. The remaining work is task-specific: define boundaries, attach checks, and review the execution plan.${runtimeNextAction ? ` Local readiness: ${runtimeNextAction}` : ""}`;
  }
  if (/\b(next|first|help|guide|recommend)\b/.test(normalized)) {
    return `${requirements} ${next} I can also explain the plan, tell you what is missing, or keep the handoff organized here.`;
  }
  return `I can keep this outcome organized, show its requirement plan, and explain what is required before work runs. ${next}`;
}

const SETUP_GUIDE_GATES = [
  { key: "modelPlanning", title: "Choose a model route", description: "A model route is needed before the workspace can generate responses.", view: "models" },
  { key: "isolatedCompute", title: "Choose an execution environment", description: "Work needs an isolated environment before it can run.", view: "compute" },
  { key: "realVerification", title: "Choose verification checks", description: "The team needs checks that can verify its work.", view: "harnesses" },
  { key: "evidenceCollection", title: "Choose where proof is retained", description: "Review evidence needs a retained destination.", view: "harnesses" },
] as const;

function setupGuideCapabilities(runtime?: TaskWorkerRuntime): Record<(typeof SETUP_GUIDE_GATES)[number]["key"], boolean> {
  return runtime?.getExecutionReadiness().capabilities ?? {
    modelPlanning: false,
    isolatedCompute: false,
    realVerification: false,
    evidenceCollection: false,
  };
}

function setupGuideMissing(capabilities: Record<(typeof SETUP_GUIDE_GATES)[number]["key"], boolean>): string[] {
  return SETUP_GUIDE_GATES
    .filter(gate => !capabilities[gate.key])
    .map(gate => gate.description);
}

export class AgentForgeWebServer {
  private server: http.Server;
  private sseClients = new Set<http.ServerResponse>();
  private readonly sseHeartbeatTimers = new Map<http.ServerResponse, NodeJS.Timeout>();
  private seededSampleData = false;
  private scribe = new ScribeProcessProvider();
  private compiler = new ProcessCompiler();
  private voice = new MockVoiceProvider();
  private packageProvider = new LocalPackageProvider();
  readonly benchmarkRunner = new BenchmarkRunner();
  readonly empiricalRouter = new EmpiricalRouter();
  readonly telegram = new TelegramMirrorProvider();
  readonly discord = new DiscordMirrorProvider();
  readonly slack = new SlackMirrorProvider();
  readonly mirrorRouter: UniversalMirrorRouter;
  readonly operationalMemory: OperationalMemoryProvider;
  readonly completionEngine: CompletionEngine;
  readonly secretStore = new IsolatedSecretStore();
  readonly openclawLegacy = new OpenClawMigrationProvider("legacy");
  readonly openclawCurrent = new OpenClawMigrationProvider("current");
  readonly hermesMigration = new HermesMigrationProvider();
  readonly grokMigration = new GrokBotMigrationProvider();
  readonly genericMigration = new GenericMigrationProvider();
  readonly taskWorkerRuntime: TaskWorkerRuntime;
  readonly driftMonitor: DriftMonitor;
  /** Human corrections are durable but this API exposes summaries, never expected output. */
  readonly correctionRegistry: CorrectionRegistry;
  readonly callLifecycleManager: CallLifecycleManager;
  private readonly channelConnections = new ChannelConnectionRegistry();
  private readonly channelRuntime: ChannelRuntimeRegistry;
  readonly nativeGateway: NativeAgentForgeGateway;
  readonly browserSessions = new BrowserSessionRegistry();
  readonly controller: AgentForgeController;
  readonly workflowEngine: WorkflowEngine;
  readonly processAgentBridge = new ProcessAgentBridge();
  readonly localSandbox = new LocalSandboxComputeProvider();
  readonly dockerCompute = new DockerComputeProvider();
  private readonly planDraftProvider?: ModelPlanDraftProvider;
  readonly conversations: ConversationRuntime;
  private readonly host = process.env.AGENTFORGE_HOST || "127.0.0.1";
  /** Optional deployment credential; it is never returned by any status route. */
  private readonly apiToken = process.env.AGENTFORGE_API_TOKEN?.trim() || undefined;
  private readonly settingsFilePath: string;

  // SSE event ID sequencing and ring-buffer for reconnect replay (Section 13)
  private sseEventCounter = 0;
  private readonly SSE_RING_BUFFER_SIZE = 500;
  // Keep idle HTTP intermediaries from closing a live EventSource connection.
  // This is deliberately shorter than common proxy idle thresholds.
  private readonly SSE_HEARTBEAT_INTERVAL_MS = 20_000;
  private sseRingBuffer: Array<{ id: number; data: string }> = [];

  constructor(
    public readonly store: WorkspaceStore = globalStore,
    private readonly port = 3460,
    completionEngine = new CompletionEngine(),
    taskWorkerRuntime?: TaskWorkerRuntime,
    options: { settingsFilePath?: string; conversation?: ConversationConfiguration; planDraftProvider?: ModelPlanDraftProvider } = {},
  ) {
    this.settingsFilePath = options.settingsFilePath || defaultSettingsFilePath();
    this.planDraftProvider = options.planDraftProvider;
    this.conversations = new ConversationRuntime(store, options.conversation);
    this.completionEngine = completionEngine;
    this.workflowEngine = new WorkflowEngine(undefined, completionEngine);
    this.operationalMemory = new OperationalMemoryProvider(this.store);
    this.taskWorkerRuntime = taskWorkerRuntime ?? new TaskWorkerRuntime(this.store, undefined, {
      repoRoot: process.cwd(),
      autoStart: false,
      memoryProvider: this.operationalMemory,
      memoryNamespace: "workspace",
    }, this.completionEngine);
    this.driftMonitor = new DriftMonitor(this.store);
    this.correctionRegistry = new CorrectionRegistry(this.store);
    this.callLifecycleManager = new CallLifecycleManager(this.store);
    this.controller = new AgentForgeController(undefined, this.operationalMemory);
    this.mirrorRouter = new UniversalMirrorRouter(this.store, this.telegram, this.discord, undefined, this.operationalMemory, this.slack);
    // The runtime registry must operate on these same provider instances so a
    // live transport attached by the launcher is the one the setup controls
    // start and stop, rather than an unconnected duplicate adapter.
    this.channelRuntime = new ChannelRuntimeRegistry({ telegram: this.telegram, discord: this.discord, slack: this.slack });
    this.nativeGateway = new NativeAgentForgeGateway(this.channelRuntime);
    // A few pre-release desktop builds persisted showcase records in the
    // otherwise durable local workspace. Remove only those reserved fixtures
    // before the UI reads state; never seed a production workspace with them.
    if (this.store.persistenceMode === "local_json") this.store.removeLegacyFixtureRecords();
    this.seedExtensionData();
    this.setupStoreRealtimeBroadcast();
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
  }

  private setupStoreRealtimeBroadcast(): void {
    this.store.subscribe(event => {
      const id = ++this.sseEventCounter;
      const data = JSON.stringify(event);
      // Maintain ring-buffer for reconnect replay
      this.sseRingBuffer.push({ id, data });
      if (this.sseRingBuffer.length > this.SSE_RING_BUFFER_SIZE) {
        this.sseRingBuffer.shift();
      }
      // Broadcast to all connected SSE clients with event ID
      for (const client of this.sseClients) {
        if (!client.writableEnded && !client.destroyed) {
          client.write(`id: ${id}\ndata: ${data}\n\n`);
        }
      }
    });
  }

  /**
   * A credential-free view for the Setup Guide. This deliberately answers
   * “what can I use here?” without returning secret names, values, paths, or
   * performing a provider action.
   */
  private inspectSetupRuntimeReadiness() {
    const telegramBot = inspectTelegramBotConfig();
    const telegramSession = inspectTelegramSessionConfig();
    const discord = inspectDiscordBotConfig();
    const slack = inspectSlackSocketModeConfig();
    const modelConfigured = Boolean(process.env.AGENTFORGE_CHAT_API_KEY?.trim() && process.env.AGENTFORGE_CHAT_MODELS?.trim());
    const executionMode = process.env.AGENTFORGE_EXECUTION_MODE?.trim() || "off";
    const channelStates = new Map(this.nativeGateway.snapshot().channels.map(channel => [channel.provider, channel.state]));
    const capabilities = [
      { id: "model", label: "Model planning", configured: modelConfigured, state: modelConfigured ? "configured" : "needs_configuration", detail: modelConfigured ? "A private model route is configured for this runtime." : "No model route is configured. The guide can still prepare a workspace and reviewable plan." },
      { id: "telegram", label: "Telegram", configured: telegramBot.configured || telegramSession.configured, state: telegramBot.configured || telegramSession.configured ? "configured" : "needs_configuration", runtimeState: channelStates.get("telegram") ?? "stopped", detail: telegramBot.configured ? "A BotFather transport is configured for this runtime." : telegramSession.configured ? "A direct Telegram user-session transport is configured for this runtime." : "No Telegram transport is configured." },
      { id: "discord", label: "Discord", configured: discord.configured, state: discord.configured ? "configured" : "needs_configuration", runtimeState: channelStates.get("discord") ?? "stopped", detail: discord.configured ? "A standalone Discord Gateway transport is configured." : "No Discord transport is configured." },
      { id: "slack", label: "Slack", configured: slack.configured, state: slack.configured ? "configured" : "needs_configuration", runtimeState: channelStates.get("slack") ?? "stopped", detail: slack.configured ? "A Slack Socket Mode transport is configured." : "No Slack transport is configured." },
      { id: "execution", label: "Governed execution", configured: executionMode === "approved-docker", state: executionMode === "approved-docker" ? "configured" : "sandbox_only", detail: executionMode === "approved-docker" ? "Approved Docker execution is selected; every task still needs its own reviewed contract." : "The workspace is in safe planning mode. External work stays off until an approved execution environment is selected." },
    ];
    const next = capabilities.find(capability => !capability.configured && capability.id === "model")
      ?? capabilities.find(capability => !capability.configured)
      ?? capabilities.find(capability => capability.id === "execution");
    return {
      available: true,
      externalChanges: false,
      scope: "local_runtime_readiness",
      capabilities,
      nextAction: next
        ? `Review ${next.label}. ${next.detail}`
        : "Review the prepared workspace plan and approve only the capabilities needed for the first run.",
    };
  }

  /** Returns SSE events after lastEventId (for Last-Event-ID reconnect replay). */
  getSseEventsAfter(lastEventId: number): Array<{ id: number; data: string }> {
    return this.sseRingBuffer.filter(e => e.id > lastEventId);
  }

  /**
   * A reconnect cursor is only replayable when it lies within the in-memory
   * history for this server instance. Clients must refresh their REST state
   * instead of silently continuing from an incomplete stream.
   */
  isSseReplayComplete(lastEventId: number): boolean {
    if (lastEventId > this.sseEventCounter) return false;
    const oldestAvailableId = this.sseRingBuffer[0]?.id;
    return oldestAvailableId === undefined || lastEventId >= oldestAvailableId - 1;
  }

  private addSseClient(req: http.IncomingMessage, res: http.ServerResponse): void {
    this.sseClients.add(res);
    const heartbeat = setInterval(() => {
      if (res.writableEnded || res.destroyed) {
        this.removeSseClient(res);
        return;
      }
      res.write(`: heartbeat id=${this.sseEventCounter}\n\n`);
    }, this.SSE_HEARTBEAT_INTERVAL_MS);
    heartbeat.unref();
    this.sseHeartbeatTimers.set(res, heartbeat);
    const cleanup = () => this.removeSseClient(res);
    req.once("close", cleanup);
    res.once("close", cleanup);
    res.once("error", cleanup);
  }

  private removeSseClient(res: http.ServerResponse): void {
    this.sseClients.delete(res);
    const heartbeat = this.sseHeartbeatTimers.get(res);
    if (heartbeat) clearInterval(heartbeat);
    this.sseHeartbeatTimers.delete(res);
  }

  /** Start a configured channel through the same registry exposed by the UI. */
  async startChannelRuntime(provider: "telegram" | "discord" | "slack") {
    return this.channelRuntime.start(provider);
  }

  /** Stop a channel through the same registry exposed by the UI. */
  async stopChannelRuntime(provider: "telegram" | "discord" | "slack") {
    return this.channelRuntime.stop(provider);
  }
  loadSettings(): SettingsRecord {
    const defaults = {
      provider: "unconfigured",
      ollamaBaseUrl: "http://127.0.0.1:11434",
      model: "unconfigured",
      port: String(this.port),
      optimization: false,
      metadata: false,
      models: {
        defaultProvider: "unconfigured",
        defaultModel: "unconfigured",
        temperature: 0.2,
        maxTokens: 4096,
        ollamaEndpoint: "http://127.0.0.1:11434",
        deepseekModel: "",
      },
      compute: {
        defaultHarness: "unconfigured",
        isolationLevel: "not_configured",
        maxConcurrentTasks: 0,
        taskTimeoutMinutes: 0,
        autoEvidencePack: false
      },
      security: {
        enforceExecutionContracts: true,
        requireHumanApprovalForDeploys: true,
        quarantineHighRiskDrift: true,
        protectedPaths: [".env", "package.json", "src/core/secret/**"]
      },
      storage: {
        persistenceMode: this.store.persistenceMode,
        backupIntervalHours: 24,
        auditRetentionDays: 90
      }
    };

    try {
      if (fs.existsSync(this.settingsFilePath)) {
        const raw = fs.readFileSync(this.settingsFilePath, "utf8");
        const parsed: unknown = JSON.parse(raw);
        if (!isRecord(parsed)) return defaults;
        const safeParsed = withoutSensitiveSettings(parsed);
        return {
          ...defaults,
          ...safeParsed,
          models: { ...defaults.models, ...(isRecord(safeParsed.models) ? safeParsed.models : {}) },
          compute: { ...defaults.compute, ...(isRecord(safeParsed.compute) ? safeParsed.compute : {}) },
          security: { ...defaults.security, ...(isRecord(safeParsed.security) ? safeParsed.security : {}) },
          storage: { ...defaults.storage, ...(isRecord(safeParsed.storage) ? safeParsed.storage : {}) }
        };
      }
    } catch {
      // Fallback to defaults
    }
    return defaults;
  }

  saveSettings(settings: SettingsRecord): void {
    const current = this.loadSettings();
    const safeSettings = withoutSensitiveSettings(settings);
    const updated = {
      ...current,
      ...safeSettings,
      models: { ...settingsSection(current.models), ...settingsSection(safeSettings.models) },
      compute: { ...settingsSection(current.compute), ...settingsSection(safeSettings.compute) },
      security: { ...settingsSection(current.security), ...settingsSection(safeSettings.security) },
      storage: { ...settingsSection(current.storage), ...settingsSection(safeSettings.storage) }
    };
    fs.mkdirSync(pathModule.dirname(this.settingsFilePath), { recursive: true });
    fs.writeFileSync(this.settingsFilePath, JSON.stringify(updated, null, 2), "utf8");
  }

  private hasOnlyFixtureRecords(): boolean {
    const agents = this.store.listAgents();
    const tasks = this.store.listTasks();
    const approvals = this.store.listApprovals();
    const fixtureAgentIds = new Set(["agent-alex", "agent-reviewer"]);

    // Fixture IDs are reserved by the in-memory test workspace. A persisted workspace
    // with only these records is still demo data after a server restart.
    return (agents.length > 0 || tasks.length > 0 || approvals.length > 0)
      && agents.every(agent => fixtureAgentIds.has(agent.id))
      && tasks.every(task => task.id === "AF-142")
      && approvals.every(approval => approval.taskId === "AF-142" || /fixture|example approval/i.test(approval.action + " " + (approval.description || "")))
      && this.store.listProcesses().length === 0
      && this.store.listCalls().length === 0
      && this.store.listInstallations().length === 0;
  }

  private seedExtensionData(): void {
    // Durable workspace storage is the real user environment. Never populate it with
    // example teammates, active-looking tasks, calls, or marketplace packages.
    // In-memory stores remain seeded for isolated tests and demonstrations.
    if (this.store.persistenceMode === "local_json") return;

    // Seed sample AI teammates if none exist
    if (this.store.listAgents().length === 0) {
      this.seededSampleData = true;
      this.store.createAgent({
        id: "agent-alex",
        name: "Fixture planner",
        avatarUrl: "🤖",
        role: "Test-only teammate profile",
        description: "In-memory fixture used to exercise the local workspace interface.",
        status: "idle",
        harnessPolicy: { preferredHarnessId: "pi", autoResume: true },
        modelPolicy: { preferredTier: 2, preferredModel: "fixture-model-a", preferredProvider: "fixture-provider", allowCloudFallback: false },
        decisionPolicy: { useSystem1Router: true },
        computePolicy: { environment: "local_workspace" },
        memoryNamespace: "engineering",
        tools: ["git", "terminal", "vitest", "diff_viewer"],
        permissions: ["repo:read", "repo:branch", "test:run"],
        assignedChannelIds: ["chan-development"],
      });

      this.store.createAgent({
        id: "agent-reviewer",
        name: "Fixture reviewer",
        avatarUrl: "💼",
        role: "Test-only teammate profile",
        description: "In-memory fixture used to exercise local policy and review validation.",
        status: "idle",
        harnessPolicy: { preferredHarnessId: "pydantic", autoResume: true },
        modelPolicy: { preferredTier: 2, preferredModel: "fixture-model-b", preferredProvider: "fixture-provider", allowCloudFallback: false },
        decisionPolicy: { useSystem1Router: true },
        computePolicy: { environment: "none" },
        memoryNamespace: "operations",
        tools: ["records_client", "conversation_client", "knowledge_base"],
        permissions: ["records:read", "records:write", "voice:outbound"],
        assignedChannelIds: ["chan-general", "chan-calls"],
      });
    }

    // Seed sample tasks
    if (this.store.listTasks().length === 0) {
      this.seededSampleData = true;
      this.store.createTask({
        id: "AF-142",
        projectId: "proj-agentforge",
        title: "Fixture work record",
        description: "In-memory task record for local interface and API coverage only.",
        priority: "high",
        status: "ready",
        assignedAgentId: "agent-alex",
        contract: {
          id: "contract-AF-142",
          taskId: "AF-142",
          version: 1,
          // Keep fixture data valid for the boundary editor: execution contracts require a full commit SHA.
          repository: { baseBranch: "origin/master", baseSha: "802e04a802e04a802e04a802e04a802e04a802e04a" },
          workspace: { requireIsolatedWorktree: true },
          scope: { allowedPaths: ["src/**"], protectedPaths: [".env", "package.json"] },
          authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: true },
          requiredChecks: [{ type: "unit_tests", required: true }],
          completion: { requireEvidencePack: true, requireHumanApproval: true },
          createdAt: new Date().toISOString(),
        },
      });
    }

    // Seed sample approval request
    if (this.store.listApprovals().length === 0) {
      this.seededSampleData = true;
      this.store.createApproval({
        taskId: "AF-142",
        requesterAgentId: "agent-alex",
        action: "Fixture approval request (no deployment connected)",
        description: "Fixture record for the local approval interface. No tests, diff evidence, or deployment are attached.",
        risk: "low",
      });
    }

    // Seed sample packages in marketplace
    if (this.store.listPackages().length === 0) {
      this.seededSampleData = true;
      this.store.registerPackage({
        schemaVersion: "1.0.0",
        name: "workspace-operations-pack",
        version: "1.1.0",
        publisher: { id: "pub-example", name: "AgentForge Example Publisher", verified: false },
        description: "Sample package manifest for testing local permission review. No external connection or package execution is provided.",
        license: "Unspecified (sample)",
        agentforgeVersion: ">=0.1.0",
        capabilities: [
          { id: "cap-triage", name: "Request Triage Agent", description: "Organizes incoming workspace requests", type: "agent" },
          { id: "cap-review", name: "Review Workspace", description: "Collects evidence before human review", type: "process" },
        ],
        permissions: {
          filesystem: { workspace: { read: true, write: true } },
          git: { read: true, branch: true, commit: true, forcePush: false },
          network: { outbound: true, allowedDomains: ["example.invalid"] },
        },
        pricing: { model: "FREE" },
      });

      this.store.registerPackage({
        schemaVersion: "1.0.0",
        name: "analytics-reporting-pack",
        version: "2.0.0",
        publisher: { id: "pub-example-analytics", name: "Example Publisher (unverified)", verified: false },
        description: "Placeholder package data for testing marketplace display. No external workflow, subscription, or execution is provided.",
        license: "Proprietary",
        agentforgeVersion: ">=0.1.0",
        capabilities: [
          { id: "cap-reporting", name: "Report Reviewer", description: "Reviews local report inputs", type: "agent" },
        ],
        permissions: {
          filesystem: { workspace: { read: true, write: false } },
          network: { outbound: true },
        },
        pricing: { model: "FREE" },
      });
    }

  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || "/", `http://localhost:${this.port}`);
    const allowedOrigin = this.getAllowedLocalOrigin(req.headers.origin);
    if (!this.isAllowedLocalHost(req.headers.host) || (req.headers.origin && !allowedOrigin)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Requests must come from the local AgentForge origin." }));
      return;
    }
    if (allowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (this.apiToken && url.pathname.startsWith("/api/") && !this.hasValidApiToken(req)) {
      res.writeHead(401, { "Content-Type": "application/json", "WWW-Authenticate": "Bearer" });
      res.end(JSON.stringify({ error: "Authentication required for this AgentForge deployment." }));
      return;
    }

    try {
      // --- Realtime SSE Stream ---
      if (req.method === "GET" && url.pathname === "/api/realtime") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          // Instruct browser to retry after 3 seconds on disconnect
          "X-Accel-Buffering": "no",
        });
        // Explicit EventSource reconnect interval. A comment alone does not
        // change browser retry behavior.
        res.write("retry: 3000\n\n");
        // Send initial heartbeat with current event counter
        res.write(`: heartbeat id=${this.sseEventCounter}\n\n`);

        // Replay missed events if client sends Last-Event-ID on reconnect
        const lastEventIdHeader = req.headers["last-event-id"];
        if (lastEventIdHeader) {
          const lastId = parseInt(String(lastEventIdHeader), 10);
          if (Number.isFinite(lastId) && lastId >= 0) {
            if (!this.isSseReplayComplete(lastId)) {
              // Event IDs are process-local and the ring buffer is bounded.
              // This remains a normal SSE message so older clients with only
              // `onmessage` handlers still refresh rather than ignoring an
              // unfamiliar named event.
              res.write(`data: ${JSON.stringify({ type: "realtime_resync_required", reason: "resume_cursor_unavailable", lastEventId: lastId, currentEventId: this.sseEventCounter })}\n\n`);
            } else {
              const missed = this.getSseEventsAfter(lastId);
              for (const event of missed) {
                res.write(`id: ${event.id}\ndata: ${event.data}\n\n`);
              }
            }
          }
        }

        this.addSseClient(req, res);
        return;
      }


      // --- REST API Endpoints ---
      if (url.pathname.startsWith("/api/")) {
        await this.handleApi(req, res, url);
        return;
      }

      // --- SPA Web UI ---
      if (req.method === "GET") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(this.renderAppHtml());
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    } catch (err) {
      if (err instanceof RequestBodyError) {
        res.writeHead(err.statusCode, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: redactRuntimeError(err) }));
        return;
      }
      if (err instanceof RangeError) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: redactRuntimeError(err) }));
        return;
      }
      const msg = redactRuntimeError(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: msg }));
    }
  }

  private getAllowedLocalOrigin(origin: string | undefined): string | undefined {
    if (!origin) return undefined;
    try {
      const parsed = new URL(origin);
      const hostIsLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      const isAllowedPort = this.isAllowedLocalPort(parsed.port);
      return parsed.protocol === "http:" && isAllowedPort && hostIsLocal
        ? origin
        : undefined;
    } catch {
      return undefined;
    }
  }

  private isAllowedLocalHost(host: string | undefined): boolean {
    if (!host) return false;
    try {
      const parsed = new URL(`http://${host}`);
      const hostIsLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      const isAllowedPort = this.isAllowedLocalPort(parsed.port);
      const configuredHost = this.host.toLowerCase();
      const hostIsConfigured = configuredHost !== "127.0.0.1" && configuredHost !== "localhost"
        && parsed.hostname.toLowerCase() === configuredHost;
      return (hostIsLocal || hostIsConfigured) && isAllowedPort;
    } catch {
      return false;
    }
  }

  private isAllowedLocalPort(port: string): boolean {
    const activeAddress = this.server.address();
    const activePort = typeof activeAddress === "object" && activeAddress !== null
      ? String(activeAddress.port)
      : String(this.port);
    return port === activePort;
  }

  private hasValidApiToken(req: http.IncomingMessage): boolean {
    const header = req.headers.authorization;
    if (!this.apiToken || typeof header !== "string" || !header.startsWith("Bearer ")) return false;
    const supplied = Buffer.from(header.slice(7).trim());
    const expected = Buffer.from(this.apiToken);
    return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
  }

  /**
   * A control plane with no identity system is safe by default only when the
   * listening socket is local.  Host/Origin validation happens after a TCP
   * connection has already reached the server, so it cannot be the boundary
   * that protects an accidentally exposed bind address.
   */
  private isLoopbackBindHost(): boolean {
    const host = this.host.trim().toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  }

  private async readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
    const contentLength = Number(req.headers["content-length"]);
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
      throw new RequestBodyError("Request body exceeds the 8 MiB limit.", 413);
    }

    let body = "";
    let bytesRead = 0;
    for await (const chunk of req) {
      bytesRead += Buffer.isBuffer(chunk) ? chunk.byteLength : Buffer.byteLength(String(chunk));
      if (bytesRead > MAX_REQUEST_BODY_BYTES) {
        throw new RequestBodyError("Request body exceeds the 8 MiB limit.", 413);
      }
      body += chunk;
    }
    if (!body) return {};

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new RequestBodyError("Request body must contain valid JSON.", 400);
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new RequestBodyError("Request JSON must be an object.", 400);
    }
    return parsed as Record<string, unknown>;
  }

  private authenticateCaller(req: http.IncomingMessage): {
    user?: AgentForgeUser;
    role: UserRole;
    permissions: string[];
    isAuthenticated: boolean;
  } {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers["x-api-key"] as string | undefined;
    const sessionToken = authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : sessionTokenFromCookie(req.headers.cookie);

    if (sessionToken) {
      const session = this.store.validateSession(sessionToken);
      if (session) {
        const user = this.store.getUser(session.userId);
        if (user) {
          return { user, role: session.role, permissions: session.permissions, isAuthenticated: true };
        }
      }
    } else if (apiKeyHeader && typeof apiKeyHeader === "string") {
      const keyRecord = this.store.validateApiKey(apiKeyHeader.trim());
      if (keyRecord) {
        const user = this.store.getUser(keyRecord.userId);
        if (user) {
          return { user, role: keyRecord.role, permissions: keyRecord.permissions, isAuthenticated: true };
        }
      }
    }

    // A deployment token protects the entire HTTP boundary before this method
    // runs. Treat that verified token as the local deployment owner as well so
    // strict mode does not accept the connection and then reject every route
    // for lacking a separate UI session. This remains a single deployment
    // identity; multi-user callers must use their own sessions or API keys.
    if (this.hasValidApiToken(req)) {
      const defaultOwner = this.store.getUser("user-owner") || this.store.listUsers().find(u => u.role === "owner");
      return {
        user: defaultOwner,
        role: defaultOwner?.role || "owner",
        permissions: defaultOwner?.permissions || ["*"],
        isAuthenticated: true,
      };
    }

    if (process.env.AGENTFORGE_AUTH_STRICT === "1" || process.env.NODE_ENV === "production") {
      return { role: "viewer", permissions: [], isAuthenticated: false };
    }

    const defaultOwner = this.store.getUser("user-owner") || this.store.listUsers().find(u => u.role === "owner");
    return {
      user: defaultOwner,
      role: defaultOwner?.role || "owner",
      permissions: defaultOwner?.permissions || ["*"],
      isAuthenticated: false,
    };
  }

  private setSessionCookie(res: http.ServerResponse, token: string, expiresAt: string): void {
    const remainingSeconds = Math.max(1, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
    res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${remainingSeconds}`);
  }

  private clearSessionCookie(res: http.ServerResponse): void {
    res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  }

  private async handleApi(req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<void> {
    const path = url.pathname;
    res.setHeader("Content-Type", "application/json");
    const caller = this.authenticateCaller(req);

    // Auth & Identity Endpoints (Section 11: Identity + RBAC)
    // A new local workspace has an owner identity but intentionally no password.
    // Bootstrap is single-use: once a password exists, ordinary login is required.
    if (req.method === "POST" && path === "/api/auth/bootstrap") {
      const ownerSummary = this.store.getUser("user-owner") || this.store.listUsers().find(user => user.role === "owner");
      const owner = ownerSummary ? this.store.getUser(ownerSummary.id) : undefined;
      if (!owner) {
        res.writeHead(409);
        res.end(JSON.stringify({ error: "No workspace owner is available for bootstrap." }));
        return;
      }
      if (owner.passwordHash) {
        res.writeHead(409);
        res.end(JSON.stringify({ error: "Owner setup is already complete. Sign in with the configured owner account." }));
        return;
      }
      const body = await this.readBody(req);
      const password = typeof body.password === "string" ? body.password : "";
      const displayName = typeof body.displayName === "string" ? body.displayName.trim() : undefined;
      if (password.length < 12) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Choose an owner password with at least 12 characters." }));
        return;
      }
      if (displayName !== undefined && !isBoundedString(displayName, 120)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Display name must be between 1 and 120 characters." }));
        return;
      }
      const configured = this.store.updateUser(owner.id, { password, ...(displayName ? { displayName } : {}) });
      const session = this.store.createSession(configured.id);
      this.setSessionCookie(res, session.token, session.expiresAt);
      this.store.recordAudit({
        origin: "web", actorId: configured.id, actorType: "user", action: "auth_owner_bootstrapped",
        targetType: "user", targetId: configured.id, details: { role: configured.role },
      });
      res.writeHead(201);
      res.end(JSON.stringify({
        token: session.token, expiresAt: session.expiresAt,
        user: { id: configured.id, username: configured.username, displayName: configured.displayName, role: configured.role, permissions: configured.permissions },
      }));
      return;
    }

    if (req.method === "POST" && path === "/api/auth/login") {
      const body = await this.readBody(req);
      const username = typeof body.username === "string" ? body.username.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (!username || !password) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Username and password are required" }));
        return;
      }
      const user = this.store.authenticateUser(username, password);
      if (!user) {
        this.store.recordAudit({
          origin: "web",
          actorId: "anonymous",
          actorType: "user",
          action: "auth_login_failed",
          targetType: "user",
          targetId: username,
          details: { username, reason: "Invalid credentials" },
        });
        res.writeHead(401);
        res.end(JSON.stringify({ error: "Invalid username or password" }));
        return;
      }
      const session = this.store.createSession(user.id);
      this.setSessionCookie(res, session.token, session.expiresAt);
      this.store.recordAudit({
        origin: "web",
        actorId: user.id,
        actorType: "user",
        action: "auth_login_success",
        targetType: "user",
        targetId: user.id,
        details: { username: user.username, role: user.role },
      });
      res.writeHead(200);
      res.end(JSON.stringify({
        token: session.token,
        expiresAt: session.expiresAt,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          permissions: user.permissions,
        },
      }));
      return;
    }

    if (req.method === "POST" && path === "/api/auth/logout") {
      const authHeader = req.headers.authorization;
      if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7).trim();
        this.store.revokeSession(token);
      }
      this.clearSessionCookie(res);
      if (caller.user) {
        this.store.recordAudit({
          origin: "web",
          actorId: caller.user.id,
          actorType: "user",
          action: "auth_logout",
          targetType: "user",
          targetId: caller.user.id,
          details: {},
        });
      }
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === "GET" && path === "/api/auth/me") {
      const strictMode = process.env.AGENTFORGE_AUTH_STRICT === "1" || process.env.NODE_ENV === "production";
      res.writeHead(200);
      res.end(JSON.stringify({
        authenticated: caller.isAuthenticated,
        accessMode: caller.isAuthenticated ? "authenticated" : strictMode ? "authentication_required" : "local_unlocked",
        user: caller.user ? {
          id: caller.user.id,
          username: caller.user.username,
          displayName: caller.user.displayName,
          role: caller.role,
          permissions: caller.permissions,
        } : null,
      }));
      return;
    }

    // User Management Endpoints (Section 11)
    if (req.method === "GET" && path === "/api/users") {
      if (!hasPermission(caller.permissions, "users:read") && caller.role !== "owner" && caller.role !== "admin") {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "RBAC permission denied", required: "users:read", role: caller.role }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify(this.store.listUsers()));
      return;
    }

    if (req.method === "POST" && path === "/api/users") {
      if (!hasPermission(caller.permissions, "users:create") && caller.role !== "owner" && caller.role !== "admin") {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "RBAC permission denied", required: "users:create", role: caller.role }));
        return;
      }
      const body = await this.readBody(req);
      if (typeof body.username !== "string" || !body.username.trim() || typeof body.displayName !== "string" || !body.displayName.trim() || typeof body.role !== "string") {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Fields 'username', 'displayName', and 'role' are required" }));
        return;
      }
      try {
        const newUser = this.store.createUser({
          username: body.username.trim(),
          displayName: body.displayName.trim(),
          role: body.role as UserRole,
          email: typeof body.email === "string" ? body.email.trim() : undefined,
          password: typeof body.password === "string" ? body.password : undefined,
          permissions: Array.isArray(body.permissions) ? body.permissions as string[] : undefined,
        });
        this.store.recordAudit({
          origin: "web",
          actorId: caller.user?.id || "admin",
          actorType: "user",
          action: "user_created",
          targetType: "user",
          targetId: newUser.id,
          details: { username: newUser.username, role: newUser.role },
        });
        res.writeHead(201);
        res.end(JSON.stringify({
          id: newUser.id,
          username: newUser.username,
          displayName: newUser.displayName,
          role: newUser.role,
          permissions: newUser.permissions,
        }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: redactRuntimeError(err) }));
      }
      return;
    }

    if (req.method === "PUT" && path.startsWith("/api/users/")) {
      const targetUserId = path.slice("/api/users/".length);
      const body = await this.readBody(req);
      if (body.role && caller.role !== "owner") {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Only workspace owners can alter user roles", role: caller.role }));
        return;
      }
      if (caller.role !== "owner" && caller.role !== "admin" && caller.user?.id !== targetUserId) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "RBAC permission denied", role: caller.role }));
        return;
      }
      const currentTarget = this.store.getUser(targetUserId);
      if (currentTarget?.role === "owner" && body.role && body.role !== "owner"
        && this.store.listUsers().filter(user => user.role === "owner" && user.status === "active").length <= 1) {
        res.writeHead(409);
        res.end(JSON.stringify({ error: "The final active workspace owner cannot be demoted." }));
        return;
      }
      try {
        const updated = this.store.updateUser(targetUserId, {
          displayName: typeof body.displayName === "string" ? body.displayName : undefined,
          role: typeof body.role === "string" ? body.role as UserRole : undefined,
          status: body.status === "active" || body.status === "suspended" ? body.status : undefined,
          password: typeof body.password === "string" ? body.password : undefined,
          permissions: Array.isArray(body.permissions) ? body.permissions as string[] : undefined,
        });
        this.store.recordAudit({
          origin: "web",
          actorId: caller.user?.id || "admin",
          actorType: "user",
          action: "user_updated",
          targetType: "user",
          targetId: updated.id,
          details: { role: updated.role, status: updated.status },
        });
        res.writeHead(200);
        res.end(JSON.stringify({
          id: updated.id,
          username: updated.username,
          displayName: updated.displayName,
          role: updated.role,
          permissions: updated.permissions,
          status: updated.status,
        }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: redactRuntimeError(err) }));
      }
      return;
    }

    if (req.method === "DELETE" && path.startsWith("/api/users/")) {
      const targetUserId = path.slice("/api/users/".length);
      if (caller.role !== "owner") {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Only workspace owners can delete users", role: caller.role }));
        return;
      }
      const currentTarget = this.store.getUser(targetUserId);
      if (currentTarget?.role === "owner"
        && this.store.listUsers().filter(user => user.role === "owner" && user.status === "active").length <= 1) {
        res.writeHead(409);
        res.end(JSON.stringify({ error: "The final active workspace owner cannot be removed." }));
        return;
      }
      try {
        const deleted = this.store.deleteUser(targetUserId);
        if (!deleted) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "User not found" }));
          return;
        }
        this.store.recordAudit({
          origin: "web",
          actorId: caller.user?.id || "owner",
          actorType: "user",
          action: "user_deleted",
          targetType: "user",
          targetId: targetUserId,
          details: {},
        });
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: redactRuntimeError(err) }));
      }
      return;
    }

    // API Key Endpoints (Section 11)
    if (req.method === "POST" && path === "/api/auth/api-keys") {
      if (caller.role !== "owner" && caller.role !== "admin") {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Only admins and owners can generate API keys", role: caller.role }));
        return;
      }
      const body = await this.readBody(req);
      const name = typeof body.name === "string" ? body.name.trim() : "Default API Key";
      const targetUserId = typeof body.userId === "string" ? body.userId : caller.user?.id || "user-owner";
      try {
        const { keyRecord, rawKey } = this.store.createApiKey(targetUserId, name);
        this.store.recordAudit({
          origin: "web",
          actorId: caller.user?.id || "admin",
          actorType: "user",
          action: "api_key_created",
          targetType: "user",
          targetId: keyRecord.id,
          details: { name, keyPrefix: keyRecord.keyPrefix, userId: targetUserId },
        });
        res.writeHead(201);
        res.end(JSON.stringify({
          id: keyRecord.id,
          name: keyRecord.name,
          keyPrefix: keyRecord.keyPrefix,
          rawKey,
          role: keyRecord.role,
          permissions: keyRecord.permissions,
          createdAt: keyRecord.createdAt,
        }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: redactRuntimeError(err) }));
      }
      return;
    }

    if (req.method === "GET" && path === "/api/auth/api-keys") {
      if (caller.role !== "owner" && caller.role !== "admin") {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Only admins and owners can list API keys", role: caller.role }));
        return;
      }
      const keys = this.store.listApiKeys(caller.role === "owner" ? undefined : caller.user?.id);
      res.writeHead(200);
      res.end(JSON.stringify(keys.map(k => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        userId: k.userId,
        role: k.role,
        permissions: k.permissions,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        revoked: k.revoked,
      }))));
      return;
    }

    if (req.method === "DELETE" && path.startsWith("/api/auth/api-keys/")) {
      const keyId = path.slice("/api/auth/api-keys/".length);
      if (caller.role !== "owner" && caller.role !== "admin") {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Only admins and owners can revoke API keys", role: caller.role }));
        return;
      }
      const revoked = this.store.revokeApiKey(keyId);
      if (!revoked) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "API key not found" }));
        return;
      }
      this.store.recordAudit({
        origin: "web",
        actorId: caller.user?.id || "admin",
        actorType: "user",
        action: "api_key_revoked",
        targetType: "user",
        targetId: keyId,
        details: {},
      });
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // Strict mode rejection for unauthenticated requests on non-auth paths
    if ((process.env.AGENTFORGE_AUTH_STRICT === "1" || process.env.NODE_ENV === "production") && !caller.isAuthenticated) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Authentication required" }));
      return;
    }

    // Every mutation below this point is protected even when a new endpoint has
    // not yet declared a narrower capability. Endpoint-specific checks further
    // restrict sensitive actions; this baseline keeps viewers read-only.
    const mutatesControlPlane = !["GET", "HEAD", "OPTIONS"].includes(req.method || "GET");
    // These routes have their own capability-specific denial below. Preserve
    // that narrower error and audit record instead of intercepting it here.
    const hasRouteSpecificWriteGate = /^\/api\/(settings|browser|workflows|projects|agents|tasks|approvals|memory|packages|audit)(?:\/|$)/.test(path);
    if (mutatesControlPlane && caller.role === "viewer" && !hasRouteSpecificWriteGate) {
      this.store.recordAudit({
        origin: "web", actorId: caller.user?.id || "anonymous", actorType: "user", action: "rbac_denied",
        targetType: "system", targetId: path, details: { path, role: caller.role, required: "write-capable role" },
      });
      res.writeHead(403);
      res.end(JSON.stringify({ error: "A write-capable role is required for this action.", role: caller.role }));
      return;
    }

    // Settings Endpoints (Sections 31, 32, 42)
    if (req.method === "GET" && path === "/api/settings") {
      res.writeHead(200);
      res.end(JSON.stringify(this.loadSettings()));
      return;
    }

    if (req.method === "POST" && path === "/api/settings") {
      // Reject credential material at the boundary before role handling so it can
      // never be accepted, echoed, audited, or accidentally persisted.
      const body = await this.readBody(req);
      if (hasSensitiveSettings(body)) {
        res.writeHead(422);
        res.end(JSON.stringify({
          error: "Provider credentials cannot be stored in workspace settings. Use a dedicated connection provider when one is implemented.",
        }));
        return;
      }
      if (!hasPermission(caller.permissions, "settings:write")) {
        this.store.recordAudit({
          origin: "web",
          actorId: caller.user?.id || "anonymous",
          actorType: "user",
          action: "rbac_denied",
          targetType: "system",
          targetId: path,
          details: { path, role: caller.role, required: "settings:write" },
        });
        res.writeHead(403);
        res.end(JSON.stringify({ error: "RBAC permission denied", required: "settings:write", role: caller.role }));
        return;
      }
      this.saveSettings(body);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, settings: this.loadSettings() }));
      return;
    }

    if (req.method === "POST" && path === "/api/settings/test-ollama") {
      const body = await this.readBody(req);
      const endpoint = typeof body.endpoint === "string" && body.endpoint.trim()
        ? body.endpoint.trim()
        : "http://127.0.0.1:11434";
      if (!isLoopbackHttpEndpoint(endpoint)) {
        res.writeHead(400);
        res.end(JSON.stringify({
          error: "Only an unauthenticated HTTP loopback endpoint may be probed from local staging.",
        }));
        return;
      }
      const startMs = Date.now();
      try {
        const parsedUrl = new URL(endpoint);
        const testReq = http.request({
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 11434,
          path: "/api/version",
          method: "GET",
          timeout: 1500,
        }, (testRes) => {
          let data = "";
          testRes.on("data", chunk => { data += chunk; });
          testRes.on("end", () => {
            const latencyMs = Date.now() - startMs;
            let version = "0.1.x";
            try {
              const parsed = JSON.parse(data);
              if (parsed.version) version = parsed.version;
            } catch {}
            res.writeHead(200);
            res.end(JSON.stringify({ connected: true, version, latencyMs, endpoint }));
          });
        });
        testReq.on("error", (err) => {
          res.writeHead(200);
          res.end(JSON.stringify({ connected: false, latencyMs: Date.now() - startMs, error: redactRuntimeError(err), endpoint }));
        });
        testReq.on("timeout", () => {
          testReq.destroy();
          res.writeHead(200);
          res.end(JSON.stringify({ connected: false, latencyMs: 1500, error: "Connection timed out (1500ms)", endpoint }));
        });
        testReq.end();
      } catch (err) {
        res.writeHead(200);
        res.end(JSON.stringify({ connected: false, latencyMs: Date.now() - startMs, error: redactRuntimeError(err), endpoint }));
      }
      return;
    }

    // Autonomous Setup Concierge Endpoints (Meet Nova)
    if (req.method === "POST" && path === "/api/setup/auto-detect") {
      res.writeHead(200);
      res.end(JSON.stringify(this.inspectSetupRuntimeReadiness()));
      return;

    }

    if (req.method === "POST" && path === "/api/setup/apply-preset") {
      res.writeHead(409);
      res.end(JSON.stringify({
        available: false,
        reason: "Workforce presets are not available because they would imply configured model routes and execution capabilities that this staging build cannot verify.",
      }));
      return;

    }

    if (req.method === "GET" && path === "/api/workforce/templates") {
      res.writeHead(200);
      res.end(JSON.stringify({
        templates: [
          {
            id: "engineering_swarm",
            name: "Autonomous Engineering Swarm",
            description: "Full-stack development team with orchestrator, PMO, engineer, QA, and security gates.",
            roles: ["Orchestrator", "PMO", "DevLead", "QA-Release", "Security"]
          },
          {
            id: "research_architecture",
            name: "Research & Systems Architecture",
            description: "Strategic research, systems design, and continuous verification.",
            roles: ["Orchestrator", "Research-Intel", "QA-Release"]
          },
          {
            id: "minimal_lean",
            name: "Minimal Lean Pair",
            description: "Direct lead orchestrator and implementation engineer.",
            roles: ["Orchestrator", "DevLead"]
          }
        ]
      }));
      return;
    }

    if (req.method === "POST" && path === "/api/workforce/apply-template") {
      res.writeHead(409);
      res.end(JSON.stringify({
        available: false,
        reason: "Template installation is disabled in staging because the legacy templates embed unverified model routes and tool claims. Create a teammate with explicit, reviewable policies instead.",
      }));
      return;

    }

    if (req.method === "GET" && path === "/api/status") {
      const channels = this.store.listChannels();
      const hasWorkspaceRecords = this.store.listWorkspaces().length > 1
        || this.store.listSpaces().length > 0
        || channels.length > 0
        || channels.some(channel => this.store.listMessages(channel.id, 1).length > 0)
        || this.store.listAgents().length > 0
        || this.store.listTasks().length > 0
        || this.store.listApprovals().length > 0
        || this.store.listProcesses().length > 0
        || this.store.listCalls().length > 0
        || this.store.listPackages().length > 0
        || this.store.listInstallations().length > 0;
      res.writeHead(200);
      res.end(JSON.stringify({
        status: "active",
        version: "vNext-0.1.0",
        storageMode: this.store.persistenceMode,
        dataMode: (this.seededSampleData || this.hasOnlyFixtureRecords()) ? "SAMPLE_DATA_PRESENT" : hasWorkspaceRecords ? "USER_DATA" : "EMPTY",
        agents: this.store.listAgents().length,
        tasks: this.store.listTasks().length,
        approvals: this.store.listApprovals("pending").length,
        channels: this.store.listChannels().length,
      }));
      return;
    }

    if (req.method === "GET" && path === "/api/completion/sessions") {
      res.writeHead(200);
      res.end(JSON.stringify(this.completionEngine.listSessions()));
      return;
    }

    if (req.method === "POST" && path === "/api/completion/sessions") {
      const body = await this.readBody(req);
      const rawGoalText = typeof body.rawGoalText === "string" ? body.rawGoalText.trim() : "";
      const requestedId = typeof body.taskId === "string" ? body.taskId.trim() : "";
      if (!rawGoalText || rawGoalText.length > 40_000) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "A goal between 1 and 40,000 characters is required." }));
        return;
      }
      if (requestedId && (requestedId.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(requestedId))) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Goal IDs may use letters, numbers, periods, underscores, colons, and hyphens (up to 128 characters)." }));
        return;
      }
      const taskId = requestedId || `goal-${crypto.randomUUID()}`;
      try {
        const session = this.completionEngine.initializeSession(taskId, rawGoalText, "local-workspace-user");
        res.writeHead(201);
        res.end(JSON.stringify(session));
      } catch (error) {
        if (error instanceof Error && error.message.includes("already exists")) {
          res.writeHead(409);
          res.end(JSON.stringify({ error: "A goal with this ID already exists." }));
          return;
        }
        throw error;
      }
      return;
    }

    if (req.method === "GET" && path === "/api/setup-guide/status") {
      const workspace = this.store.getWorkspace();
      const project = workspace ? this.store.listSpaces(workspace.id).find(space => !space.archived) : undefined;
      const channel = project ? this.store.listChannels().find(item => item.spaceId === project.id && !item.archived) : undefined;
      const guide = this.store.getAgent("agent-setup-guide");
      const thread = channel ? this.store.listThreads(channel.id).find(item => item.title === "Workspace setup" && !item.archived) : undefined;
      const sessions = this.completionEngine.listSessions()
        .filter(session => session.originalGoal.submittedBy === "setup-guide")
        .sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt));
      const capabilities = setupGuideCapabilities(this.taskWorkerRuntime);
      const gates = SETUP_GUIDE_GATES.map(gate => ({ ...gate, ready: capabilities[gate.key] }));
      const activeSession = sessions[0];
      const persistedPlan = this.store.listOperationalMemories("setup-guide")
        .filter(record => record.metadata?.kind === "setup_plan")
        .sort((left, right) => Date.parse(right.updatedAt ?? right.createdAt) - Date.parse(left.updatedAt ?? left.createdAt))[0];
      const setupPlan = persistedPlan
        ? (() => { try { return JSON.parse(persistedPlan.content) as ReturnType<typeof proposeSetupPlan>; } catch { return activeSession ? proposeSetupPlan(activeSession.originalGoal.rawText) : undefined; } })()
        : activeSession ? proposeSetupPlan(activeSession.originalGoal.rawText) : undefined;
      const setupAnswers = this.store.listOperationalMemories("setup-guide")
        .filter(record => record.metadata?.kind === "setup_answer")
        .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
        .map(record => ({ questionId: String(record.metadata?.questionId || record.id), answer: record.content, recordedAt: record.createdAt }));
      // Keep the next owner decision explicit. The client should not make a
      // first-time operator infer which of several displayed questions still
      // needs an answer, or ask them to repeat an answer already saved.
      const answeredQuestionIds = new Set(setupAnswers.map(answer => answer.questionId));
      const openQuestions = setupPlan?.questions
        .filter(question => question.required && !answeredQuestionIds.has(question.id)) ?? [];
      const capabilityState = this.store.listOperationalMemories("setup-guide")
        .filter(record => record.metadata?.kind === "setup_capability_state")
        .sort((left, right) => Date.parse(right.updatedAt ?? right.createdAt) - Date.parse(left.updatedAt ?? left.createdAt))[0];
      const setupRevisions = persistedPlan?.revisions ?? [];
      const requirements = activeSession?.prd.requirements.map(requirement => ({
        id: requirement.id,
        title: requirement.title,
        category: requirement.category,
        riskLevel: requirement.riskLevel,
        acceptanceCriteria: requirement.acceptanceCriteria,
      })) ?? [];
      const prepared = Boolean(project && channel && guide && thread && activeSession);
      res.writeHead(200);
      res.end(JSON.stringify({
        prepared,
        project,
        channel,
        guide,
        thread,
        outcome: activeSession?.originalGoal.rawText ?? "",
        requirements,
        requirementCount: requirements.length,
        setupPlan,
        readiness: setupPlan ? summarizeSetupReadiness(setupPlan) : undefined,
        setupAnswers,
        openQuestions,
        nextQuestion: openQuestions[0],
        capabilityState: capabilityState ? (() => { try { return JSON.parse(capabilityState.content); } catch { return undefined; } })() : undefined,
        setupRevisions,
        runtimeReadiness: this.inspectSetupRuntimeReadiness(),
        gates,
        nextAction: !prepared
          ? "Tell the guide the outcome you want to achieve."
          : gates.find(gate => !gate.ready)?.title ?? "Review task boundaries, checks, and approval before work runs.",
      }));
      return;
    }

    if (req.method === "POST" && path === "/api/setup-guide/answers") {
      const body = await this.readBody(req);
      const questionId = typeof body.questionId === "string" ? body.questionId.trim() : "";
      const answer = typeof body.answer === "string" ? body.answer.trim() : "";
      if (!questionId || !answer || questionId.length > 160 || answer.length > 20_000) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "A question ID and answer are required." }));
        return;
      }
      const id = `setup-answer-${questionId.replace(/[^A-Za-z0-9_-]/g, "-")}`;
      const now = new Date().toISOString();
      this.store.saveOperationalMemory({
        id,
        namespace: "setup-guide",
        category: "project_constraint",
        title: `Setup answer: ${questionId}`,
        content: answer,
        tags: ["setup", "answer", questionId],
        metadata: { kind: "setup_answer", questionId },
        createdAt: now,
        updatedAt: now,
        updatedBy: caller.user?.id || "setup-guide",
        version: 1,
      });
      this.store.recordAudit({
        origin: "api",
        actorId: caller.user?.id || "system",
        actorType: "user",
        action: "setup_answer_recorded",
        targetType: "system",
        targetId: id,
        details: { questionId },
      });
      res.writeHead(201);
      res.end(JSON.stringify({ questionId, answer, recordedAt: now, durable: true }));
      return;
    }

    if (req.method === "GET" && path === "/api/system/manifest") {
      res.writeHead(200);
      res.end(JSON.stringify({ product: "AgentForge public system", privateDataIncluded: false, subsystems: PUBLIC_SYSTEM_MANIFEST }));
      return;
    }

    if (req.method === "POST" && path === "/api/browser/validate-action") {
      const body = await this.readBody(req);
      if (!body.observation || typeof body.observation !== "object" || !body.action || typeof body.action !== "object") {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "A browser observation and proposed action are required." }));
        return;
      }
      const observation = body.observation as BrowserObservation;
      const result = new JevUltrafastBrowserPolicy().validate(observation, body.action as BrowserAction);
      this.store.recordAudit({
        origin: "api",
        actorId: caller.user?.id || "system",
        actorType: "user",
        action: "browser_action_validated",
        targetType: "system",
        targetId: observation.id || "browser-observation",
        details: { accepted: result.accepted, reason: result.accepted ? undefined : result.reason },
      });
      res.writeHead(200);
      res.end(JSON.stringify(result));
      return;
    }

    if (req.method === "GET" && path === "/api/browser/sessions") {
      const canControlBrowser = caller.role === "owner" || caller.role === "admin" || hasPermission(caller.permissions, "tasks:execute") || hasPermission(caller.permissions, "tasks:*");
      if (!canControlBrowser) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Browser session control permission required." }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify({ sessions: this.browserSessions.list() }));
      return;
    }

    if (path === "/api/browser/sessions" && req.method === "POST") {
      const canControlBrowser = caller.role === "owner" || caller.role === "admin" || hasPermission(caller.permissions, "tasks:execute") || hasPermission(caller.permissions, "tasks:*");
      if (!canControlBrowser) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Browser session control permission required." }));
        return;
      }
      const body = await this.readBody(req);
      const session = this.browserSessions.attach(String(body.id || ""), String(body.profileReference || ""));
      this.store.recordAudit({ origin: "api", actorId: caller.user?.id || "system", actorType: "user", action: "browser_session_attached", targetType: "system", targetId: session.id, details: { profileReference: session.profileReference } });
      res.writeHead(201);
      res.end(JSON.stringify(session));
      return;
    }

    const browserSessionMatch = path.match(/^\/api\/browser\/sessions\/([^/]+)\/(takeover|return|release|observe|request-write|approve-write)$/);
    if (browserSessionMatch && req.method === "POST") {
      const sessionId = decodeURIComponent(browserSessionMatch[1]);
      const operation = browserSessionMatch[2];
      const canControlBrowser = caller.role === "owner" || caller.role === "admin" || hasPermission(caller.permissions, "tasks:execute") || hasPermission(caller.permissions, "tasks:*");
      const canApproveBrowserWrite = caller.role === "owner" || caller.role === "admin" || hasPermission(caller.permissions, "approvals:decide") || hasPermission(caller.permissions, "approvals:*");
      if (!canControlBrowser || (operation === "approve-write" && !canApproveBrowserWrite)) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: operation === "approve-write" ? "Browser write approval permission required." : "Browser session control permission required." }));
        return;
      }
      const body = await this.readBody(req);
      if ((operation === "observe" && (!body.observation || typeof body.observation !== "object"))
        || (operation === "request-write" && ((!body.observation || typeof body.observation !== "object") || (!body.action || typeof body.action !== "object")))
        || (operation === "approve-write" && typeof body.observationId !== "string")) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: `A valid payload is required for browser session ${operation}.` }));
        return;
      }
      let result: unknown;
      try {
        if (operation === "takeover") result = this.browserSessions.takeOver(sessionId);
        else if (operation === "return") result = this.browserSessions.returnToAgent(sessionId);
        else if (operation === "release") result = this.browserSessions.release(sessionId);
        else if (operation === "observe") result = this.browserSessions.observe(sessionId, body.observation as BrowserObservation);
        else if (operation === "request-write") result = this.browserSessions.requestExternalWrite(sessionId, body.action as BrowserAction, body.observation as BrowserObservation);
        else result = this.browserSessions.approveExternalWrite(sessionId, String(body.observationId || ""));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: redactRuntimeError(error) }));
        return;
      }
      this.store.recordAudit({ origin: "api", actorId: caller.user?.id || "system", actorType: "user", action: `browser_session_${operation.replace("-", "_")}`, targetType: "system", targetId: sessionId, details: operation === "observe" ? { observationId: (body.observation as BrowserObservation)?.id } : operation === "request-write" ? { observationId: (body.action as BrowserAction)?.observationId } : operation === "approve-write" ? { observationId: body.observationId } : {} });
      res.writeHead(200);
      res.end(JSON.stringify(result));
      return;
    }

    if (req.method === "POST" && path === "/api/controller/inspect") {
      const body = await this.readBody(req);
      const input = typeof body.input === "string" ? body.input.trim() : "";
      if (!input || input.length > 40_000) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Describe what you want AgentForge to do." }));
        return;
      }
      const inspection = await this.controller.inspect(input, typeof body.context === "object" && body.context ? body.context as Record<string, unknown> : undefined);
      this.store.recordAudit({
        origin: "api",
        actorId: caller.user?.id || "system",
        actorType: "user",
        action: "controller_inspected",
        targetType: "system",
        targetId: inspection.decision.requestId,
        details: { intent: inspection.intent, requiresApproval: inspection.requiresApproval, providerId: inspection.decision.providerId },
      });
      res.writeHead(200);
      res.end(JSON.stringify(inspection));
      return;
    }

    if (req.method === "POST" && path === "/api/workflows/inspect") {
      if (!hasPermission(caller.permissions, "processes:read") && !hasPermission(caller.permissions, "processes:*")) {
        res.writeHead(403); res.end(JSON.stringify({ error: "RBAC permission denied", required: "processes:read", role: caller.role })); return;
      }
      const body = await this.readBody(req);
      if (!body.process || typeof body.process !== "object") {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "A workflow process definition is required." }));
        return;
      }
      const result = this.workflowEngine.inspect(body.process as Parameters<WorkflowEngine["inspect"]>[0]);
      res.writeHead(200);
      res.end(JSON.stringify(result));
      return;
    }

    if (req.method === "POST" && path === "/api/workflows/goals") {
      if (!hasPermission(caller.permissions, "tasks:create") && !hasPermission(caller.permissions, "tasks:*")) {
        res.writeHead(403); res.end(JSON.stringify({ error: "RBAC permission denied", required: "tasks:create", role: caller.role })); return;
      }
      const body = await this.readBody(req);
      const goal = typeof body.goal === "string" ? body.goal.trim() : "";
      const submittedBy = typeof body.submittedBy === "string" && body.submittedBy.trim() ? body.submittedBy.trim() : "workflow-engine";
      if (!goal || goal.length > 40_000) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "A workflow goal is required." }));
        return;
      }
      const session = this.workflowEngine.beginGoal(goal, submittedBy);
      this.store.recordAudit({
        origin: "api",
        actorId: caller.user?.id || "system",
        actorType: "user",
        action: "workflow_goal_started",
        targetType: "task",
        targetId: session.taskId,
        details: { submittedBy, externalChanges: false, workflowEngine: "workflow-engine" },
      });
      res.writeHead(201);
      res.end(JSON.stringify({ session, externalChanges: false }));
      return;
    }

    const workflowGoalMatch = path.match(/^\/api\/workflows\/goals\/([^/]+)$/);
    if (workflowGoalMatch && req.method === "GET") {
      if (!hasPermission(caller.permissions, "tasks:read") && !hasPermission(caller.permissions, "tasks:*")) {
        res.writeHead(403); res.end(JSON.stringify({ error: "RBAC permission denied", required: "tasks:read", role: caller.role })); return;
      }
      const taskId = decodeURIComponent(workflowGoalMatch[1]);
      const session = this.workflowEngine.getSession(taskId);
      if (!session) { res.writeHead(404); res.end(JSON.stringify({ error: "Workflow goal was not found." })); return; }
      res.writeHead(200); res.end(JSON.stringify({ session, externalChanges: false })); return;
    }

    const workflowStartMatch = path.match(/^\/api\/workflows\/goals\/([^/]+)\/start$/);
    if (workflowStartMatch && req.method === "POST") {
      if (!hasPermission(caller.permissions, "tasks:execute") && !hasPermission(caller.permissions, "tasks:*")) {
        res.writeHead(403); res.end(JSON.stringify({ error: "RBAC permission denied", required: "tasks:execute", role: caller.role })); return;
      }
      const taskId = decodeURIComponent(workflowStartMatch[1]);
      try {
        const session = this.workflowEngine.startGoal(taskId);
        this.store.recordAudit({ origin: "api", actorId: caller.user?.id || "system", actorType: "user", action: "workflow_goal_execution_started", targetType: "task", targetId: taskId, details: { externalChanges: false } });
        res.writeHead(200); res.end(JSON.stringify({ session, externalChanges: false }));
      } catch (error) { res.writeHead(409); res.end(JSON.stringify({ error: redactRuntimeError(error, "Unable to start workflow goal.") })); }
      return;
    }

    const workflowTraceMatch = path.match(/^\/api\/workflows\/goals\/([^/]+)\/traceability$/);
    if (workflowTraceMatch && req.method === "POST") {
      if (!hasPermission(caller.permissions, "tasks:execute") && !hasPermission(caller.permissions, "tasks:*")) {
        res.writeHead(403); res.end(JSON.stringify({ error: "RBAC permission denied", required: "tasks:execute", role: caller.role })); return;
      }
      const taskId = decodeURIComponent(workflowTraceMatch[1]);
      const body = await this.readBody(req);
      if (typeof body.requirementId !== "string" || !body.requirementId.trim()) { res.writeHead(400); res.end(JSON.stringify({ error: "A requirementId is required." })); return; }
      try {
        const session = this.workflowEngine.recordTraceability(taskId, body.requirementId, body.update && typeof body.update === "object" ? body.update : {});
        res.writeHead(200); res.end(JSON.stringify({ session, externalChanges: false }));
      } catch (error) { res.writeHead(409); res.end(JSON.stringify({ error: redactRuntimeError(error, "Unable to record workflow evidence.") })); }
      return;
    }

    if (req.method === "POST" && path === "/api/setup-guide/prepare") {
      const body = await this.readBody(req);
      const rawGoalText = typeof body.rawGoalText === "string" ? body.rawGoalText.trim() : "";
      if (!rawGoalText || rawGoalText.length > 40_000) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Tell the Setup Guide the outcome you want to achieve." }));
        return;
      }
      try {
        const workspace = this.store.getWorkspace();
        if (!workspace) throw new Error("Default workspace is unavailable.");
        // Preparing an outcome is itself a deliberate path choice. Persist the
        // Studio surface so a refresh returns to the guide rather than showing
        // first-run again after the workspace has already been prepared.
        if (!workspace.experience) this.store.updateWorkspace(workspace.id, { experience: "studio" });
        const compactTitle = rawGoalText.replace(/\s+/g, " ").replace(/[.?!].*$/, "").slice(0, 72) || "First project";
        let project = this.store.listSpaces(workspace.id).find(space => !space.archived);
        if (!project) {
          project = this.store.createSpace({
            workspaceId: workspace.id,
            name: compactTitle,
            description: "Created by Setup Guide from the workspace outcome.",
            provider: "agentforge",
          });
        }
        let channel = this.store.listChannels().find(item => item.spaceId === project!.id && !item.archived);
        if (!channel) {
          channel = this.store.createChannel({
            workspaceId: workspace.id,
            spaceId: project.id,
            name: "General",
            visibility: "private",
            archived: false,
            provider: "agentforge",
          });
        }
        let guide = this.store.getAgent("agent-setup-guide");
        if (!guide) {
          guide = this.store.createAgent({
            id: "agent-setup-guide",
            name: "Setup Guide",
            role: "Workspace architect",
            description: "Prepares a reviewable local workspace from the stated outcome and identifies configuration that needs an owner decision.",
            status: "idle",
            harnessPolicy: { preferredHarnessId: "native", autoResume: false },
            modelPolicy: { preferredTier: 2, preferredModel: "unconfigured", preferredProvider: "unconfigured", allowCloudFallback: false },
            decisionPolicy: { useSystem1Router: false },
            computePolicy: { environment: "none" },
            memoryNamespace: "setup-guide",
            tools: [],
            permissions: [],
            assignedChannelIds: [channel.id],
          });
        }
        let guideThread = this.store.listThreads(channel.id).find(thread => thread.title === "Workspace setup" && !thread.archived);
        if (!guideThread) guideThread = this.store.createThread(channel.id, "Workspace setup");
        const session = this.completionEngine.initializeSession(`goal-${crypto.randomUUID()}`, rawGoalText, "setup-guide");
        const setupPlan = proposeSetupPlan(rawGoalText);
        // An approved outcome is enough to create local, sandboxed teammate
        // profiles. This removes a repetitive setup step without treating a
        // profile as a connected model, tool, or external channel.
        const preparedAgents = [...buildCoreSystemAgentDrafts(channel.id), ...buildAgentProvisionDrafts(setupPlan, channel.id)]
          .map(draft => this.store.getAgent(draft.id) ?? this.store.createAgent(draft));
        const planMemoryId = `setup-plan-${project.id}`;
        const now = new Date().toISOString();
        const priorPlan = this.store.listOperationalMemories("setup-guide").find(record => record.id === planMemoryId);
        const nextVersion = (priorPlan?.version ?? 0) + 1;
        const revisions = priorPlan ? [...(priorPlan.revisions ?? []), {
          version: priorPlan.version ?? 1,
          title: priorPlan.title,
          content: priorPlan.content,
          category: priorPlan.category,
          tags: priorPlan.tags,
          archived: Boolean(priorPlan.archived),
          savedAt: priorPlan.updatedAt ?? priorPlan.createdAt,
          actorId: priorPlan.updatedBy,
        }] : [];
        this.store.saveOperationalMemory({
          id: planMemoryId,
          namespace: "setup-guide",
          category: "project_constraint",
          title: `Setup plan: ${compactTitle}`,
          content: JSON.stringify(setupPlan),
          tags: ["setup", "orchestrator", "agent-provisioning"],
          projectId: project.id,
          metadata: { kind: "setup_plan", rawGoalText, version: 1 },
          createdAt: now,
          updatedAt: now,
          updatedBy: "agent-setup-guide",
          version: nextVersion,
          revisions,
        });
        // The guide can prepare a workspace without pretending that a runtime is
        // connected. The worker exposes the same four capability gates used by
        // the Runtime screen; when no worker exists, every gate remains closed.
        const missing = setupGuideMissing(setupGuideCapabilities(this.taskWorkerRuntime));
        // Leave one durable initial handoff in the setup conversation. Reopening
        // onboarding should return the operator to the same guide, not turn the
        // conversation into repeated copies of its welcome message.
        const guideAlreadyIntroduced = this.store.listThreadMessages(guideThread.id)
          .some(message => message.authorId === guide.id);
        if (!guideAlreadyIntroduced) {
          this.store.createMessage({
            channelId: channel.id,
            threadId: guideThread.id,
            authorId: guide.id,
            authorType: "agent",
            content: [
              `I prepared this workspace for: ${rawGoalText}`,
              "I created the project, private General channel, saved requirement plan, and sandboxed teammate profiles.",
              setupPlan.summary,
              `Prepared teammates: ${preparedAgents.map(agent => agent.name).join(", ")}.`,
              missing.length ? `Before work can run, we need to resolve: ${missing.join(" ")}` : "The execution gates are ready for a reviewed plan.",
            ].join("\n\n"),
            externalProvider: "web",
          });
        }
        res.writeHead(201);
        res.end(JSON.stringify({ project, channel, guide, thread: guideThread, session, missing, setupPlan, preparedAgents, sandboxOnly: true }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: redactRuntimeError(error, "The Setup Guide could not prepare this workspace.") }));
      }
      return;
    }

    if (req.method === "POST" && path === "/api/setup-guide/provision") {
      const body = await this.readBody(req);
      if (body.approved !== true) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Agent provisioning requires explicit approval." }));
        return;
      }
      const rawGoalText = typeof body.rawGoalText === "string" ? body.rawGoalText.trim() : "";
      if (!rawGoalText || rawGoalText.length > 40_000) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Tell the Setup Guide the outcome for the agents." }));
        return;
      }
      const workspace = this.store.getWorkspace();
      const project = workspace ? this.store.listSpaces(workspace.id).find(space => !space.archived) : undefined;
      const channel = project ? this.store.listChannels().find(item => item.spaceId === project.id && !item.archived) : undefined;
      if (!channel) {
        res.writeHead(409);
        res.end(JSON.stringify({ error: "Prepare the workspace before provisioning agents." }));
        return;
      }
      try {
        const plan = proposeSetupPlan(rawGoalText);
        const drafts = [...buildCoreSystemAgentDrafts(channel.id), ...buildAgentProvisionDrafts(plan, channel.id)];
        const created = drafts.map(draft => {
          const existing = this.store.getAgent(draft.id);
          return existing ?? this.store.createAgent(draft);
        });
        this.store.recordAudit({
          origin: "web",
          actorId: caller.user?.id || "anonymous",
          actorType: "user",
          action: "setup_agents_provisioned",
          targetType: "workspace",
          targetId: workspace?.id || "default",
          details: { goal: rawGoalText, agentIds: created.map(agent => agent.id), sandboxOnly: true },
        });
        res.writeHead(201);
        res.end(JSON.stringify({ plan, agents: created, sandboxOnly: true }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: redactRuntimeError(error, "Could not provision the proposed agents.") }));
      }
      return;
    }

    if (req.method === "POST" && path === "/api/setup-guide/capabilities") {
      const body = await this.readBody(req);
      const rawGoalText = typeof body.rawGoalText === "string" ? body.rawGoalText.trim() : "";
      if (!rawGoalText || rawGoalText.length > 40_000) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Tell the Setup Guide the outcome for capability planning." }));
        return;
      }
      const plan = proposeSetupPlan(rawGoalText);
      const capabilities = proposeCapabilitySetup(plan);
      res.writeHead(200);
      res.end(JSON.stringify({ plan, readiness: summarizeSetupReadiness(plan), capabilities, externalChanges: false }));
      return;
    }

    if (req.method === "POST" && path === "/api/setup-guide/execute-capabilities") {
      const body = await this.readBody(req);
      const rawGoalText = typeof body.rawGoalText === "string" ? body.rawGoalText.trim() : "";
      const approved = Array.isArray(body.approved) && body.approved.every((value: unknown) => typeof value === "string")
        ? body.approved as string[] : [];
      if (!rawGoalText || rawGoalText.length > 40_000) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Tell the Setup Guide the outcome for capability setup." }));
        return;
      }
      const plan = proposeSetupPlan(rawGoalText);
      const proposals = proposeCapabilitySetup(plan);
      const results = new CapabilitySetupExecutor().apply(proposals, approved);
      const now = new Date().toISOString();
      // Persist the guide's capability decision so a restart or another client
      // can continue from the same setup state instead of asking again.
      this.store.saveOperationalMemory({
        id: "setup-capability-state",
        namespace: "setup-guide",
        category: "project_constraint",
        title: "Setup capability state",
        content: JSON.stringify({ goal: rawGoalText, approved, results }),
        tags: ["setup", "capabilities", "durable-state"],
        metadata: { kind: "setup_capability_state", goal: rawGoalText },
        createdAt: now,
        updatedAt: now,
        updatedBy: caller.user?.id || "setup-guide",
        version: 1,
      });
      this.store.recordAudit({
        origin: "web",
        actorId: caller.user?.id || "anonymous",
        actorType: "user",
        action: "setup_capabilities_evaluated",
        targetType: "workspace",
        targetId: this.store.getWorkspace()?.id || "default",
        details: {
          goal: rawGoalText,
          approvedCapabilities: approved,
          ready: results.filter(result => result.status === "ready").length,
          pending: results.filter(result => result.status === "approval_required").length,
          externalChanges: false,
        },
      });
      res.writeHead(200);
      res.end(JSON.stringify({ results, externalChanges: false }));
      return;
    }

    if (req.method === "GET" && path === "/api/setup-guide/connections") {
      const workspaceId = typeof url.searchParams.get("workspaceId") === "string" ? url.searchParams.get("workspaceId") || undefined : undefined;
      res.writeHead(200);
      res.end(JSON.stringify({ connections: this.channelConnections.list(workspaceId), externalChanges: false }));
      return;
    }

    if (req.method === "GET" && path === "/api/setup-guide/connections/health") {
      const connections = this.channelConnections.list();
      const checks = connections.map(record => ({
        id: record.id,
        provider: record.provider,
        state: record.state,
        adapterAvailable: true,
        approvalRequired: record.state === "live_pending_approval",
        externalChanges: false,
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ checks, externalChanges: false }));
      return;
    }

    if (req.method === "POST" && path === "/api/setup-guide/connections") {
      const body = await this.readBody(req);
      const provider = body.provider;
      const workspaceId = typeof body.workspaceId === "string" && body.workspaceId.trim()
        ? body.workspaceId.trim() : this.store.getWorkspace()?.id || "ws-default";
      if (provider !== "telegram" && provider !== "discord" && provider !== "slack") {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Supported public channels are Telegram, Discord, and Slack." }));
        return;
      }
      const mode = body.mode === "live" ? "live" : "sandbox";
      const credentialReference = typeof body.credentialReference === "string" ? body.credentialReference.trim() : "";
      if (mode === "live" && !credentialReference) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Live connections require a secret reference, never a raw credential." }));
        return;
      }
      const record = mode === "live"
        ? this.channelConnections.requestLive(provider, workspaceId, credentialReference)
        : this.channelConnections.registerSandbox(provider, workspaceId);
      const check = this.channelConnections.check(record.id, body.approved === true);
      this.store.recordAudit({
        origin: "web",
        actorId: caller.user?.id || "anonymous",
        actorType: "user",
        action: "channel_connection_checked",
        targetType: "workspace",
        targetId: workspaceId,
        details: { provider, mode, state: check.state, externalChanges: false },
      });
      res.writeHead(200);
      res.end(JSON.stringify({ record: this.channelConnections.get(record.id), check, externalChanges: false }));
      return;
    }

    if (req.method === "POST" && path === "/api/setup-guide/connections/callback") {
      const body = await this.readBody(req);
      const recordId = typeof body.recordId === "string" ? body.recordId.trim() : "";
      const provider = body.provider === "telegram" || body.provider === "discord" || body.provider === "slack" ? body.provider : undefined;
      const externalWorkspaceId = typeof body.externalWorkspaceId === "string" ? body.externalWorkspaceId.trim() : "";
      const credentialReference = typeof body.credentialReference === "string" ? body.credentialReference.trim() : "";
      if (!recordId || !provider || !externalWorkspaceId || !credentialReference) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Callback requires the connection ID, provider workspace ID, and secret reference." }));
        return;
      }
      try {
        const record = this.channelConnections.completeAuthCallback({ connectionId: recordId, provider, externalWorkspaceId, credentialReference, approved: body.approved === true });
        const check = this.channelConnections.check(record.id, body.approved === true);
        this.store.recordAudit({
          origin: "web",
          actorId: caller.user?.id || "anonymous",
          actorType: "user",
          action: "channel_connection_callback_recorded",
          targetType: "workspace",
          targetId: record.workspaceId,
          details: { provider: record.provider, state: check.state, externalChanges: false },
        });
        res.writeHead(200);
        res.end(JSON.stringify({ record: this.channelConnections.get(record.id), check, externalChanges: false }));
      } catch (error) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: redactRuntimeError(error, "Connection callback could not be recorded.") }));
      }
      return;
    }

    if (req.method === "GET" && path === "/api/setup-guide/channel-runtime") {
      res.writeHead(200);
      res.end(JSON.stringify({ runtimes: this.channelRuntime.list(), nativeTelegramSession: inspectTelegramSessionConfig(), telegramBotApi: inspectTelegramBotConfig(), discordBot: inspectDiscordBotConfig(), nativeSlackSocketMode: inspectSlackSocketModeConfig(), externalChanges: false }));
      return;
    }

    if (req.method === "POST" && path === "/api/setup-guide/channel-runtime") {
      const body = await this.readBody(req);
      const provider = body.provider;
      if (provider !== "telegram" && provider !== "discord" && provider !== "slack") {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Supported public channels are Telegram, Discord, and Slack." }));
        return;
      }
      const action = body.action === "stop" ? "stop" : "start";
      const status = action === "start" ? await this.channelRuntime.start(provider) : await this.channelRuntime.stop(provider);
      res.writeHead(200);
      res.end(JSON.stringify({ status, externalChanges: false }));
      return;
    }

    const completionTraceabilityMatch = path.match(/^\/api\/completion\/sessions\/([^/]+)\/traceability\/([^/]+)$/);
    if (completionTraceabilityMatch && req.method === "POST") {
      if (!hasPermission(caller.permissions, "tasks:write") && !hasPermission(caller.permissions, "tasks:*") && caller.role !== "owner") {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Task write permission required to record traceability." }));
        return;
      }
      const taskId = decodeURIComponent(completionTraceabilityMatch[1]);
      const requirementId = decodeURIComponent(completionTraceabilityMatch[2]);
      const body = await this.readBody(req);
      const fields = ["taskIds", "codeArtifacts", "testNames", "evidencePackIds"] as const;
      const isReferenceList = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 100 &&
        value.every(item => typeof item === "string" && item.trim().length > 0 && item.trim().length <= 500);
      if (fields.some(field => body[field] !== undefined && !isReferenceList(body[field]))) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Traceability references must be lists of up to 100 non-empty strings under 500 characters." }));
        return;
      }
      try {
        const session = this.completionEngine.recordRequirementTraceability(taskId, requirementId, {
          ...(isReferenceList(body.taskIds) ? { taskIds: body.taskIds } : {}),
          ...(isReferenceList(body.codeArtifacts) ? { codeArtifacts: body.codeArtifacts } : {}),
          ...(isReferenceList(body.testNames) ? { testNames: body.testNames } : {}),
          ...(isReferenceList(body.evidencePackIds) ? { evidencePackIds: body.evidencePackIds } : {}),
        });
        res.writeHead(200);
        res.end(JSON.stringify(session));
      } catch (error) {
        const message = redactRuntimeError(error);
        res.writeHead(message.includes("not found") ? 404 : 400);
        res.end(JSON.stringify({ error: message }));
      }
      return;
    }

    const completionSessionActionMatch = path.match(/^\/api\/completion\/sessions\/([^/]+)\/(start|run|report)$/);
    if (completionSessionActionMatch) {
      const taskId = decodeURIComponent(completionSessionActionMatch[1]);
      const action = completionSessionActionMatch[2];
      const session = this.completionEngine.getSession(taskId);
      if (!session) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Goal session not found." }));
        return;
      }
      if (req.method === "POST" && action === "start") {
        try {
          const started = this.completionEngine.startExecution(taskId);
          res.writeHead(200);
          res.end(JSON.stringify(started));
        } catch (err) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: redactRuntimeError(err) }));
        }
        return;
      }
      if (req.method === "POST" && action === "run") {
        if (!hasPermission(caller.permissions, "tasks:execute") && !hasPermission(caller.permissions, "tasks:*")) {
          this.store.recordAudit({
            origin: "web",
            actorId: caller.user?.id || "anonymous",
            actorType: "user",
            action: "rbac_denied",
            targetType: "task",
            targetId: taskId,
            details: { path, role: caller.role, required: "tasks:execute" },
          });
          res.writeHead(403);
          res.end(JSON.stringify({ error: "RBAC permission denied", required: "tasks:execute", role: caller.role }));
          return;
        }
        if (!this.taskWorkerRuntime?.isRunning()) {
          res.writeHead(409);
          res.end(JSON.stringify({ error: "Agent worker is not connected." }));
          return;
        }
        try {
          const executed = await this.taskWorkerRuntime.executeTask(taskId);
          res.writeHead(200);
          res.end(JSON.stringify({ task: executed, session: this.completionEngine.getSession(taskId) }));
        } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: redactRuntimeError(err) }));
        }
        return;
      }
      if (req.method === "GET" && action === "report") {
        try {
          const report = this.completionEngine.generateFinalReport(taskId);
          res.writeHead(200);
          res.end(JSON.stringify({ taskId, report }));
        } catch (err) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: redactRuntimeError(err) }));
        }
        return;
      }
    }

    const completionSessionMatch = path.match(/^\/api\/completion\/sessions\/([^/]+)$/);
    if (req.method === "GET" && completionSessionMatch) {
      const taskId = decodeURIComponent(completionSessionMatch[1]);
      const session = this.completionEngine.getSession(taskId);
      if (!session) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Goal session not found." }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify(session));
      return;
    }

    if (req.method === "GET" && path === "/api/workspace") {
      res.writeHead(200);
      res.end(JSON.stringify({
        workspace: this.store.getWorkspace(),
        spaces: this.store.listSpaces(),
        channels: this.store.listChannels(),
      }));
      return;
    }

    if (req.method === "GET" && path === "/api/workspaces") {
      res.writeHead(200);
      res.end(JSON.stringify(this.store.listWorkspaces()));
      return;
    }

    const workspaceUpdateRoute = path.match(/^\/api\/workspaces\/([^/]+)$/);
    if (workspaceUpdateRoute && req.method === "PATCH") {
      const body = await this.readBody(req);
      const experiences = ["command", "workspace", "studio"] as const;
      if ((body.name !== undefined && !isBoundedString(body.name, 120))
        || (body.description !== undefined && (typeof body.description !== "string" || body.description.length > 4000))
        || (body.experience !== undefined && !experiences.includes(body.experience as typeof experiences[number]))) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Workspace name, description, or experience is invalid." }));
        return;
      }
      try {
        const workspace = this.store.updateWorkspace(workspaceUpdateRoute[1], {
          ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
          ...(typeof body.description === "string" ? { description: body.description.trim() } : {}),
          ...(typeof body.experience === "string" ? { experience: body.experience as import("../core/types/workspace.js").WorkspaceExperience } : {}),
        });
        res.writeHead(200);
        res.end(JSON.stringify(workspace));
      } catch (error) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: redactRuntimeError(error, "Workspace not found.") }));
      }
      return;
    }

    if (req.method === "POST" && path === "/api/workspaces") {
      const body = await this.readBody(req);
      if (!isBoundedString(body.name, 120)
        || (body.description !== undefined && (typeof body.description !== "string" || body.description.length > 4000))) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Workspace name is required; description must be at most 4000 characters." }));
        return;
      }
      const workspace = this.store.createWorkspace({
        name: body.name.trim(),
        ...(typeof body.description === "string" && body.description.trim() ? { description: body.description.trim() } : {}),
      });
      res.writeHead(201);
      res.end(JSON.stringify(workspace));
      return;
    }

    const projectFileRoute = path.match(/^\/api\/projects\/([^/]+)\/(repository|files|file)$/);
    if (projectFileRoute) {
      if ((caller.role !== "owner" && caller.role !== "admin") || !hasPermission(caller.permissions, req.method === "GET" ? "settings:read" : "settings:write")) { res.writeHead(403); res.end(JSON.stringify({ error: "Project file access requires an authorized owner or administrator." })); return; }
      const project = this.store.getSpace(projectFileRoute[1]);
      if (!project) { res.writeHead(404); res.end(JSON.stringify({ error: "Project not found." })); return; }
      try {
        const action = projectFileRoute[2];
        if (action === "repository" && req.method === "POST") {
          const body = await this.readBody(req);
          if (project.archived) throw new ProjectFileError("Restore this project before connecting files.", 409);
          if (!isBoundedString(body.path, 2000) || body.mode !== "read") throw new ProjectFileError("Choose a project folder and read-only access.");
          const access = await connectProjectFolder(body.path, caller.user?.id || "local-owner");
          this.store.updateSpace(project.id, { repositoryPath: access.rootPath, repositoryAccess: access });
          this.store.recordAudit({ origin: "web", actorId: access.grantedBy, actorType: "user", action: "project_files_connected", targetType: "space", targetId: project.id, details: { mode: "read" } });
          res.writeHead(200); res.end(JSON.stringify({ connected: true, rootPath: access.rootPath, mode: "read" })); return;
        }
        if (action === "repository" && req.method === "DELETE") {
          this.store.updateSpace(project.id, { repositoryAccess: undefined });
          this.store.recordAudit({ origin: "web", actorId: caller.user?.id || "local-owner", actorType: "user", action: "project_files_disconnected", targetType: "space", targetId: project.id, details: {} });
          res.writeHead(200); res.end(JSON.stringify({ connected: false })); return;
        }
        if (req.method === "GET" && (action === "files" || action === "file")) {
          const relative = url.searchParams.get("path") || "";
          const result = action === "files" ? await listProjectFiles(project, relative) : await readProjectFile(project, relative);
          res.setHeader("Cache-Control", "no-store"); res.writeHead(200); res.end(JSON.stringify(result)); return;
        }
        res.writeHead(405); res.end(JSON.stringify({ error: "Method not supported." })); return;
      } catch (error) {
        res.writeHead(error instanceof ProjectFileError ? error.status : 500);
        res.end(JSON.stringify({ error: error instanceof ProjectFileError ? redactRuntimeError(error) : "Project files could not be read. Check folder availability and permissions." })); return;
      }
    }
    const projectRoute = path.match(/^\/api\/projects(?:\/([^/]+))?$/);
    if (projectRoute) {
      if (req.method === "GET" && !projectRoute[1]) {
        res.writeHead(200); res.end(JSON.stringify(this.store.listWorkspaces().flatMap(workspace => this.store.listSpaces(workspace.id)))); return;
      }
      if (req.method === "POST" || (req.method === "PATCH" && projectRoute[1])) {
        const body = await this.readBody(req);
        const creating = req.method === "POST";
        if ((creating && !isBoundedString(body.name, 120)) ||
            (body.name !== undefined && !isBoundedString(body.name, 120)) ||
            (body.description !== undefined && (typeof body.description !== "string" || body.description.length > 4000)) ||
            (body.instructions !== undefined && (typeof body.instructions !== "string" || body.instructions.length > 20000)) ||
            (body.repositoryPath !== undefined && (typeof body.repositoryPath !== "string" || body.repositoryPath.length > 2000)) ||
            (body.archived !== undefined && typeof body.archived !== "boolean")) {
          res.writeHead(400); res.end(JSON.stringify({ error: "Invalid project fields." })); return;
        }
        const changes = {
          ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
          ...(typeof body.description === "string" ? { description: body.description } : {}),
          ...(typeof body.instructions === "string" ? { instructions: body.instructions } : {}),
          ...(typeof body.repositoryPath === "string" ? { repositoryPath: body.repositoryPath } : {}),
          ...(typeof body.archived === "boolean" ? { archived: body.archived } : {}),
        };
        if (creating) {
          const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "ws-default";
          if (!this.store.getWorkspace(workspaceId)) { res.writeHead(400); res.end(JSON.stringify({ error: "Workspace not found." })); return; }
          const project = this.store.createSpace({ ...changes, name: String(body.name).trim(), workspaceId, provider: "agentforge" });
          this.store.createChannel({ workspaceId, spaceId: project.id, name: "General", provider: "agentforge", visibility: "private", archived: false });
          res.writeHead(201); res.end(JSON.stringify(project)); return;
        }
        if (!this.store.getSpace(projectRoute[1])) { res.writeHead(404); res.end(JSON.stringify({error:"Project not found."})); return; }
        const existingProject = this.store.getSpace(projectRoute[1])!;
        res.writeHead(200); res.end(JSON.stringify(this.store.updateSpace(projectRoute[1], { ...changes, ...(changes.repositoryPath !== undefined && changes.repositoryPath !== existingProject.repositoryPath ? { repositoryAccess: undefined } : {}) }))); return;
      }
    }

    if (req.method === "GET" && path === "/api/spaces") {
      const workspaceId = url.searchParams.get("workspaceId") || "ws-default";
      const parentSpaceId = url.searchParams.get("parentSpaceId");
      if (!this.store.getWorkspace(workspaceId)) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Workspace not found." }));
        return;
      }
      res.writeHead(200);
      const spaces = this.store.listSpaces(workspaceId);
      res.end(JSON.stringify(parentSpaceId ? spaces.filter(space => space.parentSpaceId === parentSpaceId) : spaces));
      return;
    }

    if (req.method === "POST" && path === "/api/spaces") {
      const body = await this.readBody(req);
      const provider = body.provider ?? "agentforge";
      if (!isBoundedString(body.workspaceId, 80) || !this.store.getWorkspace(body.workspaceId)
        || !isBoundedString(body.name, 120) || !workspaceProviders.has(String(provider))
        || (body.parentSpaceId !== undefined && (!isBoundedString(body.parentSpaceId, 100)
          || !this.store.getSpace(body.parentSpaceId)
          || this.store.getSpace(body.parentSpaceId)?.workspaceId !== body.workspaceId))
        || (body.description !== undefined && (typeof body.description !== "string" || body.description.length > 4000))) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Space fields are invalid or reference a missing workspace." }));
        return;
      }
      const space = this.store.createSpace({
        workspaceId: body.workspaceId,
        name: body.name.trim(),
        provider: provider as "agentforge" | "telegram" | "discord" | "slack" | "web" | "cli" | "api",
        ...(typeof body.parentSpaceId === "string" && body.parentSpaceId.trim() ? { parentSpaceId: body.parentSpaceId.trim() } : {}),
        ...(typeof body.description === "string" && body.description.trim() ? { description: body.description.trim() } : {}),
      });
      res.writeHead(201);
      res.end(JSON.stringify(space));
      return;
    }

    if (req.method === "GET" && path === "/api/channels") {
      const spaceId = url.searchParams.get("spaceId");
      if (spaceId && !this.store.listWorkspaces().some(workspace => this.store.listSpaces(workspace.id).some(space => space.id === spaceId))) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Space not found." }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify(this.store.listChannels(spaceId || undefined)));
      return;
    }

    if (req.method === "POST" && path === "/api/channels") {
      const body = await this.readBody(req);
      const space = typeof body.spaceId === "string"
        ? this.store.listWorkspaces().flatMap(workspace => this.store.listSpaces(workspace.id)).find(item => item.id === body.spaceId)
        : undefined;
      const provider = body.provider ?? "agentforge";
      const visibility = body.visibility ?? "public";
      if (!isBoundedString(body.workspaceId, 80) || !this.store.getWorkspace(body.workspaceId)
        || !space || space.workspaceId !== body.workspaceId || !isBoundedString(body.name, 120)
        || !workspaceProviders.has(String(provider)) || !channelVisibilities.has(String(visibility))
        || (body.topic !== undefined && (typeof body.topic !== "string" || body.topic.length > 1000))) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Channel fields are invalid or workspace and space do not match." }));
        return;
      }
      const channel = this.store.createChannel({
        workspaceId: body.workspaceId,
        spaceId: space.id,
        name: body.name.trim(),
        visibility: visibility as "public" | "private" | "agent_only",
        archived: false,
        provider: provider as "agentforge" | "telegram" | "discord" | "slack" | "web" | "cli" | "api",
        ...(typeof body.topic === "string" && body.topic.trim() ? { topic: body.topic.trim() } : {}),
      });
      res.writeHead(201);
      res.end(JSON.stringify(channel));
      return;
    }

    if (req.method === "GET" && path === "/api/agents") {
      res.writeHead(200);
      res.end(JSON.stringify(this.store.listAgents()));
      return;
    }

    if (req.method === "PATCH" && /^\/api\/agents\/[^/]+$/.test(path)) {
      if (!hasPermission(caller.permissions, "agents:update") && !hasPermission(caller.permissions, "agents:*")) {
        res.writeHead(403); res.end(JSON.stringify({ error: "Your role cannot edit agent profiles." })); return;
      }
      const body = await this.readBody(req);
      const id = decodeURIComponent(path.split("/").at(-1)!);
      const agent = this.store.getAgent(id);
      if (!agent) { res.writeHead(404); res.end(JSON.stringify({ error: "Agent not found." })); return; }
      if (!isBoundedString(body.name, 120) || !isBoundedString(body.role, 120)
        || typeof body.description !== "string" || body.description.length > 4000
        || Object.keys(body).some(key => !["name", "role", "description", "expectedUpdatedAt"].includes(key))) {
        res.writeHead(400); res.end(JSON.stringify({ error: "Only name, role and description may be edited here." })); return;
      }
      if (body.expectedUpdatedAt !== agent.updatedAt) {
        res.writeHead(409); res.end(JSON.stringify({ error: "This profile changed. Reopen it before saving." })); return;
      }
      const updated = this.store.updateAgent(id, { name: body.name.trim(), role: body.role.trim(), description: body.description });
      this.store.recordAudit({ origin: "web", actorId: caller.user?.id || "local-owner", actorType: "user", action: "agent_profile_updated", targetType: "agent", targetId: id, details: { fields: ["name", "role", "description"] } });
      res.writeHead(200); res.end(JSON.stringify(updated)); return;
    }

    if (req.method === "POST" && path === "/api/agents") {
      if (!hasPermission(caller.permissions, "agents:create") && !hasPermission(caller.permissions, "agents:*")) {
        this.store.recordAudit({
          origin: "web",
          actorId: caller.user?.id || "anonymous",
          actorType: "user",
          action: "rbac_denied",
          targetType: "agent",
          targetId: "new",
          details: { path, role: caller.role, required: "agents:create" },
        });
        res.writeHead(403);
        res.end(JSON.stringify({ error: "RBAC permission denied", required: "agents:create", role: caller.role }));
        return;
      }
      const body = await this.readBody(req);
      const harness = body.harnessPolicy === undefined ? {} : body.harnessPolicy;
      const model = body.modelPolicy === undefined ? {} : body.modelPolicy;
      const decision = body.decisionPolicy === undefined ? {} : body.decisionPolicy;
      const compute = body.computePolicy === undefined ? {} : body.computePolicy;
      if (!isRecord(harness) || !isRecord(model) || !isRecord(decision) || !isRecord(compute)
        || !isBoundedString(body.name, 120) || !isBoundedString(body.role, 120)
        || (body.description !== undefined && (typeof body.description !== "string" || body.description.length > 4000))
        || (body.id !== undefined && (typeof body.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(body.id)))
        || (body.status !== undefined && body.status !== "idle")
        || (body.avatarUrl !== undefined && (typeof body.avatarUrl !== "string" || body.avatarUrl.length > 500))
        || (harness.preferredHarnessId !== undefined && (typeof harness.preferredHarnessId !== "string" || !harnessIds.has(harness.preferredHarnessId)))
        || (harness.fallbackHarnessId !== undefined && (typeof harness.fallbackHarnessId !== "string" || !harnessIds.has(harness.fallbackHarnessId)))
        || (harness.autoResume !== undefined && typeof harness.autoResume !== "boolean")
        || (harness.maxSessionDurationSeconds !== undefined && (typeof harness.maxSessionDurationSeconds !== "number" || !Number.isFinite(harness.maxSessionDurationSeconds) || harness.maxSessionDurationSeconds <= 0))
        || (model.preferredTier !== undefined && (typeof model.preferredTier !== "number" || !Number.isInteger(model.preferredTier) || model.preferredTier < 0 || model.preferredTier > 4))
        || (model.preferredModel !== undefined && !isBoundedString(model.preferredModel, 120))
        || (model.preferredProvider !== undefined && !isBoundedString(model.preferredProvider, 80))
        || (model.allowCloudFallback !== undefined && typeof model.allowCloudFallback !== "boolean")
        || (model.maxTokensPerRequest !== undefined && (typeof model.maxTokensPerRequest !== "number" || !Number.isSafeInteger(model.maxTokensPerRequest) || model.maxTokensPerRequest < 1))
        || (model.maxCostUsdPerTask !== undefined && (typeof model.maxCostUsdPerTask !== "number" || !Number.isFinite(model.maxCostUsdPerTask) || model.maxCostUsdPerTask < 0))
        || (decision.useSystem1Router !== undefined && typeof decision.useSystem1Router !== "boolean")
        || (decision.decisionProviderId !== undefined && !isBoundedString(decision.decisionProviderId, 80))
        || (compute.environment !== undefined && (typeof compute.environment !== "string" || !computeEnvironments.has(compute.environment)))
        || (compute.sandboxTimeoutSeconds !== undefined && (typeof compute.sandboxTimeoutSeconds !== "number" || !Number.isFinite(compute.sandboxTimeoutSeconds) || compute.sandboxTimeoutSeconds <= 0))
        || (compute.allowedNetworkOutbound !== undefined && !isStringList(compute.allowedNetworkOutbound))
        || (body.memoryNamespace !== undefined && !isBoundedString(body.memoryNamespace, 120))
        || (body.tools !== undefined && !isStringList(body.tools))
        || (body.permissions !== undefined && (!isStringList(body.permissions) || body.permissions.some(permission => !/^[a-z][a-z0-9_-]*:[a-z][a-z0-9_-]*$/.test(permission))))
        || (body.assignedChannelIds !== undefined && (!isStringList(body.assignedChannelIds) || body.assignedChannelIds.some(id => !this.store.getChannel(id))))
        || body.defaultExecutionContract !== undefined) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Agent fields are invalid or request a capability this API does not yet support." }));
        return;
      }

      const harnessPolicy: HarnessPolicy = {
        preferredHarnessId: String(harness.preferredHarnessId ?? "native"),
        autoResume: Boolean(harness.autoResume ?? false),
        ...(typeof harness.fallbackHarnessId === "string" ? { fallbackHarnessId: harness.fallbackHarnessId } : {}),
        ...(typeof harness.maxSessionDurationSeconds === "number" ? { maxSessionDurationSeconds: harness.maxSessionDurationSeconds } : {}),
      };
      const modelPolicy: ModelPolicy = {
        preferredTier: Number(model.preferredTier ?? 2) as ModelPolicy["preferredTier"],
        preferredModel: String(model.preferredModel ?? "unconfigured"),
        preferredProvider: String(model.preferredProvider ?? "unconfigured"),
        allowCloudFallback: Boolean(model.allowCloudFallback ?? false),
        ...(typeof model.maxTokensPerRequest === "number" ? { maxTokensPerRequest: model.maxTokensPerRequest } : {}),
        ...(typeof model.maxCostUsdPerTask === "number" ? { maxCostUsdPerTask: model.maxCostUsdPerTask } : {}),
      };
      const decisionPolicy: DecisionPolicy = {
        useSystem1Router: Boolean(decision.useSystem1Router ?? false),
        ...(typeof decision.decisionProviderId === "string" ? { decisionProviderId: decision.decisionProviderId } : {}),
      };
      const computePolicy: ComputePolicy = {
        environment: (compute.environment ?? "none") as ComputePolicy["environment"],
        ...(typeof compute.sandboxTimeoutSeconds === "number" ? { sandboxTimeoutSeconds: compute.sandboxTimeoutSeconds } : {}),
        ...(Array.isArray(compute.allowedNetworkOutbound) ? { allowedNetworkOutbound: compute.allowedNetworkOutbound as string[] } : {}),
      };

      if (typeof body.id === "string" && this.store.getAgent(body.id)) {
        res.writeHead(409);
        res.end(JSON.stringify({ error: "Agent id already exists." }));
        return;
      }
      const agent: Omit<AgentTeammate, "createdAt" | "updatedAt" | "id"> & { id?: string } = {
        ...(typeof body.id === "string" ? { id: body.id } : {}),
        name: body.name,
        role: body.role,
        description: typeof body.description === "string" ? body.description : "",
        status: "idle",
        harnessPolicy,
        modelPolicy,
        decisionPolicy,
        computePolicy,
        memoryNamespace: typeof body.memoryNamespace === "string" ? body.memoryNamespace : "general",
        tools: Array.isArray(body.tools) ? body.tools as string[] : [],
        permissions: Array.isArray(body.permissions) ? body.permissions as string[] : [],
        assignedChannelIds: Array.isArray(body.assignedChannelIds) ? body.assignedChannelIds as string[] : [],
        ...(typeof body.avatarUrl === "string" ? { avatarUrl: body.avatarUrl } : {}),
      };
      const createdAgent = this.store.createAgent(agent);
      res.writeHead(201);
      res.end(JSON.stringify(createdAgent));
      return;
    }

    if (req.method === "GET" && path === "/api/tasks") {
      res.writeHead(200);
      res.end(JSON.stringify(this.store.listTasks()));
      return;
    }

    if (req.method === "POST" && path === "/api/tasks") {
      if (!hasPermission(caller.permissions, "tasks:create") && !hasPermission(caller.permissions, "tasks:*")) {
        this.store.recordAudit({
          origin: "web",
          actorId: caller.user?.id || "anonymous",
          actorType: "user",
          action: "rbac_denied",
          targetType: "task",
          targetId: "new",
          details: { path, role: caller.role, required: "tasks:create" },
        });
        res.writeHead(403);
        res.end(JSON.stringify({ error: "RBAC permission denied", required: "tasks:create", role: caller.role }));
        return;
      }
      const body = await this.readBody(req);
      const taskId = body.id;
      const status = body.status ?? "backlog";
      const priority = body.priority ?? "medium";
      const contract = body.contract;
      if (!isBoundedString(body.title, 300)
        || (body.description !== undefined && (typeof body.description !== "string" || body.description.length > 20_000))
        || (body.projectId !== undefined && !isBoundedString(body.projectId, 120))
        || (taskId !== undefined && (typeof taskId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(taskId)))
        || typeof status !== "string" || !taskStatuses.has(status as TaskStatus)
        || typeof priority !== "string" || !taskPriorities.has(priority as TaskPriority)
        || (body.assignedAgentId !== undefined && !isBoundedString(body.assignedAgentId, 120))
        || (body.originChannelId !== undefined && !isBoundedString(body.originChannelId, 120))
        || (body.originThreadId !== undefined && !isBoundedString(body.originThreadId, 120))
        || (contract !== undefined && (!isExecutionContract(contract)
          || typeof taskId !== "string"
          || contract.taskId !== taskId
          || !requestsNoExecutionAuthority(contract)))) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Task fields are invalid. New tasks must start in backlog or ready status." }));
        return;
      }
      if (typeof body.assignedAgentId === "string" && !this.store.getAgent(body.assignedAgentId)) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Assigned agent was not found." }));
        return;
      }
      if (typeof taskId === "string" && this.store.getTask(taskId)) {
        res.writeHead(409);
        res.end(JSON.stringify({ error: "Task id already exists." }));
        return;
      }
      const controllerInspection = await this.controller.inspect(`${body.title}\n${typeof body.description === "string" ? body.description : ""}`, {
        taskId: typeof taskId === "string" ? taskId : undefined,
        assignedAgentId: typeof body.assignedAgentId === "string" ? body.assignedAgentId : undefined,
        originChannelId: typeof body.originChannelId === "string" ? body.originChannelId : undefined,
      });
      const task = this.store.createTask({
        ...(typeof taskId === "string" ? { id: taskId } : {}),
        ...(typeof body.projectId === "string" ? { projectId: body.projectId } : {}),
        title: body.title,
        description: typeof body.description === "string" ? body.description : "",
        priority: priority as TaskPriority,
        status: status as TaskStatus,
        ...(typeof body.assignedAgentId === "string" ? { assignedAgentId: body.assignedAgentId } : {}),
        ...(typeof body.originChannelId === "string" ? { originChannelId: body.originChannelId } : {}),
        ...(typeof body.originThreadId === "string" ? { originThreadId: body.originThreadId } : {}),
        ...(isExecutionContract(contract) ? { contract } : {}),
      });
      this.store.recordAudit({
        origin: "web",
        actorId: caller.user?.id || "system",
        actorType: "user",
        action: "task_controller_handoff",
        targetType: "task",
        targetId: task.id,
        details: {
          intent: controllerInspection.intent,
          requiresApproval: controllerInspection.requiresApproval,
          contextPacketId: controllerInspection.contextPacket.id,
          packedTokens: controllerInspection.contextPacket.packedTokens,
          workflowEngine: "workflow-engine",
        },
      });
      res.writeHead(201);
      res.end(JSON.stringify(task));
      return;
    }

    if (req.method === "GET" && path === "/api/approvals") {
      res.writeHead(200);
      res.end(JSON.stringify(this.store.listApprovals()));
      return;
    }

    if (req.method === "POST" && path === "/api/approvals/resolve") {
      if (!hasPermission(caller.permissions, "approvals:decide") && !hasPermission(caller.permissions, "approvals:*")) {
        this.store.recordAudit({
          origin: "web",
          actorId: caller.user?.id || "anonymous",
          actorType: "user",
          action: "rbac_denied",
          targetType: "approval",
          targetId: "resolve",
          details: { path, role: caller.role, required: "approvals:decide" },
        });
        res.writeHead(403);
        res.end(JSON.stringify({ error: "RBAC permission denied", required: "approvals:decide", role: caller.role }));
        return;
      }
      const body = await this.readBody(req);
      if (typeof body.approvalId !== "string" || !["approved", "rejected"].includes(String(body.status))
        || (body.decisionNotes !== undefined && (typeof body.decisionNotes !== "string" || body.decisionNotes.length > 4000))) {
        res.writeHead(400); res.end(JSON.stringify({ error: "A valid decision and notes under 4,000 characters are required." })); return;
      }
      const existing = this.store.listApprovals().find(item => item.id === body.approvalId);
      if (!existing) { res.writeHead(404); res.end(JSON.stringify({ error: "Approval not found." })); return; }
      if (existing.status !== "pending") { res.writeHead(409); res.end(JSON.stringify({ error: "This request has already been resolved. Refresh the review desk." })); return; }
      const resolved = this.store.resolveApproval({
        approvalId: body.approvalId,
        status: body.status as "approved" | "rejected",
        approverUserId: caller.user?.id || "user-owner",
        decisionOrigin: "web",
        decisionNotes: typeof body.decisionNotes === "string" ? body.decisionNotes : undefined,
      });
      res.writeHead(200);
      res.end(JSON.stringify(resolved));
      return;
    }

    if (req.method === "GET" && path === "/api/memory") {
      if (!hasPermission(caller.permissions, "memory:read")) { res.writeHead(403); res.end(JSON.stringify({ error: "Memory read permission required." })); return; }
      const namespace = url.searchParams.get("namespace") || "general";
      const queryText = url.searchParams.get("q") || undefined;
      const records = await this.operationalMemory.query({ namespace, queryText, includeArchived: url.searchParams.get("includeArchived") === "true" });
      res.writeHead(200);
      res.end(JSON.stringify(records.map(result => result.record)));
      return;
    }

    if ((req.method === "POST" || req.method === "PATCH") && path === "/api/memory") {
      if (!hasPermission(caller.permissions, "memory:write")) { res.writeHead(403); res.end(JSON.stringify({ error: "Memory write permission required." })); return; }
      const body = await this.readBody(req);
      const validCategories: MemoryCategory[] = [
        "task_history", "repo_history", "worktree_history", "commit", "test_failure", "deployment",
        "approval", "artifact", "do_not_repeat", "project_constraint", "general_fact",
      ];
      if (req.method === "PATCH") {
        if (typeof body.namespace !== "string" || !body.namespace.trim() || body.namespace.length > 120 || typeof body.id !== "string"
          || !Number.isInteger(body.expectedVersion) || Number(body.expectedVersion) < 1
          || (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim() || body.title.length > 200))
          || (body.content !== undefined && (typeof body.content !== "string" || !body.content.trim() || body.content.length > 40000))
          || (body.category !== undefined && !validCategories.includes(body.category as MemoryCategory))
          || (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.length > 100 || body.tags.some(tag => typeof tag !== "string" || tag.length > 200)))
          || (body.archived !== undefined && typeof body.archived !== "boolean")) {
          res.writeHead(400); res.end(JSON.stringify({ error: "Invalid memory update or missing version." })); return;
        }
        try {
          const record = this.operationalMemory.update(body.namespace, body.id, Number(body.expectedVersion), caller.user?.id || "local-owner", {
            ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
            ...(typeof body.content === "string" ? { content: body.content.trim() } : {}),
            ...(typeof body.category === "string" ? { category: body.category as MemoryCategory } : {}),
            ...(Array.isArray(body.tags) ? { tags: body.tags as string[] } : {}),
            ...(typeof body.archived === "boolean" ? { archived: body.archived } : {}),
          });
          this.store.recordAudit({ origin: "web", actorId: caller.user?.id || "local-owner", actorType: "user", action: "memory_updated", targetType: "memory", targetId: record.id, details: { namespace: record.namespace, version: record.version, archived: Boolean(record.archived) } });
          res.writeHead(200); res.end(JSON.stringify(record));
        } catch (error) { res.writeHead(409); res.end(JSON.stringify({ error: redactRuntimeError(error) })); }
        return;
      }
      if (typeof body.namespace !== "string" || !body.namespace.trim()
        || body.namespace.length > 120
        || typeof body.title !== "string" || !body.title.trim() || body.title.length > 200
        || typeof body.content !== "string" || !body.content.trim() || body.content.length > 40000
        || typeof body.category !== "string" || !validCategories.includes(body.category as MemoryCategory)
        || (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.length > 100 || body.tags.some(tag => typeof tag !== "string" || tag.length > 200)))) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Memory requires a namespace, supported category, title, content, and optional string tags." }));
        return;
      }
      if (body.projectId !== undefined && (typeof body.projectId !== "string" || !this.store.getSpace(body.projectId) || this.store.getSpace(body.projectId)?.archived)) {
        res.writeHead(400); res.end(JSON.stringify({ error: "Select an existing active project for this memory." })); return;
      }
      const record = await this.operationalMemory.record({
        version: 1,
        updatedBy: caller.user?.id || "local-owner",
        namespace: body.namespace.trim(),
        category: body.category as MemoryCategory,
        title: body.title.trim(),
        content: body.content.trim(),
        tags: (body.tags as string[] | undefined) || [],
        ...(typeof body.projectId === "string" ? { projectId: body.projectId } : {}),
        ...(typeof body.taskId === "string" ? { taskId: body.taskId } : {}),
      });
      res.writeHead(201);
      res.end(JSON.stringify(record));
      return;
    }

    if (path === "/api/chat/status" && req.method === "GET") {
      res.writeHead(200); res.end(JSON.stringify(this.conversations.status())); return;
    }
    const responseRoute = path.match(/^\/api\/threads\/([^/]+)\/(respond|stop)$/);
    if (responseRoute && req.method === "POST") {
      if (!hasPermission(caller.permissions, "tasks:execute")) { res.writeHead(403); res.end(JSON.stringify({ error: "Chat generation requires execution permission." })); return; }
      const actorId = caller.user?.id || "user-owner";
      if (responseRoute[2] === "stop") {
        res.writeHead(200); res.end(JSON.stringify({ stopped: this.conversations.stop(responseRoute[1], actorId) })); return;
      }
      const body = await this.readBody(req);
      if (typeof body.messageId !== "string" || typeof body.model !== "string") { res.writeHead(400); res.end(JSON.stringify({ error: "Choose a message and model." })); return; }
      try { await this.conversations.respond(responseRoute[1], body.messageId, body.model, actorId, res); }
      catch (error) { if (!res.headersSent) { res.writeHead(409); res.end(JSON.stringify({ error: (error as Error).message })); } else res.end(); }
      return;
    }
    if (path === "/api/threads" && req.method === "GET") {
      const query = (url.searchParams.get("q") || "").trim().toLocaleLowerCase();
      if (query.length > 200) { res.writeHead(400); res.end(JSON.stringify({ error: "Search must be 200 characters or fewer." })); return; }
      const threads = this.store.listThreads(url.searchParams.get("channelId") || undefined);
      const results = query ? threads.flatMap(thread => {
        const threadMessages = this.store.listThreadMessages(thread.id);
        const latestMessage = threadMessages.at(-1);
        const message = threadMessages.find(item => item.content.toLocaleLowerCase().includes(query)
          || item.attachments?.some(file => file.filename.toLocaleLowerCase().includes(query)));
        if (!(thread.title || "").toLocaleLowerCase().includes(query) && !message) return [];
        const offset = message ? Math.max(0, message.content.toLocaleLowerCase().indexOf(query) - 45) : 0;
        return [{ ...thread, ...(latestMessage ? { lastMessagePreview: { authorType: latestMessage.authorType, content: latestMessage.content.slice(0, 240), createdAt: latestMessage.createdAt, attachmentCount: latestMessage.attachments?.length || 0 } } : {}), ...(message ? { searchHit: { messageId: message.id, excerpt: message.content.slice(offset, offset + 180)
          || message.attachments?.find(file => file.filename.toLocaleLowerCase().includes(query))?.filename || "Attachment" } } : {}) }];
      }) : threads;
      const withPreviews = query ? results : results.map(thread => {
        const latestMessage = this.store.listThreadMessages(thread.id).at(-1);
        return latestMessage ? { ...thread, lastMessagePreview: { authorType: latestMessage.authorType, content: latestMessage.content.slice(0, 240), createdAt: latestMessage.createdAt, attachmentCount: latestMessage.attachments?.length || 0 } } : thread;
      });
      res.writeHead(200); res.end(JSON.stringify(withPreviews)); return;
    }
    if (path === "/api/threads" && req.method === "POST") {
      const body = await this.readBody(req);
      if (!isBoundedString(body.channelId, 80) || !this.store.getChannel(body.channelId) || !isBoundedString(body.title, 200)) {
        res.writeHead(400); res.end(JSON.stringify({ error: "A valid channel and conversation title are required." })); return;
      }
      res.writeHead(201); res.end(JSON.stringify(this.store.createThread(body.channelId, body.title.trim()))); return;
    }
    const editMessageRoute = path.match(/^\/api\/threads\/([^/]+)\/messages\/([^/]+)$/);
    if (editMessageRoute && req.method === "PATCH") {
      if (this.conversations.status().activeThreads.includes(editMessageRoute[1])) { res.writeHead(409); res.end(JSON.stringify({ error: "Stop the response before editing this conversation." })); return; }
      const body = await this.readBody(req);
      // Reading the request body yields to other requests; generation may have started meanwhile.
      if (this.conversations.status().activeThreads.includes(editMessageRoute[1])) { res.writeHead(409); res.end(JSON.stringify({ error: "Stop the response before editing this conversation." })); return; }
      if (typeof body.content !== "string" || typeof body.expectedContent !== "string") {
        res.writeHead(400); res.end(JSON.stringify({ error: "Message text and original version are required." })); return;
      }
      try {
        const message = this.store.editThreadMessage(editMessageRoute[1], editMessageRoute[2], caller.user?.id || "user-owner", body.content, body.expectedContent);
        res.writeHead(200); res.end(JSON.stringify(message));
      } catch (error) { res.writeHead(409); res.end(JSON.stringify({ error: (error as Error).message })); }
      return;
    }
    const threadRoute = path.match(/^\/api\/threads\/([^/]+)(\/messages|\/branch|\/move)?$/);
    if (threadRoute) {
      const thread = this.store.getThread(threadRoute[1]);
      if (!thread) { res.writeHead(404); res.end(JSON.stringify({ error: "Conversation not found." })); return; }
      if (req.method === "POST" && threadRoute[2] === "/move") {
        if (this.conversations.status().activeThreads.includes(thread.id)) { res.writeHead(409); res.end(JSON.stringify({ error: "Stop the response before moving this conversation." })); return; }
        const body = await this.readBody(req);
        if (typeof body.channelId !== "string") { res.writeHead(400); res.end(JSON.stringify({ error: "Choose a destination channel." })); return; }
        // Recheck after body parsing so a response started during the await cannot be moved mid-stream.
        if (this.conversations.status().activeThreads.includes(thread.id)) { res.writeHead(409); res.end(JSON.stringify({ error: "Stop the response before moving this conversation." })); return; }
        try { const moved = this.store.moveThread(thread.id, body.channelId); res.writeHead(200); res.end(JSON.stringify(moved)); }
        catch (error) { res.writeHead(400); res.end(JSON.stringify({ error: (error as Error).message })); }
        return;
      }
      if (req.method === "POST" && threadRoute[2] === "/branch") {
        const body = await this.readBody(req);
        if (typeof body.throughMessageId !== "string") { res.writeHead(400); res.end(JSON.stringify({ error: "Choose a message to branch from." })); return; }
        try {
          const branch = this.store.branchThread(thread.id, body.throughMessageId);
          res.writeHead(201); res.end(JSON.stringify(branch));
        } catch (error) { res.writeHead(400); res.end(JSON.stringify({ error: (error as Error).message })); }
        return;
      }
      if (req.method === "GET" && threadRoute[2] === "/messages") {
        res.writeHead(200); res.end(JSON.stringify(this.store.listThreadMessages(thread.id))); return;
      }
      if (req.method === "PATCH" && !threadRoute[2]) {
        if (this.conversations.status().activeThreads.includes(thread.id)) { res.writeHead(409); res.end(JSON.stringify({ error: "Stop the response before changing this conversation." })); return; }
        const body = await this.readBody(req);
        if (this.conversations.status().activeThreads.includes(thread.id)) { res.writeHead(409); res.end(JSON.stringify({ error: "Stop the response before changing this conversation." })); return; }
        if ((body.title !== undefined && !isBoundedString(body.title, 200)) ||
            (body.pinned !== undefined && typeof body.pinned !== "boolean") ||
            (body.archived !== undefined && typeof body.archived !== "boolean")) {
          res.writeHead(400); res.end(JSON.stringify({ error: "Invalid conversation changes." })); return;
        }
        const changes = { ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
          ...(typeof body.pinned === "boolean" ? { pinned: body.pinned } : {}),
          ...(typeof body.archived === "boolean" ? { archived: body.archived } : {}) };
        res.writeHead(200); res.end(JSON.stringify(this.store.updateThread(thread.id, changes))); return;
      }
    }

    if (req.method === "GET" && path === "/api/messages") {
      const channelId = url.searchParams.get("channelId") || "chan-general";
      res.writeHead(200);
      res.end(JSON.stringify(this.store.listMessages(channelId)));
      return;
    }

    if (req.method === "POST" && path === "/api/messages") {
      const body = await this.readBody(req) as {
        channelId: string;
        content: string;
        threadId?: string;
        attachments?: unknown;
        replyToMessageId?: string;
        authorId?: string;
        authorType?: "user" | "agent" | "system";
        externalProvider?: "telegram" | "discord" | "web" | "api" | "cli";
      };
      let attachments;
      try { attachments = parseMessageAttachments(body.attachments); }
      catch (error) { res.writeHead(400); res.end(JSON.stringify({ error: (error as Error).message })); return; }
      const thread = body.threadId ? this.store.getThread(body.threadId) : undefined;
      if (thread && this.conversations.status().activeThreads.includes(thread.id)) { res.writeHead(409); res.end(JSON.stringify({ error: "Wait for the response or stop it before sending another message." })); return; }
      const replyTarget = body.replyToMessageId && thread ? this.store.listThreadMessages(thread.id).find(message => message.id === body.replyToMessageId) : undefined;
      if (!this.store.getChannel(body.channelId) || (typeof body.content !== "string" || body.content.length > 40000 || (!body.content.trim() && !attachments.length)) ||
          (body.replyToMessageId && !replyTarget) ||
          (body.threadId && (!thread || thread.channelId !== body.channelId || thread.archived))) {
        res.writeHead(400); res.end(JSON.stringify({ error: "Message requires a valid channel, active conversation, and text." })); return;
      }
      const msg = this.store.createMessage({
        channelId: body.channelId,
        ...(thread ? { threadId: thread.id } : {}),
        ...(attachments.length ? { attachments } : {}),
        ...(replyTarget ? { replyToMessageId: replyTarget.id } : {}),
        authorId: caller.user?.id || "user-owner",
        authorType: "user",
        content: body.content,
        externalProvider: body.externalProvider || "web",
      });
      // The built-in Setup Guide has a narrow, deterministic local response
      // path. It never claims a model is connected and only reports the saved
      // workspace gates it can inspect without credentials or external access.
      if (thread?.title === "Workspace setup" && this.store.getAgent("agent-setup-guide")) {
        const readiness = this.taskWorkerRuntime?.getExecutionReadiness()?.capabilities ?? {
          modelPlanning: false,
          isolatedCompute: false,
          realVerification: false,
          evidenceCollection: false,
        };
        const pending = [
          !readiness.modelPlanning ? "choose a model route" : null,
          !readiness.isolatedCompute ? "choose an isolated execution environment" : null,
          !readiness.realVerification ? "choose the verification checks" : null,
          !readiness.evidenceCollection ? "choose where review evidence is retained" : null,
        ].filter((item): item is string => Boolean(item));
        const setupSession = this.completionEngine.listSessions()
          .find(session => session.originalGoal.submittedBy === "setup-guide");
        this.store.createMessage({
          channelId: thread.channelId,
          threadId: thread.id,
          authorId: "agent-setup-guide",
          authorType: "agent",
          content: setupGuideReply(
            body.content,
            pending,
            setupSession?.prd.requirements.map(requirement => requirement.title) ?? [],
            this.inspectSetupRuntimeReadiness().nextAction,
          ),
          externalProvider: "web",
        });
      }
      res.writeHead(201);
      res.end(JSON.stringify(msg));
      return;
    }

    const processRevisionRoute = path.match(/^\/api\/processes\/([^/]+)\/revisions$/);
    const processRevisionResolutionRoute = path.match(/^\/api\/processes\/([^/]+)\/revisions\/([^/]+)\/resolve$/);
    const processRollbackRoute = path.match(/^\/api\/processes\/([^/]+)\/rollback$/);
    if (processRevisionResolutionRoute && req.method === "POST") {
      if ((process.env.AGENTFORGE_AUTH_STRICT === "1" || process.env.NODE_ENV === "production") && !caller.isAuthenticated) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: "Authenticated reviewer identity is required to resolve a process revision." }));
        return;
      }
      const processId = decodeURIComponent(processRevisionResolutionRoute[1]);
      const proposalId = decodeURIComponent(processRevisionResolutionRoute[2]);
      const body = await this.readBody(req);
      if (body.processId !== undefined && body.processId !== processId) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "The proposal does not belong to this process." }));
        return;
      }
      if (body.status !== "approved" && body.status !== "rejected") {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "status must be approved or rejected." }));
        return;
      }
      const proposalBelongsToProcess = this.store.listProcessRevisionProposals(processId).some(item => item.id === proposalId);
      if (!proposalBelongsToProcess) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Process revision proposal was not found for this process." }));
        return;
      }
      try {
        const result = this.store.resolveProcessRevisionProposal({
          proposalId,
          status: body.status,
          approverUserId: caller.user?.id || "local-unverified-web-client",
        });
        if (result.proposal.status === "stale") {
          res.writeHead(409);
          res.end(JSON.stringify({ error: "The process changed after this proposal was prepared. Prepare a fresh revision before approving it.", proposal: result.proposal }));
          return;
        }
        const revalidation = result.process
          ? this.taskWorkerRuntime.processExecutionEngine.revalidateAgentsForProcess(processId, result.process)
          : undefined;
        res.writeHead(200);
        res.end(JSON.stringify({ proposal: result.proposal, process: result.process, revalidation }));
      } catch (error) {
        res.writeHead(409);
        res.end(JSON.stringify({ error: redactRuntimeError(error, "Could not resolve the revision proposal.") }));
      }
      return;
    }
    if (processRollbackRoute && req.method === "POST") {
      if ((process.env.AGENTFORGE_AUTH_STRICT === "1" || process.env.NODE_ENV === "production") && !caller.isAuthenticated) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: "Authenticated reviewer identity is required to roll back a process." }));
        return;
      }
      const processId = decodeURIComponent(processRollbackRoute[1]);
      const current = this.store.getProcess(processId);
      if (!current) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Process was not found." }));
        return;
      }
      const body = await this.readBody(req);
      if (!Number.isSafeInteger(body.expectedVersion) || !Number.isSafeInteger(body.targetVersion)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Integer expectedVersion and targetVersion are required." }));
        return;
      }
      if (body.expectedVersion !== current.version) {
        res.writeHead(409);
        res.end(JSON.stringify({ error: `Process version changed; current version is ${current.version}.`, currentVersion: current.version }));
        return;
      }
      const target = this.store.listProcessRevisions(processId).find(item => item.version === body.targetVersion);
      if (!target || target.version >= current.version) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Historical process version was not found." }));
        return;
      }
      const diff = this.scribe.compareProcesses(current, target);
      if (this.store.getProcess(processId)?.version !== body.expectedVersion) {
        const currentVersion = this.store.getProcess(processId)?.version;
        res.writeHead(409);
        res.end(JSON.stringify({ error: "Process version changed while preparing the rollback.", currentVersion }));
        return;
      }
      const restored = this.store.rollbackProcess(processId, target.version, body.expectedVersion);
      const agentSpecification = this.compiler.compile(restored);
      const revalidation = this.taskWorkerRuntime.processExecutionEngine.revalidateAgentsForProcess(processId, restored);
      res.writeHead(200);
      res.end(JSON.stringify({ process: restored, diff, restoredFromVersion: target.version, agentSpecification, revalidation }));
      return;
    }

    if (processRevisionRoute && req.method === "GET") {
      const processId = decodeURIComponent(processRevisionRoute[1]);
      const process = this.store.getProcess(processId);
      if (!process) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Process was not found." }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify({ current: process, revisions: this.store.listProcessRevisions(processId), proposals: this.store.listProcessRevisionProposals(processId) }));
      return;
    }

    if (processRevisionRoute && req.method === "POST") {
      const processId = decodeURIComponent(processRevisionRoute[1]);
      const existing = this.store.getProcess(processId);
      if (!existing) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Process was not found." }));
        return;
      }
      const body = await this.readBody(req);
      if (!isBoundedString(body.rawContent, 1_000_000)
        || typeof body.expectedVersion !== "number"
        || !Number.isSafeInteger(body.expectedVersion)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "A non-empty revision body under 1 MB and an integer expectedVersion are required." }));
        return;
      }
      if (body.expectedVersion !== existing.version) {
        res.writeHead(409);
        res.end(JSON.stringify({ error: `Process version changed; current version is ${existing.version}.`, currentVersion: existing.version }));
        return;
      }
      const diff = await this.scribe.detectDiff(existing, body.rawContent);
      const parsed = await this.scribe.ingest({ sourceType: existing.sourceType, sourceUri: existing.sourceUri, rawContent: body.rawContent });
      const priorRules = new Map(existing.unresolvedRules.map(rule => [`${rule.stepText ?? ""}\u0000${rule.question}`, rule]));
      parsed.unresolvedRules = parsed.unresolvedRules.map(rule => {
        const prior = priorRules.get(`${rule.stepText ?? ""}\u0000${rule.question}`);
        return prior ? { ...rule, resolved: prior.resolved, resolvedRuleStatement: prior.resolvedRuleStatement, resolvedByUserId: prior.resolvedByUserId, processId } : { ...rule, processId };
      });
      const revision = {
        ...parsed,
        id: processId,
        version: existing.version + 1,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      if (this.store.getProcess(processId)?.version !== body.expectedVersion) {
        const currentVersion = this.store.getProcess(processId)?.version;
        res.writeHead(409);
        res.end(JSON.stringify({ error: "Process version changed while preparing the revision.", currentVersion }));
        return;
      }
      const proposal = this.store.createProcessRevisionProposal({
        processId,
        expectedVersion: body.expectedVersion,
        revision,
        diff,
      });
      res.writeHead(202);
      res.end(JSON.stringify({ proposal, diff, currentProcess: existing, agentSpecification: this.compiler.compile(revision) }));
      return;
    }

    if (req.method === "GET" && path === "/api/processes") {
      res.writeHead(200);
      res.end(JSON.stringify(this.store.listProcesses()));
      return;
    }

    if (req.method === "GET" && path === "/api/process-bindings") {
      const processId = url.searchParams.get("processId") || undefined;
      const agentId = url.searchParams.get("agentId") || undefined;
      res.writeHead(200);
      res.end(JSON.stringify(this.store.listProcessAgentBindings({ processId, agentId })));
      return;
    }

    if (req.method === "POST" && path === "/api/process-bindings") {
      const body = await this.readBody(req);
      if (!isBoundedString(body.processId, 120) || !isBoundedString(body.agentId, 120)
        || !isBoundedString(body.assignedRole, 120)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "processId, agentId, and an assignedRole of 1 to 120 characters are required." }));
        return;
      }
      if (!this.store.getProcess(body.processId) || !this.store.getAgent(body.agentId)) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "The selected process or agent does not exist." }));
        return;
      }
      const wasBound = this.store.listProcessAgentBindings({ processId: body.processId, agentId: body.agentId }).length > 0;
      const binding = this.store.bindProcessToAgent({ processId: body.processId, agentId: body.agentId, assignedRole: body.assignedRole });
      res.writeHead(wasBound ? 200 : 201);
      res.end(JSON.stringify(binding));
      return;
    }

    if (req.method === "GET" && path === "/api/gateway/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(this.nativeGateway.snapshot()));
      return;
    }

    if ((req.method === "POST" && (path === "/api/gateway/start" || path === "/api/gateway/stop"))) {
      const action = path.endsWith("/start") ? "start" : "stop";
      const body = await this.readBody(req);
      const requested = Array.isArray(body.providers) ? body.providers.filter((value): value is "telegram" | "discord" | "slack" => value === "telegram" || value === "discord" || value === "slack") : undefined;
      const snapshot = action === "start"
        ? await this.nativeGateway.start(requested)
        : await this.nativeGateway.stop(requested);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(snapshot));
      return;
    }

    if (req.method === "POST" && path === "/api/process-runs/prepare") {
      const body = await this.readBody(req);
      if (!isBoundedString(body.processId, 120) || !isBoundedString(body.agentId, 120)
        || (body.input !== undefined && !isBoundedString(body.input, 20_000))) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "processId and agentId are required; input is optional and limited to 20,000 characters." }));
        return;
      }
      const process = this.store.getProcess(body.processId);
      const agent = this.store.getAgent(body.agentId);
      const binding = this.store.listProcessAgentBindings({ processId: body.processId, agentId: body.agentId })[0];
      if (!process || !agent || !binding) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "The process, agent, or saved process-to-agent binding does not exist." }));
        return;
      }
      const prepared = this.processAgentBridge.prepare({ process, binding, input: body.input });
      const task = this.store.createTask({
        id: prepared.taskId,
        projectId: "proj-default",
        title: `${process.title} · ${agent.name}`,
        description: prepared.instruction,
        priority: "medium",
        status: prepared.status === "waiting_approval" ? "waiting_approval" : "ready",
        assignedAgentId: agent.id,
        processId: process.id,
        contract: prepared.contract,
      });
      this.store.recordAudit({
        origin: "api",
        actorId: caller.user?.id || "system",
        actorType: caller.user ? "user" : "system",
        action: "process_agent_run_prepared",
        targetType: "task",
        targetId: task.id,
        details: { processId: process.id, agentId: agent.id, blockers: prepared.blockers, executed: false },
      });
      res.writeHead(201);
      res.end(JSON.stringify({ ...prepared, task, executed: false }));
      return;
    }

    if (req.method === "POST" && path === "/api/process-runs/execute") {
      const body = await this.readBody(req);
      if (!isBoundedString(body.taskId, 120)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "taskId is required." }));
        return;
      }
      if (body.approved !== true) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Executing a prepared process requires explicit approval." }));
        return;
      }
      const task = this.store.getTask(body.taskId);
      if (!task || !task.processId) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "The prepared process task does not exist." }));
        return;
      }
      if (task.status !== "ready") {
        res.writeHead(409);
        res.end(JSON.stringify({ error: `The process task is ${task.status} and cannot be started.` }));
        return;
      }
      this.store.recordAudit({ origin: "api", actorId: caller.user?.id || "anonymous", actorType: "user", action: "process_agent_run_approved", targetType: "task", targetId: task.id, details: { processId: task.processId } });
      const result = await this.taskWorkerRuntime.executeTask(task.id);
      res.writeHead(200);
      res.end(JSON.stringify({ task: result, executed: result.status === "completed", readiness: this.taskWorkerRuntime.getExecutionReadiness() }));
      return;
    }

    if (req.method === "POST" && path === "/api/processes/import") {
      const body = await this.readBody(req);
      const sourceType = body.sourceType ?? "scribe";
      if (!isBoundedString(body.rawContent, 1_000_000)
        || typeof sourceType !== "string"
        || !processSourceTypes.has(sourceType as ProcessSourceType)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "A non-empty source document under 1 MB and a supported sourceType are required." }));
        return;
      }
      const process = await this.scribe.ingest({
        sourceType: sourceType as ProcessSourceType,
        rawContent: body.rawContent,
      });
      this.store.createProcess(process);
      const spec = this.compiler.compile(process);
      res.writeHead(201);
      res.end(JSON.stringify({ process, agentSpecification: spec }));
      return;
    }

    if (req.method === "GET" && path === "/api/calls") {
      res.writeHead(200);
      res.end(JSON.stringify(this.store.listCalls()));
      return;
    }

    if (req.method === "POST" && path === "/api/calls/simulate") {
      if ((process.env.AGENTFORGE_AUTH_STRICT === "1" || process.env.NODE_ENV === "production") && !caller.isAuthenticated) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: "Authenticated identity is required to initiate a call." }));
        return;
      }
      if (!hasPermission(caller.permissions, "voice:outbound")) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Permission denied", required: "voice:outbound" }));
        return;
      }
      const body = await this.readBody(req);
      if (!isRecord(body) || !isBoundedString(body.agentId, 120)
        || typeof body.phoneNumber !== "string" || !/^\+[1-9]\d{7,14}$/.test(body.phoneNumber)
        || (body.completeImmediately !== undefined && typeof body.completeImmediately !== "boolean")) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "agentId, an E.164 phoneNumber, and an optional boolean completeImmediately are required." }));
        return;
      }
      if (!this.store.getAgent(body.agentId)) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "The selected agent does not exist." }));
        return;
      }
      const call = await this.voice.startOutboundCall({
        agentId: body.agentId,
        recipientPhoneNumber: body.phoneNumber,
        recipientName: "Test Seller",
        canonicalChannelId: "chan-calls",
      });
      if (body.completeImmediately) {
        await this.voice.endCall(call.id);
        await this.callLifecycleManager.handleCallCompleted(call);
      }
      this.store.createCall(call);
      res.writeHead(201);
      res.end(JSON.stringify(call));
      return;
    }

    if (req.method === "GET" && path === "/api/packages") {
      res.writeHead(200);
      res.end(JSON.stringify({
        available: this.store.listPackages(),
        installed: this.store.listInstallations(),
      }));
      return;
    }

    if (req.method === "POST" && path === "/api/packages/install") {
      if ((process.env.AGENTFORGE_AUTH_STRICT === "1" || process.env.NODE_ENV === "production") && !caller.isAuthenticated) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: "Authenticated identity is required to install a package." }));
        return;
      }
      const body = await this.readBody(req) as { packageName?: unknown; approvedPermissions?: unknown };
      if (typeof body.packageName !== "string" || !body.packageName.trim()) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "A packageName is required." }));
        return;
      }
      const pkg = this.store.getPackage(body.packageName);
      if (!pkg) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Package not found" }));
        return;
      }
      // The persistent store survives server restarts while LocalPackageProvider is
      // in-memory. Preserve the publisher/version the owner previously reviewed.
      if (this.store.getInstallation(pkg.name)) {
        res.writeHead(409);
        res.end(JSON.stringify({
          error: "Package is already installed. Uninstall it before installing a replacement so publisher and permission review remain explicit.",
        }));
        return;
      }
      const validation = this.packageProvider.validatePackage(pkg);
      if (!validation.valid) {
        res.writeHead(422);
        res.end(JSON.stringify({ error: "Package failed local validation.", violations: validation.violations }));
        return;
      }
      if (body.approvedPermissions === undefined && this.packageProvider.hasRequestedPermissions(pkg.permissions)) {
        res.writeHead(409);
        res.end(JSON.stringify({
          requiresPermissionApproval: true,
          packageName: pkg.name,
          requestedPermissions: pkg.permissions,
          executionNotice: "This build records the installation and permissions; it does not execute package code.",
        }));
        return;
      }
      const approvedPermissions = body.approvedPermissions === undefined
        ? {}
        : body.approvedPermissions;
      if (!this.packageProvider.isPermissionApprovalValid(pkg.permissions, approvedPermissions)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Approved permissions must be a valid subset of the manifest request." }));
        return;
      }
      const inst = this.packageProvider.installPackage({
        manifest: pkg,
        installedByUserId: caller.user?.id || "user-owner",
        workspaceId: "ws-default",
        approvedPermissions: approvedPermissions as PermissionManifest,
      });
      this.store.recordInstallation(inst);
      res.writeHead(200);
      res.end(JSON.stringify({
        ...inst,
        executionNotice: "This build records the package installation and approved permissions; package code is not executed.",
      }));
      return;
    }

    if (req.method === "POST" && path === "/api/packages/uninstall") {
      if ((process.env.AGENTFORGE_AUTH_STRICT === "1" || process.env.NODE_ENV === "production") && !caller.isAuthenticated) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: "Authenticated identity is required to uninstall a package." }));
        return;
      }
      const body = await this.readBody(req) as { packageName?: unknown };
      if (typeof body.packageName !== "string" || !body.packageName.trim()) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "A packageName is required." }));
        return;
      }
      const existing = this.store.getInstallation(body.packageName);
      if (!existing) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Package '${body.packageName}' is not installed.` }));
        return;
      }
      this.packageProvider.uninstallPackage(body.packageName);
      this.store.removeInstallation(body.packageName);
      this.store.recordAudit({
        origin: "api",
        actorId: caller.user?.id || "user-owner",
        actorType: "user",
        action: "package_uninstalled",
        targetType: "package",
        targetId: body.packageName,
        details: { packageId: body.packageName },
      });
      res.writeHead(200);
      res.end(JSON.stringify({ message: `Package '${body.packageName}' uninstalled successfully.` }));
      return;
    }

    if (req.method === "GET" && path === "/api/audit") {
      const limit = parseInt(url.searchParams.get("limit") || "50", 10);
      const origin = (url.searchParams.get("origin") as AuditEntry["origin"]) || undefined;
      const actorId = url.searchParams.get("actorId") || undefined;
      const targetType = url.searchParams.get("targetType") || undefined;
      res.writeHead(200);
      res.end(JSON.stringify(this.store.listAuditEntries({ limit, origin, actorId, targetType })));
      return;
    }

    if (req.method === "GET" && path === "/api/audit/verify") {
      const verification = this.store.verifyAuditChain();
      const checkpoint = this.store.getAuditCheckpoint();
      res.writeHead(verification.valid ? 200 : 409);
      res.end(JSON.stringify({ ...verification, checkpoint }));
      return;
    }

    if (req.method === "POST" && path === "/api/audit/prune") {
      if (caller.role !== "owner" && caller.role !== "admin" && !hasPermission(caller.permissions, "audit:prune") && !hasPermission(caller.permissions, "system:*")) {
        this.store.recordAudit({
          origin: "web",
          actorId: caller.user?.id || "anonymous",
          actorType: "user",
          action: "rbac_denied",
          targetType: "system",
          targetId: "audit-trail",
          details: { path, role: caller.role, required: "audit:prune" },
        });
        res.writeHead(403);
        res.end(JSON.stringify({ error: "RBAC permission denied", required: "audit:prune", role: caller.role }));
        return;
      }
      const body = await this.readBody(req) as { retentionDays?: number; maxEntries?: number };
      const result = this.store.pruneAuditTrail(body);
      this.store.recordAudit({
        origin: "api",
        actorId: caller.user?.id || "system",
        actorType: "user",
        action: "audit_pruned",
        targetType: "system",
        targetId: "audit-trail",
        details: { options: body, result },
      });
      res.writeHead(200);
      res.end(JSON.stringify({ message: "Audit trail pruned successfully", ...result }));
      return;
    }

    if (req.method === "GET" && path === "/api/inbox") {
      res.writeHead(200);
      res.end(JSON.stringify(this.store.getUnifiedInbox()));
      return;
    }

    if (req.method === "GET" && path === "/api/models") {
      res.writeHead(200);
      res.end(JSON.stringify({
        tiers: [
          { tier: 0, name: "Deterministic Policy Engine", description: "Zero-cost rule matching & guardrails" },
          { tier: 1, name: "Jev System-1 Intent Router", description: "Fast, low-latency intent classification" },
          { tier: 2, name: "Fast Local Generative", description: "Ollama 3B-8B parameters" },
          { tier: 3, name: "Strong Local Generative", description: "Ollama 70B / DeepSeek Coder" },
          { tier: 4, name: "Frontier Cloud Generative", description: "A provider-approved cloud model, once a connection is configured" },
        ],
      }));
      return;
    }

    if (req.method === "GET" && path === "/api/compute") {
      const trackedWorktrees = this.store.listTasks().filter(task => task.worktree?.isIsolated).length;
      const telemetry = this.localSandbox.getSystemTelemetry();
      const docker = await this.dockerCompute.isAvailable();
      const execution = this.taskWorkerRuntime.getExecutionReadiness();
      const dockerConnected = execution.capabilities.isolatedCompute && docker.available;
      res.writeHead(200);
      res.end(JSON.stringify({
        status: execution.ready ? "READY" : "PARTIAL_NOT_CONFIGURED",
        worktrees: {
          trackedCount: trackedWorktrees,
          runtimeVerified: false,
          strategy: "Worktree lifecycle integration is not connected to this control plane.",
        },
        sandboxes: {
          local: "IMPLEMENTED_NOT_CONNECTED",
          docker: dockerConnected ? "AVAILABLE_CONNECTED" : docker.available ? "AVAILABLE_NOT_CONNECTED" : "UNAVAILABLE",
          e2b: "NOT_CONFIGURED",
        },
        sandboxDetails: {
          local: "The local provider exists, but the task execution backend is not connected.",
          docker: dockerConnected
            ? `Docker${docker.version ? ` ${docker.version}` : ""} responds and is connected to the approved execution backend.`
            : docker.available
            ? `Docker${docker.version ? ` ${docker.version}` : ""} responds. AgentForge execution is not connected.`
            : docker.error || "Docker could not be reached. AgentForge execution is not connected.",
          e2b: "No cloud sandbox provider is configured.",
        },
        memoryBudget: {
          status: "NOT_MEASURED",
          reason: "Host memory telemetry and model allocation are not connected.",
        },
        hostTelemetry: telemetry,
        executionReadiness: execution,
      }));
      return;
    }

    if (req.method === "GET" && path === "/api/benchmarks") {
      res.writeHead(200);
      res.end(JSON.stringify({
        suites: this.benchmarkRunner.listSuites(),
        results: this.store.listBenchmarkResults(),
      }));
      return;
    }

    if (req.method === "POST" && path === "/api/benchmarks/run") {
      const body = await this.readBody(req) as { suiteId?: string; targetId?: string };
      if (!body.suiteId || !body.targetId) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "suiteId and targetId are required." }));
        return;
      }
      try {
        const result = await this.benchmarkRunner.executeBenchmark(body.suiteId, body.targetId);
        this.store.recordBenchmarkResult(result);
        this.empiricalRouter.recordBenchmarkResult(result);
        const compatibility = this.benchmarkRunner.evaluateCompatibility(result.targetType, result.targetId, result);
        this.store.recordAudit({
          origin: "api",
          actorId: caller.user?.id || "system",
          actorType: "user",
          action: "benchmark_executed",
          targetType: "benchmark",
          targetId: result.id,
          details: { suiteId: result.suiteId, targetId: result.targetId, passedOverall: result.passedOverall },
        });
        res.writeHead(200);
        res.end(JSON.stringify({ result, compatibility }));
        return;
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: redactRuntimeError(error) }));
        return;
      }
    }

    if (req.method === "POST" && path === "/api/route") {
      const body = await this.readBody(req);
      if (!isTaskRequirements(body)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid route requirements." }));
        return;
      }
      for (const benchmark of this.store.listBenchmarkResults()) {
        this.empiricalRouter.recordBenchmarkResult(benchmark);
      }
      const decision = this.empiricalRouter.route(body);
      const controller = await this.controller.inspect(`route task: ${JSON.stringify({ taskType: body.taskType, risk: body.risk, capabilities: body.capabilities })}`, {
        taskRequirements: body,
        empiricalDecision: decision,
      });
      res.writeHead(200);
      res.end(JSON.stringify({ ...decision, controller }));
      return;
    }

    // Task lifecycle controls (pause, resume, cancel, retry, diff, evidence)
    if (path.startsWith("/api/tasks/")) {
      const parts = path.split("/");
      const taskId = parts[3];
      const action = parts[4];

      const task = taskId ? this.store.getTask(taskId) : undefined;
      if (!task) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Task not found: ${taskId}` }));
        return;
      }

      if (req.method === "GET" && (!action || action === "activity")) {
        const required = action === "activity" ? "audit:read" : "tasks:read";
        if (!hasPermission(caller.permissions, required)) {
          res.writeHead(403);
          res.end(JSON.stringify({ error: "Permission denied", required }));
          return;
        }
        res.writeHead(200, { "Cache-Control": "no-store" });
        res.end(JSON.stringify(action === "activity"
          ? { entries: this.store.listAuditEntries({ targetType: "task", targetId: task.id, limit: 200 }), limit: 200 }
          : { ...task, executionContractDigest: executionContractDigest(task) }));
        return;
      }

      if (req.method === "PUT" && action === "contract") {
        if (!hasPermission(caller.permissions, "tasks:create") && !hasPermission(caller.permissions, "tasks:*")) {
          res.writeHead(403); res.end(JSON.stringify({ error: "Permission denied", required: "tasks:create" })); return;
        }
        if (["in_progress", "verification_running", "completed", "cancelled"].includes(task.status)) {
          res.writeHead(409); res.end(JSON.stringify({ error: "Pause active work before changing its execution boundaries." })); return;
        }
        const body = await this.readBody(req);
        const checks = body.checks;
        const shaPattern = /^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/;
        const validChecks = Array.isArray(checks) && checks.length > 0 && checks.length <= 20
          && checks.every(check => isRecord(check)
            && verificationTypes.has(check.type as VerificationCheckType)
            && typeof check.required === "boolean"
            && isBoundedString(check.command, 5000)
            && (check.timeoutMs === undefined || (typeof check.timeoutMs === "number" && Number.isFinite(check.timeoutMs) && check.timeoutMs > 0 && check.timeoutMs <= 3_600_000)));
        if (typeof body.expectedUpdatedAt !== "string"
          || !isBoundedString(body.baseBranch, 200)
          || typeof body.baseSha !== "string" || !shaPattern.test(body.baseSha)
          || !isStringList(body.allowedPaths) || body.allowedPaths.length === 0
          || !isStringList(body.protectedPaths)
          || !validChecks) {
          res.writeHead(400); res.end(JSON.stringify({ error: "Provide the current task version, a branch, full Git SHA, allowed/protected paths, and at least one bounded command." })); return;
        }
        if (body.expectedUpdatedAt !== task.updatedAt) {
          res.writeHead(409); res.end(JSON.stringify({ error: "Task changed. Refresh and review the latest boundaries before saving." })); return;
        }
        // Re-read after body parsing so an approval or other edit cannot be overwritten.
        const current = this.store.getTask(task.id);
        if (!current || current.updatedAt !== body.expectedUpdatedAt) {
          res.writeHead(409); res.end(JSON.stringify({ error: "Task changed. Refresh and review the latest boundaries before saving." })); return;
        }
        const nextContract: ExecutionContract = {
          ...current.contract,
          version: current.contract.version + 1,
          repository: { baseBranch: body.baseBranch.trim(), baseSha: body.baseSha },
          workspace: { ...current.contract.workspace, requireIsolatedWorktree: true },
          scope: { ...current.contract.scope, allowedPaths: body.allowedPaths.map((path: string) => path.trim()), protectedPaths: body.protectedPaths.map((path: string) => path.trim()) },
          authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
          requiredChecks: checks.map(check => ({ type: check.type as VerificationCheckType, required: check.required, command: check.command.trim(), ...(check.timeoutMs === undefined ? {} : { timeoutMs: check.timeoutMs }) })),
          completion: { requireEvidencePack: true, requireHumanApproval: true },
          createdAt: new Date().toISOString(),
        };
        const approvalInvalidated = Boolean(current.approvedExecutionPlan);
        const updated = this.store.updateTask(task.id, { contract: nextContract, approvedExecutionPlan: undefined, executionPlanDraft: undefined });
        this.store.recordAudit({ origin: "web", actorId: caller.user?.id || "user-owner", actorType: "user", action: "TASK_CONTRACT_UPDATED", targetType: "task", targetId: task.id, details: { contractVersion: nextContract.version, approvalInvalidated, requiredCheckCount: nextContract.requiredChecks.length } });
        res.writeHead(200); res.end(JSON.stringify({ task: { ...updated, executionContractDigest: executionContractDigest(updated) }, approvalInvalidated })); return;
      }

      if (req.method === "POST" && action === "revoke-plan") {
        if ((process.env.AGENTFORGE_AUTH_STRICT === "1" || process.env.NODE_ENV === "production") && !caller.isAuthenticated) {
          res.writeHead(401); res.end(JSON.stringify({ error: "Authenticated reviewer identity is required to revoke an execution plan." })); return;
        }
        if (!hasPermission(caller.permissions, "approvals:decide")) {
          res.writeHead(403); res.end(JSON.stringify({ error: "Permission denied", required: "approvals:decide" })); return;
        }
        if (["in_progress", "verification_running"].includes(task.status)) {
          res.writeHead(409); res.end(JSON.stringify({ error: "Pause the running task before revoking its execution plan." })); return;
        }
        const body = await this.readBody(req);
        const current = this.store.getTask(task.id);
        if (!current || body.expectedUpdatedAt !== current.updatedAt) {
          res.writeHead(409); res.end(JSON.stringify({ error: "Task changed. Refresh before revoking approval." })); return;
        }
        this.store.updateTask(task.id, { approvedExecutionPlan: undefined });
        this.store.recordAudit({ origin: "web", actorId: caller.user?.id || "user-owner", actorType: "user", action: "EXECUTION_PLAN_REVOKED", targetType: "task", targetId: task.id, details: {} });
        res.writeHead(200); res.end(JSON.stringify({ message: "Execution plan approval revoked." })); return;
      }

      if (req.method === "POST" && action === "draft-plan") {
        if (!hasPermission(caller.permissions, "tasks:execute")) {
          res.writeHead(403); res.end(JSON.stringify({ error: "Permission denied", required: "tasks:execute" })); return;
        }
        if (!this.planDraftProvider) {
          res.writeHead(503); res.end(JSON.stringify({ error: "No model plan-draft provider is configured." })); return;
        }
        try {
          const draft = await this.planDraftProvider.draft(task);
          const updated = this.store.updateTask(task.id, { executionPlanDraft: draft });
          this.store.recordAudit({ origin: "web", actorId: caller.user?.id || "user-owner", actorType: "user", action: "EXECUTION_PLAN_DRAFTED", targetType: "task", targetId: task.id, details: { commandCount: draft.commands.length, source: draft.source } });
          res.writeHead(200); res.end(JSON.stringify({ draft, task: updated, message: "Model draft created and saved. Review it before approval; no execution was started." })); return;
        } catch (error) {
          res.writeHead(422); res.end(JSON.stringify({ error: redactRuntimeError(error, "Unable to draft an execution plan.") })); return;
        }
      }

      if (req.method === "POST" && action === "approve-plan") {
        if ((process.env.AGENTFORGE_AUTH_STRICT === "1" || process.env.NODE_ENV === "production") && !caller.isAuthenticated) {
          res.writeHead(401); res.end(JSON.stringify({ error: "Authenticated reviewer identity is required to approve an execution plan." })); return;
        }
        if (!hasPermission(caller.permissions, "approvals:decide") || !hasPermission(caller.permissions, "tasks:execute")) {
          res.writeHead(403); res.end(JSON.stringify({ error: "Plan approval requires review and execution permissions." })); return;
        }
        if (["in_progress", "verification_running", "completed", "cancelled"].includes(task.status)) {
          res.writeHead(409); res.end(JSON.stringify({ error: "This task cannot receive a new execution plan in its current state." })); return;
        }
        const body = await this.readBody(req);
        if (body.expectedUpdatedAt !== task.updatedAt || body.contractDigest !== executionContractDigest(task)) {
          res.writeHead(409); res.end(JSON.stringify({ error: "Task changed. Reload and review its current boundaries before approving." })); return;
        }
        const commands = body.commands;
        if (!Array.isArray(commands) || commands.length > 100 || commands.some(command => !command || typeof command !== "object" || typeof command.command !== "string" || command.command.length > 20000)) {
          res.writeHead(400); res.end(JSON.stringify({ error: "Invalid execution commands." })); return;
        }
        const record: ApprovedPlanRecord = {
          plan: { taskId: task.id, source: "human_approved", commands: commands.map(command => ({ checkName: command.checkName, command: command.command, ...(command.timeoutMs === undefined ? {} : { timeoutMs: command.timeoutMs }) })) },
          contractDigest: executionContractDigest(task), approvedBy: caller.user?.id || "user-owner",
          approvedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString(),
        };
        try { await new ApprovedPlanProvider(async () => record).getPlan(task); }
        catch (error) { res.writeHead(400); res.end(JSON.stringify({ error: redactRuntimeError(error, "Invalid plan.") })); return; }
        // Body parsing is asynchronous; do not approve a task edited during review.
        const current = this.store.getTask(task.id);
        if (!current || current.updatedAt !== body.expectedUpdatedAt) {
          res.writeHead(409); res.end(JSON.stringify({ error: "Task changed while the plan was being approved." })); return;
        }
        this.store.updateTask(task.id, { approvedExecutionPlan: record });
        this.store.recordAudit({ origin: "web", actorId: record.approvedBy, actorType: "user", action: "EXECUTION_PLAN_APPROVED", targetType: "task", targetId: task.id, details: { contractDigest: record.contractDigest, commandCount: record.plan.commands.length, expiresAt: record.expiresAt } });
        res.writeHead(200); res.end(JSON.stringify({ plan: record, message: "Plan approved for one hour. No execution was started." })); return;
      }

      if (req.method === "POST" && action === "pause") {
        if (!hasPermission(caller.permissions, "tasks:execute")) {
          res.writeHead(403);
          res.end(JSON.stringify({ error: "Permission denied", required: "tasks:execute" }));
          return;
        }
        if (this.taskWorkerRuntime) {
          const pausedTask = await this.taskWorkerRuntime.pauseTask(task.id);
          res.writeHead(200);
          res.end(JSON.stringify({ message: `Task ${task.id} paused`, task: pausedTask }));
          return;
        }
        this.store.updateTask(task.id, { status: "paused" });
        res.writeHead(200);
        res.end(JSON.stringify({ message: `Task ${task.id} paused`, task: this.store.getTask(task.id) }));
        return;
      }

      if (req.method === "POST" && action === "resume") {
        if (!hasPermission(caller.permissions, "tasks:execute")) {
          res.writeHead(403);
          res.end(JSON.stringify({ error: "Permission denied", required: "tasks:execute" }));
          return;
        }
        const executionInspection = await this.controller.inspect(`execute task: ${task.title}\n${task.description}`, {
          taskId: task.id,
          contract: task.contract,
        });
        this.store.recordAudit({
          origin: "web",
          actorId: caller.user?.id || "system",
          actorType: "user",
          action: "task_execution_controller_handoff",
          targetType: "task",
          targetId: task.id,
          details: {
            intent: executionInspection.intent,
            requiresApproval: executionInspection.requiresApproval,
            contextPacketId: executionInspection.contextPacket.id,
            packedTokens: executionInspection.contextPacket.packedTokens,
            workflowEngine: "workflow-engine",
          },
        });
        if (this.taskWorkerRuntime?.isRunning()) {
          const resumedTask = await this.taskWorkerRuntime.resumeTask(task.id);
          res.writeHead(200);
          res.end(JSON.stringify({ message: `Task ${task.id} resumed`, task: resumedTask }));
          return;
        }
        res.writeHead(409);
        res.end(JSON.stringify({ error: "Agent worker is not connected. The task remains unchanged; no work was resumed or queued.", task }));
        return;
      }

      if (req.method === "POST" && (action === "execute" || action === "run")) {
        if (!hasPermission(caller.permissions, "tasks:execute") && !hasPermission(caller.permissions, "tasks:*")) {
          this.store.recordAudit({
            origin: "web",
            actorId: caller.user?.id || "anonymous",
            actorType: "user",
            action: "rbac_denied",
            targetType: "task",
            targetId: task.id,
            details: { path, role: caller.role, required: "tasks:execute" },
          });
          res.writeHead(403);
          res.end(JSON.stringify({ error: "RBAC permission denied", required: "tasks:execute", role: caller.role }));
          return;
        }
        if (this.taskWorkerRuntime?.isRunning()) {
          const executedTask = await this.taskWorkerRuntime.executeTask(task.id);
          res.writeHead(200);
          res.end(JSON.stringify({ message: `Task ${task.id} executed`, task: executedTask }));
          return;
        }
        res.writeHead(409);
        res.end(JSON.stringify({ error: "Agent worker is not connected. The task remains unchanged; no work was executed.", task }));
        return;
      }

      if (req.method === "POST" && action === "cancel") {
        if (!hasPermission(caller.permissions, "tasks:execute")) {
          res.writeHead(403);
          res.end(JSON.stringify({ error: "Permission denied", required: "tasks:execute" }));
          return;
        }
        if (this.taskWorkerRuntime) {
          const cancelledTask = await this.taskWorkerRuntime.cancelTask(task.id);
          res.writeHead(200);
          res.end(JSON.stringify({ message: `Task ${task.id} cancelled`, task: cancelledTask }));
          return;
        }
        this.store.updateTask(task.id, { status: "cancelled" });
        res.writeHead(200);
        res.end(JSON.stringify({ message: `Task ${task.id} cancelled`, task: this.store.getTask(task.id) }));
        return;
      }

      if (req.method === "POST" && action === "retry") {
        if (!hasPermission(caller.permissions, "tasks:execute")) {
          res.writeHead(403);
          res.end(JSON.stringify({ error: "Permission denied", required: "tasks:execute" }));
          return;
        }
        if (this.taskWorkerRuntime?.isRunning()) {
          const retriedTask = await this.taskWorkerRuntime.retryTask(task.id);
          res.writeHead(200);
          res.end(JSON.stringify({ message: `Task ${task.id} retry queued`, task: retriedTask }));
          return;
        }
        res.writeHead(409);
        res.end(JSON.stringify({ error: "Agent worker is not connected. The task remains unchanged; no retry was queued.", task }));
        return;
      }

      if (req.method === "GET" && action === "diff") {
        const evidence = task.evidencePack;
        if (!evidence) {
          res.writeHead(409);
          res.end(JSON.stringify({
            available: false,
            taskId: task.id,
            reason: "No verified evidence pack is attached to this task.",
          }));
          return;
        }
        res.writeHead(200);
        res.end(JSON.stringify({
          available: true,
          taskId: task.id,
          baseSha: evidence.baseSha,
          currentSha: evidence.finalSha,
          integrityValid: verifyEvidencePackIntegrity(evidence),
          diffStat: evidence.diffStat,
          filesChanged: evidence.filesChanged,
        }));
        return;
      }

      if (req.method === "GET" && action === "evidence") {
        const evidence = task.evidencePack;
        if (!evidence) {
          res.writeHead(409);
          res.end(JSON.stringify({
            available: false,
            taskId: task.id,
            status: "NOT_AVAILABLE",
            reason: "No evidence pack has been generated for this task.",
          }));
          return;
        }
        const testsPassed = evidence.testResults.filter(test => test.passed).length;
        const integrityValid = verifyEvidencePackIntegrity(evidence);
        res.writeHead(200);
        res.end(JSON.stringify({
          available: true,
          taskId: task.id,
          objective: evidence.objective,
          status: task.status,
          contractPassed: evidence.verifiedPassed,
          integrityValid,
          testsPassed,
          totalTests: evidence.testResults.length,
          commandsExecuted: evidence.commandsExecuted,
          evidencePack: evidence,
        }));
        return;
      }

      if (req.method === "POST" && action === "approve") {
        if (!hasPermission(caller.permissions, "approvals:decide")) {
          res.writeHead(403);
          res.end(JSON.stringify({ error: "Permission denied", required: "approvals:decide" }));
          return;
        }
        if (!task.evidencePack?.verifiedPassed || !verifyEvidencePackIntegrity(task.evidencePack) || task.status !== "waiting_approval") {
          res.writeHead(409);
          res.end(JSON.stringify({
            error: "This task has no verified evidence awaiting approval. No task status was changed.",
            task,
          }));
          return;
        }
        const approvedBy = caller.user?.id || "local-owner";
        if (task.evidencePack.approvalId) {
          const request = this.store.listApprovals().find(item => item.id === task.evidencePack?.approvalId);
          if (!request || request.taskId !== task.id || request.status !== "pending") {
            res.writeHead(409); res.end(JSON.stringify({ error: "The linked approval is unavailable or already resolved. Refresh this task." })); return;
          }
          this.store.resolveApproval({ approvalId: request.id, status: "approved", approverUserId: approvedBy, decisionOrigin: "web" });
        } else {
          this.store.updateTask(task.id, {
            status: "completed",
            completedAt: new Date().toISOString(),
            evidencePack: { ...task.evidencePack, approvedBy, approvalSource: "web" },
          });
        }
        this.store.recordAudit({
          origin: "web",
          actorId: approvedBy,
          actorType: "user",
          action: "TASK_APPROVED",
          targetType: "task",
          targetId: task.id,
          details: { message: `Task ${task.id} approved. No repository merge was performed.` }
        });
        res.writeHead(200);
        res.end(JSON.stringify({ message: `Task ${task.id} approved. No repository merge was performed.`, task: this.store.getTask(task.id) }));
        return;
      }

      if (req.method === "GET" && action === "walkthrough") {
        const evidence = task.evidencePack;
        if (!evidence) {
          res.writeHead(409);
          res.end(JSON.stringify({
            available: false,
            taskId: task.id,
            reason: "No evidence pack is attached to this task, so no walkthrough can be generated.",
          }));
          return;
        }
        const walkthroughMd = `# Walkthrough: [${task.id}] ${task.title}\n\n` +
          `**Status**: ${task.status.toUpperCase()} | **Priority**: ${task.priority.toUpperCase()} | **Assigned**: ${task.assignedAgentId || "Unassigned"}\n\n` +
          `## Objective\n${task.description || "No description recorded."}\n\n` +
          `## Verification results\n` +
          evidence.testResults.map(result => `- ${result.passed ? "PASS" : "FAIL"}: ${result.checkName} (${result.command})`).join("\n") + `\n\n` +
          `## Recorded file changes\n` +
          (evidence.filesChanged.length ? evidence.filesChanged.map(file => `- ${file.status}: ${file.filePath} (+${file.linesAdded}/-${file.linesDeleted})`).join("\n") : "No file changes were recorded by the executor.") + `\n\n` +
          `## Evidence\n` +
          `- **Base SHA**: ${evidence.baseSha}\n` +
          `- **Current SHA**: ${evidence.finalSha || "Not reported"}\n` +
          `- **Verified passed**: ${evidence.verifiedPassed}\n` +
          `- **Artifacts**: ${evidence.artifacts.length}`;

        res.writeHead(200);
        res.end(JSON.stringify({
          taskId: task.id,
          title: task.title,
          status: task.status,
          walkthroughMarkdown: walkthroughMd,
          diffStat: evidence.diffStat,
          filesChanged: evidence.filesChanged,
          verified: evidence.verifiedPassed,
          evidencePack: evidence
        }));
        return;
      }
    }

    if (req.method === "GET" && path === "/api/readiness") {
      res.writeHead(200);
      res.end(JSON.stringify(PROVIDER_READINESS_REGISTRY));
      return;
    }

    if (req.method === "GET" && path === "/api/release-readiness") {
      const execution = this.taskWorkerRuntime?.getExecutionReadiness() ?? {
        ready: false,
        blockers: ["No task worker runtime is connected."],
        capabilities: { modelPlanning: false, isolatedCompute: false, realVerification: false, evidenceCollection: false },
      };
      res.writeHead(200);
      res.end(JSON.stringify(buildReleaseReadiness(PROVIDER_READINESS_REGISTRY, execution)));
      return;
    }

    if (req.method === "GET" && path === "/api/harnesses") {
      const isRunning = this.taskWorkerRuntime?.isRunning() ?? false;
      const workerCount = this.taskWorkerRuntime?.getActiveWorkerCount() ?? 0;
      const canExecuteTasks = this.taskWorkerRuntime?.canExecuteTasks() ?? false;
      const executionBlockReason = this.taskWorkerRuntime?.getExecutionBlockReason();
      const executionReadiness = this.taskWorkerRuntime?.getExecutionReadiness();
      res.writeHead(200);
      res.end(JSON.stringify({
        runtime: {
          id: "agentforge-native",
          name: "AgentForge Harness",
          status: canExecuteTasks && isRunning ? "CONNECTED" : "NOT_CONNECTED",
          canExecuteTasks: canExecuteTasks && isRunning,
          workerCount,
          activeTaskIds: isRunning && canExecuteTasks ? this.taskWorkerRuntime?.getActiveTaskIds() ?? [] : [],
          readiness: executionReadiness,
          explanation: canExecuteTasks && isRunning
            ? "The AgentForge-owned worker and execution backend are active."
            : executionBlockReason || "The AgentForge-owned worker is stopped. Tasks are stored, but no work is running.",
        },
        providers: PROVIDER_READINESS_REGISTRY.filter(provider => provider.category === "harness"),
      }));
      return;
    }

    // Quality records are local workspace evidence. The UI needs this boundary so
    // it never implies temporary fixture state will survive a restart.
    if (req.method === "GET" && path === "/api/drift/status") {
      res.writeHead(200);
      res.end(JSON.stringify({
        persistenceMode: this.store.persistenceMode,
        baselineCount: this.driftMonitor.listBaselines().length,
        comparisonCount: this.driftMonitor.listAnalyses().length,
        correctionCount: this.correctionRegistry.list().length,
        pendingCorrectionCount: this.correctionRegistry.list("PENDING_APPROVAL").length,
      }));
      return;
    }

    if (req.method === "GET" && path === "/api/quality/corrections") {
      // Expected output and rationale can be task-specific. The operator view is
      // deliberately metadata-only; the underlying evidence remains external.
      res.writeHead(200);
      res.end(JSON.stringify(this.correctionRegistry.list().map(proposal => ({
        correctionId: proposal.correctionId,
        evidenceRef: proposal.evidence.evidenceRef,
        evidenceDigest: proposal.evidence.evidenceDigest,
        expectedResultKind: proposal.correctedExpectedResult.kind,
        status: proposal.status,
        createdAt: proposal.createdAt,
        reviewedAt: proposal.reviewedAt,
        reviewedBy: proposal.reviewedBy,
        rejectionReason: proposal.rejectionReason,
      }))));
      return;
    }

    // Drift Monitoring Endpoints (Sections 22, 23, 24, 25)
    if (req.method === "GET" && path === "/api/drift/baselines") {
      res.writeHead(200);
      res.end(JSON.stringify(this.driftMonitor.listBaselines()));
      return;
    }

    if (req.method === "GET" && path === "/api/drift/reports") {
      res.writeHead(200);
      res.end(JSON.stringify(this.driftMonitor.listAnalyses()));
      return;
    }

    if (req.method === "POST" && path === "/api/drift/evaluate") {
      if (this.store.persistenceMode === "local_json") {
        res.writeHead(409);
        res.end(JSON.stringify({
          error: "Drift evaluation is unavailable until a reviewed evaluation source is connected. The local control plane will not accept manually asserted performance data.",
          available: false,
        }));
        return;
      }
      try {
        const body = await this.readBody(req) as Record<string, any>;
        const targetId = body.targetId || body.modelId;
        if (!targetId) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Missing required drift targetId/modelId" }));
          return;
        }
        const targetType = body.targetType || "model";
        const targetVersion = body.targetVersion || "1.0.0";
        let passRatePct = 100;
        if (typeof body.passRatePct === "number") {
          passRatePct = body.passRatePct;
        } else if (typeof body.measuredPassRate === "number") {
          passRatePct = body.measuredPassRate <= 1.0 ? body.measuredPassRate * 100 : body.measuredPassRate;
        }
        const avgLatencyMs = typeof body.avgLatencyMs === "number" ? body.avgLatencyMs
          : typeof body.measuredLatencyMs === "number" ? body.measuredLatencyMs : 200;
        const toolMisuseCount = typeof body.toolMisuseCount === "number" ? body.toolMisuseCount
          : typeof body.unauthorizedToolAttempts === "number" ? body.unauthorizedToolAttempts : 0;
        const hallucinatedClaimsCount = typeof body.hallucinatedClaimsCount === "number" ? body.hallucinatedClaimsCount
          : typeof body.hallucinatedCapabilities === "number" ? body.hallucinatedCapabilities : 0;
        const testCaseResults = body.testCaseResults || { "bench-code-1": true, "bench-sop-1": true };

        const analysis = this.driftMonitor.evaluate({
          runId: String(body.runId || `run-${Date.now()}`),
          targetId: String(targetId),
          targetType: targetType as any,
          targetVersion: String(targetVersion),
          passRatePct,
          avgLatencyMs,
          avgTokensPerTask: body.avgTokensPerTask ? Number(body.avgTokensPerTask) : undefined,
          toolAccuracyPct: body.toolAccuracyPct ? Number(body.toolAccuracyPct) : undefined,
          hallucinatedClaimsCount,
          toolMisuseCount,
          executedAt: new Date().toISOString(),
          testCaseResults: (testCaseResults as Record<string, boolean>),
        });

        res.writeHead(200);
        res.end(JSON.stringify({
          ...analysis,
          modelId: analysis.targetId,
          status: analysis.action,
          passed: analysis.action === "HEALTHY",
        }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: `Could not evaluate drift: ${redactRuntimeError(err)}` }));
      }
      return;
    }

    // Documentation & Specification Explorer Endpoints
    if (req.method === "GET" && path === "/api/docs") {
      try {
        const docs = listProductDocumentation().map(({ name, fullPath }) => {
          const stat = fs.statSync(fullPath);
          const raw = fs.readFileSync(fullPath, "utf8");
          const firstH1Match = raw.match(/^#\s+(.+)$/m);
          const title = firstH1Match ? firstH1Match[1].trim() : name.replace(/\.md$/, "");

          let category = "Guides & Security";
          const upper = name.toUpperCase();
          if (upper.includes("ROADMAP") || upper.includes("GOAL") || upper.includes("PLAN") || upper.includes("TAKEOVER")) {
            category = "Roadmaps & Master Goals";
          } else if (upper.includes("SPECIFICATION") || upper.includes("CONTRACT") || upper.includes("TRACEABILITY") || upper.includes("EXTENSION") || upper.includes("INDEX")) {
            category = "Architecture & Specifications";
          } else if (upper.includes("FLYWHEEL") || upper.includes("DRIFT") || upper.includes("AUDIT") || upper.includes("BENCHMARK") || upper.includes("DECISION") || upper.includes("COMPETITIVE") || upper.includes("REPORT")) {
            category = "Quality, Drift & Governance";
          } else if (upper.includes("AGENT") || upper.includes("SOUL") || upper.includes("IDENTITY") || upper.includes("MISSION") || upper.includes("TEAM") || upper.includes("TOOL") || upper.includes("MEMORY") || upper.includes("HEARTBEAT") || upper.includes("AUTONOMY") || upper.includes("DELEGATION")) {
            category = "Workforce & Operations";
          }

          return {
            name,
            title,
            category,
            sizeBytes: stat.size,
            isMasterSpec: upper.includes("MASTER") || upper.includes("COMPLETION") || upper.includes("ROADMAP") || upper.includes("RELEASE"),
            snippet: raw.slice(0, 240).replace(/[\r\n]+/g, " ").trim(),
          };
        });

        res.writeHead(200);
        res.end(JSON.stringify(docs));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: `Could not load documentation catalog: ${redactRuntimeError(err)}` }));
      }
      return;
    }

    if (req.method === "GET" && path.startsWith("/api/docs/")) {
      const fileName = decodeURIComponent(path.slice("/api/docs/".length));
      if (!/^[a-zA-Z0-9_.-]+\.md$/.test(fileName)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid document filename requested." }));
        return;
      }
      const document = findProductDocumentation(fileName);
      if (!document) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Document ${fileName} not found.` }));
        return;
      }
      try {
        const content = fs.readFileSync(document.fullPath, "utf8");
        const stat = fs.statSync(document.fullPath);
        res.writeHead(200);
        res.end(JSON.stringify({
          name: fileName,
          content,
          sizeBytes: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: `Could not read document: ${redactRuntimeError(err)}` }));
      }
      return;
    }

    // Telegram Sandbox & Conflict Guard Endpoints (Sections 11, 12, 13)
    if (req.method === "POST" && path === "/api/telegram/link-code") {
      try {
        const owner = this.store.listUsers().find(u => u.role === "owner");
        const link = this.mirrorRouter.issueTelegramLinkCode(owner?.id || "user-owner");
        res.writeHead(201);
        res.end(JSON.stringify(link));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: redactRuntimeError(error, "Could not create a link code") }));
      }
      return;
    }

    if (req.method === "GET" && path === "/api/telegram/conflict-check") {
      const conflict = await this.telegram.detectOwnershipConflict();
      res.writeHead(200);
      res.end(JSON.stringify(conflict));
      return;
    }

    if (req.method === "GET" && path === "/api/telegram/cutover-phase") {
      res.writeHead(200);
      res.end(JSON.stringify({ phase: this.telegram.getCutoverPhase() }));
      return;
    }

    if (req.method === "POST" && path === "/api/telegram/cutover-phase") {
      const body = await this.readBody(req) as { phase: any };
      this.telegram.setCutoverPhase(body.phase);
      res.writeHead(200);
      res.end(JSON.stringify({ phase: this.telegram.getCutoverPhase() }));
      return;
    }

    // Secret Storage Endpoint (Section 37)
    if (req.method === "GET" && path === "/api/secrets") {
      const secrets = await this.secretStore.listSecrets();
      res.writeHead(200);
      res.end(JSON.stringify(secrets));
      return;
    }

    // --- Migration Center REST Endpoints (Sections 7-27) ---
    if (req.method === "GET" && path === "/api/migration/sources") {
      res.writeHead(200);
      res.end(JSON.stringify([
        { id: "OPENCLAW_LEGACY", name: "OpenClaw (Legacy Layout)", description: "Sanitized compatibility fixture for an earlier OpenClaw layout." },
        { id: "OPENCLAW_CURRENT", name: "OpenClaw (Modern Upstream)", description: "Latest upstream stable OpenClaw architecture" },
        { id: "HERMES", name: "Hermes", description: "Hermes autonomous agents and feeds" },
        { id: "GROK_BOT", name: "Grok Bot", description: "Exported prompts and custom agent definitions" },
        { id: "GENERIC", name: "Generic Manifest", description: "Standard agentforge-migration.json manifest" },
      ]));
      return;
    }

    if (req.method === "POST" && path === "/api/migration/inspect") {
      const body = await this.readBody(req) as { source: string };
      let inspection;
      if (body.source === "OPENCLAW_CURRENT") inspection = await this.openclawCurrent.inspect();
      else if (body.source === "HERMES") inspection = await this.hermesMigration.inspect();
      else if (body.source === "GROK_BOT") inspection = await this.grokMigration.inspect();
      else if (body.source === "GENERIC") inspection = await this.genericMigration.inspect();
      else inspection = await this.openclawLegacy.inspect();

      res.writeHead(200);
      res.end(JSON.stringify(inspection));
      return;
    }

    if (req.method === "POST" && path === "/api/migration/plan") {
      const body = await this.readBody(req) as { source: string };
      let plan;
      if (body.source === "OPENCLAW_CURRENT") {
        const insp = await this.openclawCurrent.inspect();
        plan = await this.openclawCurrent.plan(insp);
      } else if (body.source === "HERMES") {
        const insp = await this.hermesMigration.inspect();
        plan = await this.hermesMigration.plan(insp);
      } else if (body.source === "GROK_BOT") {
        const insp = await this.grokMigration.inspect();
        plan = await this.grokMigration.plan(insp);
      } else if (body.source === "GENERIC") {
        const insp = await this.genericMigration.inspect();
        plan = await this.genericMigration.plan(insp);
      } else {
        const insp = await this.openclawLegacy.inspect();
        plan = await this.openclawLegacy.plan(insp);
      }

      res.writeHead(200);
      res.end(JSON.stringify(plan));
      return;
    }

    if (req.method === "POST" && path === "/api/migration/dry-run") {
      const body = await this.readBody(req) as { source: string };
      const provider = body.source === "OPENCLAW_CURRENT" ? this.openclawCurrent
        : body.source === "HERMES" ? this.hermesMigration
        : body.source === "GROK_BOT" ? this.grokMigration
        : body.source === "GENERIC" ? this.genericMigration
        : this.openclawLegacy;

      const insp = await provider.inspect();
      const plan = await provider.plan(insp);
      const dryRun = await provider.dryRun(plan);

      res.writeHead(200);
      res.end(JSON.stringify({ plan, dryRun }));
      return;
    }

    if (req.method === "POST" && path === "/api/migration/import") {
      const body = await this.readBody(req) as { source: string };
      const provider = body.source === "OPENCLAW_CURRENT" ? this.openclawCurrent
        : body.source === "HERMES" ? this.hermesMigration
        : body.source === "GROK_BOT" ? this.grokMigration
        : body.source === "GENERIC" ? this.genericMigration
        : this.openclawLegacy;

      const insp = await provider.inspect();
      const plan = await provider.plan(insp);
      const result = await provider.importToStore(plan, this.store);
      const verification = await provider.verify(result.runId, this.store);

      res.writeHead(200);
      res.end(JSON.stringify({ result, verification }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Endpoint not found" }));
  }

  start(): Promise<void> {
    if (!this.isLoopbackBindHost() && !this.apiToken) {
      return Promise.reject(new Error(
        "AGENTFORGE_API_TOKEN is required when AGENTFORGE_HOST is not a loopback address.",
      ));
    }

    return new Promise((resolve, reject) => {
      const onError = (error: Error): void => {
        this.server.off("listening", onListening);
        reject(error);
      };
      const onListening = (): void => {
        this.server.off("error", onError);
        console.log(`[AgentForge vNext] Control Plane Web Server running at http://${this.host}:${this.port}`);
        resolve();
      };
      this.server.once("error", onError);
      this.server.once("listening", onListening);
      this.server.listen(this.port, this.host);
    });
  }

  getBaseUrl(): string {
    const address = this.server.address();
    if (typeof address !== "object" || address === null) {
      throw new Error("AgentForge web server is not listening.");
    }
    return `http://${this.host}:${address.port}`;
  }

  stop(): Promise<void> {
    this.conversations.shutdown();
    if (this.taskWorkerRuntime) {
      this.taskWorkerRuntime.stop();
    }
    for (const client of [...this.sseClients]) this.removeSseClient(client);
    return new Promise(resolve => {
      if (typeof (this.server as any).closeAllConnections === "function") {
        (this.server as any).closeAllConnections();
      }
      this.server.close(() => resolve());
    });
  }

  private renderAppHtml(): string {
    return renderWorkspaceApp();
  }
}
