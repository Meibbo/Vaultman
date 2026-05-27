---
title: Release 1.0.1 Plan - Scorecard Regression Scan
type: implementation-plan-shard
status: active
parent: "[[docs/work/publish/plans/2026-05-26-release-1-0-1-from-1-0-0/index|Release 1.0.1 From 1.0.0 Implementation Plan]]"
created: 2026-05-26T22:07:55
updated: 2026-05-26T22:07:55
tags:
  - agent/plan
  - initiative/publish
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Scorecard Regression Scan

## Task 2: Add Release Scripts And Static Scorecard Scan

**Files:**

- Modify: `package.json`
- Create: `scripts/scorecard-regression-check.mjs`

- [ ] **Step 1: Add npm scripts**

Edit `package.json` in the release worktree so `scripts` contains these entries while preserving existing scripts:

```json
"check": "tsc -noEmit -skipLibCheck",
"verify": "npm run lint && npm run check && npm run build:plugin && npm run test:scorecard",
"test:scorecard": "node scripts/scorecard-regression-check.mjs",
"security:audit": "npm audit --audit-level=high"
```

Keep `build`, `build:plugin`, `lint`, `test:integrity`, `test:e2e`, and `test:all`.

- [ ] **Step 2: Create the failing Scorecard regression scan**

Create `scripts/scorecard-regression-check.mjs`:

```javascript
import { readFileSync } from 'node:fs';

const checks = [
	{
		file: 'manifest.json',
		name: 'manifest description ends with punctuation',
		test: (text) => /[.!?]$/.test(JSON.parse(text).description ?? ''),
	},
	{
		file: 'src/i18n/index.ts',
		name: 'i18n uses Obsidian getLanguage instead of localStorage language',
		test: (text) => text.includes('getLanguage as getObsidianLanguage') && !text.includes('localStorage.getItem'),
	},
	{
		file: 'src/i18n/index.ts',
		name: 'i18n has no eslint disable directives',
		test: (text) => !text.includes('eslint-disable'),
	},
	{
		file: 'src/svelte.d.ts',
		name: 'svelte declarations avoid any and eslint disable',
		test: (text) => !text.includes('eslint-disable') && !/\bany\b/.test(text),
	},
	{
		file: 'src/VaultmanSettings.ts',
		name: 'settings uses activeDocument instead of document',
		test: (text) => text.includes('activeDocument.body.toggleClass') && !text.includes('document.body.toggleClass'),
	},
	{
		file: 'src/main.ts',
		name: 'main uses activeDocument instead of document',
		test: (text) => text.includes('activeDocument.body.style.setProperty') && !text.includes('document.body.style.setProperty'),
	},
	{
		file: 'src/components/layout/islandActiveFilters.ts',
		name: 'active filters island uses window.requestAnimationFrame',
		test: (text) => text.includes('window.requestAnimationFrame('),
	},
	{
		file: 'src/components/layout/islandQueue.ts',
		name: 'queue island uses window.requestAnimationFrame',
		test: (text) => text.includes('window.requestAnimationFrame('),
	},
	{
		file: 'src/components/layout/viewTree.ts',
		name: 'tree view uses window.requestAnimationFrame',
		test: (text) => text.includes('window.requestAnimationFrame('),
	},
	{
		file: 'src/utils/inputModal.ts',
		name: 'input modal uses window.requestAnimationFrame',
		test: (text) => text.includes('window.requestAnimationFrame('),
	},
	{
		file: 'src/modals/modalLinter.ts',
		name: 'linter modal uses window.setTimeout',
		test: (text) => text.includes('window.setTimeout('),
	},
	{
		file: 'src/services/serviceOperationQueue.ts',
		name: 'operation queue uses window.setTimeout',
		test: (text) => text.includes('window.setTimeout('),
	},
	{
		file: 'src/services/servicePropertyIndex.ts',
		name: 'property index uses window timers',
		test: (text) => text.includes('window.setTimeout(') && text.includes('window.clearTimeout('),
	},
];

const failures = [];

for (const check of checks) {
	const text = readFileSync(check.file, 'utf8');
	if (!check.test(text)) failures.push(`${check.file}: ${check.name}`);
}

if (failures.length > 0) {
	console.error('Scorecard regression scan failed:');
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`Scorecard regression scan passed (${checks.length} checks).`);
```

- [ ] **Step 3: Run the scan and verify RED**

Run:

```powershell
npm run test:scorecard
```

Expected: exit 1 with failures for `manifest.json`, `src/i18n/index.ts`, `src/svelte.d.ts`, timer/document globals, and other listed Scorecard items.

- [ ] **Step 4: Commit the scan**

Run:

```powershell
git add package.json scripts/scorecard-regression-check.mjs
git commit -m "test(scorecard): add release regression scan"
```
