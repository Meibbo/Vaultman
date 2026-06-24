---
title: Bases interop slice 1 (Read-only Import Preview)
type: spec-index
status: draft
parent: "[[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-05T22:20:00
updated: 2026-05-05T22:20:00
tags:
  - agent/spec
  - initiative/hardening
  - bases
---

# Bases Interop Slice 1: Read-only Import Preview

This specification defines the first implementation slice for Obsidian Bases (`.base`) interoperability within Vaultman. 

As determined in the [[docs/work/hardening/research/2026-05-05-bases-interop-research/index|Bases interop research]], a direct evaluation or export would cause silent data loss due to Vaultman's current model gap. Therefore, the first slice is strictly a **read-only import preview**.

## Decision Summary

- Implement a YAML parser for `.base` files that preserves raw configuration without loss.
- Introduce `VaultmanFilterIR` (Intermediate Representation) that supports standard Vaultman rules alongside "raw expression leaves" for unsupported Bases logic.
- Introduce `VaultmanViewIR` to map core Bases views (`table`, `cards`, `list`) to Vaultman render modes, while keeping plugin-specific views (e.g., TaskNotes) as opaque `custom` metadata.
- Create an `InteropReport` UI or data structure to expose lossy fields, unknown keys, and unsupported expressions.
- Do **not** mutate or export to `.base` files in this slice.
- Do **not** evaluate advanced Bases expressions (like regex, Date math, `.map()`, `this` context) yet; they remain as read-only, unsupported filter chips in the UI.

## Scope

### In Scope
1. **Parser Service (`serviceBasesInterop`)**: Reads a `.base` file from the Obsidian vault and parses its YAML safely.
2. **IR Mapping**: 
   - Global filters map to a root `VaultmanFilterIR` group.
   - Core view configurations map to `VaultmanViewIR` arrays.
   - Known simple expressions (e.g., `status == "done"`, `file.folder`) map to Vaultman `FilterRule`s.
   - Advanced/unknown expressions map to raw AST/string nodes.
3. **Preview UI**: A read-only Vaultman modal or panel that displays the `InteropReport`:
   - Lists the views found.
   - Lists the filters (supported vs unsupported).
   - Shows warnings for lossy elements if we were to export.

### Out of Scope
- Evaluating raw Bases expressions into real filter results.
- Exporting Vaultman filters/views back to `.base`.
- Registering custom Vaultman renderers inside Bases via `registerBasesView`.
- Rendering custom third-party Bases views (like TaskNotes).

## Shards
*(To be created as implementation details are fleshed out)*
1. `01-bases-parser-service.md`
2. `02-intermediate-representations.md`
3. `03-interop-report-ui.md`

## Testing Strategy
- Use the local corpus of 25 `.base` files (`connect.base`, `tasks.base`, `Journal.base`, `Finance.base`) as fixtures.
- Assert that `serviceBasesInterop.parse(file)` retains all unknown keys in a `custom` or `raw` metadata field.
- Assert that the `InteropReport` correctly flags `listMethods`, `thisContext`, and `regex` as unsupported in the preview.
