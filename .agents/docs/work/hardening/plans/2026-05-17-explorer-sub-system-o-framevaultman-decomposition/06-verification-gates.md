---
title: 06 — Verification gates (per-commit + final)
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|O plan]]"
created: 2026-05-17T00:00:00
updated: 2026-05-17T00:00:00
tags:
  - agent/plan
  - explorer/frame
  - explorer/refactor
  - agent/verification
---

# Verification Gates

Consolidates per-commit gates from shards 00-05 plus a final acceptance gate. Executors run **every gate listed below** before merging or handing off.

Gates exist at three levels:

- **Per-commit gates** — must pass before that commit's diff lands.
- **Per-suite gates** — full unit/component suite must remain green.
- **Final acceptance gate** — verifies the full O sub-system is complete.

---

## Per-commit gates

### Pre-step 0 — Baseline

| Gate | Command | Expected |
|---|---|---|
| Snapshot tests pass | `pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts` | 3 tests PASS |
| Helpers compile | `pnpm check` | 0 errors |
| Smoke baseline clean | `obsidian dev:errors vault=plugin-dev` | `No errors captured.` |
| LOC recorded | `wc -l src/components/frame/frameVaultman.svelte` | ≈ 866 lines |

### C1 — FrameNavigationService

| Gate | Command | Expected |
|---|---|---|
| POC verified | `pnpm exec vitest run --project component test/component/_helpers/bindablePoc.test.ts` | PASS (decision recorded in commit body) |
| Service tests pass | `pnpm exec vitest run --project component test/component/frameNavigationService.test.ts` | PASS — includes **strict T3 order** assertion |
| Baseline still green | `pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts` | 3 snapshots match |
| Pre-existing frame tests green | `pnpm exec vitest run --project component test/component/frameVaultmanRootClasses.test.ts test/component/frameFaintMultiWindow.test.ts test/component/frameDashboardAddons.test.ts` | All PASS |
| Type-check clean | `pnpm check` | 0 errors |
| Full gate | `pnpm verify` | PASS |
| Live smoke | `obsidian plugin:reload id=vaultman vault=plugin-dev && obsidian command id=vaultman:open-diff vault=plugin-dev && obsidian dev:errors vault=plugin-dev` | `No errors captured.` lands on ops + file_diff |
| LOC target | `wc -l src/components/frame/frameVaultman.svelte` | ≈ 720 (-146 from 866) |

### C2 — FramePopupsState

| Gate | Command | Expected |
|---|---|---|
| Popups tests pass | `pnpm exec vitest run --project component test/component/framePopupsState.test.ts` | PASS |
| Baseline still green | `pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts` | 3 snapshots match |
| C1 tests still green | `pnpm exec vitest run --project component test/component/frameNavigationService.test.ts` | PASS |
| Type-check clean | `pnpm check` | 0 errors |
| Full gate | `pnpm verify` | PASS |
| Live smoke: 4 popups | Manual: open + exercise scope / active-filters / search / move popups | All four behave identically to pre-C2 |
| Live smoke: dev:errors | `obsidian dev:errors vault=plugin-dev` | `No errors captured.` |
| LOC target | `wc -l src/components/frame/frameVaultman.svelte` | ≈ 640 (-80 from C1) |

### C3 — FrameNavbarShell

| Gate | Command | Expected |
|---|---|---|
| Shell tests pass | `pnpm exec vitest run --project component test/component/FrameNavbarShell.test.ts` | PASS |
| Reorder controller drawerOpen test | `pnpm exec vitest run --project component test/component/frameNavReorderController.test.ts` | PASS |
| Baseline still green (or documented diff) | `pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts` | 3 snapshots match (or commit body documents intentional diff) |
| Earlier commit tests still green | `pnpm exec vitest run --project component test/component/frameNavigationService.test.ts test/component/framePopupsState.test.ts` | PASS |
| Pre-existing frame tests green | (same as C1) | All PASS |
| Type-check clean | `pnpm check` | 0 errors |
| Full gate | `pnpm verify` | PASS |
| Live smoke: dock drawer + reorder | Manual: toggle drawer; long-press + drag a dock pill | Both work identically to pre-C3 |
| Live smoke: dock + top-tab nav | Manual: click each dock item; if `topTabItems.length > 0`, click each top tab | Navigation works; no flicker |
| Live smoke: islands | Manual: open queue island via FAB, click backdrop to close; repeat for filters island | Open + close work; backdrop class toggles |
| Live smoke: dev:errors | `obsidian dev:errors vault=plugin-dev` | `No errors captured.` |
| LOC target | `wc -l src/components/frame/frameVaultman.svelte` | ≈ 480 (-160 from C2) |

### C4 — FrameDashboardShell

| Gate | Command | Expected |
|---|---|---|
| Shell tests pass | `pnpm exec vitest run --project component test/component/FrameDashboardShell.test.ts` | PASS |
| Baseline still green (or documented diff) | `pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts` | 3 snapshots match (or documented) |
| Earlier commit tests still green | `pnpm exec vitest run --project component test/component/frameNavigationService.test.ts test/component/framePopupsState.test.ts test/component/FrameNavbarShell.test.ts` | PASS |
| Dashboard-specific pre-existing test green | `pnpm exec vitest run --project component test/component/frameDashboardAddons.test.ts` | PASS |
| Type-check clean | `pnpm check` | 0 errors |
| Full gate | `pnpm verify` | PASS |
| Live smoke: dashboard mode | Manual: resize wider to enter dashboard | 3 columns render; filter tab buttons in left column |
| Live smoke: pages-strip mode | Manual: resize narrower to exit dashboard | Pages-strip renders; dashboard returns nothing |
| Live smoke: threshold cross | Manual: resize back-and-forth 3-5 times | Clean transitions, no flicker, no orphan content |
| Live smoke: dashboard nav | Manual: in dashboard mode, click dock items + filters tab buttons | Center column swaps appropriately |
| Live smoke: dashboard popups | Manual: open scope / active-filters / search / move popups while in dashboard mode | All four work |
| Live smoke: dev:errors | `obsidian dev:errors vault=plugin-dev` | `No errors captured.` |
| LOC target | `wc -l src/components/frame/frameVaultman.svelte` | ≈ 370 (-110 from C3) |

### C5 — Frame cleanup

| Gate | Command | Expected |
|---|---|---|
| Intents test pass | `pnpm exec vitest run --project component test/component/frameVaultmanIntents.test.ts` | PASS (T3 round-trip + teardown identity check + T4 bind + context propagation) |
| All O tests pass | `pnpm exec vitest run --project component test/component/frame*.test.ts test/component/Frame*.test.ts` | All PASS |
| Baseline still green | `pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts` | 3 snapshots match |
| Full pre-existing test suite | `pnpm verify` | PASS |
| Type-check clean | `pnpm check` | 0 errors |
| Stale-symbol grep | `git grep -E "frameVaultman.*\.(openDiffView\|navigateTo\|enterBasesImportMode\|setScope\|attachFolderSuggest\|itemsForSurface)" -- src/ test/` | Zero matches in `src/`; matches in `test/` only for the new service test files |
| Live smoke: full regression | Manual per shard 05 task 5.4 (8-step checklist) | All scenarios clean |
| Live smoke: dev:errors final | `obsidian dev:errors vault=plugin-dev` | `No errors captured.` |
| LOC target | `wc -l src/components/frame/frameVaultman.svelte` | ≤ 360 |

---

## Per-suite gates (every commit must satisfy these)

These run as part of `pnpm verify` but are listed here for visibility:

| Gate | Command | Expected |
|---|---|---|
| Lint | `pnpm lint:fast` / `pnpm lint:full` | 0 errors (warnings tolerated; pre-existing baseline) |
| Type-check | `pnpm check` | 0 errors |
| Build | `pnpm run build` | succeeds; produces `dist/` artifacts |
| Unit tests | `pnpm test:unit` | All PASS |
| Component tests | `pnpm test:component` | All PASS |
| Whitespace check | `git diff --check` | Clean (warnings about LF/CRLF tolerated on Windows) |

---

## Final acceptance gate (post-C5)

Sub-system O is **only** complete when **every** of the following is green:

### Code

- [ ] `src/components/frame/frameNavigation.svelte.ts` exists, ~150 LOC, no `service` prefix.
- [ ] `src/components/frame/framePopups.svelte.ts` exists, ~120 LOC.
- [ ] `src/components/frame/FrameNavbarShell.svelte` exists, ~170 LOC.
- [ ] `src/components/frame/FrameDashboardShell.svelte` exists, ~115 LOC.
- [ ] `src/components/frame/frameVaultman.svelte` is ≤ 360 LOC.
- [ ] `src/components/frame/frameNavReorder.svelte.ts` has a new `drawerOpen = $state(false)` field (and only that change; existing methods untouched).
- [ ] No file under `src/components/frame/` has been deleted.
- [ ] `Dashboard3Column`, `OperationsPage`, `FiltersPage`, `StatisticsPage`, `NavbarDock`, `NavbarTabs`, `PopupOverlay`, `PopupIsland` have NOT been modified (zero git diff for these paths from the pre-O baseline).

### Context API

- [ ] `frameNavigation.svelte.ts` exports `FRAME_NAVIGATION_KEY` as a `Symbol`.
- [ ] `framePopups.svelte.ts` exports `FRAME_POPUPS_KEY` as a `Symbol`.
- [ ] `frameVaultman.svelte` calls `setContext(FRAME_NAVIGATION_KEY, nav)` and `setContext(FRAME_POPUPS_KEY, popups)` early in the script body.
- [ ] `FrameNavbarShell.svelte` and `FrameDashboardShell.svelte` call `getContext<FrameNavigationService>(FRAME_NAVIGATION_KEY)` with a runtime guard that throws on missing context.

### T3 / T4 preservation

- [ ] `plugin.openDiffViewHook` is a 3-line `$effect` in frame registering `() => nav.openDiffIntent()` with identity-check cleanup.
- [ ] `OperationsPage` consumers bind to `nav.toolsActiveTab` (via `bind:` or explicit prop + callback per C1 POC outcome).
- [ ] `frameNavigationService.test.ts` includes the **strict T3 order assertion** (closeQueueIsland → closeFiltersIsland → closePopup if open → set activePage='ops' → set toolsActiveTab='file_diff' → applyPageTransform(true)).
- [ ] `frameVaultmanIntents.test.ts` includes T3 mount/unmount identity-check assertion.

### Tests

- [ ] `test/component/frameVaultmanBaseline.test.ts` (3 snapshots) — green.
- [ ] `test/component/frameNavigationService.test.ts` — green; covers constructor, late-binding, all methods, T3 order, surface derivations, page-order validity effect.
- [ ] `test/component/framePopupsState.test.ts` — green; covers all 4 popups + onStatsDirty + FolderSuggest action contract.
- [ ] `test/component/FrameNavbarShell.test.ts` — green; covers context guard, conditional NavbarTabs, island backdrop, dock dispatch.
- [ ] `test/component/FrameDashboardShell.test.ts` — green; covers context guard, dashboardEnabled gating, 3 snippets.
- [ ] `test/component/frameVaultmanIntents.test.ts` — green; covers T3 round-trip + teardown + T4 bind + context propagation.
- [ ] `test/component/frameNavReorderController.test.ts` (added or appended in C3) — green for `drawerOpen` field.
- [ ] All pre-existing frame tests still green: `frameVaultmanRootClasses.test.ts`, `frameFaintMultiWindow.test.ts`, `frameDashboardAddons.test.ts`.

### Live `plugin-dev` smoke (final, post-C5)

Run the full regression smoke from shard 05 task 5.4:

- [ ] `obsidian plugin:reload id=vaultman vault=plugin-dev` succeeds.
- [ ] Page navigation `ops → filters → statistics → ops` works.
- [ ] `obsidian command id=vaultman:open-diff vault=plugin-dev` lands on ops + file_diff.
- [ ] All 4 popups (scope, active filters, search, move) open + exercise + close cleanly.
- [ ] Dock drawer toggle works.
- [ ] Dock page reorder persists across reload.
- [ ] Bases import mode enters + exits cleanly.
- [ ] Faint mode tracks active window in pop-out scenarios.
- [ ] Dashboard threshold-cross resize works both directions.
- [ ] `obsidian dev:errors vault=plugin-dev` → `No errors captured.`

### Commits

- [ ] 6 commits land in sequence on the canonical branch:
  1. `test(O): baseline DOM snapshots for frameVaultman`
  2. `feat(O): extract FrameNavigationService`
  3. `feat(O): extract FramePopupsState`
  4. `feat(O): extract FrameNavbarShell`
  5. `feat(O): extract FrameDashboardShell`
  6. `refactor(O): frame cleanup + T3/T4 integration test`
- [ ] Each commit independently revertible.
- [ ] No commit skips hooks (`--no-verify`).
- [ ] No commit pushed without explicit user request.

### Documentation

- [ ] Roadmap (`.agents/docs/work/roadmap-overview.md`) entry for **O** updated from 🟡 Spec'd to ✅ Done (after final acceptance).
- [ ] `current/status.md` updated to reflect O as completed Phase 0 sub-system.
- [ ] `current/handoff.md` updated with O completion + next Phase 0 step (0-A).

---

## Failure handling

If any gate fails:

1. **Do not advance to the next commit.** Each gate is a stop-the-line condition.
2. **Diagnose root cause.** Use the failing test output + the spec's risks (shard 09) to identify which risk materialized.
3. **Fix or revert.** Choose based on blast radius:
   - Small fix (a typo, a missed import) → fix in the current commit's working tree, re-run gate, recommit (amend allowed only if not pushed — this is a local-only branch).
   - Architectural mismatch (e.g., POC RED but plan assumed GREEN) → revert the in-progress commit, switch strategy per the documented fallback, re-attempt.
4. **Update plan if needed.** If the failure reveals a gap in this plan, edit the relevant shard before continuing. Don't accumulate undocumented workarounds.

The plan's structure is designed to keep failures local: each commit's revertibility is the safety net.

---

## Self-review checklist (executor — run BEFORE final acceptance)

1. **All 7 spec open items have explicit resolution in this plan's index.** ✓ (verified during plan authoring).
2. **POC outcome documented** in C1 commit body. (One of GREEN / RED per Task 1.1 Step 4.)
3. **No `viewList` references slip in** (`git grep "viewList" -- src/` should be unrelated to O; viewList is a separate 0-H concern).
4. **No `Service` / `State` suffix changes mid-O.** Spec O1 locked. If the executor renames mid-execution, this is a plan deviation requiring user signoff.
5. **5 commits land in order.** Pre-step + C1 + C2 + C3 + C4 + C5 = 6 commits total.
6. **Final LOC of `frameVaultman.svelte` ≤ 360.** The spec's stated target is ~350 with tolerance.
7. **Baseline snapshot file is committed** (pre-step 0). Lives at `test/component/__snapshots__/frameVaultmanBaseline.test.ts.snap`. If accidentally gitignored or skipped, the gate cannot be enforced — re-stage and amend pre-step 0.
8. **All four new modules under `src/components/frame/` have the spec-mandated naming**: lowercase-prefixed `.svelte.ts` for services, PascalCase `.svelte` for components.
