---
title: Plan — PlatformAdapter + Fragility Registry (wave 1, lane B)
type: plan
status: in-progress
parent: "[[docs/work/hardening/specs/2026-06-12-wave-1-specs/02-platform-adapter|Wave 1 spec — PlatformAdapter]]"
created: 2026-06-13T00:00:00
updated: 2026-06-13T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/plan
  - umbrella-v2/wave-1
  - lane/platform-adapter
---

# Plan — PlatformAdapter + Fragility Registry

Worktree `umbrella-v2/wave-1-pa` (sandbox HEAD `de4e29b`). Implements ADR 0004; the
`revert` path is the ADR 0011 `serviceUnload` contract. Lane B is parallelizable; the
hard seam with lane A (Q4 providers) is the native-binding consolidation — see §Seams.

## 0. Ground truth from the worktree (pre-read findings)

- **No `NativeSearchAdapter` exists in the sandbox line.** It is a stable-1.1.1 feature
  (Core Search DOM scraping) never ported to sandbox. So this lane *creates* the
  exemplary adapter rather than wrapping existing code. Selectors are grounded in the
  real Obsidian Core Search DOM (`.search-result-container`, `.search-result-file-title`,
  `.search-result-file-match`) cross-checked against the web-lab reference.
- **`src/types/typeObsidian.ts` already centralizes private-API typings** and cites
  "ADR-004". It is the natural base for the adapter's probe surface (internalPlugins,
  commands, customCss, community plugins). The registry builds *on* it, not beside it.
- **Lifecycle pattern is Obsidian `Component` + `plugin.addChild(...)`.** Detachable
  services extend `Component`; `unload()` runs `onunload()` then unregisters DOM events /
  children. This IS the `serviceUnload`-revert path — adapters plug into it.
- **Two native-binding paths coexist** (ledger 07): `NativeSurfaceBindingService`
  (capture click/auxclick/mouseover, `extends Component`, wired in `main.ts`) and the
  older `attachNativeClickInterceptor` (`vm:open-node-note` CustomEvent, *not* wired in
  `main.ts` at HEAD). Consolidation = express both selector sets through the registry and
  retire the duplicate — but the selector→provider routing touches provider files (Q4).
- **Bases multi-select adapter — discrepancy RESOLVED (cheap verify, task 4):**
  `src/utils/basesMultiSelectOperations.ts` (177 lines; scrapes `.bases-tr.is-selected`,
  injects into the native menu with a fallback menu) is REAL but lives on the **stable
  line** (commit `e374367`, in tags `1.1.0-beta.2..4`, `1.1.1`, branch `dev`). It is **not
  an ancestor of sandbox HEAD `de4e29b`**, so it is absent from the 2.0 line. SDF-016 did
  land it — on stable, not sandbox. Not a doc over-claim; a line-divergence. It is itself
  a textbook fragile adapter and is queued as a registry migration (slice 4), not built
  from scratch here.

## 1. Adapter contract (the shape every fragile zone implements)

```
CapabilityResult = { ok: true } | { ok: false; reason: string }

FragilityRecord = {
  id: string;                       // stable adapter id, e.g. "native-search"
  title: string;                    // human label
  summary: string;                  // what private surface it touches & why
  privateSymbols: string[];         // T.G shape-test asserts these (minAppVersion gate)
  selectorSources: string[];        // DOM selectors scraped (drift surface)
  obsidianAssumptions: string[];    // version assumptions / undocumented behaviors
  fallback: string;                 // human description of degraded behavior
  mobile: {                         // closes the is-phone gap inventory
    supported: 'yes' | 'no' | 'degraded' | 'unknown';
    notes: string;                  // hover-only/desktop-only flags, touch behavior
  };
}

PlatformAdapter = {
  id: string;                       // === fragility.id
  fragility: FragilityRecord;
  probe(ctx): CapabilityResult;     // pure-ish capability detection; never throws
  apply(ctx): void | Promise<void>; // install the patch / listeners (only if probe ok)
  revert(): void | Promise<void>;   // serviceUnload-revert; idempotent; DOM/state clean
  fallback?(ctx): void;             // optional degraded path when probe fails
}
```

`ctx` = `{ app, plugin, doc }`. `revert` must be idempotent and leave zero residue
(listeners removed, hover sources unregistered, injected nodes detached).

## 2. Fragility Registry (enumerable, probe-on-load, auto-disable-on-fail)

`PlatformAdapterRegistry`:

- `register(adapter)` — collect adapters at boot.
- `activate(ctx)` — for each adapter: run `probe`; if ok → `apply` (failures isolated in
  try/catch so one bad adapter cannot crash load); if not ok → record disabled + run
  optional `fallback`. Returns a result list.
- `deactivate()` — `revert` every *activated* adapter in reverse order; idempotent. This
  is what `serviceUnload` / the LUPA detach path calls (ADR 0011).
- `describe(): FragilityRecord[]` — runtime-enumerable snapshot (base of the future
  config-export, D-PSS-2: native-class index vs `app.css` lives here).
- `status(): { id, enabled, reason? }[]` — what probed ok vs auto-disabled.

The registry itself `extends Component` so `plugin.addChild(registry)` ties
`deactivate()` to plugin unload automatically; per-adapter optionality (serviceUnload-gate
per user) is a later flag-driven slice.

## 3. Slice breakdown (tracer-bullet vertical slices)

1. **Contract + registry + first adapter (THIS RUN).** Types in
   `src/platform/platformAdapter.ts`; registry in `src/platform/fragilityRegistry.ts`;
   `NativeSearchAdapter` in `src/platform/adapters/nativeSearchAdapter.ts` behind a
   `SearchEngine` seam interface (`src/platform/searchEngine.ts`). Unit tests:
   probe-failure → disabled + clean; apply→revert→DOM clean; registry isolates a throwing
   adapter; T.G shape-test asserts the private symbols. **Not yet wired into `main.ts`**
   (wiring is slice 5, after the contract review) to keep boot risk zero.
2. **Native-binding consolidation (adapter side only).** Wrap the
   `NativeSurfaceBindingService` selector sets + the legacy interceptor selectors as
   `FragilityRecord` selectorSources behind one `NativeBindingAdapter`. STOP at the
   selector→provider routing seam (filters/binding-note routing = Q4 providers). Express
   the registry record + probe + revert; leave the routing call as an injected
   dependency/stub. Report the seam.
3. **file-menu delegation adapter.** Adapt the existing `ContextMenuService` `file-menu`
   delegation + reentrancy suppression (`serviceCMenu.ts`) into a `FragilityRecord` (it
   reads `app.workspace.on('file-menu')` + curates native items — undocumented item
   shapes). Probe = event availability; revert = `offref`. Native-menu curation
   (`_removeNativeFileMoveActions`) is lane D's; only the delegation seam is recorded.
4. **Bases multi-select adapter (port from stable).** Port
   `basesMultiSelectOperations.ts` from `1.1.1` into the registry as
   `BasesMultiSelectAdapter` (selectorSources = `.bases-tr.is-selected` family; probe =
   Bases view present; fallback = no batch menu; mobile = degraded/unknown). This both
   recovers a lost stable feature and demonstrates the registry on a second real scraper.
   Touches modals (FileMove/Rename/PropertyManager) — verify those exist on sandbox before
   porting; if shapes diverged, RESHAPE not verbatim.
5. **Wire into `main.ts` + platform/mobile inventory doc.** `addChild(registry)`;
   `activate` on load after services exist; `is-phone`/`isMobile` detection util
   (`src/platform/platformProfile.ts`) documented + tested; deliver the hover-only /
   desktop-only feature inventory as a short umbrella doc (input to the dev `isDesktopOnly`
   decision — D open §8.7 ledger). Iconic + Linter bridges (ledger 07) recorded as
   registry entries.

Slices 2–5 are follow-ups; THIS RUN delivers slice 1 end-to-end + the verification.

## 4. Mobile-inventory deliverable (slice 5)

A short doc enumerating, per adapter/feature: `mobile.supported` + notes, plus the
hover-only interactions (native hover-link sources, drag guides) and desktop-only
assumptions. Output feeds the dev's `isDesktopOnly` flip/subset decision; the registry's
`describe()` is the machine-readable half of the same inventory.

## 5. Seams where this lane STOPS (coordination with Q4 / lane A & D)

- **Provider routing** (native-binding selector → filter/binding-note action): the adapter
  records selectors + probe + revert, but the *routing* into `filterService.addNode` /
  `nodeBindingService.bindOrCreate` stays an injected dependency. Do not deep-edit
  `providers/*` or `serviceFilter`/`serviceNodeBinding` internals — that is Q4.
- **Native menu curation** (`menu-curator`, `_removeNativeFileMoveActions`): lane D. This
  lane only records the `file-menu` *delegation* seam.
- **Hover-editor / floating-tiles patches**: out of scope (later wave); the contract is
  shaped to host them (apply/revert of `WorkspaceLeaf` monkey-patch).

## 6. Acceptance mapping (spec §5)

| Spec criterion | Slice | This run |
|---|---|---|
| Typed contract + ≥3 real adapters migrated | 1–4 | contract + 1 adapter (native search); 3 more queued |
| Registry enumerable at runtime w/ all ADR fields incl. mobile | 2 | `describe()` + full `FragilityRecord` incl. mobile ✓ |
| Probe-failure → feature disabled, plugin loads clean | 1 | unit-tested ✓ |
| serviceUnload-revert verified by test | 1 | apply→revert→clean unit test ✓ |
| T.G shape-tests in normal suite | 1 | private-symbol shape test ✓ |
| Platform inventory doc | 5 | queued |
| `pnpm run check` + lint + verify clean | 1 | check + focused tests this run |
