/**
 * Provider-neutral adapter for Jev Ultrafast-style browser control.
 *
 * The external project supplies a browser harness and model policy. AgentForge
 * owns the safety boundary: actions are selected only from the observed,
 * indexed element table and are rejected when the observation is stale.
 */

export type BrowserOperation = "CLICK" | "TYPE_TEXT" | "SELECT" | "SCROLL_UP" | "SCROLL_DOWN" | "WAIT" | "DONE" | "BLOCKED";

export type BrowserElement = {
  index: number;
  role: string;
  name: string;
  value?: string;
  options?: string[];
  visible: boolean;
};

export type BrowserObservation = {
  id: string;
  url: string;
  capturedAt: string;
  elements: BrowserElement[];
};

export type BrowserAction = {
  operation: BrowserOperation;
  targetIndex?: number;
  text?: string;
  option?: string;
  observationId: string;
};

export type BrowserActionResult = { accepted: true; action: BrowserAction } | { accepted: false; reason: string };

export type BrowserRunStatus = "DONE" | "BLOCKED" | "MAX_STEPS";

export type BrowserRunResult = {
  status: BrowserRunStatus;
  steps: number;
  observations: number;
  actions: BrowserAction[];
  reason?: string;
};

const targetOperations = new Set<BrowserOperation>(["CLICK", "TYPE_TEXT", "SELECT"]);
const browserOperations = new Set<BrowserOperation>([
  "CLICK",
  "TYPE_TEXT",
  "SELECT",
  "SCROLL_UP",
  "SCROLL_DOWN",
  "WAIT",
  "DONE",
  "BLOCKED",
]);

/**
 * A deterministic fingerprint lets a session remember an observation without
 * retaining its page contents. It prevents a caller from reusing an ID while
 * substituting a different indexed element table during approval.
 */
export function browserObservationFingerprint(observation: BrowserObservation): string {
  return JSON.stringify({
    id: observation.id,
    url: observation.url,
    capturedAt: observation.capturedAt,
    elements: observation.elements.map(element => ({
      index: element.index,
      role: element.role,
      name: element.name,
      value: element.value,
      options: element.options,
      visible: element.visible,
    })),
  });
}

export interface JevUltrafastBrowserPolicyOptions {
  /** Maximum age of an observation accepted for an action. Set to Infinity for replay tests. */
  maxObservationAgeMs?: number;
  now?: () => number;
}

export class JevUltrafastBrowserPolicy {
  private readonly maxObservationAgeMs: number;
  private readonly now: () => number;

  constructor(options: JevUltrafastBrowserPolicyOptions = {}) {
    this.maxObservationAgeMs = options.maxObservationAgeMs ?? 30_000;
    this.now = options.now ?? Date.now;
  }

  validate(observation: BrowserObservation, action: BrowserAction): BrowserActionResult {
    const observationReason = this.validateObservation(observation);
    if (observationReason) return { accepted: false, reason: observationReason };
    if (!action || typeof action !== "object" || typeof action.observationId !== "string") return { accepted: false, reason: "browser action is malformed" };
    if (action.observationId !== observation.id) return { accepted: false, reason: "stale browser observation" };
    if (!browserOperations.has(action.operation)) return { accepted: false, reason: "browser operation is not supported" };
    if (targetOperations.has(action.operation)) {
      if (!Number.isInteger(action.targetIndex)) return { accepted: false, reason: "target index is required" };
      const target = observation.elements.find(element => element.index === action.targetIndex);
      if (!target || !target.visible) return { accepted: false, reason: "target is not present and visible in the observation" };
      if (action.operation === "TYPE_TEXT" && typeof action.text !== "string") return { accepted: false, reason: "TYPE_TEXT requires text" };
      if (action.operation === "SELECT" && (!action.option || !target.options?.includes(action.option))) return { accepted: false, reason: "SELECT option was not observed for the target" };
    }
    if (!targetOperations.has(action.operation) && (action.targetIndex !== undefined || action.text !== undefined || action.option !== undefined)) {
      return { accepted: false, reason: `${action.operation} cannot carry a target or input payload` };
    }
    if (action.operation === "TYPE_TEXT" && action.text!.length > 10_000) return { accepted: false, reason: "typed text exceeds the bounded action limit" };
    return { accepted: true, action };
  }

  /** Validate a captured observation even when no action has been selected. */
  validateObservation(observation: BrowserObservation): string | undefined {
    if (!observation || typeof observation !== "object" || typeof observation.id !== "string" || !observation.id.trim()) return "browser observation ID is required";
    if (typeof observation.url !== "string" || !observation.url.trim()) return "browser observation URL is required";
    if (!Array.isArray(observation.elements)) return "browser observation elements are required";
    const capturedAt = Date.parse(observation.capturedAt);
    if (!Number.isFinite(capturedAt)) return "browser observation timestamp is invalid";
    const age = this.now() - capturedAt;
    if (age < -5_000) return "browser observation timestamp is in the future";
    if (this.maxObservationAgeMs >= 0 && age > this.maxObservationAgeMs) return "browser observation is too old";
    const indexes = new Set<number>();
    for (const element of observation.elements) {
      if (!element || !Number.isInteger(element.index) || element.index < 0 || indexes.has(element.index)
        || typeof element.role !== "string" || typeof element.name !== "string" || typeof element.visible !== "boolean"
        || (element.value !== undefined && typeof element.value !== "string")
        || (element.options !== undefined && (!Array.isArray(element.options) || !element.options.every(option => typeof option === "string")))) {
        return "browser observation element table is invalid";
      }
      indexes.add(element.index);
    }
    return undefined;
  }
}

export interface JevUltrafastBrowserBridge {
  observe(): Promise<BrowserObservation>;
  execute(action: BrowserAction): Promise<void>;
}

export type JevBrowserActionSelector = (input: {
  observation: BrowserObservation;
  step: number;
}) => Promise<BrowserAction> | BrowserAction;

export type JevBrowserOutcomeVerifier = (input: {
  observation: BrowserObservation;
  action: BrowserAction;
}) => Promise<boolean> | boolean;

/**
 * Runs the small, indexed action loop used by Jev Ultrafast.
 *
 * The selector never receives a screenshot or an unbounded DOM. It receives
 * only the current indexed observation, and every action is revalidated before
 * it reaches the provider bridge. `DONE` is accepted only after the caller's
 * independent verifier confirms the requested outcome.
 */
export async function runJevUltrafastBrowser(
  bridge: JevUltrafastBrowserBridge,
  selector: JevBrowserActionSelector,
  options: {
    policy?: JevUltrafastBrowserPolicy;
    maxSteps?: number;
    verifyDone?: JevBrowserOutcomeVerifier;
  } = {},
): Promise<BrowserRunResult> {
  const policy = options.policy ?? new JevUltrafastBrowserPolicy();
  const maxSteps = options.maxSteps ?? 50;
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 500) {
    throw new Error("maxSteps must be an integer between 1 and 500");
  }

  const actions: BrowserAction[] = [];
  let observations = 0;
  for (let step = 0; step < maxSteps; step += 1) {
    const observation = await bridge.observe();
    observations += 1;
    const action = await selector({ observation, step });
    const validation = policy.validate(observation, action);
    if (!validation.accepted) {
      return { status: "BLOCKED", steps: step, observations, actions, reason: validation.reason };
    }
    if (action.operation === "DONE") {
      const verified = options.verifyDone ? await options.verifyDone({ observation, action }) : false;
      return verified
        ? { status: "DONE", steps: step, observations, actions }
        : { status: "BLOCKED", steps: step, observations, actions, reason: "independent outcome verification failed" };
    }
    if (action.operation === "BLOCKED") {
      return { status: "BLOCKED", steps: step, observations, actions, reason: "selector reported a blocked browser state" };
    }
    await bridge.execute(action);
    actions.push(action);
  }
  return { status: "MAX_STEPS", steps: maxSteps, observations, actions, reason: "browser step budget exhausted" };
}

/** Execute one already-selected action only after current-observation checks. */
export async function executeJevBrowserAction(bridge: JevUltrafastBrowserBridge, policy: JevUltrafastBrowserPolicy, observation: BrowserObservation, action: BrowserAction): Promise<BrowserActionResult> {
  const selectedValidation = policy.validate(observation, action);
  if (!selectedValidation.accepted) return selectedValidation;
  // Re-observe immediately before execution. A selected action is never safe
  // merely because the caller once supplied an observation object.
  const currentObservation = await bridge.observe();
  const currentObservationReason = policy.validateObservation(currentObservation);
  if (currentObservationReason) return { accepted: false, reason: currentObservationReason };
  if (browserObservationFingerprint(currentObservation) !== browserObservationFingerprint(observation)) {
    return { accepted: false, reason: "stale browser observation" };
  }
  const result = policy.validate(currentObservation, action);
  if (!result.accepted) return result;
  await bridge.execute(action);
  return result;
}
