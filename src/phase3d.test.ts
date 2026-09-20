import { describe, it, expect, beforeEach } from "vitest";
import {
  createContextFingerprint,
  compareFingerprints,
  chunkByFileBoundary,
  chunkByConversationTurn,
  chunkByRagBlock,
  chunkByCharacterWindow,
  detectContextType,
  resetFingerprintStore,
  storeFingerprint,
  findMatchingFingerprint,
} from "./hybridFingerprint.js";
import { MemoryContextOptimizer } from "./memoryContextOptimizer.js";
import { estimateTokens } from "./tokenAccounting.js";

describe("Phase 3D: File-Level Chunking", () => {
  beforeEach(() => {
    resetFingerprintStore();
  });

  describe("chunkByFileBoundary", () => {
    it("chunks repo content by file boundaries", () => {
      const content = `// File: src/router.ts
export const router = {};

// File: src/policy.ts
export const policy = {};

// File: src/index.ts
export const index = {};`;

      const chunks = chunkByFileBoundary(content);
      expect(chunks.length).toBe(3);
      expect(chunks[0].id).toBe("file:src/router.ts");
      expect(chunks[1].id).toBe("file:src/policy.ts");
      expect(chunks[2].id).toBe("file:src/index.ts");
      expect(chunks[0].type).toBe("file");
    });

    it("detects language from file extension", () => {
      const content = "// File: src/app.ts\nexport const app = {};";
      const chunks = chunkByFileBoundary(content);
      expect(chunks[0].metadata.language).toBe("typescript");
    });

    it("extracts imports and exports", () => {
      const content = `// File: src/utils.ts
import { helper } from "./helper";
export const util = {};
export function doSomething() {}`;
      const chunks = chunkByFileBoundary(content);
      expect(chunks[0].metadata.imports).toContain("./helper");
      expect(chunks[0].metadata.exports).toContain("util");
      expect(chunks[0].metadata.symbols).toContain("util");
      expect(chunks[0].metadata.symbols).toContain("doSomething");
    });
  });

  describe("chunkByConversationTurn", () => {
    it("chunks conversation by turns", () => {
      const content = `user: Hello
assistant: Hi there
user: How are you?
assistant: I'm good`;

      const chunks = chunkByConversationTurn(content);
      expect(chunks.length).toBe(4);
      expect(chunks[0].id).toBe("message:user:0");
      expect(chunks[1].id).toBe("message:assistant:1");
      expect(chunks[2].id).toBe("message:user:2");
      expect(chunks[3].id).toBe("message:assistant:3");
      expect(chunks[0].type).toBe("message");
    });

    it("handles human/ai role aliases", () => {
      const content = `human: Hello
ai: Hi there`;

      const chunks = chunkByConversationTurn(content);
      expect(chunks[0].metadata.role).toBe("user");
      expect(chunks[1].metadata.role).toBe("assistant");
    });
  });

  describe("chunkByRagBlock", () => {
    it("chunks RAG content by source/document blocks", () => {
      const content = `[Source: doc1.pdf] [Page: 1]
[Chunk: chunk-0]
This is chunk 0.

[Source: doc1.pdf] [Page: 2]
[Chunk: chunk-1]
This is chunk 1.

[Source: doc2.pdf] [Page: 1]
[Chunk: chunk-2]
This is chunk 2.`;

      const chunks = chunkByRagBlock(content);
      expect(chunks.length).toBe(3);
      expect(chunks[0].id).toBe("rag:doc1.pdf:chunk-0:p1");
      expect(chunks[1].id).toBe("rag:doc1.pdf:chunk-1:p2");
      expect(chunks[2].id).toBe("rag:doc2.pdf:chunk-2:p1");
      expect(chunks[0].type).toBe("rag");
    });
  });

  describe("chunkByCharacterWindow", () => {
    it("chunks by character window as fallback", () => {
      const content = "a\n".repeat(2500);
      const chunks = chunkByCharacterWindow(content, 1000);
      expect(chunks.length).toBe(3);
      expect(chunks[0].type).toBe("generic");
    });
  });

  describe("detectContextType", () => {
    it("detects repo context", () => {
      const content = "// File: src/app.ts\nexport const app = {};";
      expect(detectContextType(content)).toBe("repo");
    });

    it("detects conversation context", () => {
      const content = "user: Hello\nassistant: Hi";
      expect(detectContextType(content)).toBe("conversation");
    });

    it("detects RAG context", () => {
      const content = "[Source: doc.pdf] [Page: 1]\nContent here";
      expect(detectContextType(content)).toBe("rag");
    });

    it("returns unknown for unrecognized content", () => {
      const content = "Just some random text";
      expect(detectContextType(content)).toBe("unknown");
    });
  });

  describe("compareFingerprints", () => {
    it("detects exact match", () => {
      const content = "// File: src/app.ts\nexport const app = {};";
      const fp1 = createContextFingerprint({ content, tokenCount: 100, tenantId: "t" });
      const fp2 = createContextFingerprint({ content, tokenCount: 100, tenantId: "t" });

      const result = compareFingerprints(fp1, fp2);
      expect(result.matchType).toBe("exact");
      expect(result.confidence).toBe(1.0);
      expect(result.safeToEliminate).toBe(true);
    });

    it("detects chunk partial match with unchanged chunks", () => {
      const content1 = `// File: src/f1.ts
export const f1 = {};

// File: src/f2.ts
export const f2 = {};

// File: src/f3.ts
export const f3 = {};

// File: src/f4.ts
export const f4 = {};

// File: src/f5.ts
export const f5 = {};`;

      const content2 = `// File: src/f1.ts
export const f1 = {};

// File: src/f2.ts
export const f2 = {};

// File: src/f3.ts
export const f3 = {};

// File: src/f4.ts
export const f4 = {};

// File: src/f5.ts
export const f5 = {};

// File: src/f6.ts
export const f6 = {};`;

      const fp1 = createContextFingerprint({ content: content1, tokenCount: 100, tenantId: "t" });
      const fp2 = createContextFingerprint({ content: content2, tokenCount: 100, tenantId: "t" });

      const result = compareFingerprints(fp2, fp1);
      expect(result.matchType).toBe("chunk_partial");
      expect(result.unchangedChunkIds).toContain("file:src/f1.ts");
      expect(result.unchangedChunkIds).toContain("file:src/f2.ts");
      expect(result.newChunkIds).toContain("file:src/f6.ts");
    });

    it("detects changed chunks", () => {
      const content1 = `// File: src/f1.ts
export const f1 = {};

// File: src/f2.ts
export const f2 = {};

// File: src/f3.ts
export const f3 = {};

// File: src/f4.ts
export const f4 = {};

// File: src/f5.ts
export const f5 = {};`;

      const content2 = `// File: src/f1.ts
export const f1 = CHANGED;

// File: src/f2.ts
export const f2 = {};

// File: src/f3.ts
export const f3 = {};

// File: src/f4.ts
export const f4 = {};

// File: src/f5.ts
export const f5 = {};`;

      const fp1 = createContextFingerprint({ content: content1, tokenCount: 100, tenantId: "t" });
      const fp2 = createContextFingerprint({ content: content2, tokenCount: 100, tenantId: "t" });

      const result = compareFingerprints(fp2, fp1);
      expect(result.matchType).toBe("chunk_partial");
      expect(result.changedChunkIds).toContain("file:src/f1.ts");
      expect(result.unchangedChunkIds).toContain("file:src/f2.ts");
    });

    it("detects deleted chunks", () => {
      const content1 = `// File: src/f1.ts
export const f1 = {};

// File: src/f2.ts
export const f2 = {};

// File: src/f3.ts
export const f3 = {};`;

      const content2 = `// File: src/f1.ts
export const f1 = {};

// File: src/f2.ts
export const f2 = {};`;

      const fp1 = createContextFingerprint({ content: content1, tokenCount: 100, tenantId: "t" });
      const fp2 = createContextFingerprint({ content: content2, tokenCount: 100, tenantId: "t" });

      const result = compareFingerprints(fp2, fp1);
      expect(result.matchType).toBe("chunk_partial");
      expect(result.deletedChunkIds).toContain("file:src/f3.ts");
    });

    it("returns miss for tenant mismatch", () => {
      const content = "// File: src/app.ts\nexport const app = {};";
      const fp1 = createContextFingerprint({ content, tokenCount: 100, tenantId: "t1" });
      const fp2 = createContextFingerprint({ content, tokenCount: 100, tenantId: "t2" });

      const result = compareFingerprints(fp1, fp2);
      expect(result.matchType).toBe("miss");
    });
  });

  describe("MemoryContextOptimizer with file-level chunking", () => {
    it("eliminates unchanged context with 90%+ savings", () => {
      const optimizer = new MemoryContextOptimizer({ largeContextElimination: true });

      let baseline = "";
      for (let i = 0; i < 10; i++) {
        baseline += `// File: src/file${i}.ts\nexport const c${i} = {\n`;
        for (let j = 0; j < 20; j++) {
          baseline += `  key${j}: "value${j}",\n`;
        }
        baseline += `};\n`;
      }

      const tokens = estimateTokens(baseline);
      expect(tokens).toBeGreaterThan(1000);

      optimizer.eliminateLargeContext({
        content: baseline,
        contentType: "repo",
        tokenCount: tokens,
        tenantId: "t",
        provider: "p",
        model: "m",
      });

      const result = optimizer.eliminateLargeContext({
        content: baseline,
        contentType: "repo",
        tokenCount: tokens,
        tenantId: "t",
        provider: "p",
        model: "m",
      });

      expect(result.matchType).toBe("exact");
      expect(result.eliminated).toBe(true);
      expect(result.eliminatedTokens).toBeGreaterThan(0);
      expect(result.preservedTokens).toBeLessThan(tokens);
    });

    it("saves tokens when one file changed", () => {
      const optimizer = new MemoryContextOptimizer({ largeContextElimination: true });

      let baseline = "";
      for (let i = 0; i < 10; i++) {
        baseline += `// File: src/file${i}.ts\nexport const c${i} = {\n`;
        for (let j = 0; j < 30; j++) {
          baseline += `  key${j}: "value${j}",\n`;
        }
        baseline += `};\n`;
      }

      let changed = "";
      for (let i = 0; i < 10; i++) {
        if (i === 5) {
          changed += `// File: src/file${i}.ts\nexport const c${i} = CHANGED;\n`;
        } else {
          changed += `// File: src/file${i}.ts\nexport const c${i} = {\n`;
          for (let j = 0; j < 30; j++) {
            changed += `  key${j}: "value${j}",\n`;
          }
          changed += `};\n`;
        }
      }

      const tokens = estimateTokens(baseline);
      expect(tokens).toBeGreaterThan(1000);
      expect(estimateTokens(changed)).toBeGreaterThan(1000);

      optimizer.eliminateLargeContext({
        content: baseline,
        contentType: "repo",
        tokenCount: tokens,
        tenantId: "t",
        provider: "p",
        model: "m",
      });

      const result = optimizer.eliminateLargeContext({
        content: changed,
        contentType: "repo",
        tokenCount: estimateTokens(changed),
        tenantId: "t",
        provider: "p",
        model: "m",
      });

      expect(result.matchType).toBe("chunk_partial");
      expect(result.unchangedChunks).toBe(9);
      expect(result.changedChunks).toBe(1);
      expect(result.eliminatedTokens).toBeGreaterThan(0);
    });

    it("saves tokens when new file added", () => {
      const optimizer = new MemoryContextOptimizer({ largeContextElimination: true });

      let baseline = "";
      for (let i = 0; i < 10; i++) {
        baseline += `// File: src/file${i}.ts\nexport const c${i} = {\n`;
        for (let j = 0; j < 20; j++) {
          baseline += `  key${j}: "value${j}",\n`;
        }
        baseline += `};\n`;
      }

      let withNew = baseline + "// File: src/new.ts\nexport const NEW = true;\n";

      const tokens = estimateTokens(baseline);
      expect(tokens).toBeGreaterThan(1000);

      optimizer.eliminateLargeContext({
        content: baseline,
        contentType: "repo",
        tokenCount: tokens,
        tenantId: "t",
        provider: "p",
        model: "m",
      });

      const result = optimizer.eliminateLargeContext({
        content: withNew,
        contentType: "repo",
        tokenCount: estimateTokens(withNew),
        tenantId: "t",
        provider: "p",
        model: "m",
      });

      expect(result.matchType).toBe("chunk_partial");
      expect(result.unchangedChunks).toBe(10);
      expect(result.newChunks).toBe(1);
      expect(result.eliminatedTokens).toBeGreaterThan(0);
    });

    it("preserves current user request", () => {
      const optimizer = new MemoryContextOptimizer({ largeContextElimination: true });

      let baseline = "";
      for (let i = 0; i < 10; i++) {
        baseline += `// File: src/file${i}.ts\nexport const c${i} = {\n`;
        for (let j = 0; j < 20; j++) {
          baseline += `  key${j}: "value${j}",\n`;
        }
        baseline += `};\n`;
      }

      const tokens = estimateTokens(baseline);
      expect(tokens).toBeGreaterThan(1000);

      optimizer.eliminateLargeContext({
        content: baseline,
        contentType: "repo",
        tokenCount: tokens,
        tenantId: "t",
        provider: "p",
        model: "m",
      });

      const result = optimizer.eliminateLargeContext({
        content: baseline,
        contentType: "repo",
        tokenCount: tokens,
        tenantId: "t",
        provider: "p",
        model: "m",
      });

      expect(result.replacedWith).toContain("[AgentForge Known Context]");
      expect(result.replacedWith).toContain("Context fingerprint:");
      expect(result.replacedWith).toContain("Known chunks:");
    });
  });

  describe("conversation chunking", () => {
    it("saves tokens when old turns unchanged", () => {
      const optimizer = new MemoryContextOptimizer({ largeContextElimination: true });

      let baseline = "";
      for (let i = 0; i < 50; i++) {
        const role = i % 2 === 0 ? "user" : "assistant";
        baseline += `${role}: Turn ${i} with some detailed content to make it longer and more realistic.\n\n`;
      }

      let withNew = baseline;
      for (let i = 0; i < 5; i++) {
        const role = (50 + i) % 2 === 0 ? "user" : "assistant";
        withNew += `${role}: NEW Turn ${50 + i} with new content.\n\n`;
      }

      const tokens = estimateTokens(baseline);
      expect(tokens).toBeGreaterThan(1000);

      optimizer.eliminateLargeContext({
        content: baseline,
        contentType: "conversation",
        tokenCount: tokens,
        tenantId: "t",
        provider: "p",
        model: "m",
      });

      const result = optimizer.eliminateLargeContext({
        content: withNew,
        contentType: "conversation",
        tokenCount: estimateTokens(withNew),
        tenantId: "t",
        provider: "p",
        model: "m",
      });

      expect(result.matchType).toBe("chunk_partial");
      expect(result.unchangedChunks).toBe(50);
      expect(result.newChunks).toBe(5);
      expect(result.eliminatedTokens).toBeGreaterThan(0);
    });
  });

  describe("RAG chunking", () => {
    it("saves tokens when RAG chunks unchanged", () => {
      const optimizer = new MemoryContextOptimizer({ largeContextElimination: true });

      let baseline = "";
      for (let i = 0; i < 50; i++) {
        baseline += `[Source: doc${Math.floor(i / 4)}.pdf] [Page: ${(i % 4) + 1}]\n`;
        baseline += `[Chunk: chunk-${i}]\n`;
        baseline += `Original content for chunk ${i} with detailed information that makes it longer.\n\n`;
      }

      let changed = "";
      for (let i = 0; i < 50; i++) {
        changed += `[Source: doc${Math.floor(i / 4)}.pdf] [Page: ${(i % 4) + 1}]\n`;
        changed += `[Chunk: chunk-${i}]\n`;
        if (i >= 48) {
          changed += `CHANGED content for chunk ${i}.\n\n`;
        } else {
          changed += `Original content for chunk ${i} with detailed information that makes it longer.\n\n`;
        }
      }

      const tokens = estimateTokens(baseline);
      expect(tokens).toBeGreaterThan(1000);

      optimizer.eliminateLargeContext({
        content: baseline,
        contentType: "rag",
        tokenCount: tokens,
        tenantId: "t",
        provider: "p",
        model: "m",
      });

      const result = optimizer.eliminateLargeContext({
        content: changed,
        contentType: "rag",
        tokenCount: estimateTokens(changed),
        tenantId: "t",
        provider: "p",
        model: "m",
      });

      expect(result.matchType).toBe("chunk_partial");
      expect(result.unchangedChunks).toBe(48);
      expect(result.changedChunks).toBe(2);
      expect(result.eliminatedTokens).toBeGreaterThan(0);
    });
  });
});
