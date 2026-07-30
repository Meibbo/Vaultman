---
title: BT5-001..005 executable plan and adversarial pass
type: plan
status: active
lifecycle: active
parent: "[[docs/work/polish/plans/2026-07-19-bt5-001-005/index|BT5-001..005 implementation plan]]"
created: 2026-07-19T10:32:00
updated: 2026-07-19T10:32:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/plan, initiative/polish, release/bt5]
---

# BT5-001..005 executable plan

## Locked constraints

1. Work in the existing installed dev worktree and branch only; never put BT5 product code in `sandbox` and do not create another worktree.
2. Preserve the user's documentation checkpoint `1bedd4ce`; code and AI-memory commits remain separate, and `.agents/` never goes to origin.
3. Use a failing focal test before each production change. Run Svelte autofixer on every changed `.svelte` file, then type/check/unit/build gates proportional to risk.
4. BT5-004 links the in-app bulletin to the exact installed tag. The notice is concise, performs no network request before the click, and the accumulated editorial document remains manually editable, including local or tag-pinned media.

## BT5-001 — settings rerender hang

Root cause: every `saveSettings()` notification incremented `pageRenderKey`, destroying and recreating both pages, panels, virtualizers, subscriptions and queued frames. The BottomNav also had a settings key. Toolbar, dock and auto-reveal settings therefore all entered the same expensive remount path.

Implementation:

1. Keep `pageRenderKey` exclusively for actual page reordering.
2. Let settings update the existing reactive `settingsRevision` boundary.
3. Remove the BottomNav settings key and pass the revision into StatisticsPage so its direct `minimalStyle` read remains live without a remount.
4. Guard this with `settingsRerenderSource.test.ts`; preserve the reorder remount test.

Verification: focal source test, both changed Svelte files through autofixer, `check`, and a runtime sequence of toolbar → dock → auto-reveal changes without panel teardown.

## BT5-002 — workspace leaf reactivation

Root cause: BT4-022 refreshes only when the internal Filters tab changes. Returning to the same Vaultman tab changes the workspace leaf while the internal tab value remains unchanged, leaving the virtualizer with the zero-height range measured while hidden.

Implementation:

1. Add one shared tab→panel viewport refresh function and unit-test Files, Props, Tags, Snippets, Plugins, Content/no-op and missing-panel cases.
2. Reuse it from the current internal-tab effect and export it through the frame's Svelte API.
3. In `VaultmanFrame`, coalesce refresh requests to one RAF owned by the view's own `ownerDocument.defaultView`; trigger on matching `active-leaf-change` and `onResize`.
4. Cancel a queued frame before unmount. Exact leaf identity prevents inactive Vaultman leaves from rerendering.
5. Source tests cover activation, resize, teardown and the five panel ports. Runtime smoke covers main/left/right/popout where available; Obsidian tab switch, sidebar collapse, internal tab switch and focus-only transitions.

## BT5-003 — Remaining tasks availability pipeline

Root cause: `tasks` is persisted in the same IndexedDB record, but legacy records omit it;
freshness checks accept those records, Files only warms statistics for Words sort, hover missing-field detection ignores tasks, and cache notifications only repaint Words.

Implementation:

1. Keep `tasks` optional only at the persistence boundary, but add an explicit complete file-stat schema predicate requiring non-negative `characters` and numeric `tasks`.
2. Recompute fresh-but-incomplete legacy records in both snapshot and explorer warmups;
   assert the migrated record round-trips through Map/IndexedDB-compatible storage.
3. Add a deterministic priority function: currently mounted file paths first in DOM order, then remaining files by `mtime` descending and path as tie-breaker.
4. Generalize Files warmup from Words-only to statistics demanded by visible Words/Tasks cells or Words/Tasks sort. Capture mounted virtual rows after render, process batches of 25, yield between batches, publish batch paths, and preserve already completed records across cancellation/resume.
5. Generalize convergence and repaint logic for Tasks: scoped sort rerenders only when changed values can cross neighbours; unsorted visible cells patch in place in batches.
6. Include tasks in hover missing-field detection. Expose progress/timing through the existing performance monitor so `Start of The Road` can be measured in the user vault.

Focal tests: legacy hydrate, task persistence, visible/mtime priority, cancellation with subsequent resume, old-file completion, task repaint source guard and comparator convergence.

## BT5-004 — tag-pinned release bulletin

Implementation:

1. Replace the hard-coded beta.2 constant with `plugin.manifest.version`.
2. Add pure version→anchor and version→GitHub tag URL helpers. The link is `.../blob/<exact-tag>/docs/whats-new.md#<deterministic-anchor>`.
3. Reduce the modal to an attractive local intro, one explicit “What's new” action and a close action. Opening the external URL happens only inside the click handler; the command remains available for manual reopen.
4. Add accumulated `docs/whats-new.md`, newest-first, with explicit stable anchors and an editorial template supporting relative media.
5. Extend release-core/preflight to require the target anchor, reject mutable-branch GitHub media URLs in the target section, validate relative media existence and confirm the changelog target section. Add pure release-automation tests and source guards.

## BT5-005 — sort direction semantics

Implementation:

1. Extend the tested default inventory with `tasks: desc` and central physical-flow helpers:
   ascending → down arrow/glyph, descending → up arrow/glyph.
2. Use the helpers in native menus, popup, Table header and Content sort menu. Stored sort direction remains semantic data and is never inverted during restore.
3. Correct Files Name comparison to `file.name` and Path comparison to `file.path`.
4. Test every declared default, tasks first-click desc/second-click asc, name/path cases, scoped state round-trip and source usage on all four sort surfaces.

## Adversarial pass

- Multiple Vaultman leaves: a global refresh would wake hidden leaves and multiply work;
  exact leaf identity plus per-view RAF coalescing avoids it.
- Popout windows: using global `window` can schedule against the wrong document; the view's `ownerDocument.defaultView` owns request/cancel.
- Sidebar uncollapse may resize without changing active leaf; `onResize` is a second narrow trigger. Focus-only changes that do neither are intentionally no-ops because dimensions did not become stale.
- Removing remounts can expose direct non-reactive settings reads. StatisticsPage is audited now; any new setting added later must consume `settingsRevision` explicitly rather than restoring a broad key.
- A repeated visible-priority restart can starve old files. Priority may reorder pending work, but it must not discard completed/pending identities; cancellation stops a consumer, and a resumed call continues to completion with old files still present.
- Legacy persisted records may have malformed values, not just missing `tasks`; completeness checks reject non-numeric/negative schema fields instead of trusting object shape.
- A Tasks value changing from null/zero to positive may have no existing DOM span. The patcher must create/remove the exact cell safely or request one debounced render, not silently skip.
- Markdown links can contain anchors, query strings, URL-escaped paths and external images.
  Preflight validates only local relative media it can resolve and explicitly tag-pinned GitHub blob URLs; it must not treat every external URL as a filesystem path.
- Stable promotion after several betas still uses the accumulated bulletin for editorial summary and the changelog for exhaustive history; release notes must not duplicate every technical fragment into the modal.
- Locale/collation can disagree with raw ASCII. Name and Path retain `localeCompare` with numeric/base options, but their source values are exactly `file.name` and `file.path`.

## Explicit non-goals / quality boundaries

- No virtualizer replacement or per-view geometry rewrite.
- No network-fetched bulletin, embedded remote HTML or telemetry.
- No automatic prose generation: editorial content remains human-controlled.
- Live `Start of The Road` timing and the full Obsidian workspace matrix require the user's installed vault after the automated build; code completion is not a substitute for that runtime evidence.
- Shared cross-engine cell-registry cleanup remains BT5-010; this pass fixes Tasks data availability without attempting that larger taxonomy migration.
