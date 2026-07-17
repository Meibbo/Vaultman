---
title: R-STYLESET — Obsidian Style Settings parsing
type: research-record
status: active
parent: "[[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/research/index|megadump research]]"
created: 2026-06-03T10:33:47
updated: 2026-06-03T10:33:47
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/research
  - initiative/draft
---

# R-STYLESET — Style Settings (mgmeyers / obsidian-community)

Repo `obsidian-community/obsidian-style-settings` (orig. mgmeyers). The reference impl for
"parse CSS → editable controls". Feeds MD-A3 and the theme-builder (MD-A4).

## The `/* @settings */` format

Settings are declared as **YAML inside a CSS comment**:

```css
/* @settings
name: Display Name
id: unique-id
settings:
  - id: setting-id
    title: Title
    description: optional
    type: control-type
    # type-specific props
*/
```

- Recognizes both `/* @settings` and `/*! @settings`. Indentation normalized before YAML parse (`js-yaml`).
- Required: `name`, `id`, `settings[]`. Optional: `collapsed`, i18n postfixes (`title.de`, etc.).

## Scanning / discovery

- Scans CSS from 3 locations: `.obsidian/snippets/*.css`, `.obsidian/themes/{active}/**/*.css`,
  `.obsidian/plugins/{plugin}/**/*.css`.
- Iterates `document.styleSheets`, extracts text, regex-finds the `@settings` blocks, parses YAML.
- Triggers: plugin load; theme switch / CSS reload; any plugin calling
  `app.workspace.trigger("parse-style-settings")`. Debounced to avoid redundant re-parse.
- Errors (YAML syntax, missing required props, dup ids) collected + shown in UI.

## Control types

Organizational: `heading` (level 1-3), `info-text` (markdown).
Class-based: `class-toggle` (adds/removes `body.{id}`; `addCommand` makes a hotkey command),
`class-select` (mutually-exclusive `body` classes from `options[]`).
Variable: `variable-text` (`--id:"val"`, `quotes`), `variable-number` (`--id:val{format}` e.g. px/rem/%),
`variable-number-slider` (`min`/`max`/`step`/`format`), `variable-select` (`--id:val` from `options[]`).
Color: `variable-color` (formats: `hex`, `hex-rgba`, `rgb`, `rgb-values`, `rgb-split` →`--id-r/-g/-b`,
`hsl`, `hsl-values`, `hsl-split`, `hsl-split-decimal`), `variable-themed-color` (light `default` +
`defaultDark`), `color-gradient` (`min`/`max` color-var names + `steps` → `--id-0..-n`).

## How values apply + persist

- On change, generates a CSS string of all modified vars, injects into a dynamic `<style>` in `<head>`,
  scoped to `:root`. Class controls mutate `document.body.classList` directly.
- Persists to `.obsidian/plugins/obsidian-style-settings/data.json` via `loadData`/`saveData` (JSON map
  id→value). On startup: load data → scan CSS → rebuild control list → re-apply saved values to DOM.
- Export/import ALL settings as one JSON file (cross-vault sharing).

## Integration surface

- **No public read API** for other plugins to read current values. Only integration = emit
  `app.workspace.trigger("parse-style-settings")` after injecting your own CSS. `class-toggle` w/
  `addCommand:true` auto-registers a command. Integrates with Settings-Search plugin.

## Applicability to Vaultman (MD-A3 — "parse CSS + theme folders, detect patterns, represent them")

- Implement the SAME scan (snippets/themes/plugins) + `@settings`-style declarative parse to auto-build
  theme-scene controls from any theme/snippet — instant ecosystem compatibility.
- Vaultman's edge over style-settings: keep a **structured, queryable settings model** (not just DOM
  vars/classes); a **dependency graph** (gradients depend on base colors); **reverse mapping** (CSS var
  → which control); **theme profiles** per workspace/context (ties SPS); and a **real provider/read API**
  (the bridge gap, MD-F2). Injection strategy: separate user-customization `<style>` + state in VM workspace.

## Sources

- https://github.com/obsidian-community/obsidian-style-settings (README)
- https://minimal.guide/plugins/style-settings · https://docs.obsidian.md/Reference/CSS+variables/About+styling
