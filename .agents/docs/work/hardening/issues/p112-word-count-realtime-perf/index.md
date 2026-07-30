---
title: Word-count realtime refresh degrades typing FPS
type: issue
status: open
severity: medium
lifecycle: active
parent: "[[docs/work/hardening/specs/2026-06-21-p112-content-words-css/index|P112 Content/Words/CSS Fixes Spec]]"
created: 2026-06-23T00:00:00
created_by: claude-opus-4-8
tags:
  - vaultman/p112
  - vaultman/issue
  - vaultman/perf
---

# Word-count realtime refresh degrades typing FPS

**Reported:** 2026-06-23 (dev), confirmed via performance HUD.
**Shipped with:** the realtime Words-cell fix (`5b537e6`). The fix is correct;
this is a follow-up perf regression it introduced. **Decision: ship 1.1.6, fix later.**

## Symptom

With the Files **Words** cell visible, typing in any note makes FPS drop aggressively (visible on the performance HUD). Worse on large vaults (~11k files in `plugin-dev`).

## Root cause (confirmed by code, not yet profiled)

The realtime fix wired two new per-edit code paths:

1. **Service** (`serviceStatisticsCache.ts`): `metadataCache 'changed'` (fires repeatedly *while typing*, on Obsidian's parse debounce) and `vault 'modify'` (autosave) both call `invalidateFile` + `scheduleFileStatsRefresh` → `refreshFileStats` = `cachedRead` + `countWords` + `collectFileMetadata` + `events.trigger('changed')`.
2. **Files panel** (`explorerFiles.ts`): `_handleStatsChange` → debounced **full `_render()`**.

The dominant cost is **#2, not the word recompute the dev suspected**.
`_render()` in tree mode rebuilds the *entire* file-tree projection (`logic.buildFileTree` over all `_currentFiles`) plus the decorate passes (`_decorateTreeWithFileTimes` / queue / reveal) and re-renders the virtual window — on every edit. On 11k files that full rebuild per keystroke-batch is the FPS sink. The dev's "double CPU vs Obsidian's own counter" hypothesis is a minor secondary cost (one `cachedRead` per debounced edit); the rebuild is the real hog. Also: `statisticsCache 'changed'` fires on *every* `invalidateAggregates`, so each edit triggers the debounced full render even before the word recompute.

## Candidate fixes (cheapest first)

1. **Targeted row patch (recommended).** Have the service emit *which path* refreshed; the Files panel updates only that row's `.vaultman-tree-words` text node in place — skip `buildFileTree` + decorate + virtual re-render entirely. Kills the regression at the source.
2. **Listen to `vault 'modify'` only** (save), not `metadataCache 'changed'` (per-parse) — fewer triggers while typing.
3. **Viewport gate.** Skip refresh/render if the changed path is not in the currently rendered virtual window.
4. **Coarser debounce** on `_handleStatsChange` while a file is actively being edited (e.g. 250–400 ms), trailing-edge only.

(1) + (2) together should remove the regression without losing realtime feel.

## Repro

1. Files tab, enable the **Words** cell (View mode → Words).
2. Open the performance HUD.
3. Open any note in the editor and type continuously.
4. Observe FPS drop on the HUD (worse the larger the vault).

## Acceptance

- Typing with the Words cell visible holds a steady FPS comparable to typing with the cell hidden, while the cell still updates within ~1 s of edits.
- No full Files tree rebuild per edit (verify via perf marks / HUD).
