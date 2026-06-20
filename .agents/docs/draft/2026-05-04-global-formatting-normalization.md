---
title: Global Formatting Normalization
type: draft-item
status: draft
priority: low
effort: medium
created: 2026-05-04T22:30:00
tags:
  - housekeeping
  - dx
---

# Global Formatting Normalization (Spaces to Tabs)

## Context
The codebase currently uses a mix of indentation styles. While `.prettierrc.json` specifies `useTabs: true`, approximately **169 files** (92% of the project) are using spaces or have other formatting inconsistencies relative to `vp fmt` and `prettier` checks.

## Current State
- **Svelte Files:** 31 files need formatting via `prettier`.
- **Logic/Service Files:** Almost all `.ts` files need normalization.
- **Style Files:** `.scss` files currently use 2 spaces but should use tabs.
- **JSON/MD Files:** Widespread inconsistencies (e.g., `package.json`, `tsconfig.json`).

## Risks
1. **Large Diff:** A project-wide format run will touch almost every line, making concurrent PR reviews difficult.
2. **Logic Obfuscation:** Git history will show formatting changes as the most recent modification for many lines, hiding the original authorship/intent until "ignore whitespace" is used in git blame.
3. **Merge Conflicts:** Any active branches will experience massive merge conflicts if this is merged into `main` or a shared `dev` branch.

## Proposed Plan (Isolated Execution)

### 1. Preparation
- Ensure all active work is committed or stashed.
- Create an isolated branch: `housekeeping/global-format`.

### 2. Execution
- Run Prettier for Svelte: `pnpm run format:prettier`.
- Run Oxlint Formatter for TS/SCSS/JSON: `pnpm run format:ox`.
- Manual verification of critical files (e.g., `main.ts`, `serviceViews.svelte.ts`, `_tree.scss`).

### 3. Verification
- Run `pnpm run verify` to ensure no logic was broken by the formatter.
- Check `vp test run` for all projects (unit, component, integration).
- Ensure `pnpm run format:check` passes completely.

### 4. Integration
- Perform the merge during a "low activity" window.
- Notify all collaborators to pull the changes and rebase their active branches using "ignore whitespace" merge strategies if possible.

## Success Criteria
- `pnpm run format:check` returns 0 issues.
- CI pipeline passes consistently.
- No regression in plugin features or performance.
