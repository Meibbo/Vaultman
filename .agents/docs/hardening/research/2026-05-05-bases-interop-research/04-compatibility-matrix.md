---
title: Bases interop compatibility matrix
type: research-shard
status: draft
parent: "[[docs/work/hardening/research/2026-05-05-bases-interop-research/index|bases-interop-research]]"
created: 2026-05-05T01:11:52
updated: 2026-05-05T01:11:52
tags:
  - research/bases
  - compatibility
---

# Compatibility Matrix

Source inputs:

- Official Bases syntax and functions docs checked on 2026-05-05.
- Local API typings: `node_modules/obsidian/obsidian.d.ts`.
- Local corpus: 25 `.base` files under `plugin-dev/+`.
- Local Vaultman models: `typeFilter.ts`, `filter-evaluator.ts`,
  `typeViews.ts`, `serviceFilter.svelte.ts`.

## Feature Matrix

| Bases feature | Local examples | Vaultman support now | Import strategy | Export strategy | Lossiness |
|---|---|---|---|---|---|
| YAML round-trip | all 25 files | none dedicated | parse with raw document preservation | stringify preserved config | low if unknown keys retained |
| Global filters | 16 files | `activeFilter` root only | import as root filter group | export root group to `filters` | low for supported rules |
| View filters | 111 views | no per-view filter IR | import into `VaultmanViewIR.filters` | export per-view where view supports filters | medium until view state owns filters |
| Filter object logic | `and`, `or`, `not` | `all`, `any`, `none` | map `and -> all`, `or -> any`, `not -> none` | map back recursively | low for object-level logic |
| Equality / inequality | `status != "done"`, `type == "task"` | equality via `specific_value`; no inequality | equality can become rule; inequality raw expression | equality exportable; inequality raw/string | medium |
| Numeric/date comparison | `date <= today()`, `formula.ppu > 5` | none | raw expression until expression IR exists | raw/string only | high |
| Inline boolean ops | `&&`, `||`, `!status.containsAny(...)` | group-level only | parse to expression IR or raw | compile groups when possible | high without parser |
| Note properties | `note.in.contains(...)`, shorthand `Category` | frontmatter property rules | direct properties map; methods raw | export property rules as shorthand/note ids | medium |
| File properties | `file.name`, `file.folder`, `file.ext` | partial file name/path/folder/tag rules | map simple name/path/folder/ext predicates; raw for links/properties/backlinks | export supported file rules | medium |
| File functions | `file.hasTag`, `file.inFolder`, `file.hasLink` | `has_tag`, folder contains; no link graph | map `hasTag` and simple folders; `hasLink` raw | export supported rules to function calls | medium-high |
| String methods | `.contains`, `.containsAny`, `.startsWith`, `.endsWith` | contains-like search only | direct only for current file/folder/name contains; others raw | export contains-like rules | medium-high |
| List methods | `.contains`, `.containsAny`, `.isEmpty`, `.filter` | array exact value via `matchValue` | simple `prop.contains(value)` to multi-value; transforms raw | export simple multiple values only | high |
| Link values | `link("Things")`, `[[Cuenta Bancaria]]` | string compare only | preserve typed link value in IR; optional string fallback | emit `link()` / wikilink from typed value | medium-high |
| Formula refs | `formula.cover`, `formula.Moodcolor` | none | preserve formulas and references in config IR | export formulas only after explicit support | high |
| `this` context | `this.file.folder`, `this.alias` | none | raw advanced expression with context badge | preserve exact expression | high |
| Date/time functions | `date()`, `today()`, `now()`, `.format()` | none | raw or expression IR with date nodes | raw/string until evaluator exists | high |
| Regex | `/.../.matches(...)`, regex formulas | none | raw expression; later regex predicate nodes | raw/string | high |
| HTML/image/icon values | `html()`, `image()`, `icon()` | no Bases value renderer | preserve formula/view metadata; do not evaluate | preserve formulas | medium |
| Summaries | `values.mean().round(3)`, `Average` | none | preserve top-level and view summary configs | export if table/card summary UI exists | high |
| Property display names | `properties.file.ext.displayName` | view column labels exist | map to column labels and config metadata | export display names | low |
| View order | `order: [file.name, ...]` | columns exist | map to column order | export column order | low for core views |
| Sort | `sort` in many views; top-level in `connect.base` | one sort state per view model | map view sort; preserve top-level custom sort | export view sort; top-level only if imported | medium |
| GroupBy | 15 views | `ViewGroup` exists; UI partial | map to grouped render model config | export `groupBy` when property-backed | medium |
| Core views | `table`, `cards`, `list` | modes exist | map to `ExplorerViewMode` + `VaultmanViewIR` | export core view configs | medium |
| Map view | official custom example | no map mode | preserve as custom/unsupported | preserve opaque unless adapter exists | high |
| Plugin view types | TaskNotes, dynamic, facet, carousel | no renderer adapters | preserve `type` and unknown keys exactly | round-trip opaque configs | low for preservation; high for rendering |
| Plugin custom keys | `cardSize`, `options`, `calendarView`, etc. | no typed model | store in `custom` metadata by view | emit unchanged unless edited | low if opaque |
| Custom Bases view API | `registerBasesView` | no integration | not used by import preview | later register Vaultman view type | none for preview |

## Corpus Classification

Observed feature frequency across 25 files:

- `listMethods`: 20 files.
- `fileProps`: 19 files.
- `stringMethods`: 19 files.
- `comparisonOps`: 18 files.
- `booleanOps`: 16 files.
- `fileFunction`: 15 files.
- `nestedAccess`: 15 files.
- `linkValues`: 12 files.
- `regex`: 12 files.
- `dateTime`: 11 files.
- `formulaRefs`: 7 files.
- `thisContext`: 7 files.
- `htmlImageIcon`: 6 files.
- `noteProps`: 2 files.
- `aggregateSummaries`: 1 file.

View type counts:

- Core-ish: `table` 45, `cards` 33, `list` 2.
- TaskNotes: `tasknotesTaskList` 23, `tasknotesKanban` 10,
  `tasknotesMiniCalendar` 10, `tasknotesCalendar` 5.
- Dynamic/facet: `dynamic-views-masonry` 4, `facet-cards` 2,
  `dynamic-views-grid` 1, `carousel` 1.

High-signal fixture notes:

- `connect.base` is the main `this`/graph query fixture and has non-core
  top-level `order`/`sort`.
- `tasks.base`, `tasks-default.base`, and default TaskNotes bases are the main
  list/date/recurrence fixtures.
- `Journal.base` is the main formula/rendering fixture: regex, `html()`,
  `image()`, formatting, dynamic/facet/card plugin configs.
- `Finance.base` is the only summary fixture and also exercises link/list
  filters and table sizing.

## Compatibility Conclusions

- A direct conversion to current `FilterRule` would lose too much. Import must
  use a wider IR with raw expression leaves.
- View import can be mostly lossless if unknown view keys are preserved, even
  before Vaultman renders those custom views.
- Expression evaluation should be incremental. First support obvious
  property/file/tag/folder equality and containment; keep the rest visible as
  unsupported advanced query chips.
- Export must produce an `InteropReport` every time. Silent dropping is not
  acceptable because the corpus contains many custom view fields and advanced
  expressions.

## First Slice Recommendation

Build read-only import preview first:

- Load a `.base` file.
- Parse YAML and preserve raw config.
- Show global filters, views, formulas, summaries, custom keys, and warnings.
- Convert only safe rules into `VaultmanFilterIR`.
- Keep unsupported expressions as raw advanced nodes with examples and reasons.
- Do not mutate `.base` files until export has a report UI and tests.
