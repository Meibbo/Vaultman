---
title: Memory tools plan task 2 - Implement `analyze-code.mjs`
type: plan-shard
status: active
parent: "[[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/2026-05-05-memory-tools-plan|memory-tools-plan]]"
created: 2026-05-05T22:06:42
updated: 2026-05-05T22:34:47
tags:
  - agent/plan
  - pkm-ai/tools
---

### Task 2: Implement `analyze-code.mjs`

**Files:**
- Create: `tools/pkm-ai/analyze-code.mjs`

- [ ] **Step 1: Write the tool script**

```javascript
import fs from 'fs';
import path from 'path';

const targetFile = process.argv[2];

if (!targetFile || !fs.existsSync(targetFile)) {
    console.error('Usage: node analyze-code.mjs <file_path>');
    process.exit(1);
}

const content = fs.readFileSync(targetFile, 'utf-8');

// Extremely simple RegExp based "AST-like" extraction for signatures
const exportMatches = content.match(/export\s+(const|function|class|interface|type)\s+(\w+)/g) || [];
const propMatches = content.match(/export\s+let\s+(\w+)/g) || [];

console.log(`=== Analysis for ${targetFile} ===`);
console.log('Exports found:');
exportMatches.forEach(m => console.log(`- ${m}`));
console.log('Props (Svelte) found:');
propMatches.forEach(m => console.log(`- ${m}`));
```

- [ ] **Step 2: Run to verify it works**

Run: `node tools/pkm-ai/analyze-code.mjs src/components/pages/pageFilters.svelte` (or any existing file)
Expected: Prints the exports and props found.
