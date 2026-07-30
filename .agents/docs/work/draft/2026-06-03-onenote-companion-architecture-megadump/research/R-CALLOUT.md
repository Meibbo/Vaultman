---
title: R-CALLOUT — Obsidian Callout Manager mechanics
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

# R-CALLOUT — Callout Manager (eth-p)

Repo `eth-p/obsidian-callout-manager`. License **MIT** (permissive — code can be referenced/ported).
Feeds MD-A2 and the theme-scene provider pattern (MD-A3/A5).

## Architecture — multi-source detection

Discovers callouts from 4 source kinds (`CalloutSource`): **built-in** (Obsidian native: note, info, tip, warning, danger, quote, …), **theme**, **snippet**, **custom** (plugin-managed). Each callout = `{ id, color:[r,g,b], icon, sources: CalloutSource[] }`. Auto-scans stylesheets; no manual registration.

## CSS detection + handling

- Parses selectors matching `.callout[data-callout="type-name"]`.
- Reads CSS custom props inside: `--callout-color` (must be **RGB tuple** `r, g, b` — hex / `rgb()` / named colors NOT supported) and `--callout-icon` (a **Lucide** icon name).
- Inspects Obsidian's appearance system to know which theme + snippets are active, then scans their stylesheets for the above. Source attribution tracked per callout.
- "Export Callouts as CSS" button emits user customizations as a snippet; user edits stored in plugin settings.
- Graceful degradation: unparseable color/missing icon → defaults, no crash.

## Settings UI

Management pane: browse callouts w/ live preview; color picker + dropdown; Lucide icon picker; rename custom callouts; create new; insert callout into note; export as CSS; mobile-adjusted layout.

## Public plugin API (`getApi`)

```typescript
import { getApi } from "obsidian-callout-manager";
this.calloutManager = getApi(this); // after layout ready
```

| Method | Returns | Purpose |
|--------|---------|---------|
| `getCallouts()` | `Callout[]` (read-only) | all available callouts |
| `getColor(id)` | `RGB \| null` | parse callout color |
| `getTitle(id)` | `string` | default display name |
| `on("change", cb)` / `off(...)` | void | react to callout changes (event-driven, no polling) |

Owned handle (`getApi(this)`) = full access; unowned = limited.

## Applicability to Vaultman theme-scene (MD-A3/A5)

Reusable pattern: **multi-source scan → CSS pattern-match → metadata extraction → unified typed UI → public + event API → export**. Source attribution (built-in vs theme vs snippet vs custom) lets us warn on overrides, detect conflicts, resolve precedence (user > theme > built-in). Lazy/on-demand parse keeps startup cheap. Immutable read-only data + `on("change")` is the model for a `getSceneAPI()` (bridge angle MD-F2).

## Sources

- https://github.com/eth-p/obsidian-callout-manager (API README under `/api`)
- https://www.obsidianstats.com/posts/2025-06-10-custom-callouts-in-obsidian
