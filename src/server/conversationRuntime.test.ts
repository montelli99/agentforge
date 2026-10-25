import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import type { TaskWorkerRuntime } from "../core/runtime/taskWorkerRuntime.js";
import { executionContractDigest } from "../core/runtime/approvedPlanProvider.js";
import { WorkspaceStore } from "../core/store/workspaceStore.js";
import type { GenerativeModelProvider, ModelRequestOptions, StreamChunk } from "../core/providers/model.js";
import { ConversationRuntime } from "./conversationRuntime.js";
import { invokeConversationTool } from "./conversationTools.js";
import {ChatGPTDirectModel} from '../providers/models/chatgptDirectModel.js';
import {OperationalMemoryProvider} from '../providers/memory/operationalMemory.js';
import {MemoryConnectionRegistry} from '../providers/memory/memoryConnections.js';

function fixture() {
  const store = new WorkspaceStore();
  const workspace = store.createWorkspace({ name: "Synthetic" });
  const project = store.createSpace({ name: "Synthetic", workspaceId: workspace.id, provider: "web" });
  const channel = store.createChannel({ workspaceId: workspace.id, spaceId: project.id, name: "Test", visibility: "private", archived: false, provider: "web" });
  const thread = store.createThread(channel.id, "Synthetic task");
  const prompt = () => store.createMessage({ channelId: channel.id, threadId: thread.id, authorType: "user", authorId: "owner", content: "Build a synthetic artifact" });
  const response = Object.assign(new EventEmitter(), { destroyed: false, writeHead() {}, write() {}, end() {} }) as unknown as ServerResponse;
  return { store, project, channel, thread, prompt, response };
}
function provider(stream: (options: ModelRequestOptions) => AsyncIterable<StreamChunk>): GenerativeModelProvider {
  return { id: "synthetic", name: "Synthetic", defaultTier: 1, isAvailable: async () => true, listModels: async () => ["synthetic"], generate: async () => { throw Error("unexpected generate"); }, stream };
}
describe("server-owned conversations", () => {
  it('runs subscription function calls through the existing scoped task workflow',async()=>{
    const f=fixture();let round=0;
    const grant={accountId:'synthetic-account',grantId:'synthetic-grant',resource:'https://api.openai.com/v1' as const,scopes:['resource.invoke','chatgpt.tokens.use.direct'],expiresAt:Date.now()+60000};
    const model=new ChatGPTDirectModel({enabled:true,model:'synthetic',agentTools:true},{currentGrant:()=>grant},()=>({accountId:grant.accountId,grantId:grant.grantId,expiresAt:grant.expiresAt,response:{models:[{slug:'synthetic',display_name:'Synthetic',visibility:'list'}]}}),{async *open(request){
      if(!round++){
        expect(request.body.tools?.[0].name).toBe('agentforge');
        yield {type:'response.completed',response:{id:'first',status:'completed',output:[{type:'function_call',namespace:'agentforge',name:'prepare_task',call_id:'call_1',arguments:'{"title":"Synthetic artifact"}'}]}};
      }else{
        const result=request.body.input.at(-1)!;
        expect(result).toMatchObject({type:'function_call_output',call_id:'call_1'});
        const task=JSON.parse('output' in result?result.output:'{}');expect(task.status).toBe('backlog');expect(task.approvedExecutionPlan).toBeUndefined();
        yield {type:'response.output_text.delta',delta:'Task prepared for review.'};
        yield {type:'response.completed',response:{id:'second',status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Task prepared for review.'}]}]}};
      }
    }});
    await new ConversationRuntime(f.store,{provider:model,models:['synthetic']}).respond(f.thread.id,f.prompt().id,'synthetic','owner',f.response);
    expect(round).toBe(2);expect(f.store.listThreadMessages(f.thread.id).at(-1)?.generation?.status).toBe('complete');
  });
  it('excludes responses and concurrent changes while loading a connection, and preserves configuration after failure', async () => {
    const f = fixture();
    const model = provider(async function* () { yield { id:'1',deltaText:'ok',finishReason:'stop' }; });
    const runtime = new ConversationRuntime(f.store,{provider:model,models:['synthetic']});
    let reject!: (error: Error) => void;
    const changing = runtime.changeConnection(() => new Promise((_,r)=>{reject=r;}));
    await expect(runtime.respond(f.thread.id,f.prompt().id,'synthetic','owner',f.response)).rejects.toThrow('setup is in progress');
    await expect(runtime.changeConnection(async()=>({provider:model,models:['other']}))).rejects.toThrow('active responses');
    reject(Error('unlock failed'));await expect(changing).rejects.toThrow('unlock failed');
    expect(runtime.status().models).toEqual(['synthetic']);
    const prompt=f.prompt();
    const writeHead=vi.spyOn(f.response,'writeHead');
    const save=vi.spyOn(f.store,'createMessage').mockImplementationOnce(()=>{throw Error('synthetic storage failure');});
    await expect(runtime.respond(f.thread.id,prompt.id,'synthetic','owner',f.response)).rejects.toThrow('synthetic storage failure');
    expect(runtime.status().activeThreads).toEqual([]);expect(writeHead).not.toHaveBeenCalled();save.mockRestore();
    await runtime.respond(f.thread.id,prompt.id,'synthetic','owner',f.response);
    expect(f.store.listThreadMessages(f.thread.id).at(-1)?.generation?.status).toBe('complete');
    let finish!:(value:{provider:GenerativeModelProvider;models:string[]})=>void;
    const late=runtime.changeConnection(()=>new Promise(resolve=>{finish=resolve;}));
    runtime.shutdown();finish({provider:model,models:['late-model']});
    await expect(late).rejects.toThrow('service has stopped');
    expect(runtime.status().models).toEqual(['synthetic']);
    expect(()=>runtime.modelConnection('synthetic')).toThrow('available model');
  });
  it("finishes and saves after the subscriber disconnects", async () => {
    const f = fixture(); const prompt = f.prompt();
    const model = provider(async function* (options) {
      f.response.emit("close");
      expect(options.signal?.aborted).toBe(false);
      yield { id: "1", deltaText: "Saved after disconnect", finishReason: "stop" };
    });
    await new ConversationRuntime(f.store, { provider: model, models: ["synthetic"] }).respond(f.thread.id, prompt.id, "synthetic", "owner", f.response);
    expect(f.store.listThreadMessages(f.thread.id).at(-1)?.generation?.status).toBe("complete");
  });
  it("uses tools, bounds long context, and preserves originals for retrieval", async () => {
    const f = fixture();
    for (let i = 0; i < 8; i++) f.store.createMessage({ channelId: f.channel.id, threadId: f.thread.id, authorId: "owner", authorType: "user", content: (i === 0 ? "original-decision " : "") + "x".repeat(20000) });
    const memory={id:'current',namespace:'synthetic-memory',projectId:f.project.id,category:'general_fact' as const,title:'original-decision',content:'corrected-value',tags:['chat-context'],createdAt:new Date().toISOString(),version:2};
    f.store.saveOperationalMemory(memory);
    f.store.saveOperationalMemory({...memory,id:'archived',archived:true,content:'excluded-archived'});
    f.store.saveOperationalMemory({...memory,id:'private',tags:[],content:'excluded-unshared'});
    f.store.saveOperationalMemory({...memory,id:'other-project',projectId:'another-project',content:'excluded-project'});
    const adapter=new OperationalMemoryProvider();
    const query=vi.spyOn(adapter,'query').mockResolvedValue([
      {record:{...memory,id:'external-current',content:'corrected-value from adapter'},score:1},
      ...f.store.listOperationalMemories('synthetic-memory').filter(record=>record.id!=='current').map(record=>({record,score:1})),
      {record:{...memory,id:'other-namespace',namespace:'elsewhere',content:'excluded-namespace'},score:1},
    ]);
    const other=f.store.createThread(f.channel.id,'Separate conversation');
    f.store.createMessage({channelId:f.channel.id,threadId:other.id,authorId:'owner',authorType:'user',content:'original-decision other-thread-private'});
    const prompt = f.store.createMessage({channelId:f.channel.id,threadId:f.thread.id,authorId:'owner',authorType:'user',content:'Recall the earlier original-decision'}); let round = 0;
    const model = provider(async function* (options) {
      expect(options.messages.reduce((n, m) => n + m.content.length, 0)).toBeLessThan(120000);
      expect(options.messages.some(m=>m.content.startsWith('Retrieved earlier conversation passages')&&m.content.includes('original-decision'))).toBe(true);
      expect(JSON.stringify(options.messages)).not.toContain('other-thread-private');
      if (!round++) { expect(options.messages.at(-1)?.content).toBe(prompt.content); yield { id: "1", toolCalls: [{ id: "tool1", type: "function", function: { name: "search_history", arguments: '{"query":"original-decision"}' } }], finishReason: "tool_calls" }; }
      else if(round===2){yield {id:'2',toolCalls:[{id:'memory1',type:'function',function:{name:'search_project_memory',arguments:'{"query":"original-decision"}'}}],finishReason:'tool_calls'};}
      else { expect(options.messages.at(-1)?.content).toContain('corrected-value from adapter');expect(options.messages.at(-1)?.content).toContain('providerId');expect(options.messages.at(-1)?.content).not.toContain('excluded-');yield { id: "3", deltaText: "Recovered the corrected decision.", finishReason: "stop" }; }
    });
    const runtime=new ConversationRuntime(f.store, { provider: model, models: ["synthetic"] });
    const registry=new MemoryConnectionRegistry([{id:'example-memory',version:'1',name:'Example',description:'Synthetic provider',fields:[],create:()=>adapter}]);
    const connection=registry.connect('example-memory','1',{},'synthetic-memory',f.project.id);
    await runtime.changeMemory(async()=>({projectId:f.project.id,memoryNamespace:'synthetic-memory',memoryProvider:connection.provider}));
    await runtime.changeMemory(async()=>({projectId:'unrelated-project',memoryNamespace:'other',memoryProvider:new OperationalMemoryProvider()}));
    await runtime.respond(f.thread.id, prompt.id, "synthetic", "owner", f.response);
    expect(round).toBe(3);
    expect(query).toHaveBeenCalledWith(expect.objectContaining({namespace:'synthetic-memory',projectId:f.project.id,includeArchived:false}));
    query.mockImplementationOnce(()=>new Promise(()=>{}));
    const cancellation=new AbortController();
    const pending=invokeConversationTool(f.store,undefined,f.thread.id,prompt.id,'search_project_memory','{"query":"original-decision"}',cancellation.signal,'synthetic-memory',adapter);
    const stopped=expect(pending).rejects.toThrow('stopped or timed out');
    cancellation.abort();await stopped;
    await expect(invokeConversationTool(f.store,undefined,f.thread.id,prompt.id,'search_project_memory','{"query":"original-decision"}',new AbortController().signal)).rejects.toThrow('not enabled');
    expect(f.store.listThreadMessages(f.thread.id)[0].content).toContain("original-decision");
  });
  it("creates one restricted task per request and denies cross-thread access", async () => {
    const f = fixture(); const prompt = f.prompt(); const signal = new AbortController().signal;
    const run = (name: string, args: object) => invokeConversationTool(f.store, undefined, f.thread.id, prompt.id, name, JSON.stringify(args), signal);
    const task = await run("prepare_task", { title: "Synthetic" }) as { id: string };
    await run("prepare_task", { title: "Repeated" });
    expect(f.store.listTasks()).toHaveLength(1);
    expect(f.store.getTask(task.id)?.contract.scope.allowedPaths).toEqual([]);
    await expect(run("execute_task", { taskId: task.id })).rejects.toThrow("not configured");
    const other = f.store.createThread(f.channel.id, "Other");
    await expect(invokeConversationTool(f.store, undefined, other.id, prompt.id, "inspect_task", JSON.stringify({ taskId: task.id }), signal)).rejects.toThrow("not in this conversation");
  });
  it("marks an abandoned checkpoint incomplete without replaying work", () => {
    const f = fixture(); const prompt = f.prompt();
    f.store.createMessage({ channelId: f.channel.id, threadId: f.thread.id, authorId: "synthetic", authorType: "agent", content: "Partial", generation: { model: "synthetic", provider: "synthetic", status: "running", promptMessageId: prompt.id } });
    new ConversationRuntime(f.store);
    expect(f.store.listThreadMessages(f.thread.id).at(-1)?.generation?.status).toBe("failed");
    expect(f.store.listTasks()).toHaveLength(0);
  });
  it("recovers a checkpoint from disk and retains its original prompt", () => {
    const f = fixture(); const prompt = f.prompt();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-synthetic-recovery-"));
    try {
      f.store.createMessage({ channelId: f.channel.id, threadId: f.thread.id, authorId: "synthetic", authorType: "agent", content: "Saved fragment", generation: { model: "synthetic", provider: "synthetic", status: "running", promptMessageId: prompt.id } });
      const file = path.join(dir, "workspace.json"); f.store.saveToFile(file);
      const restored = new WorkspaceStore(file); new ConversationRuntime(restored);
      const reloaded = new WorkspaceStore(file);
      const messages = reloaded.listThreadMessages(f.thread.id);
      expect(messages[0].content).toBe(prompt.content);
      expect(messages.at(-1)?.content).toContain("Saved fragment");
      expect(messages.at(-1)?.generation?.status).toBe("failed");
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
  it("reads only explicitly attached text and refuses remote attachment URLs", async () => {
    const f = fixture(); const prompt = f.prompt();
    f.store.createMessage({ channelId: f.channel.id, threadId: f.thread.id, authorId: "owner", authorType: "user", content: "Read the fixture", attachments: [
      { id: "local", filename: "fixture.txt", mimeType: "text/plain", sizeBytes: 5, url: "data:text/plain;base64,aGVsbG8=" },
      { id: "remote", filename: "remote.txt", mimeType: "text/plain", sizeBytes: 5, url: "https://example.com/private" },
    ] });
    const read = (id: string) => invokeConversationTool(f.store, undefined, f.thread.id, prompt.id, "read_attachment", JSON.stringify({ attachmentId: id }), new AbortController().signal);
    expect(await read("local")).toMatchObject({ content: "hello" });
    await expect(read("remote")).rejects.toThrow("no external URLs");
  });
  it("requires current contract-bound approval before handing work to the worker", async () => {
    const f = fixture(); const prompt = f.prompt(); const signal = new AbortController().signal;
    const task = await invokeConversationTool(f.store, undefined, f.thread.id, prompt.id, "prepare_task", '{"title":"Synthetic"}', signal) as { id: string };
    const executeTask = vi.fn(async () => f.store.getTask(task.id)!);
    const worker = { canExecuteTasks: () => true, executeTask } as unknown as TaskWorkerRuntime;
    const execute = () => invokeConversationTool(f.store, worker, f.thread.id, prompt.id, "execute_task", JSON.stringify({ taskId: task.id }), signal);
    await expect(execute()).rejects.toThrow("approved execution plan");
    const record = f.store.getTask(task.id)!;
    f.store.updateTask(task.id, { status: "ready", approvedExecutionPlan: {
      plan: { taskId: task.id, source: "human_approved", commands: [{ checkName: "synthetic", command: "echo synthetic" }] },
      contractDigest: executionContractDigest(record), approvedBy: "synthetic-owner",
      approvedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString(),
    } });
    await execute(); expect(executeTask).toHaveBeenCalledTimes(1);
    f.store.updateTask(task.id, { contract: { ...record.contract, version: 2 } });
    await expect(execute()).rejects.toThrow("boundaries changed");
    expect(executeTask).toHaveBeenCalledTimes(1);
  });
});
