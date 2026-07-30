---
title: Library usage inventory
type: research-index
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-12T00:00:00
updated: 2026-05-12T00:00:00
tags:
  - agent/work
  - initiative/hardening
  - research/dependencies
  - codebase/inventory
created_by: codex
updated_by: codex
---

# Library Usage Inventory

## Scope

This research record captures the dependency inventory requested by the user after Explorer UI work. It maps direct `package.json` dependencies to the Vaultman modules, components, tests, and tooling configuration that use them.

The inventory is based on:

- `package.json` direct dependencies and dev dependencies.
- Import/require/dynamic-import scans across `src/`, `test/`, `scripts/`, `codeql/`, and root configuration files.
- Targeted searches for package names that can be used indirectly by config rather than by normal TypeScript imports.

No product code was changed for this inventory.

## Shards

- [[docs/work/hardening/research/2026-05-12-library-usage-inventory/01-product-runtime|01 - Product runtime foundations]]
- [[docs/work/hardening/research/2026-05-12-library-usage-inventory/01a-product-feature-libraries|01a - Product feature libraries]]
- [[docs/work/hardening/research/2026-05-12-library-usage-inventory/02-build-test-tooling|02 - Build, test, lint, and audit tooling]]
- [[docs/work/hardening/research/2026-05-12-library-usage-inventory/03-audit-notes|03 - Declared packages, dependency shape, and follow-up checks]]

## High-Level Map

Product/runtime dependencies:

- `obsidian`
- `svelte`
- `@tanstack/svelte-virtual`
- `@tanstack/table-core`
- `@chenglou/pretext`
- `@dnd-kit/svelte`
- `@svar-ui/svelte-filemanager`
- `bits-ui`
- `js-yaml`
- `unocss`
- `@unocss/vite`
- `@git-diff-view/svelte`

Build and test tooling:

- `vite-plus`
- `@sveltejs/vite-plugin-svelte`
- `svelte-preprocess`
- `sass`
- `esbuild`
- `esbuild-svelte`
- `esbuild-sass-plugin`
- `vitest`
- `jsdom`
- `@vitest/coverage-v8`
- `obsidian-integration-testing`
- WebdriverIO packages
- ESLint packages
- static audit and format packages

Potential audit targets from this scan:

- `@git-diff-view/svelte`
- `@eslint/js`
- `eslint-plugin-unused-imports`
- `type-fest`
- `jiti`

This is not a removal recommendation. These packages need focused audit checks because some tooling is loaded indirectly through config strings, CLI adapters, or plugin resolution.
