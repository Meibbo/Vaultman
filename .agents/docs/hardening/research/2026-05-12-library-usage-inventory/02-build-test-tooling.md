---
title: Build, test, lint, and audit tooling
type: research
status: active
parent: "[[docs/work/hardening/research/2026-05-12-library-usage-inventory/index|Library usage inventory]]"
created: 2026-05-12T00:00:00
updated: 2026-05-12T00:00:00
tags:
  - agent/work
  - initiative/hardening
  - research/dependencies
  - codebase/tooling
created_by: codex
updated_by: codex
---

# Build, Test, Lint, And Audit Tooling

## `vite-plus`

Purpose: build/dev wrapper used by package scripts and Vite config.

Users:

- `vite.config.ts`
- `package.json` scripts through `vp`

## `@sveltejs/vite-plugin-svelte`

Purpose: Svelte integration for Vite and Vitest.

Users:

- `vite.config.ts`
- `vitest.config.ts`

## `svelte-preprocess`

Purpose: preprocess TypeScript/SCSS in Svelte components.

Users:

- `vite.config.ts`
- `svelte.config.js`

## `sass`

Purpose: SCSS compilation support.

Users:

- Svelte preprocessing and style build path.

## `esbuild`, `esbuild-svelte`, `esbuild-sass-plugin`

Purpose: alternate or legacy esbuild-based build configuration.

Users:

- `scripts/esbuild.config.mjs`

## `vitest`

Purpose: unit, service, and component test runner.

Users:

- `vitest.config.ts`
- `test/**/*.test.ts`

## `jsdom`

Purpose: DOM environment for component tests.

Users:

- configured in `vitest.config.ts`

## `@vitest/coverage-v8`

Purpose: coverage provider.

Users:

- `vitest.config.ts`
- `package.json` coverage scripts

## `obsidian-integration-testing`

Purpose: integration-test harness for Obsidian plugin behavior.

Users:

- `test/integration/debug-path.test.ts`
- `test/integration/explicit-vault.test.ts`
- `test/integration/fileCentricQueue.test.ts`
- `test/integration/manual-register.test.ts`
- `test/integration/performance.test.ts`
- `test/integration/plugin.test.ts`
- `test/integration/settingsMigration.test.ts`
- `vitest.config.ts` global setup reference

## WebdriverIO And Obsidian WDIO Packages

Packages:

- `@wdio/cli`
- `@wdio/globals`
- `@wdio/local-runner`
- `@wdio/mocha-framework`
- `@wdio/spec-reporter`
- `wdio-obsidian-service`
- `wdio-obsidian-reporter`
- `mocha`

Purpose: E2E and Obsidian runtime automation.

Users:

- `wdio.conf.mts`
- package scripts that run WDIO.

Interpretation: most WDIO packages are used indirectly through WebdriverIO's
configuration resolution rather than direct imports in source files.

## ESLint Stack

Packages:

- `eslint`
- `typescript-eslint`
- `eslint-plugin-obsidianmd`
- `eslint-plugin-oxlint`
- `globals`

Users:

- `eslint.config.mts`
- `test/unit/lint/noMutableVfsRule.test.ts`
- `src/eslint-rules/no-mutable-vfs.mjs`

Declared but no direct config usage observed:

- `@eslint/js`
- `eslint-plugin-unused-imports`

Interpretation: `@eslint/js` and `eslint-plugin-unused-imports` may be stale,
reserved for future config, or indirectly relevant. They should be checked with
the dependency-audit commands before removal.

## Format And Static Audit Tools

Packages:

- `prettier`
- `prettier-plugin-svelte`
- `knip`
- `depcheck`
- `ts-prune`

Users:

- `package.json` scripts
- `knip.json`

## Type And Loader Support

Packages:

- `typescript`
- `@types/node`
- `@types/js-yaml`
- `type-fest`
- `jiti`

Observed usage:

- `typescript`, `@types/node`, and `@types/js-yaml` support typechecking and
  package typings.
- `type-fest` had no direct import in the scan.
- `jiti` had no direct import in the scan.

Interpretation: type packages often have no runtime import. `type-fest` and
`jiti` need a focused audit before any cleanup decision.
