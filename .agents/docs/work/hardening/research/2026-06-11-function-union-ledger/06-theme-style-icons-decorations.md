---
title: Ledger cluster 06 — Theme, style, iconos, decorations y presets
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-06-11-function-union-ledger/index|Function-Union Ledger]]"
created: 2026-06-11T00:00:00
updated: 2026-06-11T00:00:00
created_by: claude-fable-5
updated_by: claude-fable-5
produced_by: explore-subagent (opus), integrado por coordinador
tags:
  - agent/research
  - ledger
  - style/theme
---

# Cluster 06 — Theme, style, iconos, decorations y presets

Evidencia: **Stable 1.1.1** = `git show 1.1.1:styles.css` (≈5400 líneas, un solo styles.css, sin SCSS) + `1.1.1:src/services/serviceIcons.ts`. **Sandbox** = `src/` HEAD. **Proto v12** = shard 04 §09/§22/§23/§24 (mock React, sin runtime). El 0-B spec se leyó desde worktree (`.worktrees\agent-room-control-ui\...`) — el `.agents` del checkout principal está en rama sin ese shard.

Hallazgo decisivo: `typeViews.ts` define `ViewLayers` con `icons/badges/highlights/state` (transient, lado decoración) + **`marks` durable** (`ViewMarkLayer`, `source: user|system|template`, 10 kinds: order/query/filters/specific_view/queue_list_template/column_set/group_set/pinned_item/manual_sort/template_membership) y `ViewCapabilities.canApplyMarks` — pero **NO existe `serviceMark.ts` como servicio** en sandbox.

## Tabla — Theme service / presets

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Servicio de tema runtime (rune-class) | — | ✓ (`serviceTheme.svelte.ts` $state) | ~ (control-island mock) | OVERLAP | ADOPT-sandbox | ThemeService | n-a | N1 | proto = vocabulario, sandbox = impl real |
| `activePresetId` + cascade fallback a native | — | ✓ | ~ (theme family en FAB) | SOLO-SANDBOX | ADOPT-sandbox | ThemeService | n-a | N1 | setPreset valida contra availablePresets |
| Preset built-in `native` (chameleon, useNativeDom) | ~ (minimal=on aproxima) | ✓ (PRESET_NATIVE) | — | OVERLAP | ADOPT-sandbox | ThemeService | native | N3 | D8: stable minimal=on = ref de native |
| Preset built-in `vaultman` (default install) | ✓ (es el layout stable) | ✓ (PRESET_VAULTMAN) | ~ (es "polish/demo") | COMPARTIDA | ADOPT-sandbox | ThemeService | n-a | N3 | — |
| Preset `polish`/`demo` (proto canon) | — | — | ✓ (todo el proto) | SOLO-PROTO | MAP | PSS style facet | polish | N3 | D8 canon; no existe como built-in aún |
| Preset `barebones` | — | — | — | (sin evidencia) | DEFER | PSS style facet | barebones | N3 | D-PSS-9: {config/snippet/plugin}_scene; sin código |
| Custom preset registry (register/unregister/update) | — | ✓ (+normalize) | — | SOLO-SANDBOX | ADOPT-sandbox | ThemeService | n-a | N3 | persiste a `elasticUi.customPresets[]` |
| Preset `extends` (herencia) | — | ~ (declare-only) | — | SOLO-SANDBOX | RESHAPE | PSS (composición facetas) | flag | N3 | mapea a Profile cascade D-PSS-1 |
| `ThemePreset` exhaustive type | — | ✓ (typeThemePreset.ts) | ~ (controles dispersos) | SOLO-SANDBOX | RESHAPE | PSS (facetas tipadas) | n-a | N1 | 0-B: declare-only salvo useNativeDom/chrome/density |
| Hidratación desde `ElasticUiSettings` | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | ThemeService | n-a | N1 | clean break, sin migración legacy (0-B) |
| Snapshot efímero al aplicar Profile (rollback) | — | — | — | (sin evidencia) | DEFER | PSS | flag | N1 | D-PSS-5/Q6; no implementado |

## Tabla — Tokens / custom properties

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Capa token runtime `.vm-root` → vars Obsidian | — | ✓ (`_elastic.scss`: --vm-accent/fg/bg/bg-alt/border/transition) | — | SOLO-SANDBOX | ADOPT-sandbox | ThemeService | n-a | N0 | 0-B ejecutado |
| `--vaultman-accent` → `--interactive-accent` | ✓ (styles.css L7) | ~ (vía `$vm-color-accent`) | — | OVERLAP | RESHAPE | Fragility Registry | native | N0 | nombres `--vaultman-*` vs `--vm-*` |
| `$vm-*` SCSS vars → Obsidian core vars (bridge) | — | ✓ (`_tokens.scss` 7 grupos) | — | SOLO-SANDBOX | ADOPT-sandbox | ThemeService | n-a | N0 | — |
| 6 props custom-preset (`--vm-popup-bg-opacity/backdrop-blur/bg-tint/row-height/row-padding-y/icon-size`) | — | ✓ (#renderCustomBlock) | — | SOLO-SANDBOX | ADOPT-sandbox | ThemeService | n-a | N1 | — |
| `--vm-explorer-density` por identidad (vm-id-*) | — | ✓ (native=0/bases=2/outline=1) | ~ (compact toggle) | OVERLAP | ADOPT-sandbox | ThemeService | n-a | N1 | density overlay locked (0-B) |
| `--vaultman-glass-blur` body var | ✓ (L2237 backdrop-filter) | ~ (`_glass.scss` + `--vm-glass-blur`) | ~ (blur toggles) | OVERLAP | RESHAPE | ThemeService | n-a | N1 | ⚠️ 0-B BORRÓ settings glassBlur; stable lo usa — legacy-1.1 lo re-expresa como pseudo-snippet |
| `--vaultman-tree-indent-line-color` → `--nav-indentation-guide-color` | ✓ (L5240) | ~ (`_tree.scss`) | — | OVERLAP | ADOPT-stable | Fragility Registry | native | N2 | nested guides con token nativo |
| `--scope-color` Statistics pills | ✓ (L5055-5087) | ~ (`_statistics.scss`) | — | OVERLAP | ADOPT-stable | PSS style facet | native | N2 | — |
| Palettes proto (catppuccin/gruvbox/dracula/nord) | — | — | ✓ (THEMES) | SOLO-PROTO | DROP | — | n-a | n-a | umbrella v1 DROP; theme≠paint (0-B) |
| `unocss-preset-theme` emite `.vm-theme-{id}` build-time | — | ~ (0-B lo prescribe; uno.config sin él al re-verificar) | — | SOLO-SANDBOX | ADOPT-sandbox | ThemeService | n-a | N0 | ⚠️ drift spec↔código; verificar |

## Tabla — Vocabulario de clases

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Identidad estructural `data-vm-*` (con valor) | — | ✓ (40+ attrs: virtual-index/table-cell/tab-id/foul/badge-kind…) | — | SOLO-SANDBOX | ADOPT-sandbox | PSS style facet | flag | N0 | estrategia 4+3 parcialmente desplegada |
| Clases `vm-*` (vocabulario polish) | — | ✓ (vm-root/badge/mode-*/id-*/theme-*) | — | SOLO-SANDBOX | ADOPT-sandbox | PSS style facet | polish | N1 | — |
| Clases Obsidian reales en DOM propio | ✓ (workspace-tab-header/nav-buttons-container/nav-action-button) | ~ (nav-file/tree-item en binding/foul) | — | OVERLAP | RESHAPE | Fragility Registry | native | N1 | stable lo probó en producción (SDF-011/016) |
| Clases legacy `vaultman-*` | ✓ (todo styles.css) | ~ (residual) | — | CONTRADICE | MAP | Fragility Registry | n-a | N1 | legacy-1.1 profile portará `.vaultman-*` como pseudo-snippets |
| `data-path` nativo (protocolo Obsidian) | ~ (DnD/core) | ✓ (nativeSurfaceBinding) | — | OVERLAP | ADOPT-sandbox | PSS style facet | native | N1 | nivel (a) §7: idioma Obsidian sin prefijo |
| `data-node-id` en filas/grid | — | ✓ | ✓ (Nautilus) | COMPARTIDA | ADOPT-sandbox | PSS style facet | n-a | N1 | — |
| `class` 100% propiedad del style preset | — | ~ (rootClasses por mode/id/theme) | — | SOLO-SANDBOX | RESHAPE | PSS style facet | flag | N1 | D-PSS-2 |
| Índice clases nativas vs `app.css` (web-lab) | — | ~ (foul watch dom-mimicry) | — | SOLO-SANDBOX | RESHAPE | Fragility Registry | n-a | N1 | extensión ADR 0004 |

## Tabla — Pseudo-snippets / custom CSS sanitizado

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Inyección dinámica de custom style block | — | ✓ (`#syncCustomStyles` `<style data-vm-theme-presets>`) | — | SOLO-SANDBOX | ADOPT-sandbox | ThemeService | n-a | N1 | "user data, no va en styles.css" |
| Sanitización CSS length (px/em/rem/%/vh/vw/0) | — | ✓ (regex estricto, fallback '0') | — | SOLO-SANDBOX | ADOPT-sandbox | ThemeService | n-a | N1 | — |
| Clamp number tokens 0..1 | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | ThemeService | n-a | N1 | — |
| Pseudo-snippets exportables a snippets reales | — | — | — | (sin evidencia) | DEFER | PSS style facet | flag | N1 | D-PSS-2/Q5: export vía operation queue |
| Sanitización CSS/HTML + cero script en `.scene` | — | — | — | (sin evidencia) | DEFER | PSS | flag | N1 | D-PSS-4(d) |

## Tabla — Elastic UI / density / motion

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| UI mode thin/balanced/thick | — | ✓ | ~ (frame modes ≠ esto) | OVERLAP | ADOPT-sandbox | ThemeService | n-a | N1 | — |
| UI identity native/bases/outline/bookmarks | — | ✓ (+vm-id-* CSS) | — | SOLO-SANDBOX | ADOPT-sandbox | ThemeService | n-a | N1 | — |
| Density tokens por preset (rowHeight/padding/iconSize) | ~ (fijos en CSS) | ✓ (native 26/2/14, vaultman 32/4/16) | ~ (compact toggle) | OVERLAP | ADOPT-sandbox | ThemeService | n-a | N1 | — |
| Reduced motion (`--vm-transition: 0ms`) | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | ThemeService | n-a | N1 | a11y |
| Faint mode (unfocused → grayscale) | — | ✓ (enabled && !focused) | — | SOLO-SANDBOX | ADOPT-sandbox | ThemeService | n-a | N1 | — |
| Window focus tracking | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | ThemeService | n-a | N1 | — |
| Node-size presets + label/gap scaling | — | ~ (data-vm-node-grid) | ✓ (38/56/80/136) | OVERLAP | MAP | PSS view facet | polish | N2 | proto: size afecta labels/gaps/density |
| `lockNodeElementVisibility` | — | ✓ (native=true) | — | SOLO-SANDBOX | ADOPT-sandbox | ThemeService | native | N3 | — |
| NodeElementVisibility granular (+badges sub-toggles) | — | ✓ | ~ (behavior toggles) | OVERLAP | ADOPT-sandbox | ThemeService | n-a | N3 | media default off |

## Tabla — Iconos semánticos (resolver / roles / packs / overrides / picker)

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Resolver semántico por rol de nodo | — | — | ✓ (icons.jsx Icon/resolveIconPackKey) | SOLO-PROTO | RESHAPE | IconService/packs | flag | N2 | ⚠️ sandbox NO tiene resolver; gap clave |
| Roles semánticos (16: folder/file/md/tag/prop/value/content/match…) | — | ~ (DecorationManager: 3 kinds + ext) | ✓ | OVERLAP | RESHAPE | IconService/packs | n-a | N2 | — |
| Prioridad de resolución (folder→role→type→ext→icon→fallback) | — | ~ (if-chain básico) | ✓ (documentada) | OVERLAP | RESHAPE | IconService/packs | flag | N2 | proto = canon del algoritmo |
| Override model (auto/manual, emoji:/adw:/pack:, object) | — | — | ✓ (normalizeIconOverride) | SOLO-PROTO | RESHAPE | IconService/packs | flag | N2 | `__vmIconOverrides` sin persistencia |
| Persistencia de overrides en scene/profile | — | — | — | (sin evidencia) | DEFER | PSS view facet | flag | N2 | — |
| Icon picker (packs + 4 modos) | — | — | ✓ (IconPickerIsland) | SOLO-PROTO | RESHAPE | IconService/packs | polish | N2 | preview usa runtime Icon |
| Override por nodo (data-attr → CSS) | — | ~ (data-vm-* presentes) | ✓ | OVERLAP | RESHAPE | IconService/packs | flag | N2 | — |
| Tipo de prop → icono (TYPE_ICON_MAP) | ~ | ✓ (serviceDecorate) | ~ (prop role) | COMPARTIDA | ADOPT-sandbox | serviceDecorate | n-a | N2 | — |

## Tabla — Icon packs como assets (import pipeline)

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Pack registry (lucide/adwaita/papirus/reversal/emoji) | — | — | ✓ | SOLO-PROTO | RESHAPE | IconService/packs | flag | N4 | adwaita hardcoded en proto |
| Remote packs por source URL | — | — | ✓ | SOLO-PROTO | RESHAPE | IconService/packs | flag | N4 | sin caché de failed URL |
| Import freedesktop (`index.theme`+SVGs, opendesktop) | — | — | — | (sin evidencia) | DEFER | IconService/packs | flag | N4 (lane C) | PSS §6 |
| Packs por referencia (`packId`), nunca embebidos | — | — | ~ (object override packId) | SOLO-PROTO | MAP | PSS | flag | N1 | D-PSS-3/§6 |
| Almacén + caché de packs | — | — | — | (sin evidencia) | DEFER | IconService/packs | flag | N4 (lane C) | — |
| Scope global/scoped + override por nodo | — | — | ~ (scene pack + per-node) | SOLO-PROTO | RESHAPE | IconService/packs | flag | N3 | cell_icon scope (PSS §6) |

## Tabla — Bridge Iconic (integración externa)

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Iconic bridge (lee plugins/iconic/data.json) | ✓ (serviceIcons.ts) | ✓ (idéntico) | — | COMPARTIDA | ADOPT-sandbox | IconService/packs | n-a | N1 | degradación graceful obligatoria (§027) |
| getIcon/getTagIcon lookup | ✓ | ✓ | — | COMPARTIDA | ADOPT-sandbox | IconService/packs | n-a | N1 | tolera #prefix |
| onLoaded + isAvailable degradación | ~ | ✓ | — | OVERLAP | ADOPT-sandbox | IconService/packs | n-a | N1 | falla silenciosa sin Iconic |
| Inyección Iconic en decoración (gana sobre TYPE_ICON_MAP) | ~ | ✓ | — | OVERLAP | ADOPT-sandbox | serviceDecorate | n-a | N2 | — |

## Tabla — Badges

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| BadgeKind set (set/rename/convert/delete/filter/node-note) | ~ (counts en status bar) | ✓ (serviceBadge.ts) | — | OVERLAP | ADOPT-sandbox | serviceDecorate | n-a | N2 | BADGE_KIND_ORDER fijo |
| FAB badges (queue/filters count) | — | ✓ (describeFabBadge) | ~ | OVERLAP | ADOPT-sandbox | overlay projection | n-a | N2 | — |
| Active vs hover badges | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | serviceDecorate | n-a | N2 | hover excluye kinds activos |
| Contradicción delete-with-mutation | — | ✓ (detectBadgeContradictions) | — | SOLO-SANDBOX | ADOPT-sandbox | serviceDecorate | n-a | N2 | — |
| badgeKindFromOpKind / FromNodeBadge | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | serviceDecorate | n-a | N2 | — |
| Badge → `data-vm-badge-kind` estilado | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | PSS style facet | n-a | N2 | `.vm-badge` SCSS |
| Type-incompat / quick-add badges | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | serviceDecorate | n-a | N2 | — |
| Badge visibility por preset | — | ✓ (ops/filters/warnings/inherited/counts) | — | SOLO-SANDBOX | ADOPT-sandbox | ThemeService | native | N3 | native: solo warnings |
| Inherited folder badges (bubble) | ~ (Task 8 pendiente verificación) | ~ (is-inherited opacity) | — | OVERLAP | DEFER | overlay projection | n-a | N2 | — |

## Tabla — Decorations + Marks (transient vs durable)

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| DecorationManager (transient: icons/badges/highlights) | — | ✓ (serviceDecorate.ts) | — | SOLO-SANDBOX | ADOPT-sandbox | serviceDecorate | n-a | N2 | — |
| Match highlights (offsets por query) | ~ (básico) | ✓ | ~ (match role) | OVERLAP | ADOPT-sandbox | serviceDecorate | n-a | N2 | — |
| Selection state decoration (is-active-filter) | ✓ (border-left accent + color-mix) | ✓ (ViewSelectionState) | ~ (Set) | COMPARTIDA | ADOPT-sandbox | serviceDecorate | n-a | N2 | — |
| Filter overlay highlights | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | overlay projection | n-a | N2 | — |
| Seam decorator plugins (extensibilidad) | — | ✓ (reserved) | — | SOLO-SANDBOX | DEFER | serviceDecorate | flag | N2 | — |
| **Marks durable** (`ViewMarkLayer`, source user/system/template, 10 kinds) | — | ✓ (typeViews.ts) | — | SOLO-SANDBOX | ADOPT-sandbox | serviceMark | n-a | N2 | order/query/filters/specific_view/column_set/group_set/pinned_item/manual_sort/template_membership/queue_list_template |
| Marks vs decorate split en ViewLayers | — | ✓ (transient ≠ durable) | — | SOLO-SANDBOX | ADOPT-sandbox | serviceMark | n-a | N2 | clave |
| `canApplyMarks` capability | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | serviceMark | n-a | N2 | gate por view |
| serviceMark como servicio dedicado | — | — | — | (sin evidencia) | DEFER | serviceMark | n-a | N2 | ⚠️ NO existe serviceMark.ts; solo contrato en typeViews |
| Mark render → `data-vm-mark` + pseudo-snippet | — | — | — | (sin evidencia) | DEFER | serviceMark | flag | N2 | D-PSS §12 |
| Mark kinds taxonomía (position/style/pin/size del PSS §21) | — | ~ (ViewMarkKind ≠ esta taxonomía) | — | CONTRADICE | RESHAPE | serviceMark | flag | N2 | view-state marks vs node-data marks bajo el mismo nombre — reconciliar |
| serviceMark ↔ PSS boundary (storage) | — | — | — | (sin evidencia) | DEFER | serviceMark | n-a | N1 | grill item D-PSS §12 |

## Tabla — Overlay projection

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| serviceOverlayProjection (operation + filter indexes) | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | overlay projection | n-a | N2 | — |
| Match targets (prop/tag/file/folder/content/template) | — | ✓ (6 matchers) | — | SOLO-SANDBOX | ADOPT-sandbox | overlay projection | n-a | N2 | — |
| Merge layers (badges/highlights/state/marks) | — | ✓ (computeLayers) | — | SOLO-SANDBOX | ADOPT-sandbox | overlay projection | n-a | N2 | renderers consumen misma verdad |
| Cache semantic layers (revision-keyed, max 5000) | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | overlay projection | n-a | N2 | — |
| Overlay no hardcodeado por renderer | — | ✓ (batch) | — | SOLO-SANDBOX | ADOPT-sandbox | overlay projection | n-a | N2 | mismo overlay en tree/table/grid/cards |

## Tabla — Accents / colors

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| 6 palettes proto | — | — | ✓ | SOLO-PROTO | DROP | — | n-a | n-a | umbrella v1 DROP |
| ACCENT_PRESETS (10) + resolveAccent | — | ~ (accentOverride declarado) | ✓ | OVERLAP | DROP | — | n-a | n-a | accent nativo Obsidian cubre |
| Custom accent / hex picker | — | ~ | ✓ | SOLO-PROTO | DROP | — | n-a | n-a | DROP explícito umbrella v1 |
| ColorKnobMap (zebra/rainbow/accentOverride) | — | ~ (declarado, no wired; 0-B non-goal) | — | SOLO-SANDBOX | DEFER | ThemeService | flag | N3 | color governance pendiente |
| Statistics scope pills `--scope-color` | ✓ | ~ | — | OVERLAP | ADOPT-stable | PSS style facet | native | N2 | scope semantics, no palette |
| folderAccent (carpeta → color) | — | — | ✓ (nautilus.jsx) | SOLO-PROTO | MAP | PSS view facet | polish | N3 | comunidad ya colorea vía data-path |
| `--vaultman-accent` → interactive-accent (theme respect) | ✓ | ✓ | — | COMPARTIDA | ADOPT-sandbox | ThemeService | n-a | N0 | no-negociable (§026) |

## Tabla — Foul detection / native identity

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| FoulDetectionService | — | ✓ (serviceFoulDetection.svelte.ts) | — | SOLO-SANDBOX | RESHAPE | Fragility Registry | flag | N1 | STABILIZE_BEFORE_PROMOTION (§026) |
| Foul kinds (portal-misplaced/cross-window/snippet-drift/dom-mimicry) | — | ✓ (4 kinds) | — | SOLO-SANDBOX | RESHAPE | Fragility Registry | flag | N1 | — |
| `data-vm-foul` outline visual | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | Fragility Registry | flag | N1 | — |
| Native class emission service | ~ (clases nativas directas) | ✓ (tree→Obsidian, table/cards→Bases) | — | OVERLAP | RESHAPE | PSS style facet | native | N2 | — |
| Dock contrast minimal (is-active sin accent halo) | ✓ | — | — | SOLO-STABLE | ADOPT-stable | PSS style facet | native | N2 | — |
| Header `nav-buttons-container` (minimal) | ✓ (L2917) | — | — | SOLO-STABLE | ADOPT-stable | PSS style facet | native | N2 | — |
| `.vaultman-tree-type.nav-file-tag` extension cells | ✓ (L4954) | ~ (`_tree.scss`) | — | OVERLAP | ADOPT-stable | PSS style facet | native | N2 | — |

## Conflictos detectados

1. **Mark kinds — taxonomías incompatibles (CONTRADICE).** `ViewMarkKind` (typeViews) = 10 kinds de ESTADO DE VISTA. El PSS grill §21 = mark kinds de DATO DE NODO (position/style/pin/size). Dos conceptos bajo el mismo nombre "mark"; `pinned_item`/`manual_sort` solapan parcialmente. ¿`ViewMarkLayer` durable ES el serviceMark del whiteboard o son capas separadas? Reconciliar en el spec de marks (Q-PSS-9).
2. **serviceMark no existe en código.** Confirmado: NO hay `serviceMark.ts` en sandbox — solo el contrato `ViewMarkLayer`/`canApplyMarks` + transient `serviceDecorate`. El "serviceMark god-object" del parking-lot puede ser legacy/renombrado. La premisa "serviceMark durable vs serviceDecorate transient" se confirma a nivel de TIPO, no de SERVICIO.
3. **Vocabulario de clases `vaultman-` vs `vm-` (CONTRADICE entre streams).** Stable usa `.vaultman-*` exclusivo; sandbox migró a `vm-*`+`data-vm-*`; proto `data-node-id`. 4+3 reconcilia; el profile `legacy-1.1` portará `.vaultman-*` como pseudo-snippets.
4. **Resolver de iconos — gap total (SOLO-PROTO).** Ni stable ni sandbox tienen resolver semántico/packs/picker/overrides; solo mock en proto. Sandbox = Iconic bridge + DecorationManager básico. Todo el subsistema packs = RESHAPE desde diseño puro → riesgo de implementación alto.
5. **`unocss-preset-theme` — drift 0-B spec↔código.** El spec lo prescribe; su propia re-verificación dice que `uno.config.ts` no lo incluye. Verificar si se ejecutó después.
6. **Glass blur — settings borrados (0-B) vs vivo en stable.** `legacy-1.1` re-expresa glass como pseudo-snippet, no como setting.

## Cobertura

- **Subsistemas:** 13/13 · **Filas:** 78.
- **Código directo:** `serviceTheme.svelte.ts`, `themePresetsBuiltin.ts`, `typeThemePreset.ts`, `serviceIcons.ts`, `serviceBadge.ts`, `serviceDecorate.ts`, `typeViews.ts`, `_elastic.scss`, `_tokens.scss`, `_badges.scss`, stable `1.1.1:styles.css` (grep), 0-B index (desde worktree).
- **`(sin evidencia)` marcadas:** serviceMark dedicado, pseudo-snippet export, persistencia icon overrides, import freedesktop, packs caché, snapshot efímero, sanitización `.scene` — todas DEFER/flag.
- **DROP re-mostrados:** palettes, ACCENT_PRESETS, hex picker, custom accent.
- **No verificado:** shards 0-B 03/04/05 (solo index); session-log/issues SDF no abiertos por este agente (el trabajo SDF se verificó directo contra `1.1.1:styles.css`).
