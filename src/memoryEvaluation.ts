import type { MemoryProvider } from "./core/providers/memory.js";
import { buildContextPacket, type ContextSource } from "./contextPacket.js";

export interface MemoryEvaluationCase {
  name: string;
  namespace: string;
  queryText: string;
  expectedIds: string[];
  projectId?: string;
  forbiddenIds?: string[];
}

export interface MemoryEvaluationReport {
  totalCases: number;
  relevantAtTop: number;
  isolationPassed: number;
  averageSavingsPercent: number;
  passed: boolean;
  failures: string[];
}

/**
 * Deterministic retrieval acceptance: it measures relevance and project
 * isolation using real provider results, then measures the bounded packet that
 * would be handed to a worker. It never mutates memory or calls a model.
 */
export async function evaluateMemoryProvider(
  provider: MemoryProvider,
  cases: MemoryEvaluationCase[],
): Promise<MemoryEvaluationReport> {
  const failures: string[] = [];
  let relevantAtTop = 0;
  let isolationPassed = 0;
  let savingsTotal = 0;

  for (const evaluation of cases) {
    const results = await provider.query({
      namespace: evaluation.namespace,
      queryText: evaluation.queryText,
      projectId: evaluation.projectId,
      limit: 10,
    });
    const top = results[0]?.record.id;
    if (top && evaluation.expectedIds.includes(top)) relevantAtTop += 1;
    else failures.push(`${evaluation.name}: expected a relevant record at the top of results.`);

    const forbidden = new Set(evaluation.forbiddenIds || []);
    const isolated = results.every(result => !forbidden.has(result.record.id));
    if (isolated) isolationPassed += 1;
    else failures.push(`${evaluation.name}: returned a record outside the allowed project scope.`);

    const sources: ContextSource[] = results.map(result => ({
      id: result.record.id,
      kind: "memory",
      updatedAt: result.record.updatedAt || result.record.createdAt,
      text: `${result.record.title}\n${result.record.content}`,
    }));
    savingsTotal += buildContextPacket(sources, 2_000).savingsPercent;
  }

  const totalCases = cases.length;
  const averageSavingsPercent = totalCases ? savingsTotal / totalCases : 0;
  return {
    totalCases,
    relevantAtTop,
    isolationPassed,
    averageSavingsPercent,
    passed: totalCases > 0 && relevantAtTop === totalCases && isolationPassed === totalCases,
    failures,
  };
}
