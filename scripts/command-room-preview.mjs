import { WorkspaceStore } from '../dist/core/store/workspaceStore.js';
import { AgentForgeWebServer } from '../dist/server/webServer.js';

const store = new WorkspaceStore();
const project = store.createSpace({ name: 'Command Room visual QA', workspaceId: 'ws-default', provider: 'agentforge' });
const channel = store.createChannel({ workspaceId: 'ws-default', spaceId: project.id, name: 'General', provider: 'agentforge', visibility: 'private', archived: false });
const agentBase = {
  role: 'Visual QA fixture',
  description: 'Synthetic teammate for local layout review only.',
  status: 'working',
  harnessPolicy: { preferredHarnessId: 'native', autoResume: false },
  modelPolicy: { preferredTier: 1, preferredModel: 'fixture-model', preferredProvider: 'fixture', allowCloudFallback: false },
  decisionPolicy: { useSystem1Router: false },
  computePolicy: { environment: 'none' },
  memoryNamespace: 'visual-qa',
  tools: [],
  permissions: [],
  assignedChannelIds: [],
};
const planner = store.createAgent({ ...agentBase, id: 'fixture-planner', name: 'Fixture planner' });
const reviewer = store.createAgent({ ...agentBase, id: 'fixture-reviewer', name: 'Fixture reviewer', status: 'waiting_approval' });
const task = store.createTask({
  title: 'Fixture task — review layout only',
  description: 'Synthetic visual QA record. No agent is running.',
  projectId: project.id,
  status: 'waiting_approval',
  priority: 'medium',
  assignedAgentId: planner.id,
});
reviewer.currentTaskId = task.id;
store.createApproval({
  taskId: task.id,
  requesterAgentId: reviewer.id,
  action: 'Fixture approval request',
  description: 'Synthetic review item for visual QA only.',
  risk: 'low',
});

// A clearly named synthetic thread lets visual QA inspect the populated conversation view.
const thread = store.createThread(channel.id, 'Visual QA · Conversation controls');
const userMessage = store.createMessage({
  channelId: channel.id,
  threadId: thread.id,
  authorId: 'visual-qa-user',
  authorType: 'user',
  content: 'Review the saved plan for this parser update. Keep the change in scope and list the checks before it runs.',
});
store.createMessage({
  channelId: channel.id,
  threadId: thread.id,
  authorId: planner.id,
  authorType: 'agent',
  content: 'I prepared a reviewable plan for the fixture.\n\n1. Keep edits inside the parser module.\n2. Add a focused regression check.\n3. Run the check and attach the result for review.\n\n```text\npnpm exec vitest run src/parser.test.ts\n```\n\nExecution is offline in this visual fixture; this is saved sample content, not a generated response.',
  replyToMessageId: userMessage.id,
});
store.createMessage({
  channelId: channel.id,
  threadId: thread.id,
  authorId: 'visual-qa-user',
  authorType: 'user',
  content: 'Keep the README out of scope. I want to review the boundaries and test evidence before anything runs.',
});

const server = new AgentForgeWebServer(store, 3465);
await server.start();
console.log('Command Room visual QA: http://127.0.0.1:3465/');
process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});
