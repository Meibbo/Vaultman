# Proto v13 → Obsidian plugin (refactor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Authorization checkpoint

**Aprobado por el dev el 2026-08-07** tras el pase adversarial (correcciones aplicadas abajo) y el desglose en issues `issues/pv13-wave-1/` (13 slices, orden aprobado en su index). Ejecutar por issues (PV13-001 → 013), cada uno verificable con `npm run build`; el 013 es validación manual del dev (HITL).

- **Destino de código:** `C:\Users\vic_A\Desktop\refactor` (NO es repo git; no inicializar git salvo orden del dev; verificación = build verde + smoke manual).
- **Fuentes:** `C:\Users\vic_A\Downloads\Vaultman\Vaultman Prototype v13.html` (`PROTO_HTML`) y `C:\Users\vic_A\Downloads\Vaultman\proto-v13\` (`PROTO_DIR`).
- **Nota PM:** el refactor usa npm (AGENTS.md local exige npm); el `pnpm-lock.yaml` del scaffold se ignora (creará `package-lock.json` en el primer install).
- No push/merge/tag bajo este plan. Docs de agente locales (`.agents/`).

**Goal:** Portar el prototipo `Vaultman Prototype v13` (React 18, HTML single-file + 13 JSX global-scope) al plugin Obsidian en `C:\Users\vic_A\Desktop\refactor`, funcionando como ItemView del workspace con datos mock y persistencia vía settings.

**Architecture:** El HTML del proto se descompone en (a) un árbol de módulos ES React (`src/proto/*.tsx`) que reemplaza los 13 JSX global-scope con imports/exports explícitos, (b) `styles.css` con el CSS del proto (205 KB) aislando los selectores raíz bajo `.vm-view`, (c) un `main.ts` de plugin que registra un ItemView y monta React en su `contentEl`. El aislamiento del DOM global (document.body, window events) se hace con un contexto React + eventos acotados al contenedor.

**Tech Stack:** React 18.3.1 (react/react-dom deps), esbuild (bundle, loader jsx/tsx), TypeScript strict, Obsidian API (ItemView, Plugin, PluginSettingTab), npm.

**Shards:**
- `01-setup-and-shell.md` — bootstrap deps, esbuild/tsconfig, extracción CSS, ItemView shell, settings/persistence.
- `02-module-port.md` — conversión de los 13 JSX → módulos ES (`src/proto/`) con grafo de imports exacto.
- `03-isolation-gates.md` — cierre de aislamiento DOM (document.body, window events, tab-content scroll), gates de verificación.

---

## Prerrequisitos y contexto compartido (leer primero)

- **Fuente del proto:** `C:\Users\vic_A\Downloads\Vaultman\Vaultman Prototype v13.html` (referirlo como `PROTO_HTML`) y `C:\Users\vic_A\Downloads\Vaultman\proto-v13\` (referirlo como `PROTO_DIR`).
- **Destino:** `C:\Users\vic_A\Desktop\refactor` (referirlo como `REFACTOR_DIR`). No es repo git; NO inicializar git salvo orden del dev.
- **Spec:** `.agents/docs/work/proto-v13-obsidian-plugin/specs/2026-08-07-proto-v13-integration/index.md` (en el worktree vaultman, no en refactor).
- **Orden de carga original del proto (determina el grafo de módulos):** data → icons → control-island → popups → search-island → stack-island → views → explorer → pages → nautilus → sidebar → desktop → app.
- **Contrato de exports del proto (patrón `window.X = X` al final de cada JSX):**

| Módulo fuente | Símbolos que exporta (window.*) |
|---|---|
| data.jsx | VAULT_TAGS, VAULT_PROPS, VAULT_FILES, OPERATORS, TAB_TREES, flattenTree, leavesOf (y VAULT_FILES_BASE, VM_LOREM, vmMakeContent, builders sin window) |
| icons.jsx | ICON_PACK_SOURCES, PACK_ICON_ALIASES, NODE_TYPE_ICONS, SPECIAL_NODE_ICONS, LUCIDE_ROLE_ICONS, resolveIconPackKey, getIconSource, normalizeIconOverride, LucideIcon, Icon |
| control-island.jsx | ControlFab, ControlIsland, THEMES, ACCENT_PRESETS, resolveAccent |
| popups.jsx | (componentes SortPopover, ViewPopover, QueueIsland, FiltersIsland, ContextMenu, IconPickerIsland) |
| search-island.jsx | SearchIsland, PATTERN_TOKENS |
| stack-island.jsx | StackIsland, FiltersIslandV4, QueueIslandV4, ViewIslandV4, SortIslandV4, SettingsPanelV4, AZIndexOverlay, VM_ENGINES, vmEngineOf, DEFAULT_VIEW, DEFAULT_SORT, vmRenderKey, ACTION_META, ACTION_KINDS, FL_MIN_W, FL_MINI_W, NODE_PX |
| views.jsx | ViewNodeIcon, CanvasViewport, ManualMasonry, COLS, FlatList, WidgetsGrid, DataTable, DataChart, RecordForm, GraphCanvas, W, MindmapCanvas, JsonCanvas, vmGetSizes, MasonryGrid |
| explorer.jsx | TabExplorer, NotesExplorer, ContainerBox, ContainerGrid, NiagaraIndex, NodeCells, TREE_CELL_DEFS, TREE_CELL_ORDER, vmFirstChar, vmGroupKey, vmGroupList, MODIFIED_ORDER, vmIndexGlyph, vmShowLabel/vmShowIcon/vmShowLevel/vmShowMedia/vmShowContent, NIA_REVEAL, NODE_PX, MillerColumns, MasterDetailView, DrillView, GridDrillView, AccordionTreeRows, FlatTreeRows, TreeRows, NodeGlyph, CellMedia, CellContent |
| pages.jsx | TabPill, StatsPage, FiltersPage, ToolsPage, buildCtxItems |
| nautilus.jsx | FolderIconAdwaita, FileIconAdwaita, NautilusIconsGrid, NautilusTilesList, NautilusPathBar, buildNautilusEntries, ICON_SIZES (NAUT_ICON_SIZES), TILE_SIZES (NAUT_TILE_SIZES) |
| sidebar.jsx | NavPillIcon, DrawerNav, FilterFab, SidebarV4, flattenRows |
| desktop.jsx | Desktop (DesktopV2) |
| app.jsx | AppV4 (monta en `#root`) |

- **Eventos/globales del proto a aislar (INVENTARIO COMPLETO verificado contra fuentes, 2026-08-07):**
  - **Bus `vm-*` (window.CustomEvent) — eventos** (dispatch → listen):
    - `vm-surface-action` (control-island 110 → sidebar 317)
    - `vm-icon-override` (popups 282/287 → explorer 888)
    - `vm-redesign-cells` (explorer 1249, sidebar 749 → explorer 897)
    - `vm-cell-order` (explorer 356 → explorer 898)
    - `vm-focused-parent` (explorer 359 → stack-island 1128)
    - `vm-selmode` (pages 638 → pages 374, explorer 942)
    - `vm-queue-replace` (search-island 265/275/284 → sidebar 167)
    - `vm-search-submit` (search-island 186, pages 578 → sidebar 168)
    - `vm-toggle-collapse-all` (sidebar 310, pages 618 → stack-island 959)
    - `vm-toggle-expand-all` (sidebar 404 → pages 403)
  - **window state (lectura/escritura global):** `window.__vmIconOverrides` (leído en desktop 114, views 27, nautilus 151, explorer 306, sidebar 746, popups 280-286; escrito en popups 280), `window.__vmCellOrder` (explorer 355/356), `window.__vmSelMode` (explorer 939, pages 633), `window.__vmFocusedParent` (explorer 359, stack-island 1125), `window.__vmCollapseHandled` (pages 617, stack-island 957 — flag de handshake entre island y stack, NUEVO vs plan original).
  - **document.body:** `dataset.theme` (app 124, icons 402/491) y `style.setProperty('--color-accent'/'--interactive-accent')` (app 128/129).
  - **document/global DOM-level:** `document.addEventListener('mousedown'/'keydown')` (control-island 76/77, stack-island 116/226, sidebar 345/344), `window.addEventListener('keydown')` Escape (search-island 64, sidebar 344), `document.querySelector('.vm-tab-content')` (sidebar 308/403, pages 609), `el.addEventListener('scroll'/'wheel')` sobre elementos propios (pages 28, explorer 1040, views 71 — NO son globales; dejar como están).
  - **drag `mousemove/mouseup/touchmove/touchend` en window — SIETE sitios (no 2):** explorer 204/207 y 1228/1230; views 161/164 y 254/257; stack-island 53/57, 78/84 y 104/109.
  - **Lecturas de viewport (no son globales, se mantienen):** `window.innerWidth/innerHeight` en popups 191/192, stack 45/46/74, pages 719.
  - **imports window.* entre módulos:** `window.TAB_TREES` (explorer 878, pages 392), `window.normalizeIconOverride` (popups 278), `window.FolderIconAdwaita/FileIconAdwaita` (icons 386/387), `window.folderAccent` (icons 392).

## Correcciones del pase adversarial (2026-08-07)

Auto-revisión del plan contra las fuentes reales (`Downloads\Vaultman\proto-v13\` y `Desktop\refactor`). Hallazgos que YA han corregido el texto del plan:

1. **PM mismatch — scaffold real usa pnpm:** `Desktop\refactor` tiene `pnpm-lock.yaml` + `.npmrc`, pero su `AGENTS.md` exige **npm**. El shard 01 Task 1 se mantiene con `npm install react@18.3.1 react-dom@18.3.1` (creará `package-lock.json`); el `pnpm-lock.yaml` del scaffold se deja intacto (no es fuente de verdad). Anotar en session-log el primero que corra el build qué lock se creó.
2. **Líneas del app.jsx ajustadas:** el `useState({` real está en la línea 30 (no 22–92); effects de `document.body` en 123–132; `ReactDOM.createRoot` en 189. Corregido en shard 02 (`state.ts` y Task 13).
3. **styles.css del refactor YA existe (~164 B, CSS del sample).** Task 2 Step 1 lo sobrescribe. Si el extract diera "<199 KB", verificar que el regex `<style>…</style>` capturó el bloque entero del HTML (singleline). El proto HTML mide 205.399 chars de bloque.
4. **iconos Nautilus: `window.FolderIconAdwaita/FileIconAdwaita`** se exportan en nautilus 328/329 — el shard 02 Task 2 los mueve a folder-icons; el import en icons 386/387 queda igual de estricto tras el cambio.
5. **`window.folderAccent`** en icons 392: se mantiene como fallback `(window as any).folderAccent` (el plan ya lo decía; verificado).
6. **El inventario de eventos del index (bloque `Eventos/globales` de arriba) es la fuente de verdad actualizada con los 7 drags y los eventos faltantes** (`vm-queue-replace`, `vm-search-submit`, `vm-toggle-collapse-all`, `vm-toggle-expand-all`, `__vmCollapseHandled`).

**Convenciones de escritura en este repo (`REFACTOR_DIR`):**
- `package.json` usa npm. `npm install` para deps.
- tsconfig `strict: true`, `noUncheckedIndexedAccess`, `isolatedModules`. Si `esbuild` se queja de `jsxFactory`/`jsxFragment`, usar `jsx: 'automatic'` y `import { jsx } from 'react/jsx-runtime'` NO es necesario (esbuild lo maneja).
- ESLint con `eslint-plugin-obsidianmd` (reglas de plantilla). No dejar warnings nuevos en `npm run lint`.
- El plugin debe cargar en Obsidian con `main.js`, `manifest.json`, `styles.css` en la raíz de `REFACTOR_DIR` (es lo que ya hace el sample).

**Regla de oro del port:** el contenido/estructura de cada componente JSX se copia 1:1; solo cambia la envoltura (imports, exports, acceso a React como módulo, aislamiento DOM). Ninguna reescritura de lógica.

**Verificación base (aplicable a todas las fases):**
- `npm run build` → exit 0, `main.js` generado.
- `npm run lint` → sin errores.
- Con Obsidian abierto apuntando a un vault de pruebas: activar el plugin, abrir "Vaultman Prototype", verificar render + consola limpia (`dev:errors`).
