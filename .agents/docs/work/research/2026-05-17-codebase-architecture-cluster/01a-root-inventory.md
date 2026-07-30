---
title: Root inventory
type: research
status: draft
parent: "[[docs/work/research/2026-05-17-codebase-architecture-cluster/01-root-surface-layer|root-surface-layer]]"
created: 2026-05-17T13:10:00
updated: 2026-05-17T13:10:00
tags:
  - agent/research
  - architecture
  - codebase
created_by: codex
updated_by: codex
---

# Root Inventory

## Root Files

| Root item | Kind | Role | Surface connection |
| --- | --- | --- | --- |
| `package.json` | package manifest | Declares package metadata, Node `>=24`, `pnpm@11.1.2`, runtime deps, dev deps, and all project commands. | Calls `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `wdio.conf.mts`, `scripts/*.mjs`, `src/` through build/check/lint/test. |
| `pnpm-lock.yaml` | lockfile | Pins the resolved dependency graph. | Used by `vp install` / pnpm in local and CI. |
| `pnpm-workspace.yaml` | pnpm policy | Enforces dependency supply-chain settings: minimum release age, strict build approvals, overrides. | Affects install used before every build/test/CI command. |
| `.node-version`, `.nvmrc` | runtime pin | Pin Node 24 for local tooling. | Aligns with `package.json.engines` and GitHub workflows using Node 24. |
| `vite.config.ts` | build config | Builds Obsidian plugin as CJS library, externalizes Obsidian/Electron/CodeMirror/Node built-ins, uses Svelte and UnoCSS. | Entry is `src/pluginEntry.ts`; emits `main.js` and `styles.css` under `dist/vite`; package scripts then sync/copy artifacts. |
| `svelte.config.js` | Svelte preprocess | Enables TypeScript and SCSS preprocessing. | Applies to Svelte compilation in build and component tests. |
| `tsconfig.json` | TypeScript contract | Strict TS, bundler resolution, DOM libs, no emit, path aliases. | Drives `pnpm check`, `tsc -noEmit`, `svelte-check`, source imports under `src/`, and config-file type checking. |
| `vitest.config.ts` | test config | Defines `integration`, `component`, and `unit` projects. | Routes `test/integration`, `test/component`, and `test/unit`; aliases `obsidian` to `test/helpers/obsidian-mocks.ts`. |
| `wdio.conf.mts` | e2e config | Runs Obsidian desktop e2e through `wdio-obsidian-service`. | Uses `test/e2e/**/*.e2e.ts` and `test/vaults/e2e`. |
| `eslint.config.mts` | lint config | Combines TypeScript ESLint, Obsidian rules, Oxlint compatibility, and local `no-mutable-vfs`. | Lints `src/**/*.ts`; imports `scripts/no-mutable-vfs.mjs`; ignores build, tests, agent docs, and generated artifacts. |
| `.prettierrc.json`, `.prettierignore` | formatting | Prettier config for Svelte and ignored generated/agent files. | Used by `format:prettier` and `format:prettier:check`. |
| `knip.json` | dead-code audit | Defines entry/project files and ignores docs/tests/WIP. | Used by `pnpm run audit:knip` to inspect `src/main.ts` and `src/**/*.{ts,svelte}`. |
| `uno.config.ts` | utility/theme config | Defines UnoCSS presets, theme tokens, safelist, shortcuts, and rules. | Used by Vite plugin; affects generated CSS and classes in `src/components`/`src/styles`. |
| `manifest.json` | Obsidian plugin manifest | Declares id, name, version `1.1.0`, min app version `1.12.0`, author, desktop support. | Copied into release assets; version must align with `versions.json` and package version. |
| `versions.json` | Obsidian compatibility | Maps plugin versions to minimum Obsidian app versions. | Release/community metadata companion to `manifest.json`. |
| `main.js`, `styles.css` | generated root artifacts | Built plugin outputs present at root but ignored as compiled work. | Runtime assets consumed by Obsidian; source of truth is `src/` plus build config. |
| `README.md` | public product docs | Describes product, features, install, development, CI/security badges. | References `img/` assets and tells external users how the repo is used. |
| `CHANGELOG.md` | release history | Release/user-facing change memory. | Should align with tags and release workflow. |
| `SECURITY.md` | security policy | Defines vulnerability reporting and scope. | Complements security workflows, CodeQL, audits, and Scorecard. |
| `LICENSE` | legal | Apache-2.0 license. | Release/public repository requirement. |
| `AGENTS.md`, `CLAUDE.md` | agent bootloader | Routes AI agents to `.agents/docs/start.md`, current status, and handoff. | Active only on AI branches; should not land on `main`. |
| `.gitignore` | repository hygiene | Ignores generated artifacts, dependencies, caches, local settings, and most agent cache files while allowing `vm-*` skills/tools. | Governs which generated files and agent docs can be tracked. |

## Root Directories

| Directory | Role | Surface connection |
| --- | --- | --- |
| `src/` | Product source. | Build entry, type checking, linting, unit/component tests. |
| `test/` | Test source. | Vitest projects, WDIO e2e, Obsidian mocks and fixtures. |
| `scripts/` | Project automation. | Called by package scripts and ESLint local rule import. |
| `.github/` | CI, release, dependency and security automation. | Workflows call `vp install`, `vp run verify`, `vp run security:audit`, CodeQL, release asset prep. |
| `codeql/` | Custom CodeQL query packs and tests. | Called by `.github/workflows/codeql.yml`. |
| `.github/codeql/` | CodeQL action config. | Used by CodeQL init workflow. |
| `.agents/` | AI workflow docs, skills, tools, metrics. | Agent navigation and research outputs; branch-only per `AGENTS.md`. |
| `.claude/`, `.codex/` | Local agent/tool settings. | Local workflow only; `.claude/` ignored by `.gitignore`. |
| `docs/` | Public docs placeholder in current worktree. | Empty at root scan; AI docs live under `.agents/docs/`. |
| `img/` | README/product images. | Referenced by `README.md` and product documentation. |
| `.vscode/` | Local editor settings. | Ignored by `.gitignore`, not product source. |
| `eslint-rules/` | Intended local lint rule folder. | Empty in this scan; actual local rule import points at `scripts/no-mutable-vfs.mjs`. |

## First-Level Source Surface

At this phase, the root only reaches the first `src/` surface:

| `src/` item | Root connection |
| --- | --- |
| `pluginEntry.ts` | Vite library entry. |
| `main.ts` | Plugin runtime root; covered by build, check, lint, tests. |
| `main.scss` | Style entry consumed by Vite/Svelte/UnoCSS. |
| `settingsVM.ts` | Runtime settings source included by `src/**/*.ts`. |
| `svelte.d.ts` | Svelte typing support. |
| `api/`, `badges/`, `components/`, `config/`, `dev/`, `index/`, `logic/`, `modals/`, `providers/`, `registry/`, `services/`, `styles/`, `types/`, `utils/` | Deferred to later phases; currently reached by broad root tooling patterns. |

## Observations

- Root config is coherent around Node 24, Vite+, Svelte 5, strict TS, Vitest, WDIO, UnoCSS, and Obsidian plugin packaging.
- `package.json` is the main root orchestrator. Most root files are either direct inputs to its scripts or release metadata consumed by workflows.
- `main.js` and `styles.css` are generated root artifacts, not source of truth.
- `.agents/` is part of the agent workflow layer, not product runtime, but it is intentionally present on this branch.
