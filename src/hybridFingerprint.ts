export type ContentType = "repo" | "conversation" | "rag" | "prompt" | "system" | "unknown";

export type ChunkType = "file" | "message" | "rag" | "generic";

export type ChunkMetadata = {
  path?: string;
  role?: string;
  messageIndex?: number;
  sourceId?: string;
  page?: number;
  language?: string;
  imports?: string[];
  exports?: string[];
  symbols?: string[];
};

export type Chunk = {
  id: string;
  type: ChunkType;
  label: string;
  content: string;
  exactHash: string;
  normalizedHash: string;
  tokenCount: number;
  metadata: ChunkMetadata;
};

export type ContextFingerprint = {
  exactHash: string;
  normalizedHash: string;
  chunks: Chunk[];
  structuralSignature: StructuralSignature;
  tokenCount: number;
  contentType: ContentType;
  tenantId: string;
  userId?: string;
  projectId?: string;
  createdAt: number;
  sourceIds: string[];
  fileIds: string[];
};

export type StructuralSignature = {
  filePaths: string[];
  imports: string[];
  exports: string[];
  functionNames: string[];
  classNames: string[];
  routeNames: string[];
  schemaNames: string[];
  dependencies: string[];
  language?: string;
};

export type MatchType =
  | "exact"
  | "normalized"
  | "chunk_partial"
  | "semantic_candidate"
  | "structural_candidate"
  | "miss";

export type ContextMatchResult = {
  matchType: MatchType;
  confidence: number;
  unchangedChunks: number;
  changedChunks: number;
  newChunks: number;
  deletedChunks: number;
  totalChunks: number;
  safeToEliminate: boolean;
  safeToSummarize: boolean;
  safeToBypass: boolean;
  reason: string;
  unchangedChunkIds: string[];
  changedChunkIds: string[];
  newChunkIds: string[];
  deletedChunkIds: string[];
};

function sha256(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, "0").slice(0, 16);
}

function normalizeContent(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function detectContextType(content: string): ContentType {
  const hasFileMarkers = /^\/\/ File:|^import |^export |^const \w+ = \{/m.test(content);
  const hasConversationMarkers = /^(user|assistant|human|ai|system):/mi.test(content);
  const hasRagMarkers = /\[Source:|\[Document|\[Chunk|\[Page/i.test(content);

  if (hasFileMarkers) return "repo";
  if (hasConversationMarkers) return "conversation";
  if (hasRagMarkers) return "rag";
  return "unknown";
}

export function chunkByFileBoundary(content: string): Chunk[] {
  const chunks: Chunk[] = [];
  const lines = content.split("\n");
  let currentFile: string[] = [];
  let currentPath = "unknown";

  for (const line of lines) {
    const fileMatch = line.match(/^\/\/ File:\s*(.+)/);
    if (fileMatch) {
      if (currentFile.length > 0) {
        const fileContent = currentFile.join("\n");
        const path = currentPath;
        chunks.push(createFileChunk(path, fileContent));
        currentFile = [];
      }
      currentPath = fileMatch[1].trim();
    }
    currentFile.push(line);
  }

  if (currentFile.length > 0) {
    const fileContent = currentFile.join("\n");
    chunks.push(createFileChunk(currentPath, fileContent));
  }

  return chunks;
}

function createFileChunk(path: string, content: string): Chunk {
  const imports = extractImports(content);
  const exports = extractExports(content);
  const symbols = [...exports, ...extractClasses(content), ...extractFunctions(content)];

  return {
    id: `file:${path}`,
    type: "file",
    label: path,
    content,
    exactHash: sha256(content),
    normalizedHash: sha256(normalizeContent(content)),
    tokenCount: estimateTokens(content),
    metadata: {
      path,
      language: detectLanguage(path),
      imports,
      exports,
      symbols,
    },
  };
}

export function chunkByConversationTurn(content: string): Chunk[] {
  const chunks: Chunk[] = [];
  const lines = content.split("\n");
  let currentTurn: string[] = [];
  let currentRole = "unknown";
  let messageIndex = 0;

  for (const line of lines) {
    const roleMatch = line.match(/^(user|assistant|human|ai|system):\s*/i);
    if (roleMatch) {
      if (currentTurn.length > 0) {
        const turnContent = currentTurn.join("\n");
        chunks.push(createMessageChunk(currentRole, messageIndex, turnContent));
        messageIndex++;
      }
      currentRole = roleMatch[1].toLowerCase();
      if (currentRole === "human") currentRole = "user";
      if (currentRole === "ai") currentRole = "assistant";
      currentTurn = [line];
    } else {
      currentTurn.push(line);
    }
  }

  if (currentTurn.length > 0) {
    const turnContent = currentTurn.join("\n");
    chunks.push(createMessageChunk(currentRole, messageIndex, turnContent));
  }

  return chunks;
}

function createMessageChunk(role: string, messageIndex: number, content: string): Chunk {
  return {
    id: `message:${role}:${messageIndex}`,
    type: "message",
    label: `${role} turn ${messageIndex}`,
    content,
    exactHash: sha256(content),
    normalizedHash: sha256(normalizeContent(content)),
    tokenCount: estimateTokens(content),
    metadata: {
      role,
      messageIndex,
    },
  };
}

export function chunkByRagBlock(content: string): Chunk[] {
  const chunks: Chunk[] = [];
  const blocks = content.split(/\n(?=\[Source:|\[Document)/i);

  for (const block of blocks) {
    if (block.trim().length === 0) continue;

    const sourceMatch = block.match(/\[Source:\s*([^\]]+)\]/i);
    const docMatch = block.match(/\[Document:\s*([^\]]+)\]/i);
    const chunkMatch = block.match(/\[Chunk:\s*([^\]]+)\]/i);
    const pageMatch = block.match(/\[Page:\s*([^\]]+)\]/i);

    const sourceId = sourceMatch?.[1] || docMatch?.[1] || "unknown";
    const page = pageMatch?.[1] ? parseInt(pageMatch[1]) : undefined;
    const chunkId = chunkMatch?.[1] || `chunk-${chunks.length}`;

    chunks.push(createRagChunk(sourceId, chunkId, page, block));
  }

  return chunks;
}

function createRagChunk(sourceId: string, chunkId: string, page: number | undefined, content: string): Chunk {
  return {
    id: `rag:${sourceId}:${chunkId}${page !== undefined ? `:p${page}` : ""}`,
    type: "rag",
    label: `${sourceId} ${chunkId}${page !== undefined ? ` p.${page}` : ""}`,
    content,
    exactHash: sha256(content),
    normalizedHash: sha256(normalizeContent(content)),
    tokenCount: estimateTokens(content),
    metadata: {
      sourceId,
      page,
    },
  };
}

export function chunkByCharacterWindow(content: string, chunkSize: number = 1000): Chunk[] {
  const chunks: Chunk[] = [];
  const lines = content.split("\n");
  let currentChunk: string[] = [];
  let currentSize = 0;
  let chunkIndex = 0;

  for (const line of lines) {
    currentChunk.push(line);
    currentSize += line.length;

    if (currentSize >= chunkSize) {
      const chunkContent = currentChunk.join("\n");
      chunks.push(createGenericChunk(chunkIndex, chunkContent));
      currentChunk = [];
      currentSize = 0;
      chunkIndex++;
    }
  }

  if (currentChunk.length > 0) {
    const chunkContent = currentChunk.join("\n");
    chunks.push(createGenericChunk(chunkIndex, chunkContent));
  }

  return chunks;
}

function createGenericChunk(index: number, content: string): Chunk {
  return {
    id: `generic:${index}`,
    type: "generic",
    label: `chunk ${index}`,
    content,
    exactHash: sha256(content),
    normalizedHash: sha256(normalizeContent(content)),
    tokenCount: estimateTokens(content),
    metadata: {},
  };
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const matches = content.match(/import\s+{[^}]+}\s+from\s+['"]([^'"]+)['"]/g);
  if (matches) {
    for (const m of matches) {
      const match = m.match(/from\s+['"]([^'"]+)['"]/);
      if (match) imports.push(match[1]);
    }
  }
  return [...new Set(imports)];
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  const matches = content.match(/export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g);
  if (matches) {
    for (const m of matches) {
      const match = m.match(/(?:function|class|const|let|var)\s+(\w+)/);
      if (match) exports.push(match[1]);
    }
  }
  return [...new Set(exports)];
}

function extractClasses(content: string): string[] {
  const classes: string[] = [];
  const matches = content.match(/class\s+(\w+)/g);
  if (matches) {
    for (const m of matches) {
      const match = m.match(/class\s+(\w+)/);
      if (match) classes.push(match[1]);
    }
  }
  return [...new Set(classes)];
}

function extractFunctions(content: string): string[] {
  const functions: string[] = [];
  const matches = content.match(/(?:function|const|let|var)\s+(\w+)\s*(?:=\s*(?:\([^)]*\)\s*=>|function))/g);
  if (matches) {
    for (const m of matches) {
      const match = m.match(/(?:function|const|let|var)\s+(\w+)/);
      if (match) functions.push(match[1]);
    }
  }
  return [...new Set(functions)];
}

function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
  };
  return langMap[ext || ""] || "unknown";
}

function extractStructuralSignature(content: string, contentType: ContentType): StructuralSignature {
  const signature: StructuralSignature = {
    filePaths: [],
    imports: [],
    exports: [],
    functionNames: [],
    classNames: [],
    routeNames: [],
    schemaNames: [],
    dependencies: [],
  };

  const filePathMatches = content.match(/(?:import|export|from|require)\s+['"]([^'"]+)['"]/g);
  if (filePathMatches) {
    signature.filePaths = [...new Set(filePathMatches.map(m => m.replace(/['"]/g, "").split(/\s+/).pop() || ""))];
  }

  const importMatches = content.match(/import\s+{[^}]+}\s+from\s+['"]([^'"]+)['"]/g);
  if (importMatches) {
    signature.imports = [...new Set(importMatches.map(m => {
      const match = m.match(/from\s+['"]([^'"]+)['"]/);
      return match ? match[1] : "";
    }).filter(Boolean))];
  }

  const exportMatches = content.match(/export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g);
  if (exportMatches) {
    signature.exports = [...new Set(exportMatches.map(m => {
      const match = m.match(/(?:function|class|const|let|var)\s+(\w+)/);
      return match ? match[1] : "";
    }).filter(Boolean))];
  }

  const functionMatches = content.match(/(?:function|const|let|var)\s+(\w+)\s*(?:=\s*(?:\([^)]*\)\s*=>|function))/g);
  if (functionMatches) {
    signature.functionNames = [...new Set(functionMatches.map(m => {
      const match = m.match(/(?:function|const|let|var)\s+(\w+)/);
      return match ? match[1] : "";
    }).filter(Boolean))];
  }

  const classMatches = content.match(/class\s+(\w+)/g);
  if (classMatches) {
    signature.classNames = [...new Set(classMatches.map(m => {
      const match = m.match(/class\s+(\w+)/);
      return match ? match[1] : "";
    }).filter(Boolean))];
  }

  const routeMatches = content.match(/(?:app|pages|routes?)\s*\[['"]([^'"]+)['"]\]/g);
  if (routeMatches) {
    signature.routeNames = [...new Set(routeMatches.map(m => {
      const match = m.match(/['"]([^'"]+)['"]/);
      return match ? match[1] : "";
    }).filter(Boolean))];
  }

  const schemaMatches = content.match(/(?:schema|type|interface)\s+(\w+)/g);
  if (schemaMatches) {
    signature.schemaNames = [...new Set(schemaMatches.map(m => {
      const match = m.match(/(?:schema|type|interface)\s+(\w+)/);
      return match ? match[1] : "";
    }).filter(Boolean))];
  }

  const packageJsonMatch = content.match(/"dependencies"\s*:\s*{([^}]+)}/);
  if (packageJsonMatch) {
    const deps = packageJsonMatch[1].match(/"([^"]+)":\s*"[^"]+"/g);
    if (deps) {
      signature.dependencies = [...new Set(deps.map(d => d.match(/"([^"]+)"/)?.[1] || "").filter(Boolean))];
    }
  }

  return signature;
}

export function createContextFingerprint(params: {
  content: string;
  contentType?: ContentType;
  tokenCount: number;
  tenantId: string;
  userId?: string;
  projectId?: string;
  sourceIds?: string[];
  fileIds?: string[];
}): ContextFingerprint {
  const contentType = params.contentType || detectContextType(params.content);
  const exactHash = sha256(params.content);
  const normalizedHash = sha256(normalizeContent(params.content));

  let chunks: Chunk[];
  switch (contentType) {
    case "repo":
      chunks = chunkByFileBoundary(params.content);
      break;
    case "conversation":
      chunks = chunkByConversationTurn(params.content);
      break;
    case "rag":
      chunks = chunkByRagBlock(params.content);
      break;
    default:
      chunks = chunkByCharacterWindow(params.content);
      break;
  }

  const structuralSignature = extractStructuralSignature(params.content, contentType);

  return {
    exactHash,
    normalizedHash,
    chunks,
    structuralSignature,
    tokenCount: params.tokenCount,
    contentType,
    tenantId: params.tenantId,
    userId: params.userId,
    projectId: params.projectId,
    createdAt: Date.now(),
    sourceIds: params.sourceIds || [],
    fileIds: params.fileIds || [],
  };
}

export function compareFingerprints(
  a: ContextFingerprint,
  b: ContextFingerprint,
): ContextMatchResult {
  if (a.tenantId !== b.tenantId) {
    return {
      matchType: "miss",
      confidence: 0,
      unchangedChunks: 0,
      changedChunks: a.chunks.length,
      newChunks: 0,
      deletedChunks: 0,
      totalChunks: a.chunks.length,
      safeToEliminate: false,
      safeToSummarize: false,
      safeToBypass: false,
      reason: "tenant mismatch",
      unchangedChunkIds: [],
      changedChunkIds: a.chunks.map(c => c.id),
      newChunkIds: [],
      deletedChunkIds: [],
    };
  }

  if (a.exactHash === b.exactHash) {
    return {
      matchType: "exact",
      confidence: 1.0,
      unchangedChunks: a.chunks.length,
      changedChunks: 0,
      newChunks: 0,
      deletedChunks: 0,
      totalChunks: a.chunks.length,
      safeToEliminate: true,
      safeToSummarize: true,
      safeToBypass: true,
      reason: "exact content match",
      unchangedChunkIds: a.chunks.map(c => c.id),
      changedChunkIds: [],
      newChunkIds: [],
      deletedChunkIds: [],
    };
  }

  if (a.normalizedHash === b.normalizedHash) {
    return {
      matchType: "normalized",
      confidence: 0.97,
      unchangedChunks: a.chunks.length,
      changedChunks: 0,
      newChunks: 0,
      deletedChunks: 0,
      totalChunks: a.chunks.length,
      safeToEliminate: true,
      safeToSummarize: true,
      safeToBypass: true,
      reason: "normalized content match (formatting changes only)",
      unchangedChunkIds: a.chunks.map(c => c.id),
      changedChunkIds: [],
      newChunkIds: [],
      deletedChunkIds: [],
    };
  }

  const bChunkMap = new Map<string, Chunk>();
  for (const chunk of b.chunks) {
    bChunkMap.set(chunk.id, chunk);
  }

  const unchangedChunkIds: string[] = [];
  const changedChunkIds: string[] = [];
  const newChunkIds: string[] = [];

  for (const chunk of a.chunks) {
    const bChunk = bChunkMap.get(chunk.id);
    if (!bChunk) {
      newChunkIds.push(chunk.id);
      continue;
    }

    if (chunk.normalizedHash === bChunk.normalizedHash) {
      unchangedChunkIds.push(chunk.id);
    } else {
      changedChunkIds.push(chunk.id);
    }
  }

  const deletedChunkIds: string[] = [];
  const aChunkIds = new Set(a.chunks.map(c => c.id));
  for (const chunk of b.chunks) {
    if (!aChunkIds.has(chunk.id)) {
      deletedChunkIds.push(chunk.id);
    }
  }

  const unchangedCount = unchangedChunkIds.length;
  const changedCount = changedChunkIds.length;
  const newCount = newChunkIds.length;
  const deletedCount = deletedChunkIds.length;
  const totalChunks = a.chunks.length;

  const overlapRatio = unchangedCount / totalChunks;

  if (overlapRatio >= 0.7) {
    return {
      matchType: "chunk_partial",
      confidence: overlapRatio,
      unchangedChunks: unchangedCount,
      changedChunks: changedCount,
      newChunks: newCount,
      deletedChunks: deletedCount,
      totalChunks,
      safeToEliminate: false,
      safeToSummarize: true,
      safeToBypass: false,
      reason: `${(overlapRatio * 100).toFixed(1)}% chunks unchanged, partial elimination possible`,
      unchangedChunkIds,
      changedChunkIds,
      newChunkIds,
      deletedChunkIds,
    };
  }

  const structuralSimilarity = calculateStructuralSimilarity(
    a.structuralSignature,
    b.structuralSignature,
  );

  if (structuralSimilarity >= 0.8) {
    return {
      matchType: "structural_candidate",
      confidence: structuralSimilarity,
      unchangedChunks: unchangedCount,
      changedChunks: changedCount,
      newChunks: newCount,
      deletedChunks: deletedCount,
      totalChunks,
      safeToEliminate: false,
      safeToSummarize: true,
      safeToBypass: false,
      reason: `structural similarity ${(structuralSimilarity * 100).toFixed(1)}%, context likely related`,
      unchangedChunkIds,
      changedChunkIds,
      newChunkIds,
      deletedChunkIds,
    };
  }

  return {
    matchType: "miss",
    confidence: Math.max(overlapRatio, structuralSimilarity),
    unchangedChunks: unchangedCount,
    changedChunks: changedCount,
    newChunks: newCount,
    deletedChunks: deletedCount,
    totalChunks,
    safeToEliminate: false,
    safeToSummarize: false,
    safeToBypass: false,
    reason: "no significant match found",
    unchangedChunkIds,
    changedChunkIds,
    newChunkIds,
    deletedChunkIds,
  };
}

function calculateStructuralSimilarity(
  a: StructuralSignature,
  b: StructuralSignature,
): number {
  const allKeys = new Set([
    ...a.imports,
    ...b.imports,
    ...a.exports,
    ...b.exports,
    ...a.functionNames,
    ...b.functionNames,
    ...a.classNames,
    ...b.classNames,
  ]);

  if (allKeys.size === 0) return 0;

  let matches = 0;
  for (const key of allKeys) {
    const aHas = a.imports.includes(key) || a.exports.includes(key) ||
                 a.functionNames.includes(key) || a.classNames.includes(key);
    const bHas = b.imports.includes(key) || b.exports.includes(key) ||
                 b.functionNames.includes(key) || b.classNames.includes(key);
    if (aHas && bHas) matches++;
  }

  return matches / allKeys.size;
}

let globalFingerprintStore: Map<string, ContextFingerprint> = new Map();

export function storeFingerprint(fingerprint: ContextFingerprint): void {
  globalFingerprintStore.set(fingerprint.exactHash, fingerprint);
}

export function getStoredFingerprint(exactHash: string): ContextFingerprint | undefined {
  return globalFingerprintStore.get(exactHash);
}

export function findMatchingFingerprint(
  fingerprint: ContextFingerprint,
): ContextMatchResult | null {
  let bestMatch: ContextMatchResult | null = null;

  for (const stored of globalFingerprintStore.values()) {
    const result = compareFingerprints(fingerprint, stored);

    if (!bestMatch || result.confidence > bestMatch.confidence) {
      bestMatch = result;
    }
  }

  if (bestMatch && bestMatch.confidence >= 0.7) {
    return bestMatch;
  }

  return null;
}

export function resetFingerprintStore(): void {
  globalFingerprintStore.clear();
}
