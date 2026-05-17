---
title: Risks and open items
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|O frameVaultman decomposition]]"
created: 2026-05-17T00:00:00
updated: 2026-05-17T00:00:00
tags:
  - agent/spec
  - explorer/frame
  - explorer/refactor
---

# Risks And Open Items

## Risks

### R1 — Visual parity drift from $effect / mount ordering

**Risk.** Decomposition changes the order in which $effects run,
ResizeObservers initialize, and `onMount` callbacks fire. Subtle
visual differences (initial render flicker, ResizeObserver init
timing, transitionend race conditions) can emerge that DOM
snapshots may not catch.

**Likelihood.** Medium. The most exposed surface is `bindDashboardMeasurement`
running on the frame's `.vm-view` root (still does after O), and
the `pageIndex → viewport.applyPageTransform` $effect moving into
`FrameNavigationService` (could fire at a different point in the
mount lifecycle).

**Mitigation.**
- Layer 4 live smoke after each commit (window resize, page navigate
  rapidly to trigger transition + reorder).
- Baseline DOM snapshot for each of the 3 representative states.
- Per-commit check: time the initial render visually and confirm
  no double-flash on first navigation.
- If drift emerges, the recovery path is to move the suspect
  $effect back into frame (lifecycle there) and let nav expose
  the dependencies as plain getters. C1 is reversible without
  blocking C2.

### R2 — `bind:` to runes class getter/setter (Svelte 5 capability)

**Risk.** Svelte 5's `bind:value={instance.field}` directive
requires that the binding target is a writable reactive
expression. For a class with `get field() / set field(v)` over a
private `$state`, the binding **should** work but is not heavily
documented in the Svelte 5 reference. If it does not work, T4
(`bind:activeTab={nav.toolsActiveTab}`) fails at compile or
runtime.

**Likelihood.** Low-medium. Svelte 5 documents class state +
`$state` in classes, but the explicit `bind:` to getter/setter
pair example is not in the primary docs. The pattern is
expected-to-work per the runes design.

**Mitigation.**
- **POC in C1:** before refactoring T4, write a 5-line test that
  binds `<input bind:value={instance.field} />` against a tiny
  test class with `$state` + get/set. If green, proceed. If red,
  switch strategy.
- **Fallback:** explicit prop + callback pair.

  ```svelte
  <OperationsPage
    {plugin} {icon}
    activeTab={nav.toolsActiveTab}
    onActiveTabChange={(v) => (nav.toolsActiveTab = v)}
  />
  ```

  `OperationsPage` already accepts both forms in Svelte 5 because
  `bind:activeTab` desugars to `{activeTab}` + `onActiveTabChange`
  callback. Switching to the explicit form requires zero changes
  to `OperationsPage`.
- **Document the verification** in the C1 commit message.

### R3 — Context API as a new pattern in the codebase

**Risk.** O introduces `setContext` / `getContext` for the first
time in `src/components/` and `src/services/`. Future agents
unfamiliar with context API may:

- Mount the shells outside frame (no setContext ancestor) and hit
  silent undefined-context bugs.
- Set the context with a different key (e.g., string key
  instead of Symbol).
- Mistype the generic on `getContext<T>` and lose type safety.

**Likelihood.** Medium-high once N and 0-A start running and new
agents touch the frame.

**Mitigation.**
- Document the pattern in `02-architecture.md` (already done).
- Each context key lives **co-located** with the class that
  sets it. Future authors look for `setContext` in the same file
  as the class, not a global key registry.
- Add a runtime guard in shell `<script>` blocks:

  ```ts
  const nav = getContext<FrameNavigationService>(FRAME_NAVIGATION_KEY);
  if (!nav) throw new Error('FrameNavbarShell requires FRAME_NAVIGATION_KEY context. Mount inside frameVaultman.');
  ```

  This raises a clear error at mount time instead of cascading
  silent failures.
- The unit tests for each shell explicitly assert the
  context-missing case to lock in the error contract.

### R4 — T3 / T4 preservation: bit-for-bit equivalence

**Risk.** `openDiffIntent()` must execute the same side-effects in
the same order as the current inline `openDiffView()`. Any
reordering (e.g., setting `activePage` before closing islands
instead of after) can change visual transitions, leak state, or
trigger a different intermediate render.

**Likelihood.** Low if the test-first discipline is followed
(`frameNavigationService.test.ts` asserts the call order
explicitly). High if the test is added after the fact.

**Mitigation.**
- The `openDiffIntent` order assertion test in
  `frameNavigationService.test.ts` is **mandatory** before the
  C1 implementation. Tests fail with the current frame's
  `openDiffView` extracted verbatim into the new method;
  implementation tweaks the method until green.
- The current `openDiffView` is 6 lines. Each line maps 1:1 to a
  test assertion. The mapping is documented in shard 03 with the
  exact expected sequence.

### R5 — Stats counter split asymmetry

**Risk.** `selectedCount` / `queuedCount` / `filterRuleCount` /
`addOpCount` stay inline in frame, but every other navigation /
popup concern moves to a service. Future agents may try to "fix
the asymmetry" by moving the counters to a service, which
requires changing FiltersPage (downstream).

**Likelihood.** Low — the asymmetry is documented in the spec
and the constraints prevent it.

**Mitigation.**
- The non-extraction is **explicit** in shard 01 + shard 03 with
  rationale ("`selectedCount` is bind:-ed from FiltersPage,
  downstream changes prohibited").
- A follow-up backlog entry can capture the future option: if
  FiltersPage is itself decomposed (a future sub-system), the
  counters can move into a service then. Not in O.

### R6 — Larger PR review surface

**Risk.** O is 5 commits + 4 new files + ~500 LOC reorganized.
Without pixel-screenshot tooling, reviewer confidence depends on
the DOM snapshot discipline + live smoke. A rushed review may
miss subtle drift.

**Likelihood.** Medium.

**Mitigation.**
- Each commit reviewable independently. Reviewer can assess C1
  on its own without needing to read C2-C5.
- The 5-commit sequence is **strictly serial** — no parallelism
  needed. Reviewer can land C1, run live smoke, land C2, repeat.
- C5 (cleanup) is **optional**. If C1-C4 are accepted and the
  frame is at ~370 LOC, the cleanup can be a follow-on PR.

### R7 — Sub-system N (SCSS-to-UnoCSS) collision

**Risk.** N will rewrite many SCSS files. The 4 new modules in O
contain SCSS scoping (carried over from `frameVaultman.svelte`'s
existing styles). If N starts before O lands, both sub-systems
modify the same files; if O starts before N, the SCSS scoping
in the new shells later needs UnoCSS migration.

**Likelihood.** Low — build order `0-B → O → N` is locked. If
the order changes, this risk materializes.

**Mitigation.**
- Keep the build order. O runs before N.
- New code (inside extracted modules, only) prefers UnoCSS over
  SCSS during extraction. Existing SCSS that moves with the
  extraction is unchanged; N migrates it later.
- The 4 new modules are designed to absorb N's migration cleanly
  (small file, focused scope, easy to convert to UnoCSS class
  attributes).

### R8 — `nav.viewport` / `nav.navReorder` late-binding fragility

**Risk.** `FrameNavigationService.attachViewport` is called after
construction. If the frame's script body forgets to call attach
(or calls it after a getter access), the getter throws. This is
a class of bug that doesn't show up until the runtime path
exercises it.

**Likelihood.** Low. The attach calls are co-located in frame
script body with the construction; the order is enforced by the
sequence "nav → viewport → attachViewport → navReorder →
attachNavReorder → setContext".

**Mitigation.**
- The unit test for `frameNavigationService.test.ts` covers the
  "before attach" branch: `nav.viewport` throws if not attached.
- The frame test (`frameVaultmanIntents.test.ts`) mounts the full
  frame and verifies the attach chain executes correctly.
- Alternative considered + rejected: combine construction +
  attach into a single factory function
  (`createFrameNavigationService(plugin, overlays)` returns the
  service with all deps wired). Rejected because frame still needs
  the individual references (`viewport`, `navReorder`) for other
  consumers.

## Open items

### O1 — Naming convention final check

The spec uses `frameNavigation.svelte.ts` (no `service` prefix) and
`FrameNavigationService` (with `Service` suffix on the class name).
The class name matches existing patterns (`FrameOverlayController`,
`FrameViewportController`, `FrameNavReorderController`) which all
use `Controller` suffix. Should the new class use `Controller`
instead of `Service` for consistency?

**Provisional answer:** keep `Service` suffix because the runes
class is a state container + intent dispatcher, not a controller
of UI behavior. The existing controllers wrap behavior on a DOM
element or transition lifecycle; the navigation service is purer
state + methods. Decide during plan or impl review.

Same question for `FramePopupsState`: is `State` the right suffix?
Could be `FramePopupsController` for consistency. Provisional
answer: `State` is more accurate (the class is primarily a state
container with mutation methods; it doesn't drive a controller-
like lifecycle).

### O2 — Filters search routing effect placement

Shard 03 recommends keeping the filters-search routing $effect in
frame (because it consumes frame-only state for `fileList` /
`propExplorer` / `tagsExplorer`). The alternative (move to service
with getter accessors) is also valid. The plan-time decision can
pick either based on whether the constructor surface should stay
minimal.

### O3 — Stats counter `addOpCount` source

Today `addOpCount` is `$derived` from
`plugin.queueService.listTransactions()`. It depends on the queue's
event subscription firing `updateStats()`. In O, the queue
subscription stays in `onMount` (frame), and `addOpCount` stays
inline. If `FramePopupsState`'s `deleteFilterRule` callback fires
`onStatsDirty`, it should also re-trigger `addOpCount` reactivity.

**Check during impl:** does `addOpCount` re-evaluate when
`updateStats` runs? It should, because `updateStats` writes
`queuedCount` and `filterRuleCount` which are tracked by other
derivations. `addOpCount` itself iterates `listTransactions`
which is a fresh read on each call. May need a manual reactivity
trigger (e.g., a `$state` "queue version" that increments on
queue events and is read by the `addOpCount` derivation).

### O4 — `detachedTabs` source

Today `let detachedTabs = $state<LeafDetachState>({})` in frame is
written by the subscription callback in `onMount`. With nav
proxying `plugin.leafDetachService.getState()`, the `detachedTabs`
$state in frame becomes redundant.

**Two shapes:**

- Keep `detachedTabs` in frame, pass to shell. (Current
  threading.)
- Drop the frame $state; shell reads `nav.detachedTabs`
  (proxied from `plugin.leafDetachService`).

**Recommendation:** drop the frame $state. The subscription
callback still fires `updateStats()` if needed, but the
`detachedTabs` state itself lives in `plugin.leafDetachService`
and nav proxies access.

### O5 — `dockDrawerOpen` move to `FrameNavReorderController`

Shard 05 proposes moving `dockDrawerOpen` from frame inline into
`FrameNavReorderController.drawerOpen`. This is a **minor change to
an existing module**. The brief said "Do not refactor existing
`frame/*.ts` helpers" — does adding a `drawerOpen` field count?

**Provisional answer:** yes, this is allowed because it's an
additive change (new public getter/setter) that doesn't change
existing behavior. The brief's intent is preventing scope creep,
not blocking colocation-driven additions to existing controllers.

If the user prefers strict no-touch, the fallback is keeping
`dockDrawerOpen` as a 7th frame-level $state and threading it to
the shell as an 8th prop.

### O6 — `bindDashboardMeasurement` placement

Shard 06 keeps `bindDashboardMeasurement` and the dashboardEnabled
derivation in frame (not in the shell) to preserve the
ResizeObserver target. This is the recommended shape. An
alternative (move the action into the shell and accept a wrapper
diff in non-dashboard mode) was rejected for visual parity.

If the user revisits this in plan/impl review, the trade-off is:
- **Stays in frame:** ResizeObserver target unchanged. Shell is
  a pure render concern.
- **Moves to shell:** shell becomes self-contained for dashboard
  concerns. Wrapper element diff in non-dashboard mode requires
  documentation.

### O7 — Pre-step 0 commit vs inline

Pre-step 0 (baseline capture) can be:

- **Inline with C1** — the C1 commit includes the baseline test
  file as well as the navigation extraction. Slightly larger
  commit but single PR.
- **Own commit** — pre-step 0 lands as `test(O): baseline DOM
  snapshot for frame`. C1 then references the snapshot in its
  own test. Cleaner separation.

**Recommendation:** own commit. Aligns with "small, reviewable
commits" principle.

## Out of scope (registered for follow-on)

These surfaced during the brainstorm but are not in O:

- **Sub-system O+1 — Stats counters service.** If a future
  sub-system also decomposes FiltersPage, the stats counters
  (`selectedCount`, `queuedCount`, `filterRuleCount`,
  `addOpCount`) can collapse into a small `frameStats.svelte.ts`
  service. Not in O.
- **Sub-system O+2 — Window focus binding service.** ~20 LOC
  cluster. If a future sub-system extracts it (e.g., to share
  with another component), the focus listeners + `windowFocused`
  setter on themeService become `frameFocusBinding.svelte.ts`.
  Not in O.
- **Pages-strip extraction (`FramePagesShell.svelte`).** The
  pages-strip branch stays inline in frame per shard 06. A future
  sub-system can extract it if needed; preset wiring for the
  pages-strip layout is not anticipated, so the extraction is
  low-priority.
- **`obsidian-web-lab` integration as a smoke target.** Saved as
  reference memory; useful for 0-A / N / 12 but not for O.
