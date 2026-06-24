---
title: Bases interop sources and API
type: research-shard
status: draft
parent: "[[docs/work/hardening/research/2026-05-05-bases-interop-research/index|bases-interop-research]]"
created: 2026-05-05T00:00:00
updated: 2026-05-05T01:11:52
tags:
  - research/bases
  - api
---

# Sources And API

## Official Sources Checked

- Obsidian Bases syntax:
  https://obsidian.md/help/bases/syntax
- Obsidian Bases functions:
  https://obsidian.md/help/bases/functions
- Obsidian custom Bases view guide:
  https://docs.obsidian.md/plugins/guides/bases-view
- Obsidian API typings:
  `node_modules/obsidian/obsidian.d.ts`
- Obsidian API repo:
  https://github.com/obsidianmd/obsidian-api
- Official Maps plugin / Bases custom view example:
  https://github.com/obsidianmd/obsidian-maps
- Maps `.base` example:
  https://raw.githubusercontent.com/obsidianmd/obsidian-maps/master/examples/Places.base

## Confirmed Bases Semantics

- `.base` files are YAML.
- Top-level schema includes `filters`, `formulas`, `properties`, `summaries`,
  and `views`.
- Global `filters` apply to all views.
- View-level `filters` apply only to one view.
- Global and view filters are evaluated together as `AND`.
- There is no Dataview/SQL-like `from` source clause; default dataset is vault
  files.
- `filters` may be a string expression or a recursive object with one of
  `and`, `or`, `not`.
- Filter strings and formulas share expression syntax.
- Note/frontmatter properties: `note.price`, `note["price"]`, or shorthand
  `price`.
- File properties: `file.name`, `file.path`, `file.folder`, `file.ext`,
  `file.ctime`, `file.mtime`, `file.tags`, `file.links`, `file.backlinks`,
  `file.properties`, etc.
- Formula properties: `formula.name`.
- `this` changes by display context:
  - opened as a base file: the base file itself.
  - embedded: the embedding file.
  - sidebar: active main-pane file.
- View schema includes `type`, `name`, optional `filters`, `groupBy`, `order`,
  and `summaries`.
- Views can store custom keys for plugin-specific state, but plugin authors
  should avoid collisions with core Bases keys.

## Public API Findings

Local typings are authoritative for this repo because `obsidian` is a
dependency. Relevant public APIs in `node_modules/obsidian/obsidian.d.ts`:

- `Plugin.registerBasesView(viewId, registration): boolean`
  - returns `false` if Bases are not enabled in the vault.
- `BasesConfigFile`
  - `filters?: BasesConfigFileFilter`
  - `properties?: Record<string, Record<string, any>>`
  - `formulas?: Record<string, string>`
  - `summaries?: Record<string, string>`
  - `views?: BasesConfigFileView[]`
- `BasesConfigFileFilter`
  - `string | { and: BasesConfigFileFilter[] } | { or: ... } | { not: ... }`
- `BasesConfigFileView`
  - `type: string`
  - `name: string`
  - optional `filters`, `groupBy`, `order`, `summaries`
  - typings do not enumerate custom view keys, but runtime supports them.
- `BasesView extends Component`
  - custom views extend it and implement `onDataUpdated()`.
  - public fields include `app`, `config`, `allProperties`, `data`.
  - `data` is a `BasesQueryResult`; views should not keep stale references.
  - `createFileForView()` can create a matching file from a view.
- `BasesViewConfig`
  - `get(key)`, `set(key, value)`, `getAsPropertyId(key)`,
    `getEvaluatedFormula(view, key)`, `getOrder()`, `getSort()`,
    `getDisplayName(propertyId)`.
- `BasesQueryResult`
  - `data`, `groupedData`, `properties`, `getSummaryValue(...)`.
- `BasesEntry`
  - `file`, `getValue(propertyId)`.
- `BasesSortConfig`
  - `{ property: BasesPropertyId; direction: 'ASC' | 'DESC' }`.

## Extended API Findings

Extra pass against `node_modules/obsidian/obsidian.d.ts` on 2026-05-05:

- `BasesPropertyType` is exactly `'note' | 'formula' | 'file'`.
- `BasesPropertyId` is a typed string:
  `` `${BasesPropertyType}.${string}` ``.
- `parsePropertyId(propertyId)` splits a Bases property ID into `{ type, name }`.
- `FormulaContext` is exported but currently empty; `BasesEntry` implements it.
- `BasesEntry.getValue(propertyId)` returns `Value | null`; errors may be
  represented as `ErrorValue`.
- `BasesQueryResult.data` is the ungrouped sorted/limited result.
- `BasesQueryResult.groupedData` should be used by views that support grouping.
- `BasesQueryResult.properties` exposes user-visible property IDs.
- `BasesQueryResult.getSummaryValue(...)` evaluates a named summary for a
  property over a list of entries.
- `BasesView.data` is replaced whenever query results change; custom views must
  rerender on `onDataUpdated()` and should not retain stale result references.
- `BasesViewConfig.getAsPropertyId(key)` converts user config values into
  validated `BasesPropertyId` values.
- `BasesViewConfig.getEvaluatedFormula(view, key)` evaluates view config formulas
  in the current Base display context.
- `BasesViewConfig.getOrder()`, `getSort()`, and `getDisplayName()` are the
  public accessors for view column order, sort, and labels.
- `QueryController` is public and passed to `BasesView`, but current typings do
  not expose public methods for executing arbitrary Bases queries outside the
  registered view lifecycle.

## Value Type Findings

The API exposes an extensible `Value` system rather than plain JavaScript
values:

- `Value` has `equals`, `looseEquals`, `isTruthy`, `toString`, and `renderTo`.
- Known subclasses include `NullValue`, `NumberValue`, `StringValue`,
  `DateValue`, `DurationValue`, `ListValue`, `ObjectValue`, `FileValue`,
  `RegExpValue`, `UrlValue`, plus HTML/icon/image/link-oriented values.
- `ListValue` supports mixed `Value` contents and methods such as `includes`,
  `length`, `get`, and `concat` at the public API level.
- `ObjectValue.get(key)` returns a wrapped `Value` or `NullValue`.
- This matters for interop: Vaultman should not flatten everything to strings
  if it wants lossless import/export or eventual evaluation compatible with
  Bases.

## Custom Bases Views

Confirmed by official guide: custom Bases view registration uses:

```ts
this.registerBasesView('type-id', {
  name,
  icon,
  factory: (controller, containerEl) => new MyBasesView(controller, containerEl),
  options,
});
```

`options` create view configuration UI entries and serialize values into the
`.base` view config. The official Maps plugin registers `map` this way.
