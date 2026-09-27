import { describe, expect, it } from "vitest";
import * as AgentForge from "./index.js";

describe("public library surface", () => {
  it("exports the three public subsystems and provider-neutral building blocks", () => {
    expect(AgentForge.PUBLIC_SYSTEM_MANIFEST.map(item => item.id)).toEqual(["agentforge", "workflow-engine", "jev"]);
    expect(AgentForge.WorkflowEngine).toBeTypeOf("function");
    expect(AgentForge.proposeSetupPlan).toBeTypeOf("function");
    expect(AgentForge.buildContextPacket).toBeTypeOf("function");
    expect(AgentForge.ModelRouter).toBeTypeOf("function");
    expect(AgentForge.TeleprotoTelegramUserSessionClient).toBeTypeOf("function");
    expect(AgentForge.DiscordGatewayTransport).toBeTypeOf("function");
    expect(AgentForge.JevUltrafastBrowserPolicy).toBeTypeOf("function");
    expect(AgentForge.BrowserSessionRegistry).toBeTypeOf("function");
    expect(AgentForge.ProcessAgentBridge).toBeTypeOf("function");
    expect(AgentForge.CorrectionRegistry).toBeTypeOf("function");
  });
});
