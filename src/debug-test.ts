import { MemoryContextOptimizer } from "./memoryContextOptimizer.js";
import { resetFingerprintStore } from "./hybridFingerprint.js";

const opt = new MemoryContextOptimizer({ largeContextElimination: true });
resetFingerprintStore();

let baseline = "";
for (let i = 0; i < 10; i++) {
  baseline += `// File: src/file${i}.ts\nexport const c${i} = {\n`;
  for (let j = 0; j < 20; j++) {
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
    for (let j = 0; j < 20; j++) {
      changed += `  key${j}: "value${j}",\n`;
    }
    changed += `};\n`;
  }
}

const tBaseline = Math.ceil(baseline.length / 4);
const tChanged = Math.ceil(changed.length / 4);

console.log("Baseline tokens:", tBaseline);
console.log("Changed tokens:", tChanged);

opt.eliminateLargeContext({
  content: baseline,
  contentType: "repo",
  tokenCount: tBaseline,
  tenantId: "t",
  provider: "p",
  model: "m",
});

const result = opt.eliminateLargeContext({
  content: changed,
  contentType: "repo",
  tokenCount: tChanged,
  tenantId: "t",
  provider: "p",
  model: "m",
});

console.log("Match:", result.matchType);
console.log("Unchanged:", result.unchangedChunks);
console.log("Changed:", result.changedChunks);
console.log("New:", result.newChunks);
console.log("Saved:", result.eliminatedTokens);
console.log("Optimized:", result.preservedTokens);
