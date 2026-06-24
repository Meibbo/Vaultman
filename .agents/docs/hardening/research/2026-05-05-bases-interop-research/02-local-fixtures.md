---
title: Bases interop local fixtures
type: research-shard
status: draft
parent: "[[docs/work/hardening/research/2026-05-05-bases-interop-research/index|bases-interop-research]]"
created: 2026-05-05T00:00:00
updated: 2026-05-05T00:00:00
tags:
  - research/bases
  - fixtures
---

# Local Fixtures

Search root used: `..\..\..\+` from the plugin directory.

## `.base` Files Found

25 files:

- `agenda-default.base`
- `Calendar.base`
- `books.base`
- `calendar-default.base`
- `Finance.base`
- `Gastos.base`
- `connect.base`
- `Notes.base`
- `Media.base`
- `kanban.base`
- `Network.base`
- `kanban-default.base`
- `Journal.base`
- `Movie.base`
- `mini-calendar-default.base`
- `Places.base`
- `Persons.base`
- `relationships.base`
- `VideoGames.base`
- `Untitled.base`
- `task_footer.base`
- `tasks.base`
- `tasks-default.base`
- `Tags.base`
- `Storage.base`

## Inventory Summary

Parsed with `js-yaml`.

Top-level keys:

- `views`: 25 files
- `filters`: 16 files
- `formulas`: 13 files
- `properties`: 5 files
- `order`: 1 file
- `sort`: 1 file
- `summaries`: 1 file

View types:

- `table`: 45
- `cards`: 33
- `tasknotesTaskList`: 23
- `tasknotesKanban`: 10
- `tasknotesMiniCalendar`: 10
- `tasknotesCalendar`: 5
- `dynamic-views-masonry`: 4
- `facet-cards`: 2
- `list`: 2
- `carousel`: 1
- `dynamic-views-grid`: 1

Common view keys:

- `name`, `type`: 136 each
- `filters`: 111
- `order`: 110
- `sort`: 98
- `cardSize`: 44
- `columnSize`: 42
- `imageAspectRatio`: 41
- `image`: 35
- `groupBy`: 15
- `enableSearch`: 13
- `options`: 11

## Important Real Examples

`tasks.base`:

- custom `tasknotesTaskList`.
- complex recurring-task expressions:
  - `recurrence.isEmpty()`
  - `!complete_instances.contains(today().format(...))`
  - `list(blockedBy).filter(file(value.uid).properties.status != "done").isEmpty()`

`Calendar.base`:

- custom `tasknotesCalendar`, `tasknotesMiniCalendar`.
- many plugin-specific keys and `options`.

`connect.base`:

- top-level `order` and `sort` outside views.
- heavy `this.file`, `this.alias`, backlinks/outgoing links:
  - `file.hasLink(this.file)`
  - `this.file.hasLink(file.file)`
  - `file.path.startsWith(this.file.folder)`

`Finance.base`:

- summaries, display names, formulas, table column sizes.
- filters with wikilinks, lists, `contains`, negated file path checks.

`Journal.base`:

- regex in formulas, `html()`, `image()`, date parsing, formatting.
- multiline formulas.
- dynamic/card/facet view plugin keys.

## Real Filter Features Seen

- equality/inequality: `status != "done"`, `BudgetType == "Expense"`.
- link values: `Category == ["[[Cuenta Bancaria]]"]`, `logType == link("Day")`.
- file functions: `file.hasTag`, `file.inFolder`, `file.hasLink`.
- path/string methods: `file.path.contains`, `file.path.startsWith`,
  `file.folder.endsWith`.
- list methods: `contains`, `containsAny`, `isEmpty`, `filter`.
- date functions: `date()`, `today()`, `now()`, `.format()`.
- formula references: `formula.cover`, `formula.Moodcolor`.
- `this` context: `this.file.name`, `this.file.folder`, `this.alias`,
  `this.file.hasLink(file.file)`.
- regex formula expressions.

These fixtures prove import/export cannot rely only on current Vaultman
`FilterRule`; an expression IR or raw-expression fallback is required.
