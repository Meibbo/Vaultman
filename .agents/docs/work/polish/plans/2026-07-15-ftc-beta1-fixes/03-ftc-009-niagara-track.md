---
title: FTC-009 — Joined Niagara track and deferred effects
type: plan
status: completed
created: 2026-07-15
updated: 2026-07-15
---

# FTC-009 — Joined Niagara track and deferred effects

**Goal:** make Niagara a bidirectional, shared action/index track; fix rail anchoring and plain styling; remove unfinished effect controls from beta UX.

**Architecture:** extract pure wave/shift math into `logicNiagaraTrack.ts`; let the component render stable action descriptors before glyph descriptors when joined; keep callbacks at the action boundary so pointer scrubbing changes geometry/navigation but never fires an action.

## Task 1 — Lock the proto curve and reversible shift as pure logic

**Files**

- Add `test/unit/logicNiagaraTrack.test.ts`
- Add `src/logic/logicNiagaraTrack.ts`

1. Write failing tests for:
   - proto sigma `Math.min(7, Math.max(3, count * 0.28))`;
   - Gaussian `exp(-(distance²)/(2*sigma²))`;
   - scale `1 + 0.5 * gaussian`;
   - perpendicular offset `direction * perpendicularPull * gaussian` (the case `perpendicularPull = 38` proves the proto coefficient is not replaced by a fixed component constant);
   - signed neighbour spread `7 * tanh(distance / 1.5) * gaussian`;
   - signed overflow before the first center and after the last center;
   - zero shift while the pointer is inside the center range;
   - reversal from positive to negative overflow with no retained high-water mark.
2. Run:

   ```powershell
   pnpm exec vitest run --config vitest.unit.config.mts test/unit/logicNiagaraTrack.test.ts
   ```

   Confirm RED because the module is absent.
3. Implement named pure exports with numeric arguments and no DOM dependency:

   ```ts
   niagaraSigma(count: number): number
   niagaraGaussian(distance: number, sigma: number): number
   niagaraNodeTransform(
     distance: number,
     count: number,
     direction: -1 | 1,
     perpendicularPull: number,
   ): {
     scale: number;
     perpendicular: number;
     spread: number;
   }
   niagaraTrackShift(pointer: number, firstCenter: number, lastCenter: number): number
   ```

4. Re-run the focused test and confirm GREEN.

## Task 2 — Build one safe joined interaction track

**Files**

- Modify `test/unit/floatingTocSource.test.ts`
- Modify `src/components/layout/floatingToc.svelte`
- Modify `src/VaultmanFrame.svelte`
- Modify `src/i18n/en.ts`
- Modify `src/i18n/es.ts`

1. Add failing source assertions for:
   - `FloatingTocActionId = 'close' | 'toggle-kind' | 'drill' | 'back'`;
   - stable action order close, toggle-kind, conditional drill, conditional back;
   - joined actions and glyphs sharing one track/ref array;
   - no `shiftHWM`/`Math.max(shiftHWM` state;
   - action entries never being passed to `onJump`;
   - drag suppression preventing a release click from invoking an action;
   - the label “Join action nodes to slide”.
2. Run the focused source test and confirm RED.
3. In the component, derive stable action descriptors. When `floatingTocNiagaraNodes` is false, render the existing separate actions widget. When true, render those descriptors immediately before glyph descriptors inside the same orientation track and register every entry in the same element/center array.
4. Replace component-local Gaussian constants with the pure proto-equivalent helpers.
   Apply scale, perpendicular offset, and spread to both action and glyph entries.
5. Replace high-water shift state with the signed result from `niagaraTrackShift` on every pointer sample. Recompute from current geometry so upward/leftward and downward/rightward movement are symmetric and return toward zero.
6. Gesture rules:
   - nearest glyph entry may call `onJump` only when its group differs from the last navigated group;
   - nearest action entry changes only wave/active geometry;
   - a pointer gesture crossing the drag threshold suppresses the subsequent action click;
   - a quick stationary tap invokes its action once;
   - close cannot fire while merely scrubbing across it.
7. Rename the setting copy from “Nodes join scrub” to “Join action nodes to slide”. Keep the stored key `floatingTocNiagaraNodes` unchanged.
8. Force deferred runtime effects at the frame boundary:

   ```ts
   namePill: false,
   glow: false,
   labelMode: 'off',
   ```

   Preserve dormant stored keys for patch-line repair without exposing them.
9. Run the Svelte autofixer and focused tests.

## Task 3 — Correct frame anchoring and complete plain styling

**Files**

- Modify `test/unit/floatingTocSource.test.ts`
- Modify `styles.css`
- Modify `src/components/layout/floatingToc.svelte`

1. Add failing CSS/source assertions that:
   - horizontal rails are centered in the frame;
   - bottom uses the frame's available lower edge and correct transform origin;
   - top uses the matching upper transform origin;
   - plain style targets both action entries and index glyph entries;
   - non-plain compact surfaces cover both entry types.
2. Confirm RED.
3. Keep the wrapper bounded by the Vaultman frame. Center horizontal tracks with flex alignment; anchor bottom to the available frame edge above the dock when shown and to the frame inset when the dock is off. Do not use viewport coordinates.
4. Give top/bottom mirrored transform origins so perpendicular wave movement grows into the frame.
5. Apply the compact surface/background selector uniformly to action and glyph entries.
   Under `.is-plain`, remove background, border, shadow, and backdrop treatment from both entry types while preserving hit targets.
6. Re-run focused tests, stylelint, and `git diff --check`.

## Task 4 — Remove deferred effect controls from beta Settings

**Files**

- Modify `test/unit/settingsLayoutSource.test.ts`
- Modify `src/VaultmanSettings.ts`

1. Add failing assertions that no Settings rows expose Name Pill, Scrub Glow, Name Cell, Name Reveal, or Name Letters, while the underlying type/default keys remain intact.
2. Remove those five rows only. Keep the visible sequence: enable, Niagara slide, plain style, rail position, glyph mode, Soft Scroll, Join action nodes to slide.
3. Run:

   ```powershell
   pnpm exec vitest run --config vitest.unit.config.mts test/unit/logicNiagaraTrack.test.ts test/unit/floatingTocSource.test.ts test/unit/settingsLayoutSource.test.ts
   pnpm run check
   pnpm run stylelint
   git diff --check
   ```

4. Commit code only:

   ```powershell
   git add src styles.css test
   git commit -m "fix(explorer): unify Niagara rail track"
   ```

## FTC-009 acceptance

- Joined mode uses one physical/interaction track for action and index nodes.
- Scrub is reversible in both directions and uses the exact proto Gaussian family.
- Scrubbing across actions cannot execute them; a tap still can.
- Bottom is centered at the frame edge, and top/bottom wave origins are mirrored.
- Plain style has the same meaning for action and indexed nodes.
- Five unfinished effect controls are absent and force-disabled in beta runtime.
