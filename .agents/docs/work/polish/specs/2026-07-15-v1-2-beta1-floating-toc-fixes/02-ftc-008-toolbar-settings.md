---
title: FTC-008 Spec — toolbar Tools menu and Settings information architecture
type: spec-shard
status: approved
parent: "[[docs/work/polish/specs/2026-07-15-v1-2-beta1-floating-toc-fixes/index|beta.1 corrective batch]]"
created: 2026-07-15T00:00:00
created_by: codex-gpt-5
tags: [agent/spec, toolbar, settings, release/1.2.0-beta.1]
---

# FTC-008 — Toolbar Tools menu and Settings information architecture

## Current composition and cause

The minimal Files toolbar currently renders six nodes in this order:

`Tabs · View · Sort · Search · Auto-reveal · Expand/Collapse All`

Props and Tags render five because they do not have Auto-reveal. Content renders four caller-provided controls in its current configuration. Files is therefore the concrete wrap/slide case.

## Setting

Add the persisted boolean:

```ts
toolbarToolsMenu: boolean;
```

It defaults off and appears in Style Config immediately after `Show toolbar`, because that section already owns toolbar presentation. Copy:

- English name: `Condense toolbar tools`.
- English description: `Move Auto-reveal and Expand/Collapse All into a Tools menu so the toolbar stays at five actions.`
- Spanish name: `Condensar herramientas del toolbar`.
- Spanish description: `Mueve Auto-reveal y Expandir/Colapsar todo a un menú Tools para mantener cinco acciones.`

## Files behavior when enabled

The visible toolbar becomes:

`Tabs · View · Sort · Search · Tools`

`Tools` uses the native Obsidian `Menu` already used by View, Sort, and Tabs. Its items are ordered:

1. Auto-reveal active file.
2. Current expansion action, dynamically labelled and iconed as Expand All or Collapse All.
3. Any future action deliberately appended to this right-side tools suffix.

Keyboard Enter/Space opens the same menu at the Tools node. Existing callbacks remain the single implementation of auto-reveal and expansion; the menu does not duplicate their behavior.

When disabled, the six-node Files toolbar remains unchanged. Props/Tags remain their current five-node layout in beta.1 because they do not exceed the cap. The internal right-side menu item list is structured so a later action can be appended without adding a sixth visible node.

## Settings ordering

`VaultmanSettingsTab.display()` controls Settings order exclusively through the source order of `new Setting(containerEl)` calls. `.setHeading()` creates a visual section; it does not create a routed subpage. The explorer's `Config` submenu is a separate native `Menu` and does not influence Settings order.

Move the complete View Config heading, empty state, saved-layout rows, and delete callbacks from the end of `display()` to immediately after the reusable preset list currently headed by `queue.template.templates`.

Rename that heading only:

- English: `Action presets` -> `Operations Presets`.
- Spanish: `Presets de acción` -> `Presets de operaciones`.

Do not rename queue template data, commands, stored keys, or menu actions. This is an information-architecture/copy change, not a schema migration.

## Acceptance tests

- Default settings keep `toolbarToolsMenu=false`.
- Source/logic tests prove enabled Files has the five ordered nodes above.
- The native menu contains Auto-reveal before the dynamic expansion action.
- Disabled mode retains the two direct nodes.
- Settings source order proves Operations Presets < View Config < Style Config.
- English and Spanish translations use the approved copy.

