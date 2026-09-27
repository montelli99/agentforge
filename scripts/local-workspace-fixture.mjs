import { WorkspaceStore } from '../dist/core/store/workspaceStore.js';
import { AgentForgeWebServer } from '../dist/server/webServer.js';
await new AgentForgeWebServer(new WorkspaceStore(), 3474).start();
