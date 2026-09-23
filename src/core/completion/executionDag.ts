/**
 * Execution DAG (Dependency Graph)
 * Anti-Spoon-Feeding / Verified Completion Contract
 * 
 * Manages the execution dependency graph:
 * - If one node blocks (e.g. Retell credential missing):
 *   blocks DEPENDENT SUBTREE ONLY.
 * - Independent nodes continue executing without stopping the platform:
 *   (UI, Ollama, Pi, migration, security, docs, packages).
 * - Never asks "Should I continue?" when safe authorized work remains.
 */

import type {
  ExecutionDagNode,
  ExecutionDagNodeStatus,
  Requirement,
} from "../types/completion.js";

export class ExecutionDag {
  private nodes = new Map<string, ExecutionDagNode>(); // key: requirementId
  private dependents = new Map<string, Set<string>>(); // key: parentReqId -> childReqIds

  /**
   * Builds the DAG from a locked set of requirements
   */
  buildFromRequirements(requirements: Requirement[]): void {
    const validationErrors = this.validateRequirements(requirements);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid execution DAG: ${validationErrors.join("; ")}`);
    }

    this.nodes.clear();
    this.dependents.clear();

    for (const req of requirements) {
      const node: ExecutionDagNode = {
        id: `node-${req.id}`,
        requirementId: req.id,
        title: req.title,
        dependencies: [...req.impliedDependencies],
        status: req.impliedDependencies.length === 0 ? "READY" : "PENDING",
        isIndependent: req.impliedDependencies.length === 0,
      };

      this.nodes.set(req.id, node);

      // Register child relationships
      for (const depId of req.impliedDependencies) {
        if (!this.dependents.has(depId)) {
          this.dependents.set(depId, new Set());
        }
        this.dependents.get(depId)!.add(req.id);
      }
    }
  }

  /** Restores runtime statuses only when persisted graph structure still matches the PRD. */
  restoreStatuses(nodes: readonly ExecutionDagNode[]): void {
    const current = this.nodes;
    if (nodes.length !== current.size) throw new Error("Persisted DAG node count does not match requirements");
    const restored = new Map<string, ExecutionDagNode>();
    const allowedStatuses = new Set(["PENDING", "READY", "EXECUTING", "COMPLETED", "BLOCKED", "FAILED"]);
    for (const node of nodes) {
      const requirementId = node.requirementId;
      const expected = current.get(requirementId);
      if (!expected || restored.has(requirementId) || node.id !== expected.id || node.title !== expected.title ||
          JSON.stringify([...node.dependencies].sort()) !== JSON.stringify([...expected.dependencies].sort()) ||
          !allowedStatuses.has(node.status)) {
        throw new Error(`Persisted DAG node is invalid or differs from PRD: ${requirementId}`);
      }
      restored.set(requirementId, { ...node, dependencies: [...node.dependencies] });
    }
    for (const [id, node] of restored) current.set(id, node);
  }

  private validateRequirements(requirements: Requirement[]): string[] {
    const errors: string[] = [];
    const byId = new Map<string, Requirement>();
    for (const requirement of requirements) {
      if (byId.has(requirement.id)) errors.push(`Duplicate requirement ID ${requirement.id}`);
      byId.set(requirement.id, requirement);
    }
    if (errors.length > 0) return errors;

    for (const requirement of requirements) {
      for (const dependencyId of requirement.impliedDependencies) {
        if (!byId.has(dependencyId)) {
          errors.push(`${requirement.id} depends on missing requirement ${dependencyId}`);
        }
      }
    }
    if (errors.length > 0) return errors;

    const state = new Map<string, "visiting" | "visited">();
    const path: string[] = [];
    const reportedCycles = new Set<string>();
    const visit = (requirementId: string): void => {
      const currentState = state.get(requirementId);
      if (currentState === "visited") return;
      if (currentState === "visiting") {
        const cycleStart = path.indexOf(requirementId);
        const cycle = [...path.slice(cycleStart), requirementId];
        const canonicalCycle = [...cycle.slice(0, -1)].sort().join("|");
        if (!reportedCycles.has(canonicalCycle)) {
          reportedCycles.add(canonicalCycle);
          errors.push(`Dependency cycle ${cycle.join(" -> ")}`);
        }
        return;
      }

      state.set(requirementId, "visiting");
      path.push(requirementId);
      for (const dependencyId of byId.get(requirementId)?.impliedDependencies || []) visit(dependencyId);
      path.pop();
      state.set(requirementId, "visited");
    };

    for (const requirement of requirements) visit(requirement.id);
    return errors;
  }

  getNode(requirementId: string): ExecutionDagNode | undefined {
    return this.nodes.get(requirementId);
  }

  listNodes(): ExecutionDagNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Returns nodes that are ready to execute (all dependencies completed, not blocked)
   */
  getReadyNodes(): ExecutionDagNode[] {
    const ready: ExecutionDagNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.status !== "PENDING" && node.status !== "READY") continue;

      const allDepsMet = node.dependencies.every(depId => {
        const depNode = this.nodes.get(depId);
        return depNode && depNode.status === "COMPLETED";
      });

      if (allDepsMet) {
        node.status = "READY";
        ready.push(node);
      }
    }
    return ready;
  }

  /**
   * Blocks a node and cascades the block ONLY to its downstream dependent subtree.
   * Independent parallel branches remain completely unaffected.
   */
  blockNode(requirementId: string, reason: string): { blockedId: string; cascadedCount: number } {
    const target = this.nodes.get(requirementId);
    if (!target) return { blockedId: requirementId, cascadedCount: 0 };

    target.status = "BLOCKED";
    target.blockedReason = reason;

    // Cascade only to downstream children
    let cascadedCount = 0;
    const queue = Array.from(this.dependents.get(requirementId) || []);

    while (queue.length > 0) {
      const childId = queue.shift()!;
      const childNode = this.nodes.get(childId);
      if (childNode && childNode.status !== "BLOCKED") {
        childNode.status = "BLOCKED";
        childNode.blockedReason = `Blocked by upstream dependency ${requirementId}: ${reason}`;
        cascadedCount++;

        const grandchildren = this.dependents.get(childId);
        if (grandchildren) {
          queue.push(...grandchildren);
        }
      }
    }

    return { blockedId: requirementId, cascadedCount };
  }

  /**
   * Marks a requirement completed, potentially unlocking downstream nodes
   */
  completeNode(requirementId: string): void {
    const node = this.nodes.get(requirementId);
    if (node) {
      node.status = "COMPLETED";
    }
  }

  /**
   * Returns whether all schedulable nodes have completed
   */
  isFullyComplete(): boolean {
    for (const node of this.nodes.values()) {
      if (node.status !== "COMPLETED" && node.status !== "BLOCKED") {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns active blocked nodes
   */
  getBlockedNodes(): ExecutionDagNode[] {
    return Array.from(this.nodes.values()).filter(n => n.status === "BLOCKED");
  }

  /**
   * Returns independent unblocked nodes still remaining
   */
  getIndependentPendingNodes(): ExecutionDagNode[] {
    return Array.from(this.nodes.values()).filter(
      n => n.status !== "COMPLETED" && n.status !== "BLOCKED"
    );
  }
}
