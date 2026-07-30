---
title: v1.2.1 polish backlog — deferred slices after the v1.2.0 close
type: issue-index
status: active
lifecycle: active
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-23T02:15:00
updated: 2026-07-29T21:30:00
created_by: claude-opus-4-8-audit
updated_by: claude-opus-5
tags: [agent/issues, triage/needs-triage, initiative/polish, release/1.2.1]
---

# v1.2.1 polish backlog

## Triaged into files (2026-07-29)

From the Obsidian team's automated scan of stable 1.2.0 plus one dev runtime
report. Every scan warning was re-verified against `main` (manifest `1.2.0`)
before filing — the scan's line references are stable-tree references and do not
match sandbox, which reorganized `src/`.

- [[092-vm-scene-open-close-freeze|BT5-092]] — vm-scene open/close freezes the
  app for an instant (dev report; no diagnosis yet, HITL).
- [[093-declarative-settings-api|BT5-093]] — adopt `getSettingDefinitions()`;
  without it no Vaultman setting is findable in settings search on 1.13.0+.
  Live on both stable and sandbox (file renamed to `src/settingsVM.ts` there).
- [[094-unnecessary-assertions-and-create-el|BT5-094]] — 11 unnecessary type
  assertions (6/6 sampled verified live on `main`) + the last
  `document.createElement`. `prefer-create-el` is otherwise already fixed on
  stable, so most of that scan warning is stale.
- [[095-lint-and-guard-harness-red|BT5-095]] — **root cause of the W5
  regression.** On stable the harness is wired (stylelint and the scorecard
  guard both run inside `verify`), but neither has a browser-compat rule, so
  `text-decoration` was never guarded — the 1.1.6 fix was manual and nothing
  held it. Part B records that sandbox *dropped* both gates in the vite-plus
  migration, plus its 263-error eslint baseline.
- [[096-dependency-refresh-and-advisories|BT5-096]] — 19 Dependabot alerts, all
  `scope: development` so none ships to users; 13 open PRs of which every
  sampled dev-dependency bump is already exceeded on sandbox; plus
  `eslint-plugin-obsidianmd` 0.3.0 → 0.4.1 on both lines.
- [[097-code-scanning-alerts|BT5-097]] — the other 18 alerts: 9 CodeQL code
  findings (4 high `remote-property-injection` in a file that exists only on
  stable) and 9 OpenSSF Scorecard policy items that no code change fixes.

**Branch-attribution note (2026-07-29).** The first pass of 095/096 reported
sandbox measurements as stable facts. `vite-plus` (`vp`) is sandbox-only, so
`vp run lint`, the 263-error count and the orphaned stylelint config never
described stable. Corrected in place; both issues now separate the two lines.
Stable is also *behind* sandbox on `obsidian` (1.12.3 vs 1.13.1), which adds a
typings bump to BT5-093.

W5 (`text-decoration` at `styles.css:6895`) has no issue of its own: the scan
flags it for Obsidian 1.11.4, below the declared `minAppVersion: 1.12.0`, so no
installable user is affected. The actionable part — the missing guard and the
stale compat target — lives in BT5-095.

Work designed with the dev across the pre-stable prompts but deferred out of
v1.2.0 so the stable could ship on the verified fixes. These are the large,
cross-cutting, or newly-scoped items. Numbers are provisional until triaged
into individual files; the design detail lives in
[[docs/sessions/2026-07-22-codex-gpt5-root|the audit shard]] and the
2026-07-23 session log.

## GitHub issue map (published 2026-07-29)

Public tracker: https://github.com/Meibbo/Vaultman/issues. The `U121` identifiers
are the canonical public codes for the 1.2.1 patch; older `BT5` identifiers below
remain historical local-memory references only.

- [U121-001 #41](https://github.com/Meibbo/Vaultman/issues/41) — Universal Navbar host.
- [U121-002 #42](https://github.com/Meibbo/Vaultman/issues/42) — Text Has/Hasn't Navbar action.
- [U121-003 #43](https://github.com/Meibbo/Vaultman/issues/43) — measured Navbar overflow.
- [U121-004 #58](https://github.com/Meibbo/Vaultman/issues/58) — provider Navbar migration.
- [U121-005 #44](https://github.com/Meibbo/Vaultman/issues/44) — ChangeIcon router.
- [U121-006 #59](https://github.com/Meibbo/Vaultman/issues/59) — ChangeIcon adapters/fallback.
- [U121-007 #45](https://github.com/Meibbo/Vaultman/issues/45) — Property format cell.
- [U121-008 #60](https://github.com/Meibbo/Vaultman/issues/60) — checkbox action cell.
- [U121-009 #61](https://github.com/Meibbo/Vaultman/issues/61) — date/datetime action cells.
- [U121-010 #46](https://github.com/Meibbo/Vaultman/issues/46) — glyph color projection.
- [U121-011 #62](https://github.com/Meibbo/Vaultman/issues/62) — frame top-edge geometry.
- [U121-012 #63](https://github.com/Meibbo/Vaultman/issues/63) — differential filter render.
- [U121-013 #47](https://github.com/Meibbo/Vaultman/issues/47) — generic highlight contract.
- [U121-014 #64](https://github.com/Meibbo/Vaultman/issues/64) — folder queue badges.
- [U121-015 #65](https://github.com/Meibbo/Vaultman/issues/65) — queued rename label preview.
- [U121-016 #48](https://github.com/Meibbo/Vaultman/issues/48) — Text state preservation.
- [U121-017 #49](https://github.com/Meibbo/Vaultman/issues/49) — Text pause/resume/restart.
- [U121-018 #50](https://github.com/Meibbo/Vaultman/issues/50) — adopted Text file parents.
- [U121-019 #51](https://github.com/Meibbo/Vaultman/issues/51) — core-search visual parity.
- [U121-020 #66](https://github.com/Meibbo/Vaultman/issues/66) — Text context/view menus.
- [U121-021 #52](https://github.com/Meibbo/Vaultman/issues/52) — tag occurrence provenance.
- [U121-022 #53](https://github.com/Meibbo/Vaultman/issues/53) — default inline rename.
- [U121-023 #68](https://github.com/Meibbo/Vaultman/issues/68) — rich queued rename expansion.
- [U121-024 #54](https://github.com/Meibbo/Vaultman/issues/54) — in-app What's New modal.
- [U121-025 #55](https://github.com/Meibbo/Vaultman/issues/55) — dynamic Open/Close copy.
- [U121-026 #56](https://github.com/Meibbo/Vaultman/issues/56) — navigation/focus commands.
- [U121-027 #57](https://github.com/Meibbo/Vaultman/issues/57) — relative timestamps.
- [U121-028 #67](https://github.com/Meibbo/Vaultman/issues/67) — menu/Navbar action editor.

Published 2026-07-29 (claude-opus-5) — the five items that were local-only until now.
The `BT5-09x` codes stay as the local-memory record; the `U121` codes are canonical
in public:

- [U121-029 #69](https://github.com/Meibbo/Vaultman/issues/69) — vm-scene open/close freeze (= [[092-vm-scene-open-close-freeze|BT5-092]], HITL).
- [U121-030 #70](https://github.com/Meibbo/Vaultman/issues/70) — declarative settings API (= [[093-declarative-settings-api|BT5-093]]).
- [U121-031 #71](https://github.com/Meibbo/Vaultman/issues/71) — unnecessary assertions + `createEl` (= [[094-unnecessary-assertions-and-create-el|BT5-094]]).
- [U121-032 #72](https://github.com/Meibbo/Vaultman/issues/72) — lint gate red + dormant scorecard guard (= [[095-lint-and-guard-harness-red|BT5-095]], P1, HITL).
- [U121-033 #73](https://github.com/Meibbo/Vaultman/issues/73) — dependency refresh + 3 high advisories (= [[096-dependency-refresh-and-advisories|BT5-096]]).

## Carried over from the v1.2.0 audit (never started)

- **BT5-043..046 — Universal Navbar as a `panelWidget`.** Host + provider
  contract, measured Condensed/Scroll/Wrap overflow (Scroll keeps a fixed lane,
  no visible bar), migrate Statistics and every provider off duplicated
  toolbars. Blocks the Navbar cmenu editor below.
- **BT5-047..048 — Canonical ChangeIcon router.** One capability route for all
  explorers, extensible to Iconic and other picker plugins; adapters, initial
  selection, intercept, fallback and dedupe.
- **BT5-055 — Configurable Property value `format` cell**, incl. tag rendering
  for the `tags` property's values (props explorer only).
- **BT5-056/057 — Checkbox and date/datetime `action_cell`s** through the
  operation queue (web-lab widget contract; Daily Note stays navigation).
- **BT5-058 — Glyph color gaps**: folder icon keeps its glyph after expand,
  subfolders inherit the parent color per the fancyfile snippet, hover
  cell_highlight colored; Files cell_name.
- **BT5-059 — Frame top-edge geometry** (beta.5 vs last commit vs DOM measure).

## New scope from the smoke prompts (prompt 4–6)

### Decoration contract (do first; blocks the others)

- **Generic `cell_highlight` for the explorer** — hover / inclusive / exclusive
  / **deletion**, applied to glyph_cells, not hardcoded to props/values. Owns
  the exclusive bubbledot re-render and status-vs-operation badge coexistence
  (a parent shows at most two bubbledot badges, left of any operation badge).
- **Folder queue badges in Files** — the marked folder gets its own badge, its
  child folders too, and the bubble only projects what a collapse hides.
- **`cell_label_change`** — a queued rename projects a preview name in
  `cell_name` (like `cell_path`), generic across explorers.

### Filter / render performance

- **BT5-088 P3 — differential render.** The dominant cost; only re-touch rows
  that entered/left the filtered set. Requires separating position-independent
  decoration (icons, times, name) from the rainbow-bucket / bubble-dot / queue
  passes that depend on order. P4 (memoize decoration by signature) folds in.

### Text explorer

- Preserve the search state when switching provider tabs and back.
- Real pause/resume: resume continues instead of restarting; the toggle
  becomes "restart search" when the search completes.
- **Adopt Files `node_file` nodes as the Text parents** (`.md` only) — the
  first "adopted nodes" precedent; needs an ADR (the concept already exists in
  the sandbox/goal streams — link, do not duplicate).
- Core-search parity: horizontal padding and a "show more context" affordance
  (web-lab gate).
- `node_text` context menu with Replace-with opening the rich modal; a view
  menu with the Files cells (minus extension), In mode, Index, and Files sort
  options.
- Move the Has/Hasn't text toggle out of the input bar (BT5-044 owns this).

### Tags typing

- **Inline vs frontmatter cell_type.** Props explorer shows frontmatter only;
  Tags explorer shows both with an option to classify (splits occurrences into
  `inline` and `frontmatter` cells). Simple/nested stay filter concerns, not
  cell types. Unblocks rename/delete of inline-body tags.

### Rename family

- Inline rename as the default single-node path, behind a Layout setting
  (default on). CSS height already fixed in
  [[../bt5-final-stable-audit/091-inline-rename-editor-height|BT5-091]].
- Extend the rich queued rename to folders, props and values.

### Commands, updates, misc

- **Updates modal** — render `whats-new.md` (with images) inside the modal
  instead of opening GitHub; show once per version, not on every enable;
  fix the "Got it" button onto the same row.
- **Open ↔ Close** dynamic command text by `openMode` (`new_instance` stays
  "Open").
- New commands: open Filters island, open Queue island, reveal file,
  expand/collapse all, focus instance.
- Relative time for `last opened` / `modified` / `created` cells under 24h,
  in the tooltip too, with a settings toggle between relative and specific.
- Divider / submenu creation in the context-menu editor (they are dropped by
  the draft-time normalization); drag-and-drop between menu levels; the full
  native catalog (recurse submenus, keep separators, harvest from the real
  target); a cmenu editor for the Navbar's action nodes.

## Backlog, no fixed release

- **Per-node delete rescue** — cancel a descendant's delete without cancelling
  its parent's, re-projecting the rescued node up ln+n. Depends on:
- **Operation queue persistence** — the queue and its badges do not survive a
  plugin reload today (`OperationQueueService` has no load/save). Prerequisite
  for the rescue surviving a close.
