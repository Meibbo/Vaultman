---
title: "0009 — Bases interop strategy: native-primary + opt-in registerBasesView add-on"
type: adr
status: accepted
parent: "[[docs/architecture/adr/README|ADRs]]"
created: 2026-05-27T00:00:00
updated: 2026-05-27T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/adr
  - explorer/interop
  - explorer/bases
---

# 0009 — Bases interop strategy: hybrid (native-primary + opt-in `registerBasesView` add-on)

**Status:** Accepted 2026-05-27.

## Context

Vaultman provides Bases-overlapping functionality (filters, multi-view rendering, grouping, cross-property cells, formulas-as-cells). The Obsidian **Bases** core plugin is the canonical database surface in the ecosystem, with a documented `registerBasesView` API (`obsidian.d.ts` ≥ 1.10.0) and a small but converging community of view-providers (Dynamic Views grid/masonry, obsidian-bases-views kanban/gantt/calendar, Planner, Chronos, Life Tracker — ~6–10 known plugins).

Two extremes were on the table:

- **Path A — full interop IN+OUT.** Read `.base` files (IN) AND register our view-shells as Bases view-types (OUT) so other Bases consumers see Vaultman views.
- **Path B — full native recreate, no OUT.** Replicate Bases features natively; never register into Bases;
  a user could disable core Bases and stop relying on it entirely.

Research (`bases-interop-findings`, `obsidian-extension-api-findings`) confirmed: `registerBasesView` is documented + usable; the ecosystem is **consolidating, not fragmenting**; the API is young and will likely see ~1–2 breaking bumps in 12–18 months; Obsidian outpaces our capacity to recreate fast-evolving core behavior. Vaultman's true differentiator is **bulk-ops + the interactive filter/config builder + content logic**, which is **orthogonal to view rendering** (pixels of a grid are not the moat).

Two desires were in apparent tension: (a) "user can disable core Bases and still get all view functions" and (b) "don't strand the existing Bases user base / ecosystem / portability." A hybrid resolves both.

## Decision

A **hybrid** strategy. Four invariants:

1. **Native view-shells = PRIMARY renderer.** Our engines render our own projection. A user can disable core Bases and still get list / grid / table / cards / masonry / canvas from Vaultman. The replace goal is met by the renderer, not by abandoning interop.
2. **Bases-IN + import/export = ALWAYS supported.** We read `.base` view-defs into our `view-config`; we export to `.base` / JSON / XML / dataview-codeblock for portability. **These are independent of OUT.**
3. **Bases-OUT (`registerBasesView`) = OPT-IN add-on**, gated by a **PlatformAdapter** (ADR 0004) + the Fragility Registry + `serviceUnload` revert. Vaultman appears in Bases' view-type selector as a citizen, but our core does not depend on Bases being enabled. API churn is isolated to one adapter + the config-abstraction layer.
4. **Foreign Bases views from other plugins stay OPAQUE.** Per the extension-API recon, third-party views are not hostable; coexistence with other plugins' Bases views happens **in the same `.base` via Obsidian's view-type switch**, not by Vaultman absorbing or re-rendering them. We register OUR views;
   we do not host THEIRS.

## Consequences

- **User outcome:** a user CAN disable core Bases and keep every view function; users embedded in Bases workflows keep interop + see Vaultman views inside Bases.
- **Import/export decoupled from OUT.** Dropping `registerBasesView` would not drop import/export.
  Conversely, OUT being optional doesn't compromise portability.
- **Fragility containment.** All `registerBasesView` / `BasesView` / `BasesEntry` calls live in ONE adapter + the config-abstraction layer. A Bases API break = one place to patch.
- **B.P scope sharpens.** Implement `BasesView` subclasses that adapt our engines (read `BasesQueryResult` / `groupedData`, honor `config.getOrder()`, re-render on `onDataUpdated()`); build a config translator: Bases view-def ↔ our `view-config`.
- **Version floor.** Bases-OUT requires Obsidian ≥ 1.10.0; current stable `minAppVersion` is `1.12.0`, so the add-on is version-compatible from day one.
- **No ecosystem absorption.** We do not try to host third-party Bases views; we register OUR views.
- **Risk acknowledged.** Bases is young (~1–2 breaking bumps expected in 12–18mo). The PlatformAdapter + T.G shape-tests + Fragility Registry are exactly the containment for that risk (ADR 0004).

## Alternatives rejected

- **Pure Path A (interop-only, no native shell autonomy):** keeps us dependent on Bases for view discoverability; defeats the goal of letting users disable core Bases.
- **Pure Path B (full native replace, no OUT):** 2–3× the effort, forfeits ecosystem coexistence, locks the user base into us, and still leaves us exposed to Bases API churn anyway (we still parse `.base` for import).

## References

- [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/bases-interop-findings|bases-interop-findings]] (ecosystem + Path A/B recon)
- [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/obsidian-extension-api-findings|obsidian-extension-api-findings]] (registerBasesView signature + injection-surface)
- [[docs/architecture/adr/0004-platform-adapter-fragility-registry|ADR 0004 — PlatformAdapter + Fragility Registry]]
- [[docs/architecture/adr/0003-cell-view-config-bases-aligned|ADR 0003 — Cell + view-config (Bases-aligned)]]
