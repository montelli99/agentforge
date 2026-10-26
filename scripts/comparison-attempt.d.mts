export interface ComparisonReservation {
 manifestFile:string;sourceRoot:string;attemptRoot:string;task:string;
 arm:'agentforge'|'deepseek';trial:number;
}
export interface ComparisonOutcome {
 status:string;artifactPassed:boolean;workflowPassed:boolean;elapsedMs:number;
 requests:number;usage:null|{inputTokens:number;outputTokens:number};
}
export function reserveComparisonAttempt(input:ComparisonReservation):Promise<{directory:string;receipt:Record<string,unknown>;manifest:Record<string,unknown>}>;
export function finalizeComparisonAttempt(directory:string,outcome:ComparisonOutcome):Promise<ComparisonOutcome & Record<string,unknown>>;
