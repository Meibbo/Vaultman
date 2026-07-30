---
title: Risks and open items
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/index|0-H virtualizer + list mode]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - explorer/views
---

# Risks And Open Items

## Risks

### R1 — Measured-height regression on widget consumers

The current `viewList.svelte` uses a fixed `model.virtualization.rowHeight` (currently 32 px). TanStack's per-row `measureElement` changes scroll behavior axis-fundamentally: row heights vary with content, virtual positions shift after measurement, and the index map reflows in response. For the queue and active-filters widgets, which historically had stable single-line rows, the visible behavior should remain the same; the risk is that subtle scroll behaviors (jump on first paint, flicker on update) appear under measurement.

**Mitigation:** `perfProbe` baselines pre/post (Layer 5); variable- height unit tests (Layer 1); width-change reflow test (Layer 1).
**Severity:** medium. **Likelihood:** low.

### R2 — DnD parity slippage

The HTML5 native drag implementation at `viewList.svelte:108-143` has subtle behaviors (`clientY` vs row-rect center for drop position;
gating on `canDrag && canDrop && onReorder`; disabled-row handling;
ESC cancellation). Rewriting the surrounding component creates opportunity to silently break one of these.

**Mitigation:** explicit DnD state-machine tests (Layer 1 edge cases);
preserve the existing drag handler code verbatim where possible (transcribe rather than re-derive).
**Severity:** medium. **Likelihood:** low.

### R3 — `ExplorerRowInput` shape evolution

`ViewNodeList` consumes an EDP-009 contract that other in-flight work may iterate. Adding fields is non-breaking; renaming or removing fields would break `ViewNodeList`. The risk is acceptable if the contract is treated as canonical and changes ripple through TypeScript compilation.

**Mitigation:** consume the contract directly (no parallel types);
rely on `tsc --noEmit` to surface breakage; coordinate with future EDP-009 work via the project's normal review cadence.
**Severity:** low. **Likelihood:** low.

### R4 — Queue-leak preservation risk

The queue-specific row handling (`is-queue-child` sniffing, the `'remove'` action inline-cancel special-case) is preserved bit-for-bit inside `ViewNodeList`. The risk is that the rewrite alters how `row.cls` flows through the component, silently dropping the `is-queue-child` class on some rows.

**Mitigation:** DOM snapshot of queue rendering pre/post (Layer 2);
explicit test of group / queue-child class preservation (Layer 1).
**Severity:** medium. **Likelihood:** low.

### R5 — Test gap exposure on widget consumers

If `explorerQueue` or `explorerActiveFilters` lack existing regression tests, the migration steps 2 and 3 run without a safety net.

**Mitigation:** pre-step 0 audits coverage and adds the minimum floor before step 1 starts.
**Severity:** high if uncaught. **Likelihood:** moderate (audit pending).

### R6 — `@chenglou/pretext` performance unknown

The four migrated capital-letter `View*` components use `serviceTextMeasure.ts`, which depends on `@chenglou/pretext`. The worldview research flagged pretext as **WATCH** (pre-1.0, single- author, never benchmarked) on the hot path. `ViewNodeList` does not import pretext directly; its measurement comes from TanStack's `measureElement` reading layout-resolved heights. If TanStack measurement is slow under list-mode dimensions, pretext-based pre-measurement is an unsmoked alternative.

**Mitigation:** `perfProbe` baselines tell us early. If post-migration measurements show a regression, escalate to a dedicated pretext-audit initiative; do not fold that work into 0-H.
**Severity:** low (most likely TanStack is fine).
**Likelihood:** low.

### R7 — TanStack/Svelte 5 edge cases

Issue TanStack/virtual#866 covered an `$effect` + `untrack` + `setOptions` ordering hazard on Svelte 5. The four migrated capital views have navigated this; freshly re-implementing in `ViewNodeList` risks stepping on it again.

**Mitigation:** mirror the exact `createVirtualizer` setup pattern used by `viewTree.svelte:244` and one of the capital views. Read those files as the reference rather than re-deriving from the TanStack docs.
**Severity:** medium if hit. **Likelihood:** low.

### R8 — `list` view-mode UX gaps

The brainstorm decided to wire `list` mode and chose its component shape. A per-provider `onActivate` matrix is now documented in shard 04 ("Per-provider `onActivate` semantics") capturing the Enter behavior intent for each of the seven providers (file providers open;
state providers toggle; tag/property providers filter). What remains genuinely open after the matrix is recorded:

- **Existence audit:** whether each provider's `onActivate` body already exists in `panelExplorer.svelte`'s current activate dispatch, or needs to be added. Many non-file providers may not have an activate body today because `list` mode was never wired — Enter on a Plugin row, for instance, may currently no-op. The audit happens at step 4 in shard 05; trivial additions (Plugins / Snippets toggle) fold into 0-H, non-trivial ones (Tags / Props filter integration, Properties value editor) defer to follow-up sub-specs.
- **Multi-select keyboard shortcuts.** `ViewNodeList` passes `SelectModifiers` through `onSelect`; the panel and `selectionService` decide range / toggle semantics. Existing behavior in other view modes should transfer one-to-one. Document any divergence found.
- **Sort hooks.** `list` mode has no explicit sort UI in `ViewNodeList` (sort is consumer-driven via `rowInputs` ordering).
  Whether the panel exposes a list-mode sort control is out of 0-H.
- **Cross-cutting input model.** `SelectModifiers` is a tiny slice of a larger unified-input vision (configurable command bindings across keyboard / mouse / touch). The vision is captured in [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index|the Explorer UI vision backlog]] as a successor initiative — not blocking 0-H, but `SelectModifiers` should evolve cleanly into it.

**Mitigation:** the activate matrix in shard 04 is the design intent;
audit each provider's existing `onActivate` body during step 4 and add the missing toggling bodies inline if trivial or defer if not.
Treat Layer 3 integration tests as the per-provider UX checklist.

**Severity:** low (per-provider behavior; not blocking the spec).
**Likelihood:** moderate (some UX micro-pass during impl expected).

## Open items — to resolve during implementation

These do not block the spec but need answers during the writing-plans or implementation phase.

### O1 — Existing test coverage for widget consumers

Audit `test/` for tests referencing `explorerQueue.svelte`, `explorerActiveFilters.svelte`, `viewList.svelte`, `ViewList`. Add baseline coverage if missing. This is the pre-step 0 task in shard 05.

### O2 — `ExplorerProvider.capabilities.canReorder` confirmation

Confirm the field exists on the typed `ExplorerProvider` definition on `claude/explorer` (likely in `src/types/typeContracts.ts` or `src/services/serviceExplorerDataPlane.svelte.ts`). The DnD gate depends on it. If the field name differs, update the wiring snippet in shard 04 and the gate description in shard 03 to match.

### O3 — `ExplorerRowInput.virtualization` hint source

Verify where each migrated view sources its row-height estimate.
Patterns:

- A constant in the component file (most likely; the capital views use `estimateSize: () => 32` or similar).
- A field on `ExplorerRowInput` itself (unlikely; not in the contract type per the EDP-009 audit).
- A per-provider value pulled from `provider.metadata` or a similar surface.

`ViewNodeList` adopts whichever pattern the migrated views use; in the absence of any precedent, a constant `32` matches the current `viewList.svelte` value and is correct for the queue / active-filters use case.

### O4 — `nodeRowsFromRowInputs` or equivalent for `list` mode

The EDP-009 audit referenced `nodeRowsFromRowInputs()` indirectly.
Verify whether such a function exists on `claude/explorer` and whether reusing it in `panelExplorer.svelte`'s `list` branch is the right pattern. If not, either reuse `nodeRowsFromTree(nodes)` (the function currently feeding `table` mode at `panelExplorer.svelte:153`) and adapt via `rowInputFromViewRow`, or introduce a thin `nodeRowsToListRowInputs(nodes)` helper.

### O5 — Widget consumer row-builder locations

Locate where `explorerQueue.svelte` and `explorerActiveFilters.svelte` build their `ExplorerRenderModel<NodeBase>` today. Migration step 3 in shard 05 leaves those builders untouched and adapts via `rowInputFromViewRow` at the call site — but knowing where the builders live is necessary for future cleanup (e.g., the follow-up task that decouples queue-specific knowledge from `ViewNodeList`).

### O6 — Final pre-deletion grep

Day-of step 5: `git grep -E 'serviceVirtualizer|viewList(\\.svelte)?|viewGrid(\\.svelte)?'`
against `src/` and `test/`. Confirms zero remaining references before deletion. Today's grep returns zero `src/` matches for `viewGrid`;
re-confirm at deletion time.

### O7 — TanStack pattern mirror

Read `viewTree.svelte` around `:244` (or wherever the `createVirtualizer` call is) and one of `ViewNodeTable.svelte`, `ViewNodeCards.svelte`, or `ViewNodeGrid.svelte`. Copy the exact `$effect` + `untrack` + `setOptions` setup into `ViewNodeList` rather than re-deriving the dance from the TanStack docs.

## Deliberately out of scope

The following are confirmed out of 0-H and live in other initiatives or are deferred entirely:

- **0-B sub-system (theme unification + token layer):** next Phase 0 spec; this session's brainstorm decisions transfer.
- **0-A sub-system (native-DOM contract + view-host extraction):**
  third Phase 0 spec.
- **Pretext audit:** separate initiative; deferred until / unless Layer 5 perf smoke surfaces a regression.
- **`@dnd-kit/svelte` migration for `ViewNodeList`:** separate initiative; deferred until a forcing function (touch / accessibility audit) emerges.
- **Queue-leak cleanup:** spawned as a separate follow-up task ("Decouple queue knowledge from ViewNodeList"). Must wait until 0-H lands before starting.
- **In-editor renderers (markdown post-processor / CM6 extension):**
  scoped into a later fast-follow sub-phase per the 1-foundation brainstorm decision.
- **Touch / mobile DnD:** HTML5 native DnD limitation accepted; no touch-specific fallback in 0-H.
- **Full a11y audit (color contrast, aria-live, RTL polish beyond smoke):** outside 0-H's scope.
- **Provider-swap correctness:** rare interaction owned by `panelExplorer.svelte`, not `ViewNodeList`.
