---
title: Merge Map — proto-v5 ↔ production component-by-component
type: spec-shard
status: draft
parent: "[[index|umbrella]]"
created: 2026-05-19T00:00:00
updated: 2026-05-19T00:00:00
---

# Merge Map: proto-v5 ↔ production

Component-by-component decisión: **ADOPT** / **DROP** / **RESHAPE** / **MAP-to-existing** / **DEFER**.

Sources: proto-v5 (`C:\Users\vic_A\Downloads\Vaultman (1)\`) + auditoría interna del repo Vaultman.

## View modes

| Current view | LoC | Maps to | Source | Status | First release |
|---|---|---|---|---|---|
| `viewTree.svelte` | 1142 | KEEP. Adopt sticky-parents spec del proto (`pages.jsx:323-367` + HTML lines 1019-1031). Adopt chevron rotate animation. Fix triple-write scroll race en viewTree:420. | current + proto reference | hardening | v1.2.0 |
| `ViewNodeList.svelte` | 464 | proto Nautilus tiles (`nautilus.jsx:NautilusTilesList`) — horizontal icon + multi-meta tile rows | proto Nautilus | rewrite | v1.5.0 |
| `ViewNodeTable.svelte` | 858 | Bases table parity: `bases-tr`, `bases-table-cell`, `bases-td`, `bases-table-header`, `data-property="note.X"` | Bases (NOT proto) | rewrite | v2.0.0 |
| `ViewNodeGrid.svelte` | 1230 | proto Nautilus icons (`nautilus.jsx:NautilusIconsGrid`) — Adwaita SVG folders + file-type labels + per-folder semantic colors. Rich rows-only mode = hidrato viewList + tiles fusionado. | proto Nautilus | rewrite | v1.5.0 |
| `ViewNodeCards.svelte` | 606 | Bases cards parity: `bases-cards-item`, `bases-cards-property mod-title`, `bases-cards-property`, `bases-cards-cover` (media slot) | Bases (NOT proto) | rewrite | v2.0.0 |
| (no current) | — | proto `list` mode (compact text list) | proto observation | DEFERRED | sesión futura |
| `viewOutlineExplorer.svelte` | 77 | out-of-band, recursive snippet — sin cambios | current | preserve | — |
| `ViewMarkmap.svelte` | — | deferred — no selectable | current | preserve hidden | — |

Notas:

- viewGrid sin columnas (rows-only mode) = estructuralmente equivalente a viewList + view tiles
  fusionado. Resolución de "una view con toggle interno vs dos views separados" se decide en
  el spec de v1.5.0 (no in-scope esta umbrella). Default propuesto: una sola view con toggle.
- `EXPLORER_PLATFORM_VIEW_MODES = ['tree','list','table','grid','cards']` se preserva.
  Map / ViewNodeMap deferred (no selectable). Outline out-of-band.

## Theme system

| Proto feature | Decisión | Notas |
|---|---|---|
| 6 built-in theme palettes (Catppuccin Mocha/Latte, Gruvbox Dark/Light, Dracula, Nord) | DROP | Obsidian native handles themes + `data-theme=*` |
| Custom hex picker `<input type="color">` | DROP | Obsidian native `--color-accent` / `--interactive-accent` |
| Accent picker (10 presets) | DROP | Obsidian native |
| Theme provider de system themes | ADD | New provider detecta Obsidian themes instalados via `app.customCss.themes` y community-themes |
| Recent themes UI (últimos 3 + custom slot) | ADD | Sub-feature de v1.6.0 (sub-system 10 Theme Builder). 4 slots: 3 recent + 1 custom picker |

## Layout system

| Proto feature | Decisión | Maps to |
|---|---|---|
| Mode toggle sidebar/desktop/both | DROP | `serviceLayout.resolveDashboardEnabled(width≥800 + main-leaf + mode≠thin)` ya cubre responsive |
| Bottom nav layouts (pill / dual / drawer) | MAP | sub-system 6 — vocab ya en `serviceLayout.ts` (`LayoutDockPresentationMode`) |
| Drawer corner (L/R) | MAP | sub-system 6 — `LayoutDockCorner` en serviceLayout |
| Drawer direction (up/down/L/R) | MAP | sub-system 6 — `LayoutDockDrawerDirection` |
| Pill style (pill BG / circles) | MAP | sub-system 6 |
| Swap tabs ↔ pill items | MAP | sub-system 6 |
| Suggestion rows cap (chips) | RESHAPE | bits-ui input con `−/+` (sub-system 12) |
| Theme builder bar visibility toggles (toolbar/bottom/top show-hide) | MAP | sub-system 10 (Theme Builder) |
| Control Island (FAB + popover) | PARTIAL ADOPT | sin mode toggle. Solo: theme/accent recent + layout settings (sub-systems 6 + 10) |
| dashboard3 (4-column frame divide) | REDEFINE | NO 4-column divide. Hidrata "send tabs to Obsidian tabs" module + control de bars per-tab (toolbar/bottom/top). Su scope dentro de sub-system 5 |

## Filter / Queue system

| Proto feature | Decisión | Maps to |
|---|---|---|
| Boolean filter tree (groups AND/OR + rows + subgroups + orphans) | MAP | sub-system 4-I |
| 9-type OPERATORS (tag/list/select/text/number/date/checkbox/folder/link) | PRIMITIVE | de sub-system 4-I |
| FilterComposer (`parseManualFilter "name = value"`) | ADD | primitive de 4-I |
| StackIsland (backdrop + island wrap + squircle row + list) | ADOPT | reusable primitive. Opción: squircle row arriba+centro como alt al default arriba-derecha |
| FiltersIslandV2/V4 + QueueIslandV2/V4 | adopt | instances de StackIsland |
| IndexOverlay (AZIndexOverlay rebrand) | DEFER | future post-v1.6.0 |
| SortIslandV4 | MAP | adopt StackIsland — sort overlay con scope (all/folder/filtered) + multi-level |
| ViewIslandV4 (sidebar) ≠ ViewPopover (desktop) | UNIFY | one mode-aware view picker via `serviceLayout.kind` |

## Icons + Node elements

| Proto feature | Decisión |
|---|---|
| Adwaita SVG folder + file icons (parametric, per-folder color) | NEW sub-feature del sub-system 10 (Theme Builder): user importa Gnome icons |
| Lucide icons section (Obsidian native) | INCLUDE en icon selector del sub-system 10 |
| Per-node manual icon override | NEW capability del sub-system 10 + N.R primitive (carries icon slot) |
| Folder semantic colors (projects=blue, daily=amber, etc.) | OBSERVATION — patrón para Adwata icons import config |
| `detectKind(name)` (md/txt/json/code/img/doc) | ADD utility para Adwata icons sub-feature |

## Chrome / Navigation

| Proto feature | Decisión |
|---|---|
| Nautilus PathBar (breadcrumb back/fwd) | CHECK — current repo tiene breadcrumb (5 hits en `Select-String`). Parity-check vs proto pendiente. Si parity OK: solo polish. Si gap: ADD missing capabilities |
| Statusbar al pie ("X of Y selected · free: GB") | DEFER → sub-system serviceStats futuro post-v1.8 |
| Ribbon bar (props/files/tags/content) | MAP existing tabFiles/tabTags/tabProps/tabContent containers — no rewrite |
| Side props column ("Common to N files") | OBSERVATION — patrón para context-aware properties panel (post-v1.5) |
| `vm-bp-grid` legacy table (desktop.jsx fallback) | DROP — substituido por Bases table parity (v2.0.0) |

## cmenu

| Proto feature | Decisión |
|---|---|
| Standard 10-item cmenu (Open/Rename/Move/Tag/Prop/Duplicate/Queue/Delete) | MAP → sub-system A.R Action Routing — unifica los cmenu dispersos actuales. Contract `(id, MouseEvent)` único, no más `(row, modifiers)` divergent (ViewNodeList line 210) |
| ContextMenuV2 items con kbd hints (↵/F2/⌘D/⌫) | ADOPT — kbd hints como part of cmenu spec en A.R |

## Cross-plugin

| Proto feature | Decisión |
|---|---|
| (no proto coverage) | ADD — sub-system I.E NN engine swap direction B (Vaultman providers → NN explorer). Subscribe `api.on('selection-changed')`, write metadata via `api.metadata.setFolderMeta/setTagMeta/setPropertyMeta`, register cmenu via `api.menus.registerFileMenu/registerFolderMenu` |
| (no proto coverage) | ADD — sub-system API `vaultman.v1` namespace para handshake cross-plugin. 6 sub-namespaces NN-shaped: `navigation`, `metadata`, `selection`, `menus`, `events`, `themes` |
| (no proto coverage) | ADD — sub-system B.P Bases Parity (`note.X`/`file.X`/`formula.X` property addressing + `bases-` DOM vocab + `registerBasesView()` para inheritance del query pipeline + breaking change `prop:area → prop.note.area`) |

## Data model

| Proto feature | Decisión |
|---|---|
| `VAULT_TAGS` tree (parent + children + counts) | MAP — existing tag provider |
| `VAULT_PROPS` con types (list/select/number/date/text/links/checkbox) + counts | EXTEND `serviceFilter` con type-awareness para el 9-type OPERATORS map |
| `VAULT_FILES` shape | MAP — existing file provider |
| `OPERATORS` map per type | PRIMITIVE de sub-system 4-I |
| Cell semantics: `(row=file, column=prop:area) → property value on file` | NEW — sub-system C.D Cross-provider Cell Data (v2.0.0) |
| Bases-style namespaced property IDs (`note.X` / `file.X` / `formula.X`) | NEW BREAKING — sub-system B.P (v2.0.0) |
