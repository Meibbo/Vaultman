---
title: T4 Parallel Agent Dispatch
type: implementation-dispatch
status: active
parent: "[[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/index|ui-modernization-vertical-threads]]"
created: 2026-05-11T11:15:04
updated: 2026-05-11T11:15:04
tags:
  - agent/dispatch
  - thread/ecosystem-interception
  - parallel-agents
  - t4
created_by: codex
updated_by: codex
glossary_candidates:
  - T4 parallel dispatch
---

# T4 Parallel Agent Dispatch

Use this router when the user opens a fresh agent and says only `ola 1 agente N` or `ola 2 agente 1`.

## Required Startup

1. Read `AGENTS.md`, `.agents/docs/start.md`, `.agents/docs/current/status.md`, and `.agents/docs/current/handoff.md`.
2. Read this dispatch doc and only the assigned brief below.
3. Read [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/04-thread-ecosystem-interception|T4 Ecosystem & Interception]] for source context.
4. Use the relevant skills before edits: `vm-start-session`, `test-driven-development`, `svelte-code-writer` for `.svelte` files, and `verification-before-completion` before claiming success.
5. Run `git status --short --branch` before editing. If an owned file is dirty from someone else, stop and report the conflict.
6. Do not commit unless the user explicitly asks. Do not edit `.agents/docs/current/status.md` or `.agents/docs/current/handoff.md`.
7. Obsidian live smoke targets must pass `vault=plugin-dev` explicitly.

## Worktree Rule

If doing implementation, create an isolated worktree from the primary checkout before editing. Read this doc first, then use a branch name that matches the brief:

```powershell
git worktree add ".claude/worktrees/t4-w1-a1-fnr" -b codex/t4-w1-a1-fnr sandbox
```

If the branch or path exists, add a short numeric suffix. Work only inside that worktree after creation. Read-only scout agents may stay in the primary checkout.

## Shortcut Router

| User says | Route |
| --- | --- |
| `ola 1 agente 1` | Wave 1 Agent 1: Find/Replace popover migration |
| `ola 1 agente 2` | Wave 1 Agent 2: adopted-block DnD queue staging |
| `ola 1 agente 3` | Wave 1 Agent 3: add-ons Quick Switcher and markdown internals |
| `ola 1 agente 4` | Wave 1 Agent 4: FAB orbiting-ink polish |
| `ola 1 agente 5` | Wave 1 Agent 5: read-only frame integration scout |
| `ola 2 agente 1` | Wave 2 Agent 1: frame integration owner |

Wave 2 must not start until the coordinator confirms Wave 1 results have been reviewed or intentionally skipped.

## Shared Constraints

- Preserve T3 immutability: no `vfs.fm =`, `vfs.body =`, `vfs.ops.push`, or direct mutation from `op.apply(vfs)`.
- Do not run broad refactors. Stay inside the owned files unless the brief says a minimal extra file is allowed.
- Do not regenerate or stage `styles.css` from multiple agents. If a build changes `styles.css`, report it and leave final regeneration to the coordinator unless your brief explicitly owns it.
- For Svelte edits, run `mcp__svelte__.svelte_autofixer` on changed Svelte files before handoff.
- Handoff must list files changed, verification commands with pass/fail counts, blockers, and any out-of-scope file touched.

## Wave 1 Agent 1: Find/Replace Popover

**Goal:** migrate the real Find/Replace island to `vmPopover` while preserving existing keyboard and service behavior.

**Owned files:**

- `src/components/layout/overlays/overlayIsland.svelte`
- `src/services/serviceFnRIsland.svelte.ts`
- `test/component/vmPopoverIsland.test.ts`

**Read-only files:** `src/components/overlays/vmPopover.svelte`, `src/components/frame/frameVaultman.svelte`, FnR service tests.

**Verification:**

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/vmPopoverIsland.test.ts --fileParallelism=false
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceFnRIsland.test.ts --fileParallelism=false
pnpm run check
```

## Wave 1 Agent 2: Adopted-Block DnD Queue Staging

**Goal:** turn `buildMoveBlockOps()` from a pure helper into real adopted-block move staging across source and target VFS chains.

**Owned files:**

- `src/services/serviceDnd.ts`
- `src/services/serviceDndSvelteAdapter.ts`
- `test/unit/services/serviceDndMoveBlock.test.ts`

**Allowed only if necessary:** `test/unit/services/serviceQueueChains.test.ts` and a minimal `src/services/serviceQueue.svelte.ts` API call-site adjustment.

**Verification:**

```powershell
pnpm run lint:full
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDndMoveBlock.test.ts test/unit/services/serviceQueueChains.test.ts test/unit/services/serviceDndAliasAware.test.ts --fileParallelism=false
pnpm run check
```

## Wave 1 Agent 3: Add-Ons Internals

**Goal:** complete add-ons island internals for Quick Switcher launch and MarkdownRenderer-backed note rendering. Do not wire it into `frameVaultman`.

**Owned files:**

- `src/services/serviceAddonsIsland.svelte.ts`
- `src/components/addons/AddonsMarkdownPane.svelte`
- `test/component/addonsMarkdownPane.test.ts`

**Verification:**

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/addonsMarkdownPane.test.ts --fileParallelism=false
pnpm run check
```

## Wave 1 Agent 4: FAB Orbiting Ink

**Goal:** connect the existing `.vm-fab-processing` animation to the Ops FAB processing state and respect reduced-motion.

**Owned files:**

- `src/components/layout/overlays/layoutOverlay.svelte`
- `src/styles/_animations.scss`
- `src/styles/panel/_ops.scss`
- a focused style/component test if needed

**Verification:**

```powershell
pnpm run lint:full
pnpm run check
pnpm run build:plugin
```

If `styles.css` changes, report it and do not stage it unless the coordinator assigns final CSS regeneration to this agent.

## Wave 1 Agent 5: Frame Integration Scout

**Goal:** produce a read-only integration map for the Wave 2 frame owner.

**Read-only targets:**

- `src/components/frame/frameVaultman.svelte`
- `src/services/serviceLayout.ts`
- `src/services/serviceNativeClickIntercept.ts`
- `src/services/serviceFoulDetection.svelte.ts`
- `src/components/dashboard/Dashboard3Column.svelte`
- `src/components/addons/AddonsMarkdownPane.svelte`
- `src/types/typeSettings.ts`
- `src/index/i18n/en.ts`
- `src/index/i18n/es.ts`

**Output:** exact file-by-file integration plan, open risks, and targeted tests.
Do not edit files.

## Wave 2 Agent 1: Frame Integration Owner

**Goal:** integrate the reviewed Wave 1 pieces into the live frame.

**Start condition:** coordinator says Wave 1 is ready.

**Owned files:**

- `src/components/frame/frameVaultman.svelte`
- `src/components/settings/SettingsUI.svelte`
- `src/types/typeSettings.ts`
- `src/index/i18n/en.ts`
- `src/index/i18n/es.ts`
- focused component/unit tests for frame wiring

**Responsibilities:**

- Wire frame-level native-click interception from settings/frame state.
- Integrate Dashboard3Column and add-ons surface into `frameVaultman.svelte`.
- Mount or connect Foul Detection where the frame owns root lifecycle.
- Preserve existing single-column/sidebar behavior.

**Verification:**

```powershell
pnpm run lint:full
pnpm exec vp test run --project component --config vitest.config.ts test/component/nativeClickInterceptor.test.ts test/component/dashboard3Column.test.ts test/component/addonsMarkdownPane.test.ts --fileParallelism=false
pnpm run check
pnpm run build:plugin
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev dev:errors
```
