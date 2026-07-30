---
title: Release 1.0.2 Plan - lint check format
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

# Task 03: Lint, Check, And Format Gate

**Files:**
- Modify: `eslint.config.mts`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Depends on: Task 02

- [ ] **Step 1: Normalize ESLint imports**

In `eslint.config.mts`, use single-quoted imports and keep Obsidian config:

```ts
import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { globalIgnores } from 'eslint/config';
```

- [ ] **Step 2: Extend ESLint ignores for generated release files**

Ensure `globalIgnores` includes:

```ts
globalIgnores([
	'node_modules',
	'dist',
	'obsidian-sample-plugin',
	'esbuild.config.mjs',
	'eslint.config.js',
	'version-bump.mjs',
	'versions.json',
	'main.js',
	'coverage',
	'.obsidian',
]);
```

Do not ignore `src/`, `styles.css`, `manifest.json`, or `package.json`.

- [ ] **Step 3: Create `.prettierrc.json`**

Create:

```json
{
  "useTabs": true,
  "singleQuote": true,
  "trailingComma": "all",
  "plugins": ["prettier-plugin-svelte"],
  "overrides": [
    {
      "files": "*.svelte",
      "options": {
        "parser": "svelte"
      }
    }
  ]
}
```

- [ ] **Step 4: Create `.prettierignore`**

Create:

```text
node_modules
dist
coverage
main.js
package-lock.json
pnpm-lock.yaml
.agents
.claude
.obsidian
```

- [ ] **Step 5: Run Obsidian ESLint gate**

Run:

```powershell
pnpm run lint
```

Expected: exit 0. If `eslint-plugin-obsidianmd@0.3.0` reports new release-risk violations, fix them in the smallest source file patch and rerun this command.

- [ ] **Step 6: Run svelte-check gate**

Run:

```powershell
pnpm run check
```

Expected: exit 0. If failures come from missing Svelte preprocessing, verify Task 02 `svelte.config.js` is present before changing product code.

- [ ] **Step 7: Run format check without rewriting**

Run:

```powershell
pnpm run format:check
```

Expected: exit 0. If it fails only on `.svelte` formatting, run:

```powershell
pnpm run format
pnpm run format:check
```

Commit formatting separately from product/security fixes.

- [ ] **Step 8: Commit**

Run:

```powershell
git add eslint.config.mts .prettierrc.json .prettierignore package.json
git commit -m "chore(release): add stable lint check format gates"
```
