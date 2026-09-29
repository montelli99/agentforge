import { describe, expect, it } from "vitest";
import { PydanticHttpExecutor } from "./pydanticHttpExecutor.js";
import { NativeComputeExecutor } from "./nativeComputeExecutor.js";
import { AgentForgeNativeHarnessProvider } from "./nativeHarness.js";

const session = { sessionId: "s1", harnessId: "native", agentId: "a1", status: "active" as const, createdAt: new Date().toISOString() };
const executionContract = {
  id: "contract-harness-test",
  taskId: "t3",
  version: 1,
  repository: { baseBranch: "main", baseSha: "a".repeat(40) },
  workspace: { requireIsolatedWorktree: true },
  scope: { allowedPaths: ["src/**"], protectedPaths: [".env"], maxFilesChanged: 1 },
  authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
  requiredChecks: [],
  completion: { requireEvidencePack: true, requireHumanApproval: false },
  createdAt: new Date().toISOString(),
};
const task = { taskId: "t1", instruction: "run", context: { command: "echo ok" }, contract: { ...executionContract, taskId: "t1" } };

describe("public harness executors", () => {
  it("calls the bounded Pydantic service contract without exposing credentials", async () => {
    let request: RequestInit | undefined;
    const executor = new PydanticHttpExecutor({ endpoint: "http://127.0.0.1:8787/run", apiKey: "secret", fetchImpl: async (_url, init) => {
      request = init;
      return new Response(JSON.stringify({ output: "done", usage: { input: 2, output: 3 } }), { status: 200 });
    } });
    const result = await executor.executeTask({ session, task });
    expect(result).toEqual({ output: "done", tokensUsed: { prompt: 2, completion: 3, total: 5 } });
    expect(String(request?.body)).toContain("t1");
    expect(String(request?.body)).not.toContain("secret");
  });

  it("fails closed for a non-loopback HTTP Pydantic endpoint", () => {
    expect(() => new PydanticHttpExecutor({ endpoint: "http://remote.example/run" })).toThrow(/requires HTTPS/i);
  });

  it("rejects a Pydantic response without textual output", async () => {
    const executor = new PydanticHttpExecutor({
      endpoint: "http://127.0.0.1:8787/run",
      fetchImpl: async () => new Response(JSON.stringify({ usage: { input: 1, output: 1 } }), { status: 200 }),
    });
    await expect(executor.executeTask({ session, task })).rejects.toThrow(/no textual output/i);
  });

  it("requires an explicit command before invoking native compute", async () => {
    let ran = false;
    const compute = {
      id: "test-compute", name: "Test compute", kind: "local" as const,
      async createEnvironment() { return { id: "env", kind: "local_sandbox" as const, workingDirectory: ".", isolated: true, status: "running" as const }; },
      async executeCommand() { ran = true; return { exitCode: 0, stdout: "ok", stderr: "", durationMs: 1 }; },
      async destroyEnvironment() {},
    };
    const executor = new NativeComputeExecutor(compute, ".");
    await executor.createSession({ session });
    await expect(executor.executeTask({ session, task: { taskId: "t2", instruction: "missing" } })).rejects.toThrow(/approved command/i);
    expect(ran).toBe(false);
    await executor.shutdown();
  });

  it("runs an explicitly approved command through the AgentForge harness", async () => {
    const compute = {
      id: "test-compute", name: "Test compute", kind: "local" as const,
      async createEnvironment() { return { id: "env", kind: "local_sandbox" as const, workingDirectory: ".", isolated: true, status: "running" as const }; },
      async executeCommand(_id: string, command: string) { return { exitCode: command === "echo approved" ? 0 : 1, stdout: "approved\n", stderr: "", durationMs: 1 }; },
      async destroyEnvironment() {},
    };
    const executor = new NativeComputeExecutor(compute, ".");
    const harness = new AgentForgeNativeHarnessProvider(false, executor);
    const started = await harness.startSession({ agentId: "a1", systemPrompt: "test" });
    const result = await harness.executeTask(started.sessionId, { taskId: "t3", instruction: "run", context: { command: "echo approved" }, contract: executionContract });
    expect(result).toMatchObject({ status: "success", output: "approved\n" });
    await harness.shutdown();
  });

  it("rejects a destructive command before invoking native compute", async () => {
    let ran = false;
    const compute = {
      id: "test-compute", name: "Test compute", kind: "local" as const,
      async createEnvironment() { return { id: "env", kind: "local_sandbox" as const, workingDirectory: ".", isolated: true, status: "running" as const }; },
      async executeCommand() { ran = true; return { exitCode: 0, stdout: "", stderr: "", durationMs: 1 }; },
      async destroyEnvironment() {},
    };
    const executor = new NativeComputeExecutor(compute, ".");
    const harness = new AgentForgeNativeHarnessProvider(false, executor);
    const started = await harness.startSession({ agentId: "a1", systemPrompt: "test" });
    const result = await harness.executeTask(started.sessionId, {
      taskId: "t-dangerous",
      instruction: "delete files",
      context: { command: "rm -rf artifacts" },
      contract: { ...executionContract, taskId: "t-dangerous" },
    });
    expect(ran).toBe(false);
    expect(result).toMatchObject({ status: "failure", error: expect.stringMatching(/forbidden|denied/i) });
    await harness.shutdown();
  });

  it("enforces file scope before an attached executor can run", async () => {
    let ran = false;
    const executor = {
      async createSession() {},
      async executeTask() { ran = true; return { output: "should not run" }; },
      async shutdown() {},
    };
    const harness = new AgentForgeNativeHarnessProvider(false, executor as unknown as NativeComputeExecutor);
    const started = await harness.startSession({ agentId: "a1", systemPrompt: "test" });
    const result = await harness.executeTask(started.sessionId, {
      taskId: "t-contract",
      instruction: "write outside scope",
      inputFiles: ["outside.txt"],
      contract: {
        id: "contract-harness",
        taskId: "t-contract",
        version: 1,
        repository: { baseBranch: "main", baseSha: "a".repeat(40) },
        workspace: { requireIsolatedWorktree: true },
        scope: { allowedPaths: ["src/**"], protectedPaths: [], maxFilesChanged: 1 },
        authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
        requiredChecks: [],
        completion: { requireEvidencePack: true, requireHumanApproval: false },
        createdAt: new Date().toISOString(),
      },
    });
    expect(ran).toBe(false);
    expect(result).toMatchObject({ status: "failure", error: expect.stringMatching(/contract boundary violation/i) });
    await harness.shutdown();
  });

  it("redacts a credential echoed by a harness executor", async () => {
    const executor = {
      async createSession() {},
      async executeTask() { throw new Error("executor failed with Bearer sk-harnessfixture123456789"); },
      async shutdown() {},
    };
    const harness = new AgentForgeNativeHarnessProvider(false, executor as unknown as NativeComputeExecutor);
    const started = await harness.startSession({ agentId: "a1", systemPrompt: "test" });
    const result = await harness.executeTask(started.sessionId, task);
    expect(result).toMatchObject({ status: "failure", error: "executor failed with Bearer [REDACTED_SECRET]" });
  });
});

