---
title: Bases import choose mode filter interop
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-05-bases-import-choose-mode/index|bases-import-choose-mode]]"
created: 2026-05-05T02:31:25
updated: 2026-05-05T02:33:30
tags:
  - agent/spec
  - initiative/hardening
  - bases/import
---

# Filter Interop

## Group Logic Rename

Vaultman internal `FilterGroup.logic` changes to:

- `and`
- `or`
- `not`

The old values are legacy compatibility only:

- `all` -> `and`
- `any` -> `or`
- `none` -> `not`

All new UI, tests, import output, templates, and service logic should use
`and | or | not`.

The filter evaluator semantics remain:

- `and`: intersection of child results.
- `or`: union of child results.
- `not`: universe minus union of child results.

## Import Mapping

Minimum mapping for this slice:

- Bases object filter `and` -> Vaultman group `and`.
- Bases object filter `or` -> Vaultman group `or`.
- Bases object filter `not` -> Vaultman group `not`.
- Safe equality/property/tag/file predicates may convert into existing rule
  types where the current evaluator already supports them.

Unsupported expressions are not applied as active filters yet. They are kept in
the import report with:

- original expression.
- source file/block/view.
- reason.
- whether data was preserved but not applied.

Convertible rules can expand in later slices.

## Service Boundary

Create a dedicated Bases interop boundary, expected modules:

- `typeBasesInterop.ts`
- `serviceBasesInterop.ts` or pure parser/import modules under `src/services`
  and `src/utils`.

Inputs:

- source path.
- source kind: `.base`, `.base#view`, markdown fenced block, or future wikilink.
- raw content.

Outputs:

- preview/report object.
- compatible `FilterGroup` using `and | or | not`.
- source/view metadata for UI rows.

The service must be testable without Svelte and without mutating vault files.

## Testing

Tests must be written first for implementation.

Minimum coverage:

- `FilterGroup.logic` accepts and evaluates `and | or | not`.
- legacy `all | any | none` normalizes safely.
- Bases object groups import to the new logic names.
- global + view filters combine as `and`.
- unsupported expressions are reported and not applied.
- chooser source discovery includes `.base` and markdown fenced `bases` blocks.
- empty/loading landing renders for at least one explorer no-result state.

## Open Risks

- Markdown fenced `bases` discovery can be expensive on large vaults; the first
  slice should reuse existing retrieval/indexing instead of adding a second full
  vault scan path.
- Direct conversion to current `FilterRule` remains lossy; report visibility is
  required before export or broad rule mapping.
- Renaming `GroupLogic` touches many tests and settings/templates. A normalizer
  is required to keep old saved filters functional.
