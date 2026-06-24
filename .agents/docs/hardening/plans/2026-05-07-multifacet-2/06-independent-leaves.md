---
title: Independent workspace leaves
type: implementation-plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-07-multifacet-2/index|multifacet wave 2 plan]]"
created: 2026-05-07T02:30:00
updated: 2026-05-07T02:30:00
tags:
  - agent/plan
  - workspace/layout
created_by: claude
updated_by: claude
---

# Phase 6 — Independent Workspace Leaves

> Spec: [[docs/work/hardening/specs/2026-05-07-multifacet-2/04-independent-leaves|Independent leaves]]

## Tasks

- [x] Create `src/registry/tabRegistry.ts` enumerating `TabId` and
      `DETACHABLE` set per spec.
- [x] Create `src/services/serviceLeafDetach.ts` implementing
      `detach`, `attach`, `restore`, plus persistence via
      `loadData()`/`saveData()`.
- [x] For each detachable tab, register a unique `VIEW_TYPE` in
      `main.ts onload` with a Svelte component factory. Spawning
      remains conditional.
- [x] Add **detach to leaf** / **return to panel** entry to each
      tab's `view` menu via `overlayViewMenu.svelte`.
- [x] Add Settings global toggle **all tabs as independent
      leaves** that calls detach/attach for every tab in
      `DETACHABLE`.
- [x] In `onLayoutReady`, call `LeafDetachService.restore()` after
      Obsidian's own workspace replay.

## Tests

- [x] `test/component/tabViewMenuDetach.test.ts` — menu entry
      label flips with state.
- [x] `test/component/settingsLeafToggle.test.ts` — global toggle
      detaches/attaches all tabs.
- [x] `test/unit/services/serviceLeafDetach.test.ts` —
      `loadData`/`saveData` round trip, `restore` is idempotent.
- [x] `test/smoke/obsidianLeafPersistence.test.ts` — detach a
      tab, reload Obsidian, leaf re-spawns.

## Verification

- [x] Focused unit + component runs.
- [x] Obsidian CLI smoke: `obsidian plugin:reload id=vaultman`
      and assert detached leaves come back.
- [x] `pnpm run check && pnpm run lint && pnpm run build`.

## Stop Conditions

- Stop if detach requires monkey-patching private Obsidian APIs.
  Document and propose alternative.
- Stop if a detached leaf double-mounts the same Svelte component
  alongside the in-panel slot. Ensure mutual exclusion.
- Stop if `restore()` races Obsidian's own workspace load and
  produces duplicate leaves. Defer to a `app.workspace.onLayoutReady`
  callback or microtask.
