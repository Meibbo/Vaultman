---
title: Codebase Orphan Files Audit
type: research-note
status: active
parent: "[[docs/work/research/2026-05-17-codebase-architecture-cluster/index|Codebase architecture cluster]]"
created: 2026-05-25T12:24:00-05:00
updated: 2026-05-25T12:24:00-05:00
tags:
  - agent/research
  - architecture
  - audit
  - cleanup
created_by: antigravity
updated_by: antigravity
---

# Codebase Orphan Files Audit — Vaultman (2026-05-25)

An audit of the Vaultman codebase was conducted to identify stray, unused, or orphan files left over from past development iterations.

## Summary

- **Untracked files in Git:** 0 in `src/` or `test/`. All local untracked files are confined to `.agents/docs/` or build/test artifacts.
- **Orphan/Unused source files:** 10 files (Svelte components or TypeScript classes) that are tracked in git but never imported/used anywhere.
- **Unused dependencies:** `@git-diff-view/svelte` in `package.json`.
- **Knip False Positives:** 4 items were flagged as unused due to configuration mismatches in `knip.json`.

## Unused Files List

| File Path | Original Purpose | Recommendation |
| :--- | :--- | :--- |
| `src/modals/modalQueueDetails.ts` | Queue details preview modal (Fase 1). | **Delete**. Replaced by Svelte views. |
| `src/components/componentQueueList.ts` | Older DOM-based queue renderer. | **Delete**. Replaced by Svelte views. |
| `src/components/pages/tabLinter.svelte` | Linter tab component. | **Retain or Delete**. Disabled in `pageTools.svelte`. |
| `src/components/btnSelection.svelte` | Selection button row primitive. | **Delete**. Unused. |
| `src/components/primitives/Badge.svelte` | Primitive badge component. | **Delete**. Unused. |
| `src/components/primitives/BtnSquircle.svelte` | Squircle button primitive. | **Delete**. Unused. |
| `src/components/containers/explorerBasesImport.ts` | Re-export wrapper for bases import. | **Delete**. Direct provider imports used instead. |
| `src/components/containers/explorerPlugins.ts` | Re-export wrapper for plugins. | **Delete**. Direct provider imports used instead. |
| `src/components/containers/explorerSnippets.ts` | Re-export wrapper for snippets. | **Delete**. Direct provider imports used instead. |
| `src/api/explorerProvider.ts` | Public API type re-exporter. | **Delete**. Unused. |

## Unused Dependencies

- `@git-diff-view/svelte` (production dependency): No active imports in the source or tests.

## Knip Configuration Repair

To resolve false positives in `knip`, the `knip.json` configuration should be updated:

```diff
-	"entry": ["src/main.ts", "esbuild.config.mjs", "version-bump.mjs", "svelte.config.js"],
+	"entry": ["src/pluginEntry.ts", "scripts/esbuild.config.mjs", "version-bump.mjs", "svelte.config.js"],
```

This properly targets the actual build entry point (`src/pluginEntry.ts`) and the correct esbuild script location (`scripts/esbuild.config.mjs`).
