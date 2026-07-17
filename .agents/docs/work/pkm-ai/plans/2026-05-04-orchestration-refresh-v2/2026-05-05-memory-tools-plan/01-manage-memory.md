---
title: Memory tools plan task 1 - Implement `manage-memory.mjs`
type: plan-shard
status: active
parent: "[[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/2026-05-05-memory-tools-plan|memory-tools-plan]]"
created: 2026-05-05T22:06:42
updated: 2026-05-05T22:34:47
tags:
  - agent/plan
  - pkm-ai/tools
---

### Task 1: Implement `manage-memory.mjs`

**Files:**
- Create: `tools/pkm-ai/manage-memory.mjs`

- [ ] **Step 1: Write the tool script**

```javascript
import fs from 'fs';
import path from 'path';

const action = process.argv[2];
const archiveDir = 'docs/archive';

if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
}

if (action === 'archive') {
    const summary = process.argv[3] || 'No summary';
    const content = process.argv[4] || '';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `archive-${timestamp}.md`;
    const filepath = path.join(archiveDir, filename);
    
    const fileContent = `---\ntitle: ${summary}\ntype: archive\ndate: ${new Date().toISOString()}\n---\n\n${content}\n`;
    fs.writeFileSync(filepath, fileContent, 'utf-8');
    console.log(`Archived to ${filepath}`);
} else if (action === 'retrieve') {
    const files = fs.readdirSync(archiveDir);
    console.log(`Archived files:\n${files.join('\n')}`);
} else {
    console.error('Usage: node manage-memory.mjs <archive|retrieve> [summary] [content]');
    process.exit(1);
}
```

- [ ] **Step 2: Run to verify it works**

Run: `node tools/pkm-ai/manage-memory.mjs archive "Test summary" "Test content"`
Expected: Prints `Archived to docs/archive/archive-[timestamp].md` and creates the file.

- [ ] **Step 3: Commit**

```bash
git add tools/pkm-ai/manage-memory.mjs
git commit -m "feat(pkm-ai): add manage-memory tool for archiving context"
```
