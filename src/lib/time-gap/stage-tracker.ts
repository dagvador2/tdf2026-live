import { ProgressionHistory } from "./progression-history";
import { computeTimeGaps } from "./calculator";
import { RiderGap } from "./types";

/**
 * Manages ProgressionHistory instances per stage.
 * Singleton — survives hot-reload in dev.
 */
class StageTracker {
  private stages: Map<string, ProgressionHistory> = new Map();

  getHistory(stageId: string): ProgressionHistory {
    if (!this.stages.has(stageId)) {
      this.stages.set(stageId, new ProgressionHistory());
    }
    return this.stages.get(stageId)!;
  }

  computeGaps(stageId: string): RiderGap[] {
    const history = this.stages.get(stageId);
    if (!history) return [];
    return computeTimeGaps(history);
  }

  clearStage(stageId: string): void {
    this.stages.delete(stageId);
  }

  clear(): void {
    this.stages.clear();
  }
}

const globalForTracker = globalThis as unknown as {
  stageTracker: StageTracker;
};
export const stageTracker =
  globalForTracker.stageTracker || new StageTracker();
if (process.env.NODE_ENV !== "production") {
  globalForTracker.stageTracker = stageTracker;
}
