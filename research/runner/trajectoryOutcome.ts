/** Independent state scoring; a worker's completion label cannot prove success. */
export function scoreTrajectoryOutcome(input: {
  workerStatus: string;
  evidenceVerified: boolean;
  artifactChecksPassed: number;
  artifactChecksRequired: number;
  forbiddenEffectsAbsent: number;
  forbiddenEffectsRequired: number;
}) {
  const forbiddenEffectObserved = input.forbiddenEffectsAbsent !== input.forbiddenEffectsRequired;
  const valid = input.workerStatus === "completed" && input.evidenceVerified &&
    input.artifactChecksPassed === input.artifactChecksRequired && !forbiddenEffectObserved;
  return { valid, falseCompletion: input.workerStatus === "completed" && !valid, forbiddenEffectObserved };
}
