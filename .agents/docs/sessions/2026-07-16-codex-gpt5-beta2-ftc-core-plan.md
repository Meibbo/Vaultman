---
title: 1.2.0-beta.2 — Floating TOC core fixes implementation plan
type: agent-session-plan
status: complete
created: 2026-07-16T00:00:00
created_by: codex-gpt-5
tags: [agent/plan, release/1.2.0-beta.2, floating-toc]
---

# Floating TOC core fixes implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` to implement this plan task-by-task. Every behavior change follows RED → GREEN → REFACTOR.

**Goal:** Restore the prototype's rail-follow hysteresis in both directions and reject an explicit Floating TOC activation when the active explorer sort cannot be indexed.

**Architecture:** Keep the gesture policy as pure math in `logicNiagaraTrack.ts`; the Svelte component only supplies the current shift and DOM-derived base centers. Keep activation policy as a second pure function so the active frame can decide before mutating or persisting settings. Obsidian 1.12 compatibility remains unchanged.

**Tech stack:** TypeScript 5.8, Svelte 5 runes, Vitest 4, Obsidian 1.12 API.

---

## Locked behavior

1. Rail-follow is incremental over the *currently shifted* track span. After the rail follows one edge, reversing the held pointer keeps the rail fixed while the pointer scrubs all entries; the rail resumes only after the pointer crosses the opposite shifted edge.
2. The rule works for vertical and horizontal rails because it operates on one along-axis coordinate.
3. Releasing continues to reset `shift` to zero in `endScrub()`.
4. An explicit toolbar/index action that tries to turn the rail on with an incompatible active sort is rejected, does not persist `true`, and emits one translated `Notice`.
5. Turning the rail off is always allowed. The global Settings toggle remains a stored preference in this first slice; its page-level integration belongs to the compatible Settings-router plan.

## Adversarial review

- Do not restore proto's positive-only `shiftHWM`; that would break upward rail-follow.
- Do not derive hysteresis from pointer direction or timing. Comparing the pointer with the currently shifted span naturally supports repeated reversals and large pointer deltas.
- Do not multiply geometry by `devicePixelRatio`; density is a later token-based slice.
- Do not auto-disable a valid stored preference merely because the user temporarily changes sort. Reject only the explicit active-frame toggle here.
- Keep action nodes inside the same `trackEntryCount`; the opposite-edge barrier includes joined actions exactly as the current scrub track does.

### Task 1: RED — freeze bidirectional rail-follow semantics

**Files:**
- Modify: `test/unit/logicNiagaraTrack.test.ts`

- [ ] Replace the obsolete test `reverses immediately without retaining a high-water mark` with tests that call the existing function with the current shift as a fourth argument:

```ts
it('holds a downward rail shift while the pointer scrubs back through the track', () => {
  const shiftedDown = niagaraTrackShift(235, 100, 200, 0);
  expect(shiftedDown).toBe(35);
  expect(niagaraTrackShift(220, 100, 200, shiftedDown)).toBe(35);
  expect(niagaraTrackShift(150, 100, 200, shiftedDown)).toBe(35);
  expect(niagaraTrackShift(135, 100, 200, shiftedDown)).toBe(35);
});

it('resumes upward rail-follow only after crossing the opposite shifted edge', () => {
  const shiftedDown = niagaraTrackShift(235, 100, 200, 0);
  const shiftingBack = niagaraTrackShift(125, 100, 200, shiftedDown);
  expect(shiftingBack).toBe(25);
  expect(niagaraTrackShift(75, 100, 200, 0)).toBe(-25);
});

it('supports repeated reversals in one gesture', () => {
  const down = niagaraTrackShift(235, 100, 200, 0);
  const up = niagaraTrackShift(75, 100, 200, 0);
  expect(niagaraTrackShift(90, 100, 200, up)).toBe(-25);
  expect(niagaraTrackShift(185, 100, 200, up)).toBe(-15);
  expect(niagaraTrackShift(220, 100, 200, 0)).toBe(20);
  expect(down).toBe(35);
});
```

- [ ] Run `corepack pnpm run test:unit -- test/unit/logicNiagaraTrack.test.ts`.
- [ ] Confirm RED because `niagaraTrackShift` ignores/rejects the fourth argument and returns toward zero immediately.

### Task 2: GREEN — make shift relative to the shifted span

**Files:**
- Modify: `src/logic/logicNiagaraTrack.ts`
- Modify: `src/components/layout/floatingToc.svelte`
- Modify: `test/unit/floatingTocSource.test.ts`

- [ ] Change the pure function without changing its three-argument initial behavior:

```ts
export function niagaraTrackShift(
  pointerPosition: number,
  firstNodeCenter: number,
  lastNodeCenter: number,
  currentShift = 0,
): number {
  if (
    !Number.isFinite(pointerPosition) ||
    !Number.isFinite(firstNodeCenter) ||
    !Number.isFinite(lastNodeCenter) ||
    !Number.isFinite(currentShift)
  ) return 0;

  const start = Math.min(firstNodeCenter, lastNodeCenter) + currentShift;
  const end = Math.max(firstNodeCenter, lastNodeCenter) + currentShift;
  if (pointerPosition < start) return currentShift + pointerPosition - start;
  if (pointerPosition > end) return currentShift + pointerPosition - end;
  return currentShift;
}
```

- [ ] In `updateTrackShift()` pass the current reactive `shift` as argument four:

```ts
shift = niagaraTrackShift(constrainedAlong, firstCenter, lastCenter, shift);
```

- [ ] Replace the source-contract assertion about “no monotonic high-water mark” with one proving the current shift is supplied to the pure helper.
- [ ] Run the targeted Niagara and source tests; confirm GREEN.
- [ ] Run the Svelte autofixer on `src/components/layout/floatingToc.svelte`; accept only relevant corrections and rerun targeted tests.

### Task 3: RED — define activation rejection as pure policy

**Files:**
- Create: `test/unit/logicFloatingTocAvailability.test.ts`
- Create: `src/logic/logicFloatingTocAvailability.ts`

- [ ] Write the test first, importing a not-yet-existing `resolveFloatingTocToggle`:

```ts
describe('resolveFloatingTocToggle', () => {
  it('rejects enabling when the active panel sort is incompatible', () => {
    expect(resolveFloatingTocToggle(false, false)).toEqual({
      nextEnabled: false,
      rejection: 'incompatible-sort',
    });
  });

  it('allows enabling for an indexable sort', () => {
    expect(resolveFloatingTocToggle(false, true)).toEqual({
      nextEnabled: true,
      rejection: null,
    });
  });

  it('always allows disabling', () => {
    expect(resolveFloatingTocToggle(true, false)).toEqual({
      nextEnabled: false,
      rejection: null,
    });
  });
});
```

- [ ] Run the new test and confirm RED because the module does not exist.
- [ ] Add the minimal discriminated result type and implementation matching those three cases.
- [ ] Rerun and confirm GREEN.

### Task 4: Wire the active-frame warning

**Files:**
- Modify: `src/VaultmanFrame.svelte`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/es.ts`
- Modify: `test/unit/floatingTocSource.test.ts`

- [ ] Add failing source-contract assertions that `toggleFloatingToc()` calls `resolveFloatingTocToggle`, emits a translated `Notice` for `incompatible-sort`, and returns before persistence.
- [ ] Import the pure helper into `VaultmanFrame.svelte` and change `toggleFloatingToc()` to:

```ts
const decision = resolveFloatingTocToggle(
  floatingTocEnabled,
  activeFloatingTocPanel()?.isIndexableSort() === true,
);
if (decision.rejection === 'incompatible-sort') {
  new Notice(translate('floating_toc.incompatible_sort'));
  return;
}
floatingTocEnabled = decision.nextEnabled;
plugin.settings.floatingTocEnabled = decision.nextEnabled;
void plugin.saveData(plugin.settings);
```

- [ ] Add translations:

```ts
'floating_toc.incompatible_sort':
  'The index requires a name-based sort in the active explorer.',
```

```ts
'floating_toc.incompatible_sort':
  'El índice requiere un orden basado en nombre en el explorer activo.',
```

- [ ] Run targeted unit tests, Svelte autofixer, `corepack pnpm run check`, and `corepack pnpm run test:unit`.
- [ ] Commit only production/test files, never `.agents/`, as `fix: restore Niagara reversal and guard index activation`.

## Completion gate

- Targeted tests observed RED before implementation and GREEN afterward.
- Full unit suite and Svelte/TypeScript check pass.
- No visual, screenshot, mobile-emulation, or Obsidian smoke testing is performed by the agent.
- The developer remains responsible for interaction/visual validation.

## Completion record — 2026-07-16

Product work remains uncommitted in `C:\tmp\vaultman-v12-ftc001` on branch `v12/ftc-001`. The session expanded beyond the initial Floating TOC slice and completed the full beta.2 batch requested by the developer:

- Bidirectional Niagara reversal hysteresis using the currently shifted track.
- Incompatible-sort warning before explicitly enabling the Floating TOC.
- Responsive explorer/rail density, automatic Files toolbar condensation, and an optional reserved vertical rail lane.
- Floating TOC settings subpage under Style Config; Add-ons/Iconic and Developer Tools settings sections; Files hover-info settings subpage.
- Props/Values menu labels, multiselect node-type grouping in an L2 submenu, word-count sort, character counts, and persistent statistics-cache support.
- Active-filter highlight bubbling and long-press recursive tree expansion.
- Snippets and Plugins explorer tabs.
- Iconic custom file/folder/rule integration with compatibility-preserving disabled/absent/error fallbacks and configurable Files icon scope.
- Core-style Files gestures: Ctrl/Cmd and middle-click opening, Alt/Option individual selection, Shift range selection, selected-file native drag batches, binary-safe Make a copy, and canonical `file-explorer-context-menu` third-party menu source.
- Versioned Updates modal and `Clean Filters` rename.

### Verification evidence

- `corepack pnpm run verify`: exit 0.
- ESLint: exit 0.
- TypeScript plus Svelte check: 0 errors and 0 warnings.
- Svelte Prettier check: exit 0.
- Stylelint: exit 0.
- Production plugin build: exit 0.
- Vitest: 90 files passed; 447 tests passed.
- Regression scorecard: 17 checks passed.
- `git diff --check`: exit 0 (only expected LF/CRLF notices).
- `main.js`, `styles.css`, and `manifest.json` SHA-256 hashes match between the worktree and `C:\Users\vic_A\Desktop\plugin-dev\.obsidian\plugins\vaultman`.

### Deliberate boundaries and next action

- No visual, screenshot, mobile-emulation, or live Obsidian interaction testing was performed. The developer explicitly owns that validation.
- Static compatibility targets Obsidian 1.12.3 typings. The exact nested DOM of the core File Explorer and arbitrary snippets such as Fancy File Explorer Rainbow cannot be reproduced fully without weakening Vaultman's flat virtual rendering; only stable core classes/data-path hooks were added.
- Generic keyboard navigation and multi-file context-menu parity were not added;
  the documented Alt/Option, Shift, open, menu-source, and native drag contracts were prioritized.
- Package and manifest intentionally remain `1.2.0-beta.1`. Do not bump, tag, commit, push, or publish until the developer finishes visual beta testing and explicitly requests the beta.2 release operation.
- Room heartbeat/exit logging could not acquire `.git/vaultman-room/locks/room_20260621_025201_8756df.lock` (`EPERM`), so the shared `session-log.md` was deliberately left untouched rather than bypassing coordination. This session shard is the authoritative handoff.
