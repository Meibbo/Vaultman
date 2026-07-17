---
title: Memory tools plan task 3 - Implement `traverse-graph.mjs`
type: plan-shard
status: active
parent: "[[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/2026-05-05-memory-tools-plan|memory-tools-plan]]"
created: 2026-05-05T22:06:42
updated: 2026-05-05T22:34:47
tags:
  - agent/plan
  - pkm-ai/tools
---

### Task 3: Implement `traverse-graph.mjs`

**Files:**
- Create: `tools/pkm-ai/traverse-graph.mjs`

- [ ] **Step 1: Write the tool script**

```javascript
import fs from 'fs';

const targetFile = process.argv[2];

if (!targetFile || !fs.existsSync(targetFile)) {
    console.error('Usage: node traverse-graph.mjs <file_path>');
    process.exit(1);
}

const content = fs.readFileSync(targetFile, 'utf-8');
const imports = content.match(/import\s+.*?\s+from\s+['"](.*?)['"]/g) || [];

console.log(`=== Dependencies for ${targetFile} ===`);
imports.forEach(i => console.log(i));
```

- [ ] **Step 2: Run to verify it works**

Run: `node tools/pkm-ai/traverse-graph.mjs src/components/pages/pageFilters.svelte`
Expected: Prints the import statements found in the file.

- [ ] **Step 3: Commit**

```bash
git add tools/pkm-ai/traverse-graph.mjs
git commit -m "feat(pkm-ai): add traverse-graph tool for dependency tracking"
```
