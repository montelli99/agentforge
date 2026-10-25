import { ChatGPTDirectModel } from './chatgptDirectModel.js';
import type { DirectAuthorization, DirectCatalog, AuthorizedResponsesTransport } from './chatgptDirectModel.js';
import { ModelPlanDraftProvider } from '../../core/runtime/modelPlanDraftProvider.js';
import type { PlanningAudit } from '../../core/runtime/executionReceipt.js';
import type { Task } from '../../core/types/task.js';
import type { ContextPacket } from '../../contextPacket.js';
import type { ApprovedExecutionPlan } from '../../core/runtime/contractedDockerExecutionBackend.js';

export interface ChatGPTDirectRuntime {
  authorization: DirectAuthorization;
  catalog: () => DirectCatalog | undefined;
  transport: AuthorizedResponsesTransport;
}
let installed: ChatGPTDirectRuntime | undefined;
/** Trusted bootstrap injection only. No environment token, module path, secret
 * lookup, OAuth, transport or catalog is constructed by the launcher. */
export function installChatGPTDirectRuntime(runtime: ChatGPTDirectRuntime): () => void {
  if (installed) throw Error('Direct runtime already installed');
  if (!runtime || typeof runtime.authorization?.currentGrant !== 'function' || typeof runtime.catalog !== 'function' || typeof runtime.transport?.open !== 'function') throw Error('Invalid injected direct runtime');
  const snapshot = { ...runtime };
  installed = snapshot;
  return () => { if (installed === snapshot) installed = undefined; };
}
type Accounting = { requireReportedUsage: boolean; persist: (audit: PlanningAudit) => Promise<void>; deadlineMs?: number };
class DirectPlanDraftProvider extends ModelPlanDraftProvider {
  constructor(private readonly direct: ChatGPTDirectModel, model: string, accounting: Accounting) {
    super(direct, model, ['sh', 'node'], undefined, accounting, 'chatgpt-direct');
  }
  override getReadiness(): { ready: boolean; blocker?: string } { return this.direct.getReadiness(); }
  override async draft(task: Task, signal?: AbortSignal, contextPacket?: ContextPacket): Promise<ApprovedExecutionPlan> {
    const readiness = this.getReadiness();
    if (!readiness.ready) throw Error(readiness.blocker);
    return super.draft(task, signal, contextPacket);
  }
}
/** Called by the actual clean launcher for AGENTFORGE_PLAN_PROVIDER=chatgpt-direct.
 * A missing/disabled runtime is a visible blocked planner, never a chat fallback. */
export function configureChatGPTDirectPlanner(env: Readonly<Record<string, string | undefined>>, accounting: Accounting,
  runtime: ChatGPTDirectRuntime | undefined = installed): ModelPlanDraftProvider {
  const flag = env.AGENTFORGE_PLAN_DIRECT_ENABLED;
  if (flag !== undefined && flag !== 'true' && flag !== 'false') throw Error('Direct planner opt-in must be true or false');
  const deadline = env.AGENTFORGE_PLAN_DIRECT_DEADLINE_MS;
  const maxOutputBytes=env.AGENTFORGE_PLAN_DIRECT_MAX_OUTPUT_BYTES;
  const config = { enabled: flag === 'true', model: env.AGENTFORGE_PLAN_DIRECT_MODEL, deadlineMs: deadline === undefined ? 30000 : Number(deadline),
    maxOutputBytes:maxOutputBytes===undefined?1048576:Number(maxOutputBytes) };
  const direct = new ChatGPTDirectModel(config, runtime?.authorization ?? { currentGrant: () => undefined },
    runtime?.catalog ?? (() => undefined), runtime?.transport ?? { async *open() { throw Error('Authorized direct transport has not been injected'); } });
  return new DirectPlanDraftProvider(direct, config.model ?? '', { ...accounting, requireReportedUsage: true, deadlineMs: config.deadlineMs });
}
