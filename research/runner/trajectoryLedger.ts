import fs from "node:fs/promises";

export type TrajectoryUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  currency: string;
  costSource: string;
} | { status: "unknown" };

export type TrajectoryRecord = {
  id: string;
  status: "started" | "completed" | "failed";
  attempts: number;
  usage: TrajectoryUsage;
  costUsd: number | "unknown";
  reservedCostUsd: number;
};

export type TrajectoryLedgerState = {
  schemaVersion: 1;
  trajectories: TrajectoryRecord[];
  totalReservedUsd: number;
};

export class TrajectoryLedger {
  constructor(private readonly file: string, private readonly maxSpendUsd: number) {}

  async load(): Promise<TrajectoryLedgerState> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8")) as TrajectoryLedgerState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { schemaVersion: 1, trajectories: [], totalReservedUsd: 0 };
      }
      // A damaged checkpoint must not be mistaken for an empty ledger: doing
      // so could replay a charged trajectory after a restart.
      throw error;
    }
  }

  async checkpoint(state: TrajectoryLedgerState): Promise<void> {
    const temporary = `${this.file}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(state), "utf8");
    await fs.rename(temporary, this.file);
  }

  async start(id: string, estimatedCostUsd: number): Promise<TrajectoryLedgerState> {
    const state = await this.load();
    const existing = state.trajectories.find(item => item.id === id);
    if (existing && existing.status !== "failed") {
      throw new Error(`trajectory ${id} is already ${existing.status}; reconcile its checkpoint before another provider call`);
    }
    if (!Number.isFinite(estimatedCostUsd) || estimatedCostUsd < 0) throw new Error("estimated trajectory cost must be non-negative");
    if (state.totalReservedUsd + estimatedCostUsd > this.maxSpendUsd) throw new Error("trajectory spend cap would be exceeded");
    if (existing) {
      if (existing.attempts >= 2) throw new Error("trajectory retry cap would be exceeded");
      existing.status = "started";
      existing.attempts += 1;
      existing.reservedCostUsd = estimatedCostUsd;
      existing.usage = { status: "unknown" };
      existing.costUsd = "unknown";
      state.totalReservedUsd += estimatedCostUsd;
      await this.checkpoint(state);
      return state;
    }
    state.totalReservedUsd += estimatedCostUsd;
    state.trajectories.push({ id, status: "started", attempts: 1, usage: { status: "unknown" }, costUsd: "unknown", reservedCostUsd: estimatedCostUsd });
    await this.checkpoint(state);
    return state;
  }

  async fail(id: string): Promise<TrajectoryLedgerState> {
    const state = await this.load();
    const trajectory = state.trajectories.find(item => item.id === id);
    if (!trajectory) throw new Error(`unknown trajectory: ${id}`);
    if (trajectory.status === "started") trajectory.status = "failed";
    await this.checkpoint(state);
    return state;
  }

  async complete(id: string, usage: TrajectoryUsage, costUsd: number | "unknown"): Promise<TrajectoryLedgerState> {
    const state = await this.load();
    const trajectory = state.trajectories.find(item => item.id === id);
    if (!trajectory) throw new Error(`unknown trajectory: ${id}`);
    if (trajectory.status !== "started") return state;
    trajectory.status = "completed";
    trajectory.usage = usage;
    trajectory.costUsd = costUsd;
    if (costUsd !== "unknown") {
      state.totalReservedUsd = Math.max(0, state.totalReservedUsd - trajectory.reservedCostUsd + costUsd);
      trajectory.reservedCostUsd = costUsd;
    }
    await this.checkpoint(state);
    return state;
  }
}
