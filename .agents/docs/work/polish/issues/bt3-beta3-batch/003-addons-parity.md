---
title: BT3-003 — Snippets/Plugins scene-precedent parity
type: issue
status: completed
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
updated: 2026-07-17T14:14:30-05:00
updated_by: codex-gpt-5
tags: [agent/issue, initiative/polish]
---

# BT3-003 — Snippets/Plugins scene-precedent parity

**Gap.** beta.2 montó `explorerSnippets`/`explorerPlugins` como `UnifiedTreeView`
pelado: `showExplorerControls=false` (`pageFilters.svelte:210-214,726`), tipos fuera
de `FiltersTab` (`navbarFilters.svelte:30`, `popupView.svelte:10`) → cero toolbar,
sort, view menu, search, cells config.

**Objetivo (D5/D8).** Parity con Props/Tags (sin expand-all: no hay sub-nodos aún),
montada como **precedente de scene** — contratos shape-twin del refactor sandbox
(patrón FTC-002/006 WAR-shaped: provider puro + panel adapter + puerto tipado), sin
sobre-abstraer.

**Alcance:**
- `FiltersTab` union + `showExplorerControls` para `snippets`/`plugins`; per-tab
  sort state, saved layouts y search cableados.
- Sort options: Name · **Installed time** · **Updated time** (labels propios addons).
  Fuente de tiempos: snippets = ctime/mtime del `.css` (adapter.stat — viven en
  `.obsidian/snippets`, fuera del vault index); plugins = adapter.stat de
  `manifest.json` (installed=ctime, updated=mtime). Cache simple por sesión; provider
  puro en `obsidianAddons.ts` extiende `CssSnippetEntry`/`CommunityPluginEntry` con
  tiempos opcionales.
- Hover info de addons: nombre + installed/updated (+ version/author para plugins,
  reuso del shape `buildFileHoverInfo`).
- Cells configurables (view menu): icon · text · state (el toggle on/off) · config
  (solo plugins, ver BT3-004) · installed/updated como cells de texto opcionales.
- Floating TOC availability: extender `logicFloatingTocAvailability.ts` a ambos
  (listas planas funcionan con glyph letters).
- Tabs cmenu reposition NO va aquí (BT3-006).

**DoD (AFK):**
- Toolbar completa visible/operativa en ambos tabs (minimal y experimental).
- Sort por installed/updated con tests de comparator + fuente de tiempos stubbed.
- Source-guards: union types actualizados sin `as` casts sucios.
- Gates estándar + autofixer en `.svelte` tocados.

**HITL dev:** copy de labels + juicio visual de cells default.

## Cierre de implementación — 2026-07-17

Commit code-only: `5414a0f0 feat(addons): add explorer toolbar parity` sobre
`v12/bt3`.

- Añadidos `snippets` y `plugins` al contrato compartido `ExplorerTabId`, al estado
  de búsqueda/sort/view por tab, layouts guardados y wiring lazy
  Frame → Page → panel. Los consumers de header ajenos a Data conservan sus tabs
  string mediante una frontera tipada y el Data page valida el union sin casts.
- Creado `logicAddonExplorer.ts`: comparator puro para Name/Installed/Updated,
  búsqueda pura, shape común de hover y `AddonExplorerPanelPort` shape-twin del
  `FloatingTocPanel`. Los dos panels siguen siendo adapters explícitos; no se creó
  una superclase anticipada.
- `obsidianAddons.ts` obtiene `ctime`/`mtime` vía `Vault#configDir` y
  `adapter.stat` para cada snippet CSS y `manifest.json`, con cache `WeakMap` por
  `App`/path durante la sesión. Tiempos faltantes permanecen opcionales y se
  ordenan al final en ambas direcciones.
- Los panels exponen búsqueda, sort, view tree-only, cells configurables y TOC
  plano. Snippets: icon/text/state/installed/updated. Plugins añade config como
  contrato para [[004-addon-cells|BT3-004]]. Hover incluye nombre y tiempos; plugins
  agrega version/author. No se añadió expand-all, drill ni create/ADD mode.
- El menú sort ofrece sólo Name/Installed/Updated en addons, sin columna vertical
  jerárquica. El menú view conserva únicamente Tree. Labels nuevos entraron en
  `en.ts` y `es.ts`.
- Adversarial C2: añadido token monotónico `refreshRevision` a ambos adapters para
  impedir que un refresh antiguo sobrescriba uno nuevo o reaparezca tras
  `onunload`→`onload`. Self-protection de Vaultman sigue en menú, doble clic y
  acción; sort no-name desactiva indexación TOC; ids de plugin siguen desambiguando
  nombres duplicados.

### Evidencia AFK

- RED/GREEN focal: 6 files / 31 tests; hardening de refresh observado RED y luego
  GREEN en source guard.
- `pnpm run check`: 0 errors / 0 warnings.
- Autofixer Svelte: `issues:[]` en `VaultmanFrame.svelte`, `navbarFilters.svelte`,
  `popupSort.svelte`, `popupView.svelte`, `pageFilters.svelte`, `tabPlugins.svelte`
  y `tabSnippets.svelte`.
- ESLint, Prettier, Stylelint y `git diff --check`: verdes. ESLint detectó durante
  el slice el fallback hardcodeado de `.obsidian`; se eliminó y el test usa una
  config dir no estándar.
- Build production: verde; suite unitaria integrada: 94 files / 496 tests.
- Visual/UI/Obsidian/mobile: delistado por el batch; copy, densidad y cells default
  permanecen HITL del dev. La acción/config gear visible se completa en BT3-004.
