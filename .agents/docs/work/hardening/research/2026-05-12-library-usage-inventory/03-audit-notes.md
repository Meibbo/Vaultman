---
title: Declared packages, dependency shape, and follow-up checks
type: research
status: active
parent: "[[docs/work/hardening/research/2026-05-12-library-usage-inventory/index|Library usage inventory]]"
created: 2026-05-12T00:00:00
updated: 2026-05-12T00:00:00
tags:
  - agent/work
  - initiative/hardening
  - research/dependencies
  - codebase/audit
created_by: codex
updated_by: codex
---

# Declared Packages, Dependency Shape, And Follow-Up Checks

## Declared Packages With No Direct Import Found

The scan did not find direct imports for these package names in the searched
source/config surfaces:

- `@git-diff-view/svelte`
- `@eslint/js`
- `eslint-plugin-unused-imports`
- `type-fest`
- `jiti`

This is not a removal recommendation by itself. The next step for removal would
be to run the repo's audit tools and inspect whether any package is loaded
indirectly by CLI/config resolution.

## Dependency Shape Notes

- Several product-imported packages are listed under `devDependencies`, notably
  the TanStack packages. That can still work for a bundled Obsidian plugin
  because the dependency is needed at build time, but it should be an explicit
  packaging decision.
- The most important third-party UI/runtime boundaries are currently contained:
  TanStack Virtual behind view and scroll services, TanStack Table behind the
  table adapter, DnD Kit behind a Svelte adapter service, Bits UI behind overlay
  primitives, and Pretext behind a text-measurement service.
- `obsidian` and `svelte` are foundational platform dependencies and should not
  be evaluated like optional feature libraries.

## Suggested Follow-Up Checks

Before pruning any dependency:

1. Run `pnpm knip`.
2. Run `pnpm depcheck`.
3. Run `pnpm ts-prune` for exported symbol drift.
4. Confirm build/test configs that load packages by string or plugin name,
   especially ESLint, WDIO, Vitest coverage, and Vite plugins.
5. Build the plugin and run the focused test suite for any touched dependency
   boundary.
