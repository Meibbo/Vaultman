---
title: 12 — C12 flicker fix (scroll anti-pattern)
type: plan-task
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 12 — C12: Eliminate node-element hide/show flicker during scroll

User-reported: when scrolling, node elements (icon/label/detail/badges) hide and re-show, an anti-pattern. Root cause unknown today. This commit begins with systematic-debugging (reproduce → locate → diagnose) and only then patches. The patch is scoped to render gating; the scroll-idle deferral mechanism (a recent stability investment) is NOT regressed unless it IS the root cause, in which case the implementing agent escalates before patching.

**Files:** The root-cause module is identified during Step 3 (locate phase) and patched in Step 7. The candidate inspection list is fixed up front:

- Modify one of these candidates (whichever locate phase identifies as the cause):
  - `src/services/serviceExplorerScrollGeometry.ts`
  - `src/services/serviceNodeRowMeasure.ts`
  - `src/services/serviceNodeRowStyle.ts`
  - `src/components/views/ViewNodeTable.svelte` (scroll-idle guardrail)
  - `src/components/views/ViewNodeGrid.svelte` (scroll-idle guardrail)
- Modify: `scripts/run-explorer-scroll-smoke.mjs` (add strict-flicker assertion + CLI flag)
- Modify: `src/dev/perfProbe.ts` (extend probe to report per-row child presence, if not already supported)
- Create: `test/integration/scroll-flicker.test.ts` (frame-level assertion, optional if harness extension covers it)

## Steps

- [ ] **Step 1: Invoke systematic-debugging skill** (REQUIRED)

The implementing agent must invoke the `superpowers:systematic-debugging`
skill BEFORE any code change. This step is non-skippable.

- [ ] **Step 2: Reproduce phase**

Run:

```powershell
pnpm run build
obsidian plugin:reload id=vaultman vault=plugin-dev
obsidian command id=vaultman:open vault=plugin-dev
# Set up a vault with many nodes (≥1000). If plugin-dev does not have one,
# generate a synthetic dataset using:
obsidian eval code="plugin.testHooks?.seedSyntheticNodes?.(2000)" vault=plugin-dev
# Switch to a view with badges + media (e.g., cards under vaultman with media toggled on)
obsidian eval code="plugin.themeService.setPreset('vaultman')" vault=plugin-dev
# Toggle media on via the submenu
obsidian eval code="/* viewHost.toggleElement('media') via DOM click on the media checkbox */" vault=plugin-dev
# Scroll rapidly with wheel events:
obsidian eval code="(function(){const c=document.querySelector('.vm-view-host-container .vm-cards-virtual-scroll, .vm-node-card-scroll'); if(!c) return; let i=0; const id=setInterval(()=>{c.scrollTop+=200; if(++i>50) clearInterval(id);}, 16);})()" vault=plugin-dev
# Visually observe: do icons/labels/badges briefly disappear during scroll?
```

If reproduction succeeds, capture:
- Which view modes exhibit the flicker (likely Table, Grid, Cards per
  the scroll-idle deferral pass; possibly all).
- Frame timing when elements disappear (use Chrome DevTools Performance
  recording).
- Whether the flicker only occurs during ACTIVE scroll or also briefly
  after scroll stops.

If reproduction fails, the synthetic smoke harness does not exercise the
user-observed scenario. Mark this as a known limitation, document in
commit message, and move on with the assertion-only patch (which is
still useful as a regression guard).

- [ ] **Step 3: Locate phase**

Inspect, in priority order:

1. `src/services/serviceExplorerScrollGeometry.ts` — does the geometry
   coordinator suspend any render flag during active scroll?
2. `src/services/serviceNodeRowMeasure.ts` — does row measurement defer
   children render? Check for any `if (isActivelyScrolling) return earlyEmpty`
   pattern.
3. `src/services/serviceNodeRowStyle.ts` — style application gate; does
   it return null/empty during scroll?
4. View components' scroll-idle guardrails added during the 2026-05-16
   variable-scroll-repair pass. Search:
   ```
   pnpm exec rg "scroll-idle|scrollIdle|isActivelyScrolling|deferUntilIdle" src/
   ```

For each candidate, read the relevant code and form a hypothesis: "if X
is the cause, when X is bypassed/changed, the flicker stops".

Test each hypothesis MINIMALLY (e.g., temporarily disable the candidate
in a scratch branch) and observe whether the flicker disappears. The
first hypothesis that eliminates the flicker is the root cause.

- [ ] **Step 4: Diagnose decision**

If the root cause is in the scroll-idle deferral pass (R-protected
investment): **escalate to user** before patching. Possible safe
alternatives:

- Defer ONLY the virtualizer resizing, not the children render.
- Render row container WITH children synchronously at row mount; only
  defer subsequent measurement.
- Cache the last-known children DOM snapshot when entering active scroll;
  reuse it instead of returning empty.

If the root cause is elsewhere (a non-deferral render gate that returns
early for cosmetic reasons): patch directly without escalation.

- [ ] **Step 5: Write failing test for the flicker assertion**

Either extend `scripts/run-explorer-scroll-smoke.mjs` with a frame-level
assertion, or add `test/integration/scroll-flicker.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

describe('scroll-flicker assertion', () => {
  it('no frame during scroll burst has a row container with empty children', async () => {
    // Set up: scroll harness, capture frames, run a scroll burst.
    // Assertion: for every visible row in every frame, row.children.length > 0.
    // (Implementation depends on the existing smoke harness's frame capture API.)
  });
});
```

Refine the assertion's exact shape based on what `src/dev/perfProbe.ts`
exposes. If the harness today only reports `blankFrames=0` style aggregate
metrics, extend it minimally to report per-row child presence.

- [ ] **Step 6: Run failing test to confirm flicker reproduces in test**

```powershell
pnpm smoke:scroll -- --view=cards --jumps=100 --strict-flicker
```

(Add `--strict-flicker` flag to the runner.) If the test does not
reproduce the flicker in the synthetic harness, log this and move on.
Manual repro in plugin-dev is the alternative gate.

- [ ] **Step 7: Apply the patch**

Based on Step 3-4 diagnosis, modify the single relevant file. Patch
must NOT touch:
- `serviceDnd`, `serviceManualDnd`, dnd-kit
- The bindable / context distribution chain in ViewHost
- The mask service or contract

Patch SHOULD scope to: the render gate causing children to disappear.

- [ ] **Step 8: Run flicker assertion test to verify PASS**

```powershell
pnpm smoke:scroll -- --view=cards --jumps=100 --strict-flicker
pnpm smoke:scroll -- --view=table --jumps=100 --strict-flicker
pnpm smoke:scroll -- --view=tree --jumps=100 --strict-flicker
pnpm smoke:scroll -- --view=grid --jumps=100 --strict-flicker
pnpm smoke:scroll -- --view=list --jumps=100 --strict-flicker
```

Expected per view: no flicker frames detected. Existing perf gates
preserved (blankFrames=0, maxBlank=0ms).

- [ ] **Step 9: Visual smoke on plugin-dev**

Re-run the repro from Step 2. Confirm the flicker is gone visually.

- [ ] **Step 10: Run full `pnpm verify`**

```powershell
pnpm verify
```

Expected: PASS. No regression in any earlier 0-A gate.

- [ ] **Step 11: Commit**

Patch is minimal. Commit message documents the root cause clearly:

```powershell
git add <only the patched files>
git commit -m "fix(0-A): eliminate node-element hide/show flicker during scroll

Root cause: [exact module + line range identified during locate phase].
[1-2 sentence explanation of why the pre-patch code suspended children
render and why the new code does not.]

Patch scope: single render-gate change. serviceDnd, serviceManualDnd,
dnd-kit, ViewHost, NodeElementMask service, contract all unchanged.

Verification:
- Strict flicker assertion added to smoke harness; passes for tree,
  list, table, grid, cards under 100-jump synthetic burst.
- Existing perf gates preserved: blankFrames=0, maxBlank=0ms across all
  5 views.
- Manual plugin-dev repro (cards mode + media slot on + rapid wheel
  scroll over 2000-node dataset): flicker absent.
- dev:errors: No errors captured."
```

## Verification gates

- Flicker assertion passes for all 5 views.
- Existing perf gates preserved.
- `pnpm verify` PASS.
- Visual manual smoke confirms flicker gone.
- Patch scope localized to a single module.

## Risk R4 escalation

If during Step 3 the root cause is identified as the scroll-idle deferral
mechanism added by the 2026-05-16 variable-scroll-repair pass: PAUSE and
escalate to user before patching. Present the alternatives from Step 4
and let user decide which trade-off to take.

## Limitation

If the synthetic smoke harness cannot reproduce the flicker (because
jump-cheat does not exercise real user scroll patterns), the strict
assertion still serves as a regression guard for whatever the harness
CAN exercise. Comprehensive adversarial scroll coverage is owned by
Sub-system 0-A.S, not this commit.

## Rollback

`git revert <commit>` reverts the patch and the strict assertion. The
flicker returns; the prior 11 commits are unaffected.
