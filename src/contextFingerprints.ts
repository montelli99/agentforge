import crypto from "node:crypto";

export type ContextFingerprint = {
  id: string;
  hash: string;
  semanticHash: string;
  contentLength: number;
  tokenEstimate: number;
  fileRefs: string[];
  codeBlocks: number;
  timestamps: number[];
  createdAt: number;
};

export type FingerprintMatch = {
  fingerprint: ContextFingerprint;
  similarity: number;
  matchType: "exact" | "semantic" | "structural";
};

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function normalizeContent(content: string): string {
  return content
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function extractFileRefs(content: string): string[] {
  const filePatterns = [
    /@[\w/\\.-]+\.\w+/g,
    /[\w/\\.-]+\.(ts|js|py|go|rs|java|cpp|c|h|md|txt|json|yaml|yml)/g,
  ];

  const refs: Set<string> = new Set();
  for (const pattern of filePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        refs.add(match);
      }
    }
  }

  return Array.from(refs);
}

function countCodeBlocks(content: string): number {
  const codeBlockPattern = /```[\s\S]*?```/g;
  const matches = content.match(codeBlockPattern);
  return matches ? matches.length : 0;
}

function extractTimestamps(content: string): number[] {
  const timestampPatterns = [
    /\d{4}-\d{2}-\d{2}/g,
    /\d{2}:\d{2}:\d{2}/g,
  ];

  const timestamps: number[] = [];
  for (const pattern of timestampPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        const parsed = Date.parse(match);
        if (!isNaN(parsed)) {
          timestamps.push(parsed);
        }
      }
    }
  }

  return timestamps;
}

function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

export class ContextFingerprinter {
  private fingerprints: Map<string, ContextFingerprint> = new Map();
  private maxFingerprints: number;

  constructor(maxFingerprints: number = 10000) {
    this.maxFingerprints = maxFingerprints;
  }

  create(content: string): ContextFingerprint {
    const hash = hashContent(content);
    const semanticHash = hashContent(normalizeContent(content));

    const fingerprint: ContextFingerprint = {
      id: `fp_${hash}`,
      hash,
      semanticHash,
      contentLength: content.length,
      tokenEstimate: estimateTokens(content),
      fileRefs: extractFileRefs(content),
      codeBlocks: countCodeBlocks(content),
      timestamps: extractTimestamps(content),
      createdAt: Date.now(),
    };

    this.fingerprints.set(fingerprint.id, fingerprint);
    this.evictIfNeeded();

    return fingerprint;
  }

  findExact(content: string): ContextFingerprint | undefined {
    const hash = hashContent(content);
    for (const fp of this.fingerprints.values()) {
      if (fp.hash === hash) return fp;
    }
    return undefined;
  }

  findSemantic(content: string, threshold: number = 0.9): ContextFingerprint | undefined {
    const semanticHash = hashContent(normalizeContent(content));
    for (const fp of this.fingerprints.values()) {
      if (fp.semanticHash === semanticHash) return fp;
    }
    return undefined;
  }

  findSimilar(content: string, threshold: number = 0.8): FingerprintMatch[] {
    const contentFp = this.create(content);
    const matches: FingerprintMatch[] = [];

    for (const fp of this.fingerprints.values()) {
      if (fp.id === contentFp.id) continue;

      const similarity = this.calculateSimilarity(contentFp, fp);
      if (similarity >= threshold) {
        const matchType = similarity >= 0.99
          ? "exact"
          : similarity >= 0.9
            ? "semantic"
            : "structural";
        matches.push({ fingerprint: fp, similarity, matchType });
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);
    return matches;
  }

  private calculateSimilarity(a: ContextFingerprint, b: ContextFingerprint): number {
    let score = 0;
    let factors = 0;

    if (a.hash === b.hash) {
      return 1.0;
    }

    if (a.semanticHash === b.semanticHash) {
      score += 0.4;
    }
    factors += 0.4;

    const lengthDiff = Math.abs(a.contentLength - b.contentLength);
    const maxLength = Math.max(a.contentLength, b.contentLength);
    if (maxLength > 0) {
      score += (1 - lengthDiff / maxLength) * 0.2;
    }
    factors += 0.2;

    const codeBlockDiff = Math.abs(a.codeBlocks - b.codeBlocks);
    if (codeBlockDiff === 0 && a.codeBlocks > 0) {
      score += 0.2;
    }
    factors += 0.2;

    const fileRefSimilarity = this.calculateSetSimilarity(
      new Set(a.fileRefs),
      new Set(b.fileRefs),
    );
    score += fileRefSimilarity * 0.2;
    factors += 0.2;

    return factors > 0 ? score / factors : 0;
  }

  private calculateSetSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 1;
    if (a.size === 0 || b.size === 0) return 0;

    let intersection = 0;
    for (const item of a) {
      if (b.has(item)) intersection++;
    }

    const union = a.size + b.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  private evictIfNeeded(): void {
    if (this.fingerprints.size <= this.maxFingerprints) return;

    const sorted = Array.from(this.fingerprints.values())
      .sort((a, b) => a.createdAt - b.createdAt);

    const toRemove = sorted.slice(0, sorted.length - this.maxFingerprints);
    for (const fp of toRemove) {
      this.fingerprints.delete(fp.id);
    }
  }

  clear(): void {
    this.fingerprints.clear();
  }

  getFingerprintCount(): number {
    return this.fingerprints.size;
  }

  getFingerprint(id: string): ContextFingerprint | undefined {
    return this.fingerprints.get(id);
  }
}

let globalFingerprinter: ContextFingerprinter | null = null;

export function getContextFingerprinter(): ContextFingerprinter {
  if (!globalFingerprinter) {
    globalFingerprinter = new ContextFingerprinter();
  }
  return globalFingerprinter;
}

export function resetContextFingerprinter(): void {
  globalFingerprinter = null;
}
