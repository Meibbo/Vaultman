---
title: 13 — Final verification gates
type: plan-task
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 13 — Final verification gates

After all 12 commits land, run the full aggregate verification. This step does NOT add any new code; it confirms the 0-A sub-system as a whole meets the spec's verification matrix (shard 10).

**Files:**
- No new code or test files in this step.
- Update: `baseline-log.md` (append post-0-A snapshot for comparison).

## Steps

- [x] **Step 1: Run full `pnpm verify`**

```powershell
pnpm verify
```

Expected: PASS.
- Unit: ≥ baseline test file count + new test files added across C1-C12
- Component: ≥ baseline + new files
- Lint: 0 errors, warnings only on pre-existing unrelated files

- [x] **Step 2: Run `pnpm run build` to confirm clean build**

```powershell
pnpm run build
```

Expected: PASS. `dist/build/` output generated. Synced to `plugin-dev` per existing post-build hook.

- [x] **Step 3: Run `git diff --check`**

```powershell
git diff --check
```

Expected: PASS (only LF-to-CRLF warnings allowed on Windows).

- [x] **Step 4: Confirm `serviceDnd`, `serviceManualDnd`, dnd-kit untouched**

```powershell
git log --oneline -- src/services/serviceDnd.ts src/services/serviceManualDnd.ts
git log --oneline -- "node_modules/@dnd-kit/*" 2>$null
```

Expected: no commits from 0-A author in this range touched these paths.
(0-A commits are scoped to the 12-commit set; verify none of them modified these.)

- [x] **Step 5: Confirm `btnMultiSelection` is fully renamed**

```powershell
Select-String -Path src,test -Pattern "btnMultiSelection" -SimpleMatch -Recurse
```

Expected: zero hits in `src/` and `test/`.

```powershell
Select-String -Path .agents/docs -Pattern "btnMultiSelection" -SimpleMatch -Recurse
```

Expected: only archeological annotation hits (lines containing "renamed from btnMultiSelection in 0-A" or equivalent).

- [x] **Step 6: Run per-view scroll smoke baseline comparison**

```powershell
pnpm smoke:scroll -- --view=tree --jumps=100
pnpm smoke:scroll -- --view=list --jumps=100
pnpm smoke:scroll -- --view=table --jumps=100
pnpm smoke:scroll -- --view=grid --jumps=100
pnpm smoke:scroll -- --view=cards --jumps=100
```

Per view: capture `blankFrames`, `blank>100ms`, `blank>250ms`, `maxBlank`, `maxDelay`. Append to `baseline-log.md` under a section "Post-0-A scroll smoke baseline".

Comparison to pre-0-A baseline (captured in step 00):
- `blankFrames=0` and `maxBlank=0ms` must be preserved.
- `maxDelay` per view may differ; record actuals. C12 flicker fix should not regress this; if it does, investigate.

- [x] **Step 7: Run Notebook Navigator comparison bridge**

```powershell
pnpm vitest run test/unit/performance/explorerNotebookNavigatorComparison.test.ts
```

Expected: PASS. Vaultman 50K projection median must remain faster than the NN list builder median (current: ~27ms vs ~61ms per status doc).

- [x] **Step 8: Live `plugin-dev` flow per spec shard 10**

```powershell
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open

# Preset toggle
obsidian vault=plugin-dev eval code="plugin.themeService.setPreset('native')"
obsidian vault=plugin-dev eval code="document.querySelectorAll('.vm-view-menu-mode').length"
# Expected: 1

obsidian vault=plugin-dev eval code="plugin.themeService.setPreset('vaultman')"
obsidian vault=plugin-dev eval code="document.querySelectorAll('.vm-view-menu-mode').length"
# Expected: 5

obsidian vault=plugin-dev eval code="document.querySelector('.vm-node-elements-toggle') !== null"
# Expected: true

# View-mode cycle
# (Iterate: tree, list, table, grid, cards — each via menu click or eval)
# Confirm each mounts without dev errors.

# btnNodeElementsVisibility toggle
# Click media checkbox in submenu, switch to cards view, observe .bases-cards-cover.

obsidian vault=plugin-dev dev:errors
```

Expected: `No errors captured.`

- [x] **Step 9: Update `baseline-log.md` with post-0-A snapshot**

Append a section to `baseline-log.md`:

```markdown
## Post-0-A baseline (2026-05-XX)

- `pnpm verify`: unit X files / Y tests; component A files / B tests; lint 0 errors.
- Per-view scroll smoke maxDelay: Tree X ms, List Y ms, Table Z ms, Grid W ms, Cards V ms.
- NN comparison: Vaultman P ms vs NN Q ms (Vaultman still ahead).
- `btnMultiSelection` callsites in `src/` and `test/`: 0.
- Live `plugin-dev`: view-mode menu = 5 under vaultman, 1 under native; submenu visible iff vaultman; no dev errors after full flow.
```

- [x] **Step 10: Commit the baseline update**

```powershell
git add .agents/docs/work/hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/baseline-log.md
git commit -m "docs(0-A): record post-0-A baseline log

Captures pnpm verify counts, per-view scroll maxDelay, NN comparison
medians, btnMultiSelection callsite count (0), and live plugin-dev menu
visibility per preset. Closes 0-A verification matrix per spec shard 10."
```

- [x] **Step 11: Update `.agents/docs/work/roadmap-overview.md` 0-A row**

Change line 41 from:

```
| **0-A** | Native-DOM parity + View Feature Contract + view-host extraction | 🟡 Spec drafted 2026-05-18; awaiting writing-plans handoff | [[docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/index|0-A spec]]; uses [[reference_obsidian_web_lab|obsidian-web-lab]] as native DOM reference (file-explorer + Bases + Outline tab vocab) |
```

To:

```
| **0-A** | Native-DOM parity + View Feature Contract + view-host extraction | ✅ Done | [[docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/index|0-A spec]] · [[docs/work/hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/index|0-A plan]] |
```

Commit:

```powershell
git add .agents/docs/work/roadmap-overview.md
git commit -m "docs(0-A): mark 0-A complete in roadmap-overview

Updates Phase 0 spine row 0-A from 🟡 drafted to ✅ done with link to
the executed implementation plan."
```

- [x] **Step 12: Update `.agents/docs/current/status.md` next action**

Change "Next Action" to reflect 0-A completion and queue Sub-system N (SCSS → UnoCSS migration) per the locked build order `0-H → 0-B → O → 0-A → N`. Or if 0-A.S brainstorm should run first, note that.

Commit alongside the roadmap update.

## Verification gates

- All 8 pre-merge gates green.
- `baseline-log.md` shows pre and post 0-A snapshots side by side.
- Roadmap and status docs reflect 0-A completion.

## Closeout note

Closed on 2026-05-20. `baseline-log.md` records the final `pnpm verify` pass, focused test gates, strict and non-strict live scroll smokes for all five selectable views, Notebook Navigator comparison bridge evidence, `btnMultiSelection`/DnD audit checks, and the `plugin-dev` preset/menu/dev-error gate.
The natural handoff commit for this closeout includes the baseline, roadmap, current status/handoff, and C12/C13 checklist updates.

## After this step

Sub-system 0-A is complete. Next track decisions per [[docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/11-risks-and-followups|spec shard 11 follow-ups]]:

- Sub-system N (SCSS → UnoCSS) — per locked build order.
- Sub-system 0-A.S — adversarial scroll harness + 3-plugin sequential perf comparison (parallel track).
- Polished preset rewrite session — user uploads source files, separate brainstorm distributes pieces to sub-system entries.
- Action Routing Contract — when needed.
- Provider Extensibility — when needed for Bases parity work.
