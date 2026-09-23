/**
 * AgentForge Completion Engine
 * Anti-Spoon-Feeding / Verified Completion Contract
 * 
 * Orchestrates the full substantial task lifecycle:
 * ORIGINAL GOAL
 * → REQUIREMENTS EXTRACTION
 * → PRD
 * → PRD CRITIC
 * → REQUIREMENTS TRACEABILITY
 * → DEPENDENCY GRAPH
 * → TEST PLAN
 * → EXECUTION
 * → CONTINUOUS VERIFICATION
 * → COMPLETION AUDIT
 * → AUTOMATIC REPAIR
 * → RE-AUDIT
 * → VERIFIED COMPLETION
 * → FINAL REPORT
 * 
 * Invariants:
 * 1. Persist immutable OriginalGoal.
 * 2. Worker model has ZERO authority to mark task COMPLETE_VERIFIED.
 * 3. Only CompletionEngine may transition to COMPLETE_VERIFIED.
 * 4. Autonomous by default: never ask "Should I continue?" when safe authorized work remains.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  CompletionAuditResult,
  CompletionContract,
  CompletionVerificationEvidence,
  InteractionPolicy,
  OriginalGoal,
  PRDCriticReview,
  PRDDocument,
  RepairTask,
  ExecutionDagNode,
  RequirementTraceabilityRecord,
  SubstantialTaskState,
} from "../types/completion.js";
import { DEFAULT_INTERACTION_POLICY } from "../types/completion.js";
import { PRDEngine } from "./prdEngine.js";
import { PRDCritic } from "./prdCritic.js";
import { ExecutionDag } from "./executionDag.js";
import { TraceabilityMatrix } from "./traceabilityMatrix.js";
import { CompletionContractEnforcer } from "./completionContract.js";
import { CompletionAuditor, AuditorContext } from "./completionAuditor.js";
import { AutomaticRepairLoop, RepairLoopResult } from "./repairLoop.js";
import type { CompletionSessionStore } from "./completionSessionStore.js";

export interface SubstantialTaskSession {
  readonly taskId: string;
  readonly originalGoal: OriginalGoal;
  readonly prd: PRDDocument;
  readonly criticReview: PRDCriticReview;
  readonly state: SubstantialTaskState;
  readonly policy: InteractionPolicy;
  readonly dag: readonly ExecutionDagNode[];
  readonly traceability: readonly RequirementTraceabilityRecord[];
  readonly completionContract: CompletionContract;
  readonly auditResult?: CompletionAuditResult;
  readonly repairLoopResult?: RepairLoopResult;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly verifiedByEngine: boolean;
  readonly contractDeficits?: readonly string[];
}

interface MutableTaskSession {
  taskId: string;
  readonly originalGoal: OriginalGoal;
  prd: PRDDocument;
  criticReview: PRDCriticReview;
  state: SubstantialTaskState;
  policy: InteractionPolicy;
  dag: ExecutionDag;
  traceability: TraceabilityMatrix;
  completionContract: CompletionContract;
  auditResult?: CompletionAuditResult;
  repairLoopResult?: RepairLoopResult;
  startedAt: string;
  completedAt?: string;
  verifiedByEngine: boolean;
  contractDeficits?: string[];
}

export type RepairExecutor = (task: RepairTask) => Promise<boolean>;

function freezeRecursively<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeRecursively(child);
  return Object.freeze(value);
}

export class CompletionEngine {
  private prdEngine = new PRDEngine();
  private prdCritic = new PRDCritic();
  private contractEnforcer = new CompletionContractEnforcer();
  private auditor = new CompletionAuditor();
  private repairLoop = new AutomaticRepairLoop();
  private sessions = new Map<string, MutableTaskSession>();

  constructor(
    private readonly repairExecutor?: RepairExecutor,
    private readonly sessionStore?: CompletionSessionStore,
  ) {
    for (const persisted of sessionStore?.loadAll() ?? []) {
      const restored = this.restoreSession(persisted);
      if (this.sessions.has(restored.taskId)) throw new Error(`Duplicate persisted completion session ${restored.taskId}`);
      this.sessions.set(restored.taskId, restored);
    }
  }

  /**
   * Initializes a substantial task session with an immutable OriginalGoal
   */
  initializeSession(taskId: string, rawGoalText: string, submittedBy = "user-montelli"): SubstantialTaskSession {
    if (this.sessions.has(taskId)) throw new Error(`Completion session already exists for task ${taskId}`);
    const immutableHash = crypto.createHash("sha256").update(rawGoalText).digest("hex");
    const originalGoal = Object.freeze<OriginalGoal>({
      id: `goal-${crypto.randomUUID().slice(0, 8)}`,
      rawText: rawGoalText,
      submittedBy,
      submittedAt: new Date().toISOString(),
      immutableHash,
    });

    // 1. Requirements extraction & PRD Generation
    const rawPrd = this.prdEngine.generatePRD(originalGoal);

    // 2. Adversarial PRD Critic Review & Baseline Locking
    const criticReview = this.prdCritic.reviewAndLock(rawPrd, originalGoal);
    const lockedPrd = criticReview.revisedPRD;

    // 3. Traceability initialization
    const traceability = new TraceabilityMatrix();
    for (const req of lockedPrd.requirements) {
      traceability.registerRequirement(req.id, originalGoal.id);
    }

    // 4. Dependency Graph / Execution DAG
    const dag = new ExecutionDag();
    dag.buildFromRequirements(lockedPrd.requirements);

    // 5. Completion Contract creation
    const completionContract = CompletionContractEnforcer.createDefaultContract(
      taskId,
      lockedPrd.requirements.map(r => r.id)
    );

    const session: MutableTaskSession = {
      taskId,
      originalGoal,
      prd: lockedPrd,
      criticReview,
      state: criticReview.critiquePassed ? "PLANNING" : "BLOCKED_OWNER",
      policy: { ...DEFAULT_INTERACTION_POLICY },
      dag,
      traceability,
      completionContract,
      startedAt: new Date().toISOString(),
      verifiedByEngine: false,
      contractDeficits: criticReview.critiquePassed
        ? undefined
        : ["PRD critic found uncovered OriginalGoal terms or missing safety coverage; revise the locked PRD before execution."],
    };

    this.sessions.set(taskId, session);
    return this.persistAndSnapshot(session);
  }

  getSession(taskId: string): SubstantialTaskSession | undefined {
    const session = this.sessions.get(taskId);
    return session ? this.snapshot(session) : undefined;
  }

  listSessions(): SubstantialTaskSession[] {
    return [...this.sessions.values()]
      .map(session => this.snapshot(session))
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  }

  /**
   * Advances the task to EXECUTING state
   */
  startExecution(taskId: string): SubstantialTaskSession {
    const session = this.mustGetSession(taskId);
    if (!session.criticReview.critiquePassed) {
      throw new Error("Cannot start execution: PRD critic found uncovered goal or safety requirements.");
    }
    if (session.state !== "PLANNING" && session.state !== "FAILED") {
      throw new Error(`Cannot start execution from state ${session.state}.`);
    }
    session.state = "EXECUTING";
    session.contractDeficits = undefined;
    return this.persistAndSnapshot(session);
  }

  /**
   * Called when a worker model signals WORKER_FINISHED.
   * Worker model has ZERO authority to mark task COMPLETE_VERIFIED.
   * This handler transitions state to VERIFYING and runs the adversarial audit.
   */
  async handleWorkerFinished(
    taskId: string,
    auditorContext: Omit<AuditorContext, "originalGoal" | "prd">,
    verificationEvidence?: CompletionVerificationEvidence,
  ): Promise<SubstantialTaskSession> {
    const session = this.mustGetSession(taskId);
    if (session.state !== "EXECUTING") {
      throw new Error(`Worker completion is not accepted from state ${session.state}; start execution first.`);
    }

    // Transition to VERIFYING
    session.state = "VERIFYING";
    this.persistAndSnapshot(session);

    const fullContext: AuditorContext = {
      ...auditorContext,
      originalGoal: session.originalGoal,
      prd: session.prd,
    };

    // Transition to AUDITING
    session.state = "AUDITING";
    this.persistAndSnapshot(session);
    let auditResult = await this.auditor.audit(fullContext);
    session.auditResult = auditResult;

    // Update traceability status
    for (const req of session.prd.requirements) {
      if (auditResult.unmetRequirements.includes(req.id)) {
        session.traceability.updateAuditStatus(req.id, "FAILED", "Unmet requirement");
      } else {
        session.traceability.updateAuditStatus(req.id, "PASSED");
      }
    }
    this.persistAndSnapshot(session);

    // Never manufacture implementation or test evidence. A repair is only attempted
    // when the host has supplied a real executor that can edit and verify the code.
    if (!auditResult.passed && this.repairExecutor) {
      session.state = "REPAIRING";
      this.persistAndSnapshot(session);

      const repairLoopResult = await this.repairLoop.runLoop(
        auditResult,
        this.repairExecutor,
        async () => {
          // Re-audit
          return await this.auditor.audit(fullContext);
        }
      );

      session.repairLoopResult = repairLoopResult;
      this.persistAndSnapshot(session);

      // The audit context is a caller-provided snapshot. Re-audit that same snapshot
      // rather than treating an executor's boolean result as proof of changed code.
      if (repairLoopResult.allResolved) {
        auditResult = await this.auditor.audit(fullContext);
        session.auditResult = auditResult;
      }
    }

    // A successful worker response is not proof that host checks passed. Missing,
    // failed, or unreferenced checks must fail closed instead of being implied.
    const workspaceDir = fullContext.workspaceDir;
    const checkPassed = (check: CompletionVerificationEvidence["build"] | undefined): boolean => {
      if (!check || check.status !== "PASS" || !check.evidencePath?.trim() || !check.completedAt || !workspaceDir) {
        return false;
      }
      const completedAt = Date.parse(check.completedAt);
      const taskStartedAt = Date.parse(session.startedAt);
      if (!Number.isFinite(completedAt) || completedAt < taskStartedAt || completedAt > Date.now() + 60_000) {
        return false;
      }

      try {
        const workspaceRoot = fs.realpathSync(workspaceDir);
        const evidencePath = path.resolve(workspaceRoot, check.evidencePath);
        const resolvedEvidencePath = fs.realpathSync(evidencePath);
        const relativePath = path.relative(workspaceRoot, resolvedEvidencePath);
        return relativePath !== "" && !relativePath.startsWith(`..${path.sep}`) && relativePath !== ".." &&
          !path.isAbsolute(relativePath) && fs.statSync(resolvedEvidencePath).isFile();
      } catch {
        return false;
      }
    };

    // Evaluate Completion Contract using only explicit, referenced verification evidence.
    const contractResult = this.contractEnforcer.evaluate(session.completionContract, {
      requirementsImplemented: fullContext.implementedRequirementIds,
      testsPassed: checkPassed(verificationEvidence?.tests),
      testPassRate: checkPassed(verificationEvidence?.tests)
        ? verificationEvidence!.tests.passRate
        : 0,
      buildPassed: checkPassed(verificationEvidence?.build),
      typecheckPassed: checkPassed(verificationEvidence?.typecheck),
      browserSmokePassed: checkPassed(verificationEvidence?.browserSmoke),
      integrationTestsPassed: checkPassed(verificationEvidence?.integrationTests),
      providerTestsPassed: checkPassed(verificationEvidence?.providerTest),
      secretScanPassed: checkPassed(verificationEvidence?.secretScan),
      piiScanPassed: checkPassed(verificationEvidence?.piiScan),
      documentationPresent: checkPassed(verificationEvidence?.documentation),
      rollbackPlanPresent: checkPassed(verificationEvidence?.rollbackPlan),
      adversarialAuditPassed: session.auditResult.passed,
      unresolvedTodoClassifications: session.auditResult.todoFindings.map(f => f.classification),
      evidenceLevel: verificationEvidence?.evidenceLevel ?? "L0_CLAIMED",
      simulationDisclosures: verificationEvidence?.simulationDisclosures ?? [],
    });
    session.contractDeficits = contractResult.deficits;

    if (session.auditResult.passed && contractResult.passed) {
      // ONLY CompletionEngine may set COMPLETE_VERIFIED
      session.state = "COMPLETE_VERIFIED";
      session.verifiedByEngine = true;
      session.completedAt = new Date().toISOString();
    } else {
      // If there are unresolvable blockers, mark BLOCKED_EXTERNAL or FAILED
      if (session.repairLoopResult && session.repairLoopResult.unresolvableBlockers.length > 0) {
        session.state = "BLOCKED_EXTERNAL";
      } else {
        session.state = "FAILED";
      }
    }

    return this.persistAndSnapshot(session);
  }

  /**
   * Generates the final completion report
   */
  generateFinalReport(taskId: string): string {
    const session = this.mustGetSession(taskId);
    return `# AgentForge Verified Completion Report
**Task ID:** ${session.taskId}
**State:** ${session.state}
**Verified By Engine:** ${session.verifiedByEngine ? "YES (Verified)" : "NO"}
**Original Goal Hash:** \`${session.originalGoal.immutableHash}\`
**PRD Requirements:** ${session.prd.requirements.length} locked requirements
**Audit Result:** ${session.auditResult?.passed ? "PASSED" : "FAILED / BLOCKED"}
**Contract Result:** ${session.contractDeficits?.length === 0 ? "PASSED" : "FAILED"}
${session.contractDeficits?.length ? `**Contract Deficits:**\n${session.contractDeficits.map(deficit => `- ${deficit}`).join("\n")}` : ""}
**Repairs Attempted:** ${session.repairLoopResult?.iterationsRun || 0} iterations
**Started At:** ${session.startedAt}
**Completed At:** ${session.completedAt || "In-Flight"}
`;
  }

  private snapshot(session: MutableTaskSession): SubstantialTaskSession {
    return freezeRecursively({
      ...session,
      prd: structuredClone(session.prd),
      criticReview: structuredClone(session.criticReview),
      policy: { ...session.policy },
      dag: session.dag.listNodes().map(node => ({ ...node, dependencies: [...node.dependencies] })),
      traceability: session.traceability.listRecords().map(record => ({
        ...record,
        taskIds: [...record.taskIds],
        codeArtifacts: [...record.codeArtifacts],
        testNames: [...record.testNames],
        evidencePackIds: [...record.evidencePackIds],
      })),
      completionContract: structuredClone(session.completionContract),
      auditResult: session.auditResult ? structuredClone(session.auditResult) : undefined,
      repairLoopResult: session.repairLoopResult ? structuredClone(session.repairLoopResult) : undefined,
      contractDeficits: session.contractDeficits ? [...session.contractDeficits] : undefined,
    });
  }

  private persistAndSnapshot(session: MutableTaskSession): SubstantialTaskSession {
    const snapshot = this.snapshot(session);
    this.sessionStore?.save(snapshot);
    return snapshot;
  }

  private restoreSession(snapshot: SubstantialTaskSession): MutableTaskSession {
    const goal = snapshot?.originalGoal;
    if (!snapshot || typeof snapshot.taskId !== "string" || !snapshot.taskId.trim() ||
        !goal || typeof goal.rawText !== "string" || typeof goal.id !== "string" ||
        typeof goal.immutableHash !== "string" ||
        crypto.createHash("sha256").update(goal.rawText).digest("hex") !== goal.immutableHash ||
        snapshot.prd?.goalId !== goal.id || !Array.isArray(snapshot.prd.requirements) ||
        !Array.isArray(snapshot.dag) || !Array.isArray(snapshot.traceability) ||
        !["PLANNING", "EXECUTING", "VERIFYING", "AUDITING", "REPAIRING", "BLOCKED_EXTERNAL", "BLOCKED_OWNER", "FAILED", "COMPLETE_VERIFIED"].includes(snapshot.state)) {
      throw new Error(`Persisted completion session is invalid: ${snapshot?.taskId ?? "unknown task"}`);
    }

    const dag = new ExecutionDag();
    dag.buildFromRequirements(snapshot.prd.requirements);
    dag.restoreStatuses(snapshot.dag);
    const traceability = new TraceabilityMatrix();
    for (const requirement of snapshot.prd.requirements) traceability.registerRequirement(requirement.id, goal.id);
    traceability.restoreRecords(snapshot.traceability);

    const restored: MutableTaskSession = {
      ...structuredClone(snapshot),
      originalGoal: Object.freeze({ ...snapshot.originalGoal }),
      prd: structuredClone(snapshot.prd),
      criticReview: structuredClone(snapshot.criticReview),
      policy: structuredClone(snapshot.policy),
      dag,
      traceability,
      completionContract: structuredClone(snapshot.completionContract),
      auditResult: snapshot.auditResult ? structuredClone(snapshot.auditResult) : undefined,
      repairLoopResult: snapshot.repairLoopResult ? structuredClone(snapshot.repairLoopResult) : undefined,
      contractDeficits: snapshot.contractDeficits ? [...snapshot.contractDeficits] : undefined,
    };
    // A local JSON record cannot independently prove its prior verification evidence after restart.
    if (restored.state === "COMPLETE_VERIFIED") {
      restored.state = "FAILED";
      restored.verifiedByEngine = false;
      restored.completedAt = undefined;
      restored.contractDeficits = [
        ...(restored.contractDeficits ?? []),
        "Persisted completion requires fresh verification after process restart.",
      ];
    }
    return restored;
  }

  private mustGetSession(taskId: string): MutableTaskSession {
    const session = this.sessions.get(taskId);
    if (!session) throw new Error(`Completion session not found for task ${taskId}`);
    return session;
  }
}
