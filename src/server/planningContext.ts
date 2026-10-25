import crypto from "node:crypto";
import type { ContextPacket } from "../contextPacket.js";
import { estimateTokens } from "../cost.js";

type SourceReference = ContextPacket["sources"][number];

interface AdvisoryRecord {
  advisory: true;
  sources: SourceReference[];
  content: string;
}

interface EncodedRecord {
  encoded: string;
  sources: SourceReference[];
}

const encodeAdvisoryRecord = (packet: ContextPacket): EncodedRecord | undefined => {
  if (packet.truncated) {
    throw new Error(`Planning context packet ${packet.id} is already truncated; retained source provenance is unknown.`);
  }
  if (!packet.content.trim()) return undefined;
  const sourceKeys = new Set<string>();
  const sources = packet.sources.filter(source => {
    const key = `${source.kind}:${source.id}`;
    if (sourceKeys.has(key)) return false;
    sourceKeys.add(key);
    return true;
  });
  if (sources.length === 0) {
    throw new Error(`Planning context packet ${packet.id} has no construction-time source provenance.`);
  }
  const record: AdvisoryRecord = { advisory: true, sources, content: packet.content };
  const encoded = JSON.stringify(record);
  if (encoded.includes("\n") || encoded.includes("\r")) {
    throw new Error(`Planning context packet ${packet.id} could not be encoded as one advisory record.`);
  }
  return { encoded, sources };
};

/**
 * Compose already-bounded context packets as quoted advisory data in caller
 * order. `maxEstimatedContentTokens` bounds only the returned `content` field
 * using AgentForge's estimator; it is not a provider or request token limit.
 * Whole-record truncation keeps provenance aligned with retained content.
 */
export function mergePlanningContextPackets(
  packets: readonly (ContextPacket | undefined | null)[],
  maxEstimatedContentTokens = 12_000,
): ContextPacket {
  if (!Number.isInteger(maxEstimatedContentTokens) || maxEstimatedContentTokens < 1) {
    throw new Error("Planning context estimated content budget must be a positive integer.");
  }

  const allRecords = packets
    .map(packet => packet ? encodeAdvisoryRecord(packet) : undefined)
    .filter((record): record is EncodedRecord => Boolean(record));
  const originalContent = allRecords.map(record => record.encoded).join("\n");
  const originalTokens = estimateTokens(originalContent).total;
  const seenContent = new Set<string>();
  const uniqueRecords = allRecords.filter(record => {
    if (seenContent.has(record.encoded)) return false;
    seenContent.add(record.encoded);
    return true;
  });

  const retained: EncodedRecord[] = [];
  let content = "";
  for (const record of uniqueRecords) {
    const candidate = content ? `${content}\n${record.encoded}` : record.encoded;
    if (estimateTokens(candidate).total > maxEstimatedContentTokens) {
      if (retained.length === 0) {
        throw new Error("Highest-priority planning context exceeds the estimated content budget.");
      }
      break;
    }
    retained.push(record);
    content = candidate;
  }

  const sourceKeys = new Set<string>();
  const sources = retained.flatMap(record => record.sources).filter(source => {
    const key = `${source.kind}:${source.id}`;
    if (sourceKeys.has(key)) return false;
    sourceKeys.add(key);
    return true;
  });
  const packedTokens = estimateTokens(content).total;
  return {
    id: `ctx-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    sources,
    content,
    originalTokens,
    packedTokens,
    savingsPercent: originalTokens > 0 ? (originalTokens - packedTokens) / originalTokens : 0,
    truncated: retained.length < uniqueRecords.length,
  };
}
