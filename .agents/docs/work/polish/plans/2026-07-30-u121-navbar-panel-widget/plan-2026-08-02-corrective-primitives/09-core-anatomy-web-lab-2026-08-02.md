---
title: U121-003 Core file-properties anatomy recorded from Web Lab
type: implementation-record
status: reference
parent: "[[09-reveal-this-file-properties|Plan shard 09]]"
created_by: claude-opus-5
updated_by: claude-opus-5
dateCreated: 2026-08-02
updated: 2026-08-02
---

# Core file-properties anatomy — recorded 2026-08-02

Read from `C:\Users\vic_A\Desktop\obsidian-web-lab\obsidian\app.css` and
`app.js`, not reconstructed from memory. Task 9.3 requires this before writing
markup; recorded here so the next agent does not re-derive it.

## Structure

```text
div.metadata-container
  div.metadata-properties-heading
    div.metadata-properties-title
  div.metadata-properties
    div.metadata-property[data-property-key][data-property-type]
      div.metadata-property-key
        span.metadata-property-icon
        input.metadata-property-key-input
      div.metadata-property-value
        (div.metadata-property-value-item for list-shaped values)
  div.metadata-add-button
```

`app.js` uses exactly these class names and no others in this family:
`metadata-property`, `-icon`, `-key`, `-key-input`, `-value`, `-value-item`,
`-warning-icon`.

## The declarations Core already ships (do NOT copy them)

`app.css:11161-11430`. Vaultman reuses the classes and inherits these; copying
them into `styles.css` is what invariant 9 of spec shard 01 forbids.

| Selector | What Core already does |
| --- | --- |
| `.metadata-container` | `--metadata-background`, `--metadata-border-*`, `--metadata-padding`, `--metadata-max-width`, `color: var(--text-muted)` |
| `.metadata-properties` | `display: flex; flex-direction: column; gap: var(--metadata-gap)` |
| `.metadata-property` | `display: flex; align-items: start`, `--metadata-property-radius/-background/-box-shadow`, `overflow: hidden` |
| `.metadata-property-key` | fixed `var(--metadata-label-width)`, `border-bottom` divider, `--metadata-label-background` |
| `input.metadata-property-key-input` | borderless, `--metadata-label-text-color`, `--metadata-label-font-size/-weight`, ellipsis overflow |
| `.metadata-property-value` | `flex: 1 1 auto`, `gap: var(--size-2-2)`, `border-bottom` divider, `--metadata-input-background` |
| `.metadata-property-icon` | `--icon-color`, hover → `--icon-color-focused` |
| `.metadata-input-text` / `-number` / `-checkbox` / `-longtext` | the value widgets, already styled |

## Behavior Core already provides through those classes

- **Focus**: `.metadata-property.has-focus` and `.metadata-property:focus-within`
  apply `--metadata-property-box-shadow-focus`. This is the Core focus
  indication the spec means by "Core's focused/primary variables" — it is
  inherited, never re-approximated.
- **Collapse**: `.metadata-container.is-collapsed .metadata-property { display: none }`,
  driven by a class on the container, and
  `.metadata-properties-heading .collapse-indicator` is positioned for it.
- **Selection**: `.metadata-container:focus-within .metadata-property.is-selected`
  takes `--nav-item-color-selected` / `--nav-item-background-selected`.
- **Drop target**: `.metadata-property-value.is-being-dragged-over` renders its
  own indicator, so the drag affordance has a Core class too.
- **RTL** and **mobile** (`.is-mobile .metadata-container`,
  `.is-mobile .metadata-properties-heading`) are already handled.

## Consequence for task 9.3

Tree emits the structure above and adds only what Core has no class for. Table
and Cards must **not** get a `metadata-property` recreation: Core has one
file-properties layout and inventing it for engines Core does not have breaks
the "do not recreate Core" rule of spec shard 01.
