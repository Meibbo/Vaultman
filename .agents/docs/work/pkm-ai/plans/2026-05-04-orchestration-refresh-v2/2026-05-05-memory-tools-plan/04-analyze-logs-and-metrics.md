---
title: Memory tools plan task 4 - Implement `analyze-logs.mjs` and `analyze-metrics.mjs`
type: plan-shard
status: active
parent: "[[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/2026-05-05-memory-tools-plan|memory-tools-plan]]"
created: 2026-05-05T22:06:42
updated: 2026-05-05T22:34:47
tags:
  - agent/plan
  - pkm-ai/tools
---

### Task 4: Implement `analyze-logs.mjs` and `analyze-metrics.mjs`

**Files:**
- Create: `tools/pkm-ai/analyze-logs.mjs`
- Create: `tools/pkm-ai/analyze-metrics.mjs`

- [ ] **Step 1: Write the `analyze-logs.mjs` tool**

```javascript
import fs from 'fs';

const logFile = process.argv[2];

if (!logFile || !fs.existsSync(logFile)) {
    console.error('Usage: node analyze-logs.mjs <log_file_path>');
    process.exit(1);
}

const content = fs.readFileSync(logFile, 'utf-8');
const errorLines = content.split('\n').filter(line => line.includes('Error') || line.includes('Exception'));

console.log(`Found ${errorLines.length} error lines.`);
errorLines.slice(0, 10).forEach(line => console.log(line));
if(errorLines.length > 10) console.log('... (truncated)');
```

- [ ] **Step 2: Write the `analyze-metrics.mjs` tool**

```javascript
import fs from 'fs';

const metricsFile = 'metrics/pkm-ai.jsonl';

if (!fs.existsSync(metricsFile)) {
    console.error('Metrics file not found.');
    process.exit(1);
}

const content = fs.readFileSync(metricsFile, 'utf-8');
const lines = content.trim().split('\n');
console.log(`Total metric events: ${lines.length}`);
console.log('Last 5 events:');
lines.slice(-5).forEach(l => console.log(l));
```

- [ ] **Step 3: Verify the tools**

Run: `node tools/pkm-ai/analyze-metrics.mjs`
Expected: Prints total metrics and the last 5 events.

- [ ] **Step 4: Commit**

```bash
git add tools/pkm-ai/analyze-logs.mjs tools/pkm-ai/analyze-metrics.mjs
git commit -m "feat(pkm-ai): add logs and metrics analysis tools"
```
