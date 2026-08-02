---
title: U121-003 plan 06 - integration verification and smoke
type: implementation-plan-shard
status: pending-approval
parent: "[[index|U121-003 corrective implementation plan]]"
updated: 2026-08-02
---

# 06 — Integrated verification, exact build and live smoke

## Task 6.1 — Add one integrated regression scorecard

**Files:**

- Create: `test/unit/u121003CorrectiveIntegration.test.ts`
- Modify: `test/unit/panelWidgetRegressions.test.ts`
- Modify: `test/unit/selectionCheckboxSource.test.ts`
- Modify: `test/unit/propertyValueWidgetsSource.test.ts`
- Modify: `test/unit/settingsRerenderSource.test.ts`

- [ ] Add an integrated contract test that imports the pure controller, selection,
  capability, operation-target, badge-sort and swipe modules and runs one minimal
  tracer-bullet scenario across their public APIs.
- [ ] Add source guards for the architectural negatives: no provider-keyed host
  remount, no split panelWidget caches, no provider-local selection store, no
  renderer metadata write, no duplicate Cell availability branches.
- [ ] Add a reactivity guard proving provider, Cell visibility, selected state and
  widget pending state have direct notification/subscription paths and do not
  require a global explorer rebuild callback.
- [ ] Run the new test first and confirm RED for any missing integration seam.
- [ ] Apply only seam corrections; do not add new behavior or bypass public ports
  to satisfy the test.
- [ ] Re-run the integrated test and every focused suite from shards 01–05; confirm
  GREEN.
- [ ] Commit code-only as `test: lock U121-003 integrated regressions` only after
  tasks 6.2 and 6.3 also pass.

## Task 6.2 — Run Svelte and repository gates

- [ ] List changed Svelte files with
  `git diff --name-only -- '*.svelte'` and run the Svelte autofixer individually
  on every result. Fix all valid diagnostics and re-run until each is clean.
- [ ] Run `pnpm run format:check`; if it fails, run the repository formatter only
  on changed Svelte files and repeat the check.
- [ ] Run `pnpm run lint` and require exit code 0.
- [ ] Run `pnpm run check` and require TypeScript plus Svelte exit code 0.
- [ ] Run `pnpm run stylelint` and require exit code 0.
- [ ] Run `pnpm run test:unit` and require all tests pass with no unhandled errors.
- [ ] Run `pnpm run test:scorecard` and require the regression scorecard pass.
- [ ] Run `pnpm run build:plugin` and require exit code 0.
- [ ] Run the aggregate gate `pnpm run verify`; require exit code 0 rather than
  treating the separate earlier passes as a substitute.
- [ ] Run `git diff --check` and remove whitespace errors.
- [ ] If any gate fails, return to its owning red-green task, diagnose, add/adjust
  the narrow regression test and repeat the full sequence. Do not weaken a gate.

## Task 6.3 — Sync and prove the exact Start of The Road build

The developer explicitly selected `Start of The Road`, not `plugin-dev`, for this
smoke. Never assume another agent's current installed build belongs to this branch.

- [ ] Record the exact source commit with `git rev-parse HEAD` and ensure the
  worktree is clean except permitted uncommitted test fixes before building.
- [ ] Run `pnpm run build:plugin` immediately before copying artifacts.
- [ ] Ensure the target directory exists, then copy only the plugin artifacts:

```powershell
$vmTarget = 'C:\Users\vic_A\My Drive\Start of The Road\.obsidian\plugins\vaultman'
New-Item -ItemType Directory -Force -Path $vmTarget | Out-Null
Copy-Item -LiteralPath '.\main.js' -Destination (Join-Path $vmTarget 'main.js') -Force
Copy-Item -LiteralPath '.\styles.css' -Destination (Join-Path $vmTarget 'styles.css') -Force
Copy-Item -LiteralPath '.\manifest.json' -Destination (Join-Path $vmTarget 'manifest.json') -Force
```

- [ ] Compare SHA-256 hashes and require every pair to match:

```powershell
$vmTarget = 'C:\Users\vic_A\My Drive\Start of The Road\.obsidian\plugins\vaultman'
'main.js','styles.css','manifest.json' | ForEach-Object {
  $sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $PWD $_)).Hash
  $targetHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $vmTarget $_)).Hash
  [pscustomobject]@{ File = $_; Source = $sourceHash; Target = $targetHash; Match = $sourceHash -eq $targetHash }
}
```

- [ ] Abort smoke if any `Match` is false. Rebuild and recopy; do not rationalize
  the mismatch as caching.
- [ ] Reload the Vaultman plugin in that vault and confirm its manifest version and
  recorded source commit/build timestamp in the smoke log before interaction.

## Task 6.4 — Execute and record the live acceptance matrix

Create an execution record beside this plan containing commit, artifact hashes,
Obsidian version, theme, platform mode, frame width and pass/fail evidence.

- [ ] Provider liveness: in instance A repeat Statistics -> Files, Props, Tags,
  Content/Text, Snippets and Plugins; provider menu, toolbar and body must update
  every time. Instance B must remain unchanged.
- [ ] Search wide: open Search, verify one square Search ActionNode with Core
  focused/primary indication, no duplicate magnifier, and all configured trailing
  actions inside the box. It closes only on a second Search action.
- [ ] Search narrow: shrink until SearchControl occupies one full-width second row.
  ToolCase stays on row one; no action or search child creates a third item/row.
- [ ] Condensed providers: with search open, verify Files, Content/Text and
  Statistics put the correct overflow actions in one ToolCase without losing
  Reveal/Collapse/Filters/Queue or self-ordering Statistics incorrectly.
- [ ] Themes desktop/mobile: repeat toolbar/search anatomy in Default, Baseline and
  Velocity. Compare to Core Files; native gradient and vertical alignment must be
  inherited, including `is-mobile=on`.
- [ ] Selection Tree: all providers, nested on/off and start/end positions. Verify
  checkboxes before caret at start, no flat chevron gap, live repaint and Shift
  range across off-screen rows.
- [ ] Selection Table: checkbox is a centered real first/final column per row.
  Context menu on one selected/invoked node names and targets the entire set.
- [ ] Selection Cards: every card owns its corner checkbox; no frame-level floating
  checkbox. Repeat batch context menu and Shift range where ordering applies.
- [ ] Props: nested on includes empty values; nested off shows `property: value`;
  All types is default. Format off is plain; Format on has working checkbox/date/
  datetime widgets and each queues exactly one Rename operation.
- [ ] Conflicts: tooltip states the reason, no yellow row/card border, and hiding
  visual warnings does not unblock incompatible operations.
- [ ] File-count: visible/sortable only for folders in nested Tree and absent in
  nested-off/Table/Cards/fixedFolders sort menu; files remain Name ordered.
- [ ] By badges: pending delete/rename/move/convert, conflicts and include/exclude
  filters group first with stable secondary order in every provider.
- [ ] Mobile safety: toolbar remains recoverable regardless of saved desktop value;
  left-to-right swipe on node body opens its existing tooltip while controls,
  scroll, long press and drag keep their native behavior.
- [ ] Placement: `Open Vaultman` creates the configured explicit left or right
  sidebar leaf; a migrated legacy `sidebar` value opens left.
- [ ] Menu spam: repeated same toolbar action toggles one menu; different action
  replaces it; provider change/destroy leaves no orphan menu.
- [ ] Responsiveness: provider, nested, Cells, sort and selection respond by the
  next frame. If a visible near-one-second stall remains, capture a performance
  profile and return to diagnosis; do not close U121-003 on subjective improvement.

## Task 6.5 — Review, final code commit and developer acceptance

- [ ] Use `requesting-code-review` against the approved spec and this plan. Resolve
  every correctness finding or document why it is outside the locked scope.
- [ ] Run `verification-before-completion`; repeat `pnpm run verify`, exact build,
  hashes and any smoke scenario touched by review fixes.
- [ ] Stage only code/tests/build-source files, never `.agents/`, and create the
  planned final code commit if task 6.1 was not already committed.
- [ ] Append the complete execution record and local docs commit separately.
- [ ] Ask the developer to accept the exact-build smoke result.
- [ ] Only after that acceptance may the issue record be marked complete. Still do
  not push, merge, tag, release or close GitHub under this plan without a separate
  explicit request.

