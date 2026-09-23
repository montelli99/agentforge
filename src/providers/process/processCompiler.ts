/**
 * Process Compiler
 * Sections 11, 12, 15: Process-to-Agent Builder & SOP Authority Enforcement
 * 
 * CORE CONTRACT: SOP IS NOT AUTHORITY.
 * The compiler extracts tools, permissions, and identifies UnresolvedBusinessRules.
 * It compiles the process into an AgentSpecification paired with an ExecutionContract.
 */

import type { ProcessDefinition, AgentSpecification, UnresolvedBusinessRule } from "../../core/types/process.js";
import type { ExecutionContract } from "../../core/types/contract.js";

export class ProcessCompiler {
  /**
   * Compiles a ProcessDefinition into a structured AgentSpecification.
   * Scans for ambiguous actions and generates UnresolvedBusinessRules.
   */
  compile(process: ProcessDefinition): AgentSpecification {
    const tools = new Set<string>();
    const permissions = new Set<string>();
    const promptSteps: string[] = [];
    const unresolvedRules: UnresolvedBusinessRule[] = [...process.unresolvedRules];

    for (const step of process.steps) {
      promptSteps.push(`Step ${step.sequence}: ${step.instruction}`);

      // Extract tool requirements
      if (step.toolRequirements) {
        step.toolRequirements.forEach(t => tools.add(t));
      }
      if (step.permissionsRequired) {
        step.permissionsRequired.forEach(p => permissions.add(p));
      }

      // Check for privileged verbs that MUST have business rule backing
      const lower = step.instruction.toLowerCase();
      const requiresAuthorization =
        lower.includes("delete") ||
        lower.includes("move lead") ||
        lower.includes("transfer") ||
        lower.includes("approve") ||
        lower.includes("underwrite") ||
        lower.includes("deploy") ||
        lower.includes("exfiltrate") ||
        lower.includes("send bulk");
      const hasExplicitAuthorizationBlocker = unresolvedRules.some(rule =>
        rule.stepId === step.id
        && !rule.resolved
        && rule.severity === "blocker"
        && /explicit business authority|explicit authorization criteria/i.test(`${rule.question} ${rule.description}`),
      );
      if (requiresAuthorization && !hasExplicitAuthorizationBlocker) {
        unresolvedRules.push({
          id: `rule-auth-${step.id}`,
          processId: process.id,
          stepId: step.id,
          stepText: step.instruction,
          question: `What explicit authorization criteria allows: "${step.instruction}"?`,
          description: "SOP describes action, but does not provide authoritative criteria for execution.",
          severity: "blocker",
          resolved: false,
        });
      }
    }

    const systemPrompt = [
      `You are an AI Teammate operating under the '${process.title}' process standard.`,
      `Process Objective: ${process.description}`,
      "",
      "Standard Operating Sequence:",
      ...promptSteps,
      "",
      "SAFETY ENFORCEMENT:",
      "You must NEVER exceed your ExecutionContract or perform actions lacking explicit business rules.",
    ].join("\n");

    const hasBlockers = unresolvedRules.some(r => !r.resolved);

    const suggestedContract: Pick<ExecutionContract, "scope" | "authority" | "completion"> = {
      scope: {
        allowedPaths: ["workspace/**"],
        protectedPaths: [".env", "credentials/**", "production/**"],
      },
      authority: {
        externalMessage: false,
        productionWrite: false, // Never authorized by SOP alone
        deployment: false, // Never authorized by SOP alone
        forcePush: false,
        deleteFiles: false,
        networkOutbound: false, // SOP text does not grant network authority
      },
      completion: {
        requireEvidencePack: true,
        requireHumanApproval: hasBlockers,
      },
    };

    return {
      agentRole: `${process.title} Specialist`,
      name: `${process.title.replace(/\s+/g, "")}Agent`,
      systemPrompt,
      requiredTools: Array.from(tools),
      requiredPermissions: Array.from(permissions),
      unresolvedRules,
      suggestedExecutionContract: suggestedContract,
      contractTemplate: suggestedContract,
      testScenarios: [
        {
          name: "Standard Process Flow",
          input: "Run qualification for inbound lead 101",
          expectedOutput: "Completed qualification according to standard operating sequence",
        },
      ],
    };
  }

  /**
   * Resolves a business rule with the owner's explicit criteria
   */
  resolveRule(
    spec: AgentSpecification,
    ruleId: string,
    ruleStatement: string,
    userId: string,
  ): AgentSpecification {
    const updatedRules = spec.unresolvedRules.map(r => {
      if (r.id === ruleId) {
        return {
          ...r,
          resolved: true,
          resolvedRuleStatement: ruleStatement,
          resolvedByUserId: userId,
        };
      }
      return r;
    });

    return {
      ...spec,
      unresolvedRules: updatedRules,
      systemPrompt: `${spec.systemPrompt}\n\nResolved Business Rule: ${ruleStatement}`,
    };
  }
}
