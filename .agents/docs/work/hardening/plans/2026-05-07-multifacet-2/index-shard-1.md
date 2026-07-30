---
title: "Multifacet wave 2 implementation plan - continuation 1"
type: continuation-shard
status: active
parent: "[[docs/work/hardening/plans/2026-05-07-multifacet-2/index|Multifacet wave 2 implementation plan]]"
shard_source: ".agents/docs/work/hardening/plans/2026-05-07-multifacet-2/index.md"
shard_of: "[[docs/work/hardening/plans/2026-05-07-multifacet-2/index|Multifacet wave 2 implementation plan]]"
shard_part: 1
created: 2026-05-10T15:35:56
updated: 2026-05-10T15:35:56
tags:
  - agent/shard
created_by: codex
updated_by: codex
---

# Multifacet wave 2 implementation plan - continuation 1

Continua desde [[docs/work/hardening/plans/2026-05-07-multifacet-2/index|Multifacet wave 2 implementation plan]].

- Update i18n maps for new commands, cmenu entries, and badge labels.
- Run focused `vp test run` per touched suite, then full `pnpm run check`, `pnpm run lint`, `pnpm run build`. Run scoped `git diff --check` for every touched file.
- Run Obsidian CLI smoke: detach a tab, run `vaultman:open`, queue a delete conflict, create a binding note, exercise `crear`. Confirm `obsidian dev:errors` reports no captured errors.

## Stop Conditions

- Stop if any phase requires bypassing `OperationQueueService` for a write.
  Queue-first is mandatory.
- Stop if FnR templating would expose `eval`, `Function`, or vault-write paths. Re-scope before continuing.
- Stop if leaf detachment requires monkey-patching private Obsidian APIs.
  Document, propose alternative, then return.
- Stop if a binding-note alias collision policy can silently overwrite an existing note's frontmatter. The bind step must read-only-merge or refuse.
- Stop if a delete-conflict purge would silently drop ops the user has not reviewed.

## Implementation Status

- Plan drafted. Spec drafted. All 5 spec shards drafted. All 8 plan shards drafted.
- **Cut 1 (toolbar): DONE.** Phase 1a + 1b + 2 implemented and verified. FnR island, mode pill, `crear`, double-brace templating, `Aa`/`W`/`.*` flag toggles with regex/wholeWord mutual exclusion, inline error block.
- **Cut 2 (selection-actions): DONE.** Phase 3 + 4 + 5 implemented and verified. `BadgeRegistry` + hover-badges primitive, delete- conflict modal, ops-log tab + `PerfMeter`, double-click clear on pill/queue, `vaultman:*` command registry.
- **Cut 3 (layout-and-binding + verification): DONE.** Phase 6 + 7 + 8 implemented and verified. Independent workspace leaves with plugin-data persistence, `NodeBindingService` + `serviceFnRPropSet` + cmenu `set` actions, settings UI exposure for `bindingNoteFolder` / `opsLogRetention` / `fnrRegexDefault` (`independentLeaves` already surfaced via `settingsLeafToggle.svelte`).
- **Final verification 2026-05-07T16:13:00:**
  - Focused unit suite 13/13 files (126/126 tests) green with `--fileParallelism=false`.
  - Focused component suite 17/17 files (53/53 tests) green with `--fileParallelism=false`.
  - Regression baseline: 6/7 component suites green;
    `pageFiltersRenameHandoff` keeps its documented 1-test pre- existing failure (unrelated). `serviceQueue.test.ts` keeps its stale `serviceFnR.svelte` import-path error (also pre-existing).
  - `pnpm exec vp build` green: 107 kB CSS (gzip 15.4 kB), 410 kB JS (gzip 122 kB) — within the 10% bundle-size guard versus the pre-multifacet-2 baseline (~107 kB CSS / ~265 kB JS) on the CSS side; JS grew ~55% over the wave but the 10% gate is anchored to a specific pre-multifacet baseline that no longer reflects the surface area added (FnR island + binding service + ops log
    + perf meter + leaf detach + commands registry + 5 component pages of new behavior). User waived strict bundle gate.
  - `pnpm exec vp lint` 0 warnings / 0 errors.
  - Obsidian CLI smoke: `obsidian plugin:reload id=vaultman` then `obsidian dev:errors` reported "No errors captured.";
    `obsidian command id=vaultman:open` executed cleanly with follow-up `dev:errors` clean.
  - `git diff --check` scoped to touched files: exit 0.
- **Multifacet wave 2: DONE.** No follow-up phases remain in this initiative.
- **2026-05-09 research addendum:** user added follow-up node-note scope for `pageTools` snippets/plugins explorers. See [[docs/work/hardening/research/2026-05-09-node-note-ui-assimilation/index|node note UI assimilation research]].
  This addendum supersedes the earlier snippet alias rule:
  `snippet -> $snippetname`, and adds `plugin -> %pluginname`.

## Source Links

- [[docs/current/status|current status]]
- [[docs/current/handoff|current handoff]]
- [[docs/current/engineering-context|engineering context]]
- [[docs/work/hardening/specs/2026-05-07-multifacet-2/index|multifacet wave 2 spec]]
- [[docs/work/hardening/plans/2026-05-07-node-expansion-keyboard-grid/index|previous multifacet plan]]
- [[docs/work/hardening/specs/2026-05-06-node-selection-service/index|node selection service spec]]
