---
title: Plan — PlatformAdapter + Fragility Registry (wave 1, lane B)
type: plan
status: in-progress
parent: "[[docs/work/hardening/specs/2026-06-12-wave-1-specs/02-platform-adapter|Wave 1 spec — PlatformAdapter]]"
created: 2026-06-13T00:00:00
updated: 2026-06-13T00:00:00
created_by: claude-opus-4-8
updated_by: claude-fable-5
worktree: umbrella-v2/wave-1-pa
base: sandbox HEAD de4e29b
tags:
  - agent/plan
  - umbrella-v2/wave-1
  - lane/platform-adapter
---

# Plan — PlatformAdapter + Fragility Registry

Worktree `umbrella-v2/wave-1-pa` (sandbox HEAD `de4e29b`). Implements ADR 0004; the `revert` path is the ADR 0011 `serviceUnload` contract. Lane B is parallelizable; the hard seam with lane A (Q4 providers) is the native-binding consolidation — see §Seams.

> Coordinator note (claude-fable-5, 2026-06-13): plan recuperado del worktree de lane B.
> Slice 1 verificado (check + 28 focused tests) en `umbrella-v2/wave-1-pa`, working tree
> SIN commit; NO aterrizado a sandbox aún. Punto de reconciliación: el seam `SearchEngine`
> (`src/platform/searchEngine.ts`) es provisional — el tipo canónico lo define el tracer
> (lane C, D-C-1); el adapter de B lo implementa. Resolver al aterrizar/lanzar C.

## 0. Ground truth from the worktree (pre-read findings)

- **No `NativeSearchAdapter` exists in the sandbox line.** It is a stable-1.1.1 feature (Core Search DOM scraping) never ported to sandbox. So this lane *creates* the exemplary adapter. Selectors grounded in the real Obsidian Core Search DOM (`.search-result-container`, `.search-result-file-title`, `.search-result-file-match`) cross-checked against the web-lab reference.
- **`src/types/typeObsidian.ts` already centralizes private-API typings** and cites "ADR-004". Natural base for the adapter's probe surface (internalPlugins, commands, customCss, community plugins). The registry builds *on* it.
- **Lifecycle pattern is Obsidian `Component` + `plugin.addChild(...)`.** This IS the `serviceUnload`-revert path — adapters plug into it.
- **Two native-binding paths coexist** (ledger 07): `NativeSurfaceBindingService` (wired in `main.ts`) and the older `attachNativeClickInterceptor` (`vm:open-node-note` CustomEvent, NOT wired at HEAD). Consolidation = express both selector sets through the registry and retire the duplicate — but selector->provider routing touches provider files (Q4).
- **Bases multi-select adapter — discrepancy RESOLVED (cheap verify):**
  `src/utils/basesMultiSelectOperations.ts` (177 lines; scrapes `.bases-tr.is-selected`, injects native menu + fallback) is REAL but on the **stable line** (commit `e374367`, in `1.1.0-beta.2..4`, `1.1.1`, `dev`). NOT an ancestor of sandbox `de4e29b` -> absent from the 2.0 line. SDF-016 landed it on stable, not sandbox. Line-divergence, not over-claim.
  Queued as slice 4 (registry migration, not from scratch).

## 1. Adapter contract

```
CapabilityResult = { ok: true } | { ok: false; reason: string }
FragilityRecord = { id, title, summary, privateSymbols[], selectorSources[],
  obsidianAssumptions[], fallback, mobile: { supported: 'yes'|'no'|'degraded'|'unknown', notes } }
PlatformAdapter = { id (===fragility.id), fragility, probe(ctx): CapabilityResult (never throws),
  apply(ctx): void|Promise, revert(): void|Promise (idempotent, zero residue), fallback?(ctx) }
```
`ctx = { app, plugin, doc }`.

## 2. Fragility Registry (enumerable, probe-on-load, auto-disable-on-fail)

`PlatformAdapterRegistry`:
- `add(adapter)` — collect at boot (named `add`, not `register`, to avoid clashing with `Component.register`).
- `activate(ctx)` — per adapter: `probe`; if ok -> `apply` (failures isolated in try/catch);
  if not ok -> record disabled + run optional `fallback`.
- `deactivate()` — `revert` every activated adapter in reverse order; idempotent. The serviceUnload / LUPA detach path (ADR 0011).
- `describe(): FragilityRecord[]` — runtime-enumerable (base of config-export, D-PSS-2).
- `status(): { id, enabled, reason? }[]`.
Registry `extends Component` so `plugin.addChild(registry)` ties `deactivate()` to unload.

## 3. Slice breakdown

1. **Contract + registry + first adapter (THIS RUN).** `src/platform/platformAdapter.ts`, `fragilityRegistry.ts`, `NativeSearchAdapter` in `adapters/nativeSearchAdapter.ts` behind a `SearchEngine` seam (`searchEngine.ts`). Tests: probe-failure -> disabled + clean;
   apply->revert->DOM clean; registry isolates a throwing adapter; T.G shape-test asserts private symbols. NOT wired into `main.ts` (slice 5) to keep boot risk zero.
2. **Native-binding consolidation (adapter side only).** Wrap both binding paths' selectors as one `NativeBindingAdapter`. STOP at the selector->provider routing seam (Q4); leave routing as an injected dependency. Report the seam.
3. **file-menu delegation adapter.** Adapt `ContextMenuService` `file-menu` delegation + reentrancy suppression (`serviceCMenu.ts`). Native-menu curation (`_removeNativeFileMoveActions`) is lane D's; only the delegation seam here.
4. **Bases multi-select adapter (port from stable).** Port `basesMultiSelectOperations.ts` from `1.1.1` as `BasesMultiSelectAdapter`. Touches modals (FileMove/Rename/ PropertyManager) — verify shapes on sandbox before porting; RESHAPE if diverged.
5. **Wire into `main.ts` + platform/mobile inventory doc.** `addChild(registry)`; `activate` on load after services exist; `is-phone`/`isMobile` util (`platformProfile.ts`) + hover-only/desktop-only inventory doc (input to the dev `isDesktopOnly` decision — ledger §8.7). Iconic + Linter bridges (ledger 07) recorded as registry entries.

## 4. Mobile-inventory deliverable (slice 5)
Per adapter/feature: `mobile.supported` + notes, hover-only interactions, desktop-only assumptions. Feeds the dev's `isDesktopOnly` flip/subset decision; `describe()` is the machine-readable half.

## 5. Seams where this lane STOPS (coordination with Q4 / lane A & D)
- **Provider routing** (native-binding selector -> filter/binding-note action): adapter records selectors + probe + revert; routing into `filterService`/`nodeBindingService` stays injected. Do NOT deep-edit `providers/*` or `serviceFilter`/`serviceNodeBinding` — that is Q4.
- **Native menu curation** (`menu-curator`): lane D. Only the `file-menu` delegation seam here.
- **Hover-editor / floating-tiles patches**: later wave; contract shaped to host them.

## 6. Acceptance mapping (spec §5)

| Spec criterion | Slice | This run |
|---|---|---|
| Typed contract + >=3 real adapters migrated | 1–4 | contract + 1 adapter (native search); 3 queued |
| Registry enumerable w/ all ADR fields incl. mobile | 2 | `describe()` + full `FragilityRecord` incl. mobile ✓ |
| Probe-failure -> disabled, plugin loads clean | 1 | unit-tested ✓ |
| serviceUnload-revert verified by test | 1 | apply->revert->clean unit test ✓ |
| T.G shape-tests in normal suite | 1 | private-symbol shape test ✓ |
| Platform inventory doc | 5 | queued |
| `pnpm run check` + lint + verify clean | 1 | check + focused tests this run |
