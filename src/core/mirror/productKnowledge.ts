import { readFileSync } from "node:fs";

/** Public, code-verified facts for the bounded channel assistant. */
const facts = [
  { terms: /approv|permission|authoriz|contract/i, text: "Approvals: privileged actions require an authorized reviewer. An approval starts pending; an authorized decision records the approver and time. For a task waiting on verified completion evidence, approval can complete the task and rejection can fail it. Approval does not by itself run a new external action." },
  { terms: /memory|context|handoff|forget/i, text: "Memory: AgentForge stores durable operational records, including task history, constraints, approvals, and do-not-repeat rules. JEv can select bounded context for a workflow. Private chat memory must be scoped to its canonical channel; no cross-chat records are supplied." },
  { terms: /jev|routing|intent|decid/i, text: "JEv: a bounded System-1 classifier selects setup, route, review, or execute intent. It does not write long-form responses or perform external actions. Execution requires an approval boundary." },
  { terms: /workflow|process|stage|task/i, text: "Workflow Engine: it compiles processes into stages, checks, handoff contracts, completion evidence, and retry or recovery rules. Preparing a process run creates a reviewable task and restricted execution contract; preparation alone does not start a worker." },
  { terms: /telegram|discord|slack|gateway|channel/i, text: "Channels: AgentForge owns a native gateway and channel adapters. A live provider connection still requires that provider's authorization. OpenClaw and Hermes are optional migration bridges, not required for native channel sessions." },
  { terms: /harness|agentforge|system|feature|help/i, text: "AgentForge: the workforce control plane owns workspaces, agents, roles, durable memory, permissions, approvals, audit events, channels, runtime lifecycle, and model routing. Native execution is its default path; Pi and Pydantic are optional engines." },
];

const publicDocuments = ["PUBLIC_SYSTEM_ARCHITECTURE.md", "CHAT_SETUP.md", "NATIVE_GATEWAY_OPERATIONS.md"] as const;
const commonWords = new Set(["about", "agentforge", "could", "does", "have", "how", "into", "please", "that", "them", "there", "this", "what", "when", "where", "which", "with", "would", "your"]);

function terms(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z0-9]{3,}/g) || [])
    .filter(term => !commonWords.has(term)));
}

function publicDocumentExcerpts(question: string): string {
  const query = terms(question);
  if (!query.size) return "";
  const sections: Array<{ score: number; text: string }> = [];
  for (const document of publicDocuments) {
    let contents: string;
    try {
      // Both source and compiled modules resolve this path inside the public package.
      contents = readFileSync(new URL(`../../../docs/${document}`, import.meta.url), "utf8");
    } catch {
      continue;
    }
    for (const section of contents.split(/(?=^## )/m)) {
      const heading = section.match(/^## ([^\r\n]+)/m)?.[1];
      if (!heading || /current verification|release evidence|repeatable verification/i.test(heading)) continue;
      const headingTerms = terms(heading);
      const bodyTerms = terms(section.slice(0, 3000));
      let score = 0;
      for (const term of query) score += (headingTerms.has(term) ? 3 : 0) + (bodyTerms.has(term) ? 1 : 0);
      if (score >= 3) sections.push({ score, text: `[${document} — ${heading}]\n${section.slice(0, 1500)}` });
    }
  }
  return sections.sort((a, b) => b.score - a.score).slice(0, 2).map(section => section.text).join("\n");
}

export function productKnowledgeFor(question: string): string {
  const selected = facts.filter(fact => fact.terms.test(question)).slice(0, 3);
  return [...selected.map(fact => fact.text), publicDocumentExcerpts(question)].filter(Boolean).join("\n");
}

/** Useful, conservative answer when a configured model is slow or unavailable. */
export function productFallbackFor(question: string): string | undefined {
  if (!/\b(what|how|why|explain|describe|does|is|are)\b/i.test(question)) return undefined;
  if (/approv|permission|authoriz/i.test(question)) {
    return "AgentForge holds privileged actions for an authorized reviewer. The decision records who approved or rejected the pending request and when; approval can complete a task with verified evidence, but it does not itself run a new external action.";
  }
  if (/mimo/i.test(question) && /configur|connect|setup|route/i.test(question)) {
    return "To use MiMo for AgentForge chat, set AGENTFORGE_CHAT_PROVIDER=mimo, list an allowed MiMo model in AGENTFORGE_CHAT_MODELS, and supply MIMO_API_KEY privately to the AgentForge process. Restart the server after changing those settings.";
  }
  if (/jev|memory|context/i.test(question)) {
    return "JEv classifies a request and selects a bounded workflow; it does not generate the answer or execute actions. AgentForge keeps operational memory and recent private-chat history, and passes only relevant, scoped context to the chat model.";
  }
  return undefined;
}
