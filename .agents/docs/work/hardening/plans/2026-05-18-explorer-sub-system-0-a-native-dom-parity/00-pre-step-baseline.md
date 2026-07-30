---
title: 00 — Pre-step baseline
type: plan-task
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 00 — Pre-step baseline

Capture pre-0-A state so that every C5/C6/C8/C9 DOM-diffing test has a known reference. No code changes in this step. Log artifacts to `baseline-log.md` in this plan folder for later comparison.

**Files:**
- Create: `.agents/docs/work/hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/baseline-log.md`

## Steps

- [ ] **Step 1: Confirm working tree clean (or scope dirty files)**

Run:

```powershell
git status --short --branch
```

Expected: branch `sandbox`. Capture any dirty files in `baseline-log.md` to preserve through 0-A work.

- [ ] **Step 2: Capture `pnpm verify` baseline**

Run:

```powershell
pnpm verify
```

Expected: PASS. Record in `baseline-log.md`:
- Unit test file count + test count
- Component test file count + test count
- Lint warnings + errors

- [ ] **Step 3: Capture current `panelExplorer.svelte` LOC and mode-switch line range**

Run:

```powershell
(Get-Content src/components/containers/panelExplorer.svelte | Measure-Object -Line).Lines
Select-String -Path src/components/containers/panelExplorer.svelte -Pattern "viewMode ===" -SimpleMatch
```

Expected: ≈1433 LOC; mode-switch lines in range 1205-1380 (per the inventory).
Record exact line numbers in `baseline-log.md`.

- [ ] **Step 4: Capture current native-class emission in view components**

Run:

```powershell
Select-String -Path src/components/views/*.svelte -Pattern "class:nav-file|class:tree-item|class:nav-file-title" -SimpleMatch
```

Expected: hits in `viewTree.svelte` (`tree-item*`), `ViewNodeTable.svelte` (`nav-file`, `nav-file-title`), `ViewNodeGrid.svelte` (`nav-file`, `nav-file-title`), `ViewNodeCards.svelte` (`nav-file`, `nav-file-title`).
Record line numbers per file in `baseline-log.md`.

- [ ] **Step 5: Capture btnMultiSelection occurrences (pre-rename baseline)**

Run:

```powershell
Select-String -Path src,test,.agents/docs -Pattern "btnMultiSelection" -SimpleMatch -Recurse
```

Expected: zero hits in `src/` and `test/`. Hits in `.agents/docs/` are documentation references in 0-B's spec folder. Record all occurrences in `baseline-log.md` for C7 rename audit.

- [ ] **Step 6: Capture current `EXPLORER_PLATFORM_VIEW_MODES` consumers**

Run:

```powershell
Select-String -Path src,test -Pattern "EXPLORER_PLATFORM_VIEW_MODES" -SimpleMatch -Recurse
```

Record consumer files in `baseline-log.md`. C7 audits them for refactor through `viewHost.selectableModes`.

- [ ] **Step 7: Capture pnpm smoke:scroll baseline per view**

Run:

```powershell
pnpm smoke:scroll -- --view=tree --jumps=100
pnpm smoke:scroll -- --view=list --jumps=100
pnpm smoke:scroll -- --view=table --jumps=100
pnpm smoke:scroll -- --view=grid --jumps=100
pnpm smoke:scroll -- --view=cards --jumps=100
```

Expected per view: `blankFrames=0`, `maxBlank=0ms`, `dev:errors` clean.
Record `maxDelay` per view in `baseline-log.md`. (Current observed:
Tree 108ms, List 258ms, Table 1312ms, Grid 600ms, Cards 24ms.)

- [ ] **Step 8: Capture preset toggle baseline (live `plugin-dev`)**

Run via Obsidian CLI:

```powershell
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev eval code="document.querySelectorAll('.vm-tree-virtual-row').length"
```

Record row count + `dev:errors` output in `baseline-log.md`.

- [ ] **Step 9: Commit baseline log only**

Run:

```powershell
git add .agents/docs/work/hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/baseline-log.md
git commit -m "docs(0-A): record pre-0-A baseline log

Captures pnpm verify counts, view-component class emission, btnNodeElementsVisibility
callsite inventory, EXPLORER_PLATFORM_VIEW_MODES consumers, per-view scroll
smoke maxDelay, and live plugin-dev row count baseline for downstream
0-A commit verification."
```

## Verification

`baseline-log.md` exists and contains the 8 captured artifacts. No source files modified in this step. `git status --short` shows only the new baseline log.
