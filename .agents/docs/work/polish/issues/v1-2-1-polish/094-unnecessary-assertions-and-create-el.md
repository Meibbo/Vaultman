---
title: BT5-094 — Clear the unnecessary type assertions and the last document.createElement
type: issue
status: needs-triage
lifecycle: active
priority: P3
execution: AFK
parent: "[[docs/work/polish/issues/v1-2-1-polish/index|v1.2.1 polish backlog]]"
dateCreated: 2026-07-29T18:52:04
dateUpdated: 2026-07-29T18:52:04
created_by: claude-opus-5
updated_by: claude-opus-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.1, types, lint-hygiene]
---

# BT5-094 — Clear the unnecessary type assertions and the last document.createElement

## Symptom

Obsidian team automated scan on stable 1.2.0 reported two mechanical classes.

**Unnecessary assertions** — "This assertion is unnecessary since the receiver
accepts the original type of the expression" (plus one "does not change the type
of the expression"), at 11 sites:

| Cited site (stable) | Line content verified on `main` |
| --- | --- |
| `src/components/layout/viewNodeTable.ts:93`, `:102`, `:109` | `opts.nodes as TreeNode[],` |
| `src/logic/logicInteractionMode.ts:45`, `:47` | `return normalized as 'open' \| 'add' \| 'select';` |
| `src/main.ts:563`, `:584` | `normalizeOpenMode(this.settings.openMode as string)` |
| `src/services/serviceIcons.ts:517` | `return candidate as IconicRuntimePlugin;` |
| `src/utils/obsidianAddons.ts:97` | `return app as ExtendedApp;` |
| `src/utils/performanceMonitor.ts:193-198` | (range, not sampled) |
| `src/services/serviceNativeSearchAdapter.ts:166` | `this.app = app as SearchApp;` |

6 of 6 sampled sites are still present at the cited lines on `main`, so this is
live on stable, not a stale report.

**`document.createElement`** — "Uses `document.createElement` instead of
Obsidian's `createEl` helpers" (`obsidianmd/prefer-create-el`), cited at 9 sites
across `perfProbe.ts`, `logicUpdateNotice.ts`, `main.ts` and `modalConfirm.ts`.
**Mostly already fixed:** `main:src/modals/modalConfirm.ts` uses `createEl` at
the exact cited lines (36, 40, 44). A repo-wide check of `main` finds one
remaining occurrence, in `src/VaultmanFrame.svelte`. Sandbox has zero.

## Why these are not simply deletions

An assertion the compiler calls unnecessary is sometimes load-bearing
documentation of an unsound boundary. Two of these sit exactly there:
`app as ExtendedApp` and `app as SearchApp` narrow Obsidian's `App` onto the
project's extended typings. If the receiver already accepts `App`, the assertion
is noise — but removing it may silently widen what the call site accepts. Check
each against the typed wrapper convention in `src/types/obsidian-extended.ts`
before deleting.

`opts.nodes as TreeNode[]` at three sites in one file suggests the parameter type
is already `TreeNode[]` and the assertion is pure noise — cheapest of the batch.

## Plan

- [ ] Enable `@typescript-eslint/no-unnecessary-type-assertion` reporting on the
      patch line and enumerate the real current set (the rule is already active
      via `obsidianmd/recommended`; it reports 2 sites on sandbox today).
- [ ] Remove the noise assertions; for the `App`-narrowing ones, confirm the
      receiver type first and keep the wrapper route if it is doing real work.
- [ ] Replace the remaining `document.createElement` in
      `src/VaultmanFrame.svelte` with the `createEl` helper.
- [ ] Confirm `--fix` output by hand: the run flags 4 auto-fixable errors, and
      autofix on assertions can change inference.

## Acceptance criteria

- [ ] Zero `no-unnecessary-type-assertion` reports on the patch line.
- [ ] Zero `document.createElement` in shipped source.
- [ ] `svelte-check` and the unit/component suites stay green (an assertion
      removal that changes inference shows up here, not in lint).
- [ ] No behaviour change — this is hygiene only.

## Blocked by

Nothing hard, but doing this **before**
[[095-lint-and-guard-harness-red|BT5-095]] means the result is unverifiable in
CI: the lint gate currently exits 1 with 263 errors, so a clean assertion count
cannot be asserted. Prefer 095 first, or accept a manual count here.
