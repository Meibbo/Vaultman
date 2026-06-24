---
title: Bases interop research
type: research-index
status: draft
parent: "[[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-05T00:00:00
updated: 2026-05-05T01:11:52
tags:
  - research/bases
  - hardening
---

# Bases Interop Research

Purpose: preserve the research needed to design import/export between
Obsidian Bases `.base` files and Vaultman filter/view services.

## Shards

- [[docs/work/hardening/research/2026-05-05-bases-interop-research/01-sources-api|01 - Sources and API]]
- [[docs/work/hardening/research/2026-05-05-bases-interop-research/02-local-fixtures|02 - Local Fixtures]]
- [[docs/work/hardening/research/2026-05-05-bases-interop-research/03-compat-design|03 - Compatibility Design]]
- [[docs/work/hardening/research/2026-05-05-bases-interop-research/04-compatibility-matrix|04 - Compatibility Matrix]]

## Confirmed Direction

- Bases interop must be separate from `serviceFnR`.
- Bases needs a parser/import/export service and a shared filter/view IR.
- Vaultman can register its own custom Bases views through the public
  `registerBasesView` API.
- Reusing other plugins' renderers inside Vaultman is not confirmed by public
  API; import/export of serialized `.base` config is the safe path.
- Current `typeFilter.ts` is too narrow for Bases expression semantics.
- The local `.base` corpus uses 136 views across 10 view types and proves that
  plugin-specific view keys must be preserved opaquely.
- `QueryController` is public as a constructor dependency for `BasesView`, but
  current typings expose no public query/evaluation methods to reuse outside a
  registered Bases view.

## Completed Follow-Up Research

1. Read more of `node_modules/obsidian/obsidian.d.ts` around `Value`,
   `FormulaContext`, `QueryController`, and `parsePropertyId`.
2. Classified all 25 local `.base` files by filter expression features and view
   config keys.
3. Built a compatibility matrix with examples, current support, import/export
   strategy, and lossiness.

## Immediate Next Design Tasks

1. Choose first implementation slice:
   - read-only import preview,
   - `.base` export from current filters/views,
   - or custom Vaultman Bases view registration.
2. Draft the design/spec for the selected slice before touching product code.
3. Decide how raw advanced Bases expressions appear in active filters:
   read-only chips, editable query chips, or disabled unsupported nodes.

## Warning

Do not continue from the old FnR syntax selector abstraction. Bases belongs in
interop + filter/view IR. FnR should only consume compiled search/replace
semantics where relevant.
