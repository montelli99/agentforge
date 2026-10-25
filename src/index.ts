/**
 * AgentForge public library surface.
 *
 * This entrypoint intentionally exports provider-neutral contracts and public
 * building blocks only. Deployment credentials, private workspace state, and
 * deployment-specific integrations are not part of the package surface.
 */
export * from "./publicSystemManifest.js";
export * from "./workflowEngine.js";
export * from "./setupOrchestrator.js";
export * from "./contextPacket.js";
export * from "./memoryEvaluation.js";
export * from "./releaseReadiness.js";
export * from "./processAgentBridge.js";
export * from "./providers/process/processCompiler.js";
export * from "./providers/process/scribeProvider.js";
export * from "./core/process/processExecutionEngine.js";
export * from "./providers/mcp/mcpJsonRpcClient.js";
export * from "./channelConnectionRegistry.js";
export * from "./nativeGateway.js";
export * from "./channelRuntimeRegistry.js";
export * from "./controller/agentController.js";
export * from "./providers/decision/jevDecision.js";
export * from "./providers/models/modelRouter.js";
export * from "./providers/channels/telegramUserSessionTransport.js";
export * from "./providers/channels/teleprotoTelegramUserSessionClient.js";
export * from "./providers/channels/telegramLiveTransport.js";
export * from "./providers/channels/telegramSessionConfig.js";
export * from "./providers/channels/slackSocketModeTransport.js";
export * from "./providers/channels/discordGatewayTransport.js";
export * from "./providers/channels/telegramGatewayRelay.js";
export * from "./providers/channels/discordGatewayRelay.js";
export * from "./providers/browser/jevUltrafastBrowser.js";
export * from "./providers/browser/browserSessionRegistry.js";
export * from "./providers/harness/piSdkExecutor.js";
export * from "./providers/harness/pydanticHttpExecutor.js";
export * from "./providers/harness/nativeComputeExecutor.js";
export * from "./core/runtime/taskWorkerRuntime.js";
export * from "./core/runtime/modelToolLoop.js";
export * from "./core/quality/correctionRegistry.js";
export * from "./core/types/providerReadiness.js";
export * from "./core/types/process.js";
export * from "./core/types/contract.js";
export * from "./core/types/task.js";
export * from "./core/types/evidence.js";
export * from "./core/evidence/evidencePackIntegrity.js";
export * from "./core/types/agent.js";
export * from "./core/providers/memory.js";
export * from "./core/store/workspaceStore.js";
export * from "./providers/memory/operationalMemory.js";
export * from "./providers/memory/obsidianMemory.js";
export * from "./providers/memory/hindsightMemory.js";


// Reusable optimization SDK; importing it never starts the legacy proxy.
export { AgentForgeOptimizer, createOptimizer } from "./optimizer.js";
export { SemanticCache } from "./cache.js";
export { SemanticMemory } from "./semanticMemory.js";
export { RealEmbeddingProvider } from "./embeddingAdapter.js";
export { canOptimizeProviderBody, buildOptimizedProviderBody } from "./providerRequestBody.js";

export {ExplicitIndexedMemory, type ExplicitIndexOptions, type IndexedEmbeddingProvider} from "./memory/indexed/explicitIndex.js";
export {IndexedServerMode, configureIndexedServerMode, readIndexedServerConfiguration, type IndexedMemoryRuntime, type IndexedServerConfiguration} from "./memory/indexed/serverMode.js";
export {ContinuousIndexedMemoryLifecycle, extractSyntheticMemorySnapshot, type ContinuousIndexedMemoryConfiguration, type ContinuousMemoryWatchEvent, type ContinuousMemoryWatcher} from "./memory/indexed/continuousLifecycle.js";
export {SubscriptionCliModelProvider,readSubscriptionCliConfiguration,type SubscriptionCliConfiguration} from "./providers/models/subscriptionCliModel.js";
export {inspectClaudeCliCapabilities,inspectClaudeCliAuthentication,type ClaudeCliCapabilities} from "./providers/models/claudeCliCapabilities.js";
export {prepareChatGPTSignIn,chatgptDirectSignInEndpoint} from "./providers/models/chatgptDirectSignIn.js";
export {exchangeDirectCallback,type DirectTokenExchangeTransport,type SessionCredentials} from "./providers/models/chatgptDirectExchange.js";
export * from "./providers/memory/compositeMemory.js";
export { ConversationRuntime, type ConversationConfiguration } from "./server/conversationRuntime.js";
export * from "./providers/memory/memoryConnections.js";
export { AgentForgeWebServer } from "./server/webServer.js";
