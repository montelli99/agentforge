/**
 * AgentForge vNext Web Control Plane Launcher
 */

import http from "node:http";
import path from "node:path";
import { AgentForgeWebServer } from "./webServer.js";
import { getDefaultWorkspaceFilePath, WorkspaceStore } from "../core/store/workspaceStore.js";
import { CompletionEngine } from "../core/completion/completionEngine.js";
import { JsonCompletionSessionStore } from "../core/completion/completionSessionStore.js";
import { OpenAIModelProvider } from "../providers/models/openaiModel.js";
import { MiMoModelProvider } from "../providers/models/mimoModel.js";
import { TaskWorkerRuntime } from "../core/runtime/taskWorkerRuntime.js";
import { ApprovedPlanProvider } from "../core/runtime/approvedPlanProvider.js";
import { ContractedDockerExecutionBackend } from "../core/runtime/contractedDockerExecutionBackend.js";
import { DockerComputeProvider } from "../core/compute/dockerComputeProvider.js";
import { ModelPlanDraftProvider } from "../core/runtime/modelPlanDraftProvider.js";
import { TelegramUserSessionTransport } from "../providers/channels/telegramUserSessionTransport.js";
import { TeleprotoTelegramUserSessionClient } from "../providers/channels/teleprotoTelegramUserSessionClient.js";
import { readTelegramSessionConfig } from "../providers/channels/telegramSessionConfig.js";
import { OperationalMemoryProvider } from "../providers/memory/operationalMemory.js";
import { OpenClawGatewayTransport } from "../providers/channels/openClawGatewayTransport.js";
import { DiscordGatewayTransport } from "../providers/channels/discordGatewayTransport.js";
import { readDiscordBotToken } from "../providers/channels/discordBotConfig.js";
import { SlackSocketModeTransport } from "../providers/channels/slackSocketModeTransport.js";
import { readSlackSocketModeConfig } from "../providers/channels/slackSocketModeConfig.js";
import { TelegramBotApiTransport, type TelegramBotUpdate } from "../providers/channels/telegramBotApiTransport.js";
import { readTelegramBotToken } from "../providers/channels/telegramBotConfig.js";
import { redactRuntimeError } from "../core/secret/runtimeRedaction.js";

// 3000 is intentionally avoided: it is commonly occupied by unrelated local services.
const port = parseInt(process.env.PORT || process.env.AGENTFORGE_PORT || "3460", 10);
const workspaceFilePath = getDefaultWorkspaceFilePath();
const completionStorePath = path.join(path.dirname(workspaceFilePath), "completion-sessions.json");
// Dedicated opt-in only: never adopt production or unrelated application credentials.
const chatKey = process.env.AGENTFORGE_CHAT_API_KEY;
const chatModels = (process.env.AGENTFORGE_CHAT_MODELS || "").split(",").map(value => value.trim()).filter(Boolean);
const chatBase = process.env.AGENTFORGE_CHAT_BASE_URL || "https://api.openai.com/v1";
const chatProviderName = process.env.AGENTFORGE_CHAT_PROVIDER || "openai-compatible";
if (!["openai-compatible", "mimo"].includes(chatProviderName)) throw new Error("Unknown AgentForge chat provider.");
if (chatKey && chatModels.length) {
  const endpoint = new URL(chatBase);
  if (endpoint.username || endpoint.password || (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname)))) throw new Error("Chat endpoint requires HTTPS or localhost HTTP.");
}
const store = new WorkspaceStore(workspaceFilePath);
const operationalMemory = new OperationalMemoryProvider(store);
const completion = new CompletionEngine(undefined, new JsonCompletionSessionStore(completionStorePath));
const chatProvider = chatModels.length
  ? chatProviderName === "mimo" && process.env.MIMO_API_KEY
    ? new MiMoModelProvider()
    : chatProviderName === "openai-compatible" && chatKey
      ? new OpenAIModelProvider(chatKey, chatBase)
      : undefined
  : undefined;
const planDraftProvider = chatProvider && chatModels[0] ? new ModelPlanDraftProvider(chatProvider, chatModels[0]) : undefined;
let taskRuntime: TaskWorkerRuntime | undefined;
const executionMode = process.env.AGENTFORGE_EXECUTION_MODE;
if (executionMode && executionMode !== "off" && executionMode !== "approved-docker") {
  throw new Error("Unknown AgentForge execution mode. Use off or approved-docker.");
}
if (executionMode === "approved-docker") {
  const repository = process.env.AGENTFORGE_EXECUTION_REPO;
  if (!repository || !path.isAbsolute(repository)) throw new Error("Approved Docker execution requires an explicit absolute AGENTFORGE_EXECUTION_REPO.");
  const plans = new ApprovedPlanProvider(async taskId => store.getTask(taskId)?.approvedExecutionPlan);
  const backend = new ContractedDockerExecutionBackend(new DockerComputeProvider({ maxMemoryBytes: 1024 * 1024 * 1024, cpuQuota: 1 }), plans);
  await backend.initialize();
  taskRuntime = new TaskWorkerRuntime(store, backend, {
    repoRoot: repository,
    autoStart: false,
    automaticDispatch: false,
    memoryProvider: operationalMemory,
    memoryNamespace: "workspace",
  }, completion);
}
const server = new AgentForgeWebServer(
  store,
  port,
  completion,
  taskRuntime,
  { conversation: chatProvider ? { provider: chatProvider, models: chatModels,
    memoryNamespace: process.env.AGENTFORGE_CHAT_MEMORY_NAMESPACE || undefined } : undefined,
    planDraftProvider },
);

// Telegram is a direct AgentForge-owned MTProto user session and does not
// require an OpenClaw/Hermes process. API ID, API hash, and the already-
// authorized session are runtime-only secrets.
let telegramUserSession: TelegramUserSessionTransport | undefined;
let telegramBotTransport: TelegramBotApiTransport | undefined;
let gatewayTransport: OpenClawGatewayTransport | undefined;
let gatewayRelay: ReturnType<typeof server.telegram.createGatewayRelay> | undefined;
let discordTransport: DiscordGatewayTransport | undefined;
let slackTransport: SlackSocketModeTransport | undefined;
const telegramSessionConfig = readTelegramSessionConfig();
if (telegramSessionConfig) {
  telegramUserSession = new TelegramUserSessionTransport(new TeleprotoTelegramUserSessionClient(telegramSessionConfig));
  server.telegram.attachUserSessionTransport(telegramUserSession);
}

// Easy public setup path: a BotFather token is sufficient for normal bot
// messaging and requires no MTProto developer credentials. MTProto remains
// preferred when a user-session file is explicitly configured.
const telegramBotToken = readTelegramBotToken();
if (!telegramSessionConfig && telegramBotToken) {
  telegramBotTransport = new TelegramBotApiTransport({
    token: telegramBotToken,
    onUpdate: async (update: TelegramBotUpdate) => {
      const message = update.message;
      if (message) {
        await server.telegram.ingestInboundUpdate({
          updateId: update.update_id,
          chatId: String(message.chat.id),
          topicId: message.message_thread_id,
          userId: String(message.from?.id ?? message.chat.id),
          username: message.from?.username,
          text: message.text,
          messageId: message.message_id,
          replyToMessageId: message.reply_to_message?.message_id,
        });
        return;
      }
      const callback = update.callback_query;
      if (!callback?.message) return;
      await server.telegram.ingestInboundUpdate({
        updateId: update.update_id,
        chatId: String(callback.message.chat.id),
        topicId: callback.message.message_thread_id,
        userId: String(callback.from.id),
        username: callback.from.username,
        callbackData: callback.data,
        messageId: callback.message.message_id,
      });
    },
  });
  server.telegram.attachLiveTransport(telegramBotTransport);
}

// Optional migration path: attach to an already-authenticated OpenClaw/Hermes
// gateway. This bridge is never required by the native MTProto path above.
const gatewayUrl = process.env.AGENTFORGE_GATEWAY_URL?.trim();
if (gatewayUrl) {
  gatewayTransport = new OpenClawGatewayTransport({
    url: gatewayUrl,
    token: process.env.AGENTFORGE_GATEWAY_TOKEN?.trim() || undefined,
    identityPath: process.env.AGENTFORGE_GATEWAY_IDENTITY_PATH || path.join(path.dirname(workspaceFilePath), "gateway-device.json"),
  });
  gatewayRelay = server.telegram.createGatewayRelay(gatewayTransport);
  server.telegram.attachGatewayRelay(gatewayRelay);
}

// Discord Gateway is also opt-in and runtime-only. The token is never written
// to workspace state or exposed through the public manifest.
const discordToken = readDiscordBotToken();
if (discordToken) {
  discordTransport = new DiscordGatewayTransport({
    token: discordToken,
    gatewayUrl: process.env.AGENTFORGE_DISCORD_GATEWAY_URL,
    onEvent: async event => server.discord.ingestInboundInteraction(event),
  });
  server.discord.attachLiveTransport(discordTransport);
}

const { appToken: slackAppToken, botToken: slackBotToken } = readSlackSocketModeConfig();
if (slackAppToken && slackBotToken) {
  slackTransport = new SlackSocketModeTransport({
    appToken: slackAppToken,
    botToken: slackBotToken,
    onEvent: async event => server.slack.ingestEvent(event),
  });
  server.slack.attachTransport(slackTransport);
}

// Start autonomous task worker runtime
server.taskWorkerRuntime.start();

const configuredChannels: Array<"telegram" | "discord" | "slack"> = [];
if (telegramUserSession || telegramBotTransport || (gatewayTransport && gatewayRelay)) configuredChannels.push("telegram");
if (discordTransport) configuredChannels.push("discord");
if (slackTransport) configuredChannels.push("slack");

server.start().then(async () => {
  // Start every configured transport through the native gateway. This keeps the
  // public gateway snapshot aligned with the live adapter that owns the session.
  if (configuredChannels.length > 0) {
    const snapshot = await server.nativeGateway.start(configuredChannels);
    const telegramStatus = snapshot.channels.find(channel => channel.provider === "telegram");
    if (telegramStatus?.state === "error") throw new Error(telegramStatus.lastError || "Telegram runtime failed to start.");
    if (telegramUserSession || telegramBotTransport) {
      console.log(telegramUserSession
        ? "[AgentForge vNext] Direct Telegram MTProto user session is connected."
        : "[AgentForge vNext] Telegram Bot API transport is connected.");
    }
  }
  if (gatewayTransport && gatewayRelay) {
    gatewayTransport.start();
    gatewayRelay.start();
    console.log("[AgentForge vNext] Optional OpenClaw/Hermes relay connected; native AgentForge Telegram remains available.");
  }

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[AgentForge vNext] Received ${signal}; stopping runtime cleanly.`);
    await server.nativeGateway.stop(configuredChannels);
    await server.stop();
  };
  process.once("SIGINT", () => { void shutdown("SIGINT").finally(() => process.exit(0)); });
  process.once("SIGTERM", () => { void shutdown("SIGTERM").finally(() => process.exit(0)); });

  const workerReady = server.taskWorkerRuntime.canExecuteTasks() && server.taskWorkerRuntime.isRunning();
  console.log(workerReady
    ? `[AgentForge vNext] TaskWorkerRuntime active with ${server.taskWorkerRuntime.getActiveWorkerCount()} workers.`
    : `[AgentForge vNext] Task execution is offline: ${server.taskWorkerRuntime.getExecutionBlockReason() || "worker stopped"}`);

  // Dual-port forwarder on 3460 to preserve existing user browser tab
  if (port !== 3460 && process.env.AGENTFORGE_DISABLE_SECONDARY !== "1") {
    try {
      const secondaryServer = http.createServer((req, res) => {
        const proxyReq = http.request({
          hostname: "127.0.0.1",
          port: port,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, host: `127.0.0.1:${port}` },
        }, (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        });
        proxyReq.on("error", (proxyErr) => {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end(`Secondary proxy to port ${port} failed: ${redactRuntimeError(proxyErr)}`);
        });
        req.pipe(proxyReq, { end: true });
      });
      secondaryServer.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          console.log(`[AgentForge vNext] Port 3460 is already in use; primary active on http://127.0.0.1:${port}`);
        } else {
          console.warn("[AgentForge vNext] Secondary listener error:", redactRuntimeError(err));
        }
      });
      secondaryServer.listen(3460, "127.0.0.1", () => {
        console.log(`[AgentForge vNext] Secondary listener active at http://127.0.0.1:3460/ (preserving user browser tabs)`);
      });
    } catch (secErr) {
      console.warn("[AgentForge vNext] Could not start secondary 3460 listener:", redactRuntimeError(secErr));
    }
  }
}).catch(err => {
  console.error("Failed to start AgentForge vNext Web Server:", redactRuntimeError(err));
  process.exit(1);
});
