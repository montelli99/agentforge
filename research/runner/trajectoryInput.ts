import type { FullTrajectoryCase } from "./fullTrajectoryReadiness.js";

/** Supply only agent-visible task data; evaluator commands and answers stay out. */
export function trajectoryInputForModel(item: FullTrajectoryCase): string {
  if (!item.input?.task || !item.input.setup?.length || !item.input.events?.length) {
    throw new Error(`Incomplete model-visible trajectory input: ${item.id}`);
  }
  return JSON.stringify({ task: item.input.task, setup: item.input.setup, events: item.input.events });
}
