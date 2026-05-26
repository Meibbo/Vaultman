---
title: 0003 — Cell + view-config, Bases-aligned
type: adr
status: active
parent: "[[docs/architecture/adr/README|adr]]"
created: 2026-05-26T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/adr
  - explorer/interop
---

# 0003 — Cell + view-config, Bases-aligned

**Decision status:** Accepted. **Date:** 2026-05-26.

## Context

Node elements (label, detail, badges, table columns) are positioned ad hoc per view.
Bases parity/symbiosis is a first-class goal; if the cell/placement model is designed
arbitrarily, Bases IN/OUT becomes a large later refactor — the exact churn we must avoid.

## Decision

- **Cell** = a universal element = `source` ({in|cross}-provider field, incl.
  note-preview) + `semantic role`. The cell does not own its position.
- **view-config** maps `semantic role → slot/position/order` per engine+mode, is
  user-editable in the LayoutBuilder, and is a **superset of the Bases view-def**.
- Renderers emit `bases-*` DOM under the "native" preset (OUT); a translator maps a
  Bases view-def/results into our engines (IN). Confirmed: `registerBasesView` exists
  and the `bases-*` classes exist in `app.css`.

## Consequences

- Bases symbiosis by construction, not bolt-on. Cross-provider cells generalize C.D.
- Residual API-shape gaps (`BasesView` methods, `entry.getValue`, `note./file./formula.`
  namespacing) are deferred to the B.P translator spec — they do not change this contract.

## Alternatives considered

- Arbitrary cell/placement model with Bases added later: rejected (large refactor).
