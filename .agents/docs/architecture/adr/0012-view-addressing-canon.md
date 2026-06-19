---
title: 0012 — View Addressing Canon
type: adr
status: accepted
supersedes: "ADR 0008 view-taxonomy portion (render-ownership decision retained)"
created: 2026-06-18T00:00:00
created_by: claude-opus-4-8
tags:
  - architecture/adr
  - explorer/views
  - explorer/addressing
---

# 0012 — View Addressing Canon

## Status

**Accepted (NOW-tier)** — locked by dev grill 2026-06-17/18. Living detail (filled mid-grill):
[[docs/architecture/explorer-model/05-view-canon|05 View Addressing Canon]]. Supersedes the
**engine/mode/orientation view-taxonomy** of ADR 0008 (`render-ownership-two-layer` keeps its
render-ownership decision; only its view-taxonomy is superseded).

## Context

The view taxonomy was contested across THREE sources: `typeViewConfig.ts` (tracer — `orientation = h/v`,
miller/container as modes, Table as an engine), `explorer-model/02-render-and-data.md` (richer but
ADR-0008-era), and proto v12 (the dev's intent). The tracer over-simplified — collapsing the proto's
rich orientations to h/v and turning container/miller into modes. The dev's **homescreen-composition**
use case + the **Notebook-Navigator master-detail** require orientation to be a *composable* axis, not
h/v. (A 3-way canon conflict surfaced mid-grill; the canon was homeless/stale.)

## Decision

The view-addressing normal form = `engine · mode · orientation · direction · child_global_direction ·
viewScope · flags`, **computed never pre-enumerated** (D-C-8):

- **Engines:** `Linear · Geometry · Canvas · Charts`. **Table = a Geometry mode** (not an engine);
  **Charts = 4th engine** (distinct viz logic; canary placeholder). group-box **removed** (= a
  viewBuilder + viewScope composition). folder/Nautilus = grid/cards + orientation `drill`.
- **orientation ≠ h/v** — arrangement semantics, engine-specific (Linear `list·collapsible·accordion·
  drill`; Geometry `list·section·drill·container`). **h/v became the `direction` axis.**
- **`direction`** (level-1 nodes) + **`child_global_direction`** (children, RELATIVE to the
  H/V-Column/Row toggle + `mediator`) — both DIRECTIONS, not behaviors.
- **validity = compose-free** (any orientation on any mode; per-mode default; free user override; NO
  strict legal/illegal matrix).
- **viewScope** = `per_panel · per_level · per_parent · per_node`.
- **`regime`** (slot | coordinates) = the engine boundary; **regime-flip** (free manual-sort →
  coordinates → Canvas runtime).
- **cell-config** (intra-cell slot order/position) = `specific_view` → CSS pseudo-snippets (N.R/UPV
  plane), distinct from addressing.

Full modes/orientations/defaults/examples + DEFERRED items: shard 05.

## Consequences

- `typeViewConfig.ts` must be **re-modeled** to this canon (thread B code). glossary L129-131 +
  `explorer-model/02` engine table = superseded → archive when stable.
- The **perf render-runtime (thread A)** depends only on **geometry** (fixed vs variable + lanes +
  hit-test) — unaffected by orientation richness → the **Linear pilot can proceed in parallel**.
- **Canvas · Charts · viewScope-as-filter · composition/homescreen = DEFERRED** (N3/N4), tracked in
  `research-inventory`.

## Alternatives considered

- **Keep the tracer's `orientation = h/v` + rich-as-modes:** rejected — breaks composability (the
  homescreen needs container-orientation × grid/cards mode) and forces a combinatorial mode explosion.
