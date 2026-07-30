---
title: v1.2.0-beta.1 Floating TOC fixes — implementation plans
type: plan
status: completed
created: 2026-07-15
updated: 2026-07-15
---

# v1.2.0-beta.1 Floating TOC fixes

Implementation base: `C:\tmp\vaultman-v12-ftc001`, branch `v12/ftc-001`, starting at `8aa28e25`.

Approved specification:
[[docs/work/polish/specs/2026-07-15-v1-2-beta1-floating-toc-fixes/index|beta.1 Floating TOC fixes]].

## Execution order

1. [[01-ftc-007-index-lifecycle|FTC-007 — index lifecycle and soft scroll]]
2. [[02-ftc-008-toolbar-settings|FTC-008 — toolbar Tools menu and Settings order]]
3. [[03-ftc-009-niagara-track|FTC-009 — joined Niagara track and deferred effects]]

The order is intentional. FTC-007 establishes the action and reveal contracts consumed by the Niagara refactor. FTC-008 is independent at runtime but touches Settings near the same beta controls. FTC-009 performs the component/CSS consolidation last, once the behavioral contracts are stable.

## Global constraints

- Use red-green-refactor for every behavior change.
- Run the Svelte autofixer after each edited `.svelte` file.
- Preserve `8aa28e25` and all earlier Claude work.
- Keep product commits free of `.agents/` paths.
- Do not run visual, screenshot, browser, Obsidian smoke, mobile-emulation, E2E, or interaction-recorder validation. The developer owns visual acceptance.
- Automated gates are source/unit behavior tests, `svelte-check`, TypeScript, lint, formatting, stylelint, and production build only.

## Completion gates

Run from `C:\tmp\vaultman-v12-ftc001`:

```powershell
pnpm run test:unit
pnpm run check
pnpm run lint
pnpm run format:check
pnpm run stylelint
pnpm run build:plugin
git diff --check
git status --short --branch
```

Do not run `test:e2e`, `test:all`, `smoke:scroll`, or any visual harness.

## Completion

Corrective code batch landed serially on `v12/ftc-001`:

1. FTC-007 — `409b15ed`
2. FTC-008 — `d9eb4cf0`
3. FTC-009 — `58193e14`

Final nonvisual evidence: 70 unit files / 345 tests passed; TypeScript + Svelte 0/0;
production bundle, ESLint, Stylelint, targeted Svelte formatting, and diff-check passed.
The global Svelte format command still reports 18 pre-existing files outside the batch.
No visual/UI automation was run; that validation remains owned by the developer.
