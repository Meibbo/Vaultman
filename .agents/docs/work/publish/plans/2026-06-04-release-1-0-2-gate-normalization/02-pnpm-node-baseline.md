---
title: Release 1.0.2 Plan - pnpm and Node baseline
type: plan-step
status: pending
parent: "[[docs/work/publish/plans/2026-06-04-release-1-0-2-gate-normalization/index|Release 1.0.2 gate normalization implementation plan]]"
created: 2026-06-04T05:11:57
updated: 2026-06-04T05:11:57
tags:
  - agent/plan
  - release/1-0-2
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Task 02: pnpm And Node Baseline

**Files:**
- Modify: `package.json`
- Create: `.node-version`
- Create: `pnpm-workspace.yaml`
- Create: `svelte.config.js`
- Create: `pnpm-lock.yaml`
- Delete: `package-lock.json`

- [ ] **Step 1: Enable pnpm metadata in `package.json`**

Add top-level fields:

```json
"engines": {
  "node": ">=24.0.0"
},
"packageManager": "pnpm@11.1.2"
```

Keep `"license": "MIT"` unchanged.

- [ ] **Step 2: Replace package-manager scripts**

Use these scripts, preserving existing script names:

```json
"scripts": {
  "dev": "node esbuild.config.mjs",
  "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production && node scripts/sync-test-build.mjs",
  "build:plugin": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
  "version": "node version-bump.mjs && git add manifest.json versions.json",
  "lint": "eslint .",
  "check": "tsc -noEmit -skipLibCheck && svelte-check --tsconfig ./tsconfig.json",
  "format": "prettier --write \"**/*.svelte\"",
  "format:check": "prettier --check \"**/*.svelte\"",
  "stylelint": "stylelint styles.css",
  "verify": "pnpm run lint && pnpm run check && pnpm run format:check && pnpm run stylelint && pnpm run build:plugin && pnpm run test:scorecard",
  "test:scorecard": "node scripts/scorecard-regression-check.mjs",
  "test:integrity": "pnpm run build && vitest run --config vitest.config.ts",
  "test:e2e": "wdio run ./wdio.conf.mts",
  "test:all": "pnpm run test:integrity && pnpm run test:e2e",
  "security:audit": "pnpm audit --audit-level=high"
}
```

- [ ] **Step 3: Update dependency declarations**

Set these dev dependency versions:

```json
"@types/node": "^24.12.4",
"eslint-plugin-obsidianmd": "^0.3.0",
"prettier": "^3.8.3",
"prettier-plugin-svelte": "^3.5.1",
"stylelint": "^17.12.0",
"stylelint-config-recommended": "^18.0.0",
"stylelint-declaration-block-no-ignored-properties": "^3.0.0",
"svelte-check": "^4.1.0",
"svelte-preprocess": "^6.0.3"
```

Keep esbuild and `esbuild-svelte`; do not add Vite/Vite+.

- [ ] **Step 4: Create `.node-version`**

Create:

```text
24
```

- [ ] **Step 5: Create `svelte.config.js`**

Create:

```js
import { sveltePreprocess } from 'svelte-preprocess';

export default {
	preprocess: sveltePreprocess({
		typescript: true,
	}),
};
```

- [ ] **Step 6: Create `pnpm-workspace.yaml`**

Create:

```yaml
minimumReleaseAge: 1440
blockExoticSubdeps: true
strictDepBuilds: true

allowBuilds:
  esbuild: true
  obsidian-integration-testing: true
  svelte-preprocess: true

overrides:
  devalue: 5.8.1
  lodash: 4.18.1
  serialize-javascript: 7.0.5
```

- [ ] **Step 7: Generate stable pnpm lockfile**

Run from the hotfix worktree:

```powershell
corepack enable
corepack prepare pnpm@11.1.2 --activate
pnpm install --lockfile-only
```

Expected: `pnpm-lock.yaml` is created and `package-lock.json` is no longer
needed.

- [ ] **Step 8: Remove npm lockfile**

Run:

```powershell
Remove-Item -LiteralPath package-lock.json
```

Expected: `git status --short package-lock.json pnpm-lock.yaml` shows
`D package-lock.json` and `?? pnpm-lock.yaml`.

- [ ] **Step 9: Verify baseline install**

Run:

```powershell
pnpm install --frozen-lockfile
pnpm run build:plugin
```

Expected: both commands exit 0 and `main.js` exists.

- [ ] **Step 10: Commit**

Run:

```powershell
git add package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version svelte.config.js package-lock.json
git commit -m "chore(release): normalize stable gate on pnpm and node 24"
```
