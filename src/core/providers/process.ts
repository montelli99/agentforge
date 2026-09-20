/**
 * ProcessKnowledgeProvider Interface
 * Section 9 & 10: Process Knowledge & SOP Ingestion
 * Reference provider: Scribe (plus Markdown, HTML, PDF, Manual, Capture)
 */

import type { ProcessDefinition, ProcessDiff, ProcessSourceType } from "../types/process.js";

export interface ProcessIngestOptions {
  sourceType: ProcessSourceType;
  sourceUri?: string;
  rawContent?: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessKnowledgeProvider {
  readonly id: string;
  readonly name: string;

  ingest(options: ProcessIngestOptions): Promise<ProcessDefinition>;
  detectDiff(current: ProcessDefinition, updatedRawContent: string): Promise<ProcessDiff>;
  exportToMarkdown(process: ProcessDefinition): string;
}
