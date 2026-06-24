---
title: Bases interop compatibility design notes
type: research-shard
status: draft
parent: "[[docs/work/hardening/research/2026-05-05-bases-interop-research/index|bases-interop-research]]"
created: 2026-05-05T00:00:00
updated: 2026-05-05T00:00:00
tags:
  - research/bases
  - design
---

# Compatibility Design Notes

## Vaultman Current Model Gap

Current `src/types/typeFilter.ts` is rule/group oriented:

- group logic: `all`, `any`, `none`.
- rules: `has_property`, `missing_property`, `specific_value`,
  `multiple_values`, `folder`, `folder_exclude`, `file_name`,
  `file_name_exclude`, `file_path`, `file_folder`, `has_tag`.

This represents a small subset of Bases filters. It cannot represent:

- arbitrary expression strings as AST;
- `this` context;
- formula references;
- method calls such as `.containsAny()`, `.isEmpty()`, `.startsWith()`;
- `file()` and `link()` typed values;
- regex functions;
- list transforms: `.filter()`, `.map()`, `.flat()`, `.unique()`;
- date arithmetic and duration strings;
- plugin-added functions;
- view-specific custom keys.

`src/types/typeViews.ts` aligns conceptually with Bases:
`ExplorerRenderModel`, columns, groups, sort, search, view modes, marks, cells.
But Vaultman does not yet have a Bases-compatible serialized view IR.

## Proposed Service Boundary

Do not fold this into `serviceFnR`.

Create:

- `serviceBasesInterop`
- `typeBasesInterop`
- parser/compiler modules for Bases expression strings
- import/export reports with unsupported/lossy fields

Suggested IRs:

- `BasesConfigIR`
  - parsed `.base` plus source path and raw unknown fields.
- `BasesExpressionIR`
  - parsed filter/formula expression or raw fallback.
- `VaultmanFilterIR`
  - superset of current `FilterGroup`, with raw expression leaves for
    unsupported Bases logic.
- `VaultmanViewIR`
  - maps Bases `views[]` to Vaultman view mode, columns, sort, group,
    cards/table options, and custom metadata.
- `InteropReport`
  - warnings for lossy import/export, unsupported functions, plugin-specific
    view types, and fields preserved as opaque metadata.

## Recommended Import Levels

1. Lossless YAML parse/preserve:
   - parse `.base`, preserve unknown keys, expose structured metadata.
2. Shallow import:
   - convert obvious filters to current Vaultman rules.
   - keep unsupported expressions as raw advanced rules.
3. Expression IR:
   - parse subset of Bases expression language into AST.
   - evaluate/compile supported predicates into Vaultman filter logic.
4. View import:
   - core `table`, `cards`, `list` map to Vaultman views.
   - `map`, TaskNotes, dynamic/facet/carousel views are preserved as
     plugin-specific view configs until explicitly supported.
5. Export:
   - Vaultman filters/views export to `.base`.
   - unsupported Vaultman semantics should be emitted as report/comments, not
     silently dropped.

## Can Views Be Used Both Ways?

Confirmed:

- Vaultman can register custom Bases views using public API.
- A Vaultman Bases view would receive filtered Bases data from Obsidian via
  `BasesQueryResult`; this is a strong path for “our views in Bases”.

Not confirmed / likely not safe:

- Reusing other plugins’ Bases renderers directly inside Vaultman explorers.
  Public API exposes registration and Bases data objects, not a registry for
  instantiating arbitrary third-party view classes inside another plugin.
  Safer path is importing/exporting serialized view config and optionally
  implementing compatible Vaultman renderers for selected view types.

## First Implementation Options

Option A: read-only import preview.

- Safest.
- Parse `.base`, show views/filters/report in Vaultman.
- No mutation or export yet.

Option B: export current Vaultman filters/views to `.base`.

- Useful quickly.
- Risk: Vaultman semantics may exceed Bases; must report lossiness.

Option C: register Vaultman Bases view.

- Proves API integration.
- Requires careful Svelte/DOM integration and performance testing with
  `BasesQueryResult`.

Recommended first slice: Option A, because it builds the compatibility matrix
and prevents silent data loss.

## Open Questions

- How much of Bases expression syntax should Vaultman evaluate itself versus
  preserving as raw expressions?
- Should advanced raw Bases expressions become active filters, read-only
  filters, or query chips with unsupported badges?
- Should plugin-specific views map to opaque `VaultmanViewIR.custom`, or should
  known plugins like TaskNotes get adapters?
- How should export preserve unknown custom keys: exact round-trip, namespaced
  metadata, or report-only?
