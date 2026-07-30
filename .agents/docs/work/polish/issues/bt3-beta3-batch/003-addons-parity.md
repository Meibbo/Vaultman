---
title: BT3-003 — Snippets/Plugins scene-precedent parity
type: issue
status: pending
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish]
---

# BT3-003 — Snippets/Plugins scene-precedent parity

**Gap.** beta.2 montó `explorerSnippets`/`explorerPlugins` como `UnifiedTreeView` pelado: `showExplorerControls=false` (`pageFilters.svelte:210-214,726`), tipos fuera de `FiltersTab` (`navbarFilters.svelte:30`, `popupView.svelte:10`) → cero toolbar, sort, view menu, search, cells config.

**Objetivo (D5/D8).** Parity con Props/Tags (sin expand-all: no hay sub-nodos aún), montada como **precedente de scene** — contratos shape-twin del refactor sandbox (patrón FTC-002/006 WAR-shaped: provider puro + panel adapter + puerto tipado), sin sobre-abstraer.

**Alcance:**
- `FiltersTab` union + `showExplorerControls` para `snippets`/`plugins`; per-tab sort state, saved layouts y search cableados.
- Sort options: Name · **Installed time** · **Updated time** (labels propios addons).
  Fuente de tiempos: snippets = ctime/mtime del `.css` (adapter.stat — viven en `.obsidian/snippets`, fuera del vault index); plugins = adapter.stat de `manifest.json` (installed=ctime, updated=mtime). Cache simple por sesión; provider puro en `obsidianAddons.ts` extiende `CssSnippetEntry`/`CommunityPluginEntry` con tiempos opcionales.
- Hover info de addons: nombre + installed/updated (+ version/author para plugins, reuso del shape `buildFileHoverInfo`).
- Cells configurables (view menu): icon · text · state (el toggle on/off) · config (solo plugins, ver BT3-004) · installed/updated como cells de texto opcionales.
- Floating TOC availability: extender `logicFloatingTocAvailability.ts` a ambos (listas planas funcionan con glyph letters).
- Tabs cmenu reposition NO va aquí (BT3-006).

**DoD (AFK):**
- Toolbar completa visible/operativa en ambos tabs (minimal y experimental).
- Sort por installed/updated con tests de comparator + fuente de tiempos stubbed.
- Source-guards: union types actualizados sin `as` casts sucios.
- Gates estándar + autofixer en `.svelte` tocados.

**HITL dev:** copy de labels + juicio visual de cells default.
