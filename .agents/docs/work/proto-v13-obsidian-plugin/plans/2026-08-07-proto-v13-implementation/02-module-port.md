# Shard 02 — Port de los 13 JSX → módulos ES en `src/proto/`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Contexto previo: leer `index.md` de este plan. Orden de creación = orden topológico resuelto abajo; el **ciclo** nativo del proto `icons ↔ nautilus` se rompe moviendo los iconos Adwaita a un módulo propio.

## Grafo de imports final (módulo → módulos que importa)

```
folder-icons.tsx  (nuevo, extraído de nautilus.jsx)  ← [sin dependencias de proto]
data.ts                                           ← [sin dependencias de proto]
icons.tsx                                         ← folder-icons (lazy fallback), React
nautilus.tsx                                      ← icons.Icon, folder-icons, data (VAULT_FILES)
views.tsx                                         ← icons.Icon, control-ui.Toggle (lazy), data
control-island.tsx                                ← icons.Icon, stack.SettingsPanelV4 (lazy), data (THEMES interno)
popups.tsx                                        ← icons.normalizeIconOverride/Folder/Icon, views.vmGetSizes
search-island.tsx                                 ← data (VAULT_*), icons.Icon/Toggle, pages.FiltersPage (lazy)
stack-island.tsx                                  ← data (OPERATORS), icons (Folder/Icon), views.vmGetSizes
explorer.tsx                                      ← data (flattenTree/leavesOf/TAB_TREES), icons, views.*, nautilus.*, stack.vmRender
pages.tsx                                         ← data (TAB_TREES), icons.Icon, search.SearchIsland, explorer.TabExplorer
app.tsx                                           ← control.ControlFab/Island, icons.Icon, sidebar.SidebarV4
sidebar.tsx                                       ← icons, stack.*Islands, pages.{StatsPage,FiltersPage,ToolsPage}, popups.IconPicker
desktop.tsx                                       ← data (VAULT_*), nautilus.*, icons, views.vmGetSizes
index.tsx                                         ← app, settings-engine (state.ts)
```

## Reglas mecánicas de conversión (aplicar a TODOS los módulos)

1. Cada `const X = (…)=>…` / `function X()` / data literal se copia **textualmente** desde la fuente. NO reescribir lógica.
2. En la parte alta de cada archivo:
   - Añadir `/* eslint-disable react/prop-types */` si el linter se queja de props no tipadas (el proto es JS implícito). No convertir props a TS en esta iteración (paridad).
   - `import { ..., type ... }` solo de los módulos listados en el grafo. Nada de `window.` para intercambio entre módulos (se usa imports ES).
3. `React.` → named imports: cada acceso `React.useState`/`useEffect`/`useMemo`/`useId`/`useRef` se mapea al import correspondiente (`import { useState } from 'react'`, etc.). El JSX `React.createElement` NO existe (el proto usa JSX puro); `jsx: 'automatic'` lo maneja sin `React` en scope.
4. Al final de cada archivo, **eliminar** las líneas `window.X = X;` y en su lugar `export` el(los) símbolo(s) que la fuente exportaba al window (para los módulos que requieren exportar sus símbolos; ver Tabla de exports el shard del `index.md`).
5. Donde un módulo leía `window.Y` de otro módulo (intercambio), sustituir por import ES directo `import { Y } from './Y-module'`.
6. **Isolation seam (data-theme / accent):** en `app.jsx` se hacen:
   ```js
   React.useEffect(() => { document.body.dataset.theme = theme }, [theme]);
   React.useEffect(() => { document.body.style.setProperty('--color-accent', c); … }, [accent, customAccent]);
   ```
   Estos dos effect se moverán a `app` y escribirán en la propiedad de datos del **contenedor** (`container.dataset.theme`, `container.style.setProperty`), que `index.tsx` suministra vía contexto (ver sección "theme-context" abajo). NUNCA escribir en `document.body`.
7. El acceso de `icons.jsx:402` (`document.body.dataset.theme`) se lee del contexto de tema (ver Task 8).
8. Cada módulo, tras editarse, debe compilar: `npx tsc -noEmit` (o `npm run build`) verde antes de pasar al siguiente.
9. **Commit**: en refactor NO hay git; verificación = build verde. Anotar avance en el session-log de la iniciativa.

## Task 1: `data.ts` (origen data.jsx)

**Files:**
- Create: `REFACTOR_DIR/src/proto/data.ts`

- [ ] **Step 1: Copiar contenido literal**

Copiar el contenido completo de `PROTO_DIR/data.jsx` a `REFACTOR_DIR/src/proto/data.ts` SIN cambios (es un data module, no JSX — solo hay `const VAULT_*` y helpers + el bloque `window.VAULT_FILES=…`). Eliminar las 6 últimas líneas de exports a window:
```js
window.VAULT_FILES   = VAULT_FILES;
window.OPERATORS    = OPERATORS;
window.TAB_TREES    = TAB_TREES;
window.flattenTree  = flattenTree;
window.leavesOf     = leavesOf;
```
(las demás no existen o se mantienen)
y en su lugar añadir exports:
```ts
export { VAULT_TAGS, VAULT_PROPS, VAULT_FILES, OPERATORS, TAB_TREES, flattenTree, leavesOf };
```
Además, el HELPERS exportables: `buildFileTree`, `buildTagTree`, `buildPropTree`, `buildContentTree`, `buildDeepBranch`, `vmMakeFile`, `VM_LOREM`, `VAULT_FILES_BASE` — añadirlos al export statement si existen (copiar de la fuente; el executor hace `grep '^const \|^function \|^let ' data.jsx` y lo explicita).

- [ ] **Step 2: Verificar** — `grep -c "window\." data.ts` → 0. `npm run build` exit 0.

**NOTA**: si el executor ve más de `window.X` en `data.jsx` (p.ej. `window.VAULT_TAGS`), quita SOLO las de export; nunca sustituir datos.

## Task 2: `folder-icons.tsx` (nuevo, rompe el ciclo icons ↔ nautilus)

**Files:**
- Create: `REFACTOR_DIR/src/proto/folder-icons.tsx` — copiar el contenido de `FolderIconAdwaita` y `FileIconAdwaita` que hoy viven en `nautilus.jsx` (grep `FolderIconAdwaita` y `FileIconAdwaita` y desde su `const ` hasta la llave de cierre). Los dos se mueven tal cual a este archivo.

- [ ] **Step 1:** Copiar ambos componentes literalmente. La única adición: `export` de los dos símbolos.
- [ ] **Step 2:** En `nautilus.tsx`, IMPORTAR `FolderIconAdwaita, FileIconAdwaita` desde `./folder-icons` y **quitar** sus definiciones locales.
- [ ] **Step 3:** En `icons.tsx`, sustituir el acceso lazy:
   ```js
   const Folder = window.FolderIconAdwaita;
   const File = window.FileIconAdwaita;
   ```
   por:
   ```js
   import { FolderIconAdwaita as Folder, FileIconAdwaita as File } from './folder-icons';
   ```
   He prestado: el fallback `if (!Folder || !File)` era para el caso "no cargados"; con import ES siempre existen → mantener el guard y, al ser módulo, ya cumplen.

## Task: `state.ts` — defaults + merge + snapshot (contrato de persistencia)

**Files:**
- Create: `REFACTOR_DIR/src/proto/state.ts`

- [ ] **Step 1:** Extraer del `app.jsx` (líneas 22–92) el objeto inicial de `useState` a una constante exportada `createDefaultProtoState()`, y los aceptadores `mode/theme/accent/customAccent/bothOpen/controlOpen` a defaults. Copiar literalmente los valores de la fuente.
- [ ] **Step 2:** Export `mergedProtoState(saved: ProtoSnapshot | null)` que hace `{ ...defaults(), ...stored }` con shallow-merge top-level (documentar en el archivo que es intencional: los defaults del proto se regeneran).
- [ ] Tipar con `ProtoSnapshot` de `settings.ts` (import type desde `../settings`).

## Task `theme-context` (core del aislamiento DOM)

**Files:**
- Create: `src/proto/theme-context.tsx`

Contenido (escribir literal):
```tsx
import type { ReactNode } from 'react';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect } from 'react';

interface ThemeContextValue {
  container?: HTMLElement;
  setTheme: (t: string) => void;     // escribe en el dataset del contenedor actual (vía containerRef)
  setAccent: (c: string) => void;    // escribe CSS vars en el contenedor actual
}

const ThemeContext = createContext<ThemeContextValue>({ setTheme: () => {}, setAccent: () => {} });

export function ThemeProvider({ container, children }: PropsWithChildren<{ container?: HTMLElement }>) {
  const apply = useCallback((fn: (el: HTMLElement) => void) => {
    // resolved from the live element each call; the ItemView always has a DOM node
    if (container) fn(container);
  }, [container]);
  const value = {
    container,
    setTheme: (t: string) => apply((el) => { el.dataset.theme = t; }),
    setAccent: (c: string) => apply((el) => {
      el.style.setProperty('--color-accent', c);
      el.style.setProperty('--interactive-accent', c);
    }),
  };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }
```
> Remake: En el proto los effects escribían en `document.body`. Aquí el elemento vivo es siempre el `container` del ItemView (que tiene `.vm-view`). El `data-theme` a nivel `.vm-view[data-theme]` debe casar con los selectores reescritos en `styles.css` (shard 01 Task 2).

## Task 6: `icons/icons.tsx` — primer módulo complejo

**Files:**
- Create: `src/proto/icons.tsx` (de icons.jsx)

Aplicar reglas 1–9. En particular:
- `React.useId` → `useId`.
- El `document.body.dataset.theme` del `RemoteNavIcon`/`LocalAdwaita` → a `useTheme().container?.dataset.theme` (o pasar themepor prop si se prefiere; elegir una y documentarla. La vía contexto es la acordada).
- `window.folderAccent` (línea 392, lazy) — mantener como fallback: `const folderAccent = (window as any).folderAccent;` documentado como "global opcional del proto sin definición, mantenido por compat para el guard".
- Exportar `Icon`, `LucideIcon`, `resolveIconPackKey`, `getIconSource`, `normalizeIconOverride`, `SPECIAL_NODE_ICONS`, etc. conforme a tabla de exports del `index`.
- Nada de `window.ICON_PACK_SOURCES = …` al final: son exports.

## Task 7: `views.tsx` — agrupar renderers

**Files:**
- Create: `src/proto/views.tsx` (de views.jsx) y seguir las reglas. Exportar `vmGetSizes`, `ManualMasonry`, `FlatList`, `WidgetsGrid`, `DataTable`, `DataChart`, `RecordForm`, `GraphCanvas`, `MindmapCanvas`, `JsonCanvas`, `MasonryGrid`, `W` (wrapper de wheel), `CanvasViewport`.
- Los usos de `Document.querySelector('.vm-tab-content')` NO existen aquí, pero revisar si algún renderer toca scroll — documentar.

## Task 8: `stack-island.tsx`

**Files:**
- Create: `src/proto/stack-island.tsx` (1703 líneas; mayor módulo).
- Reglas generales. Exportar los símbolos de stack de la tabla del index (StackIsland, FiltersIslandV4, QueueIslandV4, ViewIslandV4, SortIslandV4, SettingsPanelV4, AZIndexOverlay, VM_ENGINES, vmEngineOf, DEFAULT_VIEW, DEFAULT_SORT, vmRenderKey, ACTION_META, ACTION_KINDS, FL_MIN_W, FL_MINI_W, NODE_PX).
- Dependencias externas de la fuente: `OPERATORS` (data), `vmGetSizes`( views). Import ES directo.

## Task 9: `control-island.tsx`

**Files:**
- Create: `src/proto/control-island.tsx` (de control-ui.jsx)
- Exportar `ControlFab`, `ControlIsland`, `THEMES`, `ACCENT_PRESETS`, `resolveAccent` (es `function`)
- Importar `SettingsPanelV4` de `./stack-island` (lazy); `Icon` de `./icons`.
- Línea `onClick={() => window.dispatchEvent(new CustomEvent('vm-surface-action', …))}` — ver Task venta (a) del shard 03; por ahora se mantienen como `window.dispatchEvent`namespaced (decisión: un registro local de eventos en `src/proto/events.ts` se hace en Task del shard 03).

## Task 10: `popups.tsx`, `search-island.tsx`, `pages.tsx`

**Files:**
- Create: `src/proto/popups.tsx`, `src/proto/search-island.tsx`, `src/proto/pages.tsx`
- Reglas generales; imports según grafo.
- `pages/StatsPage` usa `document.querySelector('.vm-tab-content')` (line 609) → el scroll hay handle en shard 03 (si no se necesita, dejarlo con el contenedor `.vm-view` query scope local).

## Task 11: `explorer.tsx`

**Files:**
- Create: `src/proto/explorer.tsx` (1295 líneas)
- **Crítico**: `window.addEventListener('mousemove'/'mouseup'/'touchmove'/'touchend')` para drags (líneas 204-208, 1228-1230) → se mantienen en `window` PERO con función `cleanup` (ya tienen) y se documenta que no se debe global-ar el scope del Obsidian; si el linter alerta, ver shard 03 Task B.
- `window.TAB_TREES` → `import { TAB_TREES } from './data'`.
- `window.addEventListener('vm-…')` en `useEffect`, retornar cleanup (ya lo hacen) — conservar, pero despachar/dip curtirá se centraliza en shard 03 (events.ts).
- Importa `ManualMasonry`, `FlatList`, etc. de `views`; `NautilusIconsGrid`, `NautilusTilesList`, `buildNautilusEntries` de `nautilus`; `vmGetSizes` de `views`.
- Exporta `TabExplorer` y ciclos de render.

## Task 12: `nautilus.tsx`

**Files:**
- Create: `src/proto/nautilus.tsx`
- Exporta `NautilusIconsGrid`, `NautilusTilesList`, `NautilusPathBar`, `buildNautilusEntries`, `ICON_SIZES`/`TILE_SIZES` (alias NAUT_*).
- Quita las definiciones de `FolderIconAdwaita`/`FileIconAdwaita` (movidas a folder-icons).

## Task 13: `sidebar.tsx`, `desktop.tsx`, `app.tsx`

**Files:**
- `Sidebar.tsx`: imports de stack (>2 islands), pages (Stats/Filters/Tools), icons, popups (IconPickerIsland).
- `desktop.tsx`: imports de nautilus grid y data; usa `NautilusPathBar`; export `Desktop`.
- `app.tsx`: **quitar** el `ReactDOM.createRoot(document.getElementById('root')).render(<AppV4 />)` final; en su lugar export `AppV4`. Los effects de `document.body` → `useTheme()` (Task theme-context). Recibe props `initialState` y `onStateChange` (ver @ bottom).

## Task 14: `index.tsx` — composición y mount

**Files:**
- Create: `src/proto/index.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ThemeProvider } from './theme-context';
import { AppV4 } from './app';
import { MergedProto, parseSavedState } from './state';
import type { ProtoSnapshot } from '../settings';

export interface MountOptions {
  initialState?: ProtoSnapshot | null;
  onStateChange?: (s: ProtoSnapshot) => void;
}

export function mountPrototype(container: HTMLElement, opts: MountOptions = {}) {
  const root: Root = createRoot(container);
  const Wrapper = () => {
    const [snapshot, setSnapshot] = useState<ProtoSnapshot>(
      () => (opts.initialState as ProtoSnapshot) || defaultProtoSnapshot(),
    );
    const handleState = useCallback((s: ProtoSnapshot) => {
      setSnapshot(s);
      opts.onStateChange?.(s);
    }, [opts.onStateChange]);
    useEffect(() => {
      // from ProtoSnapshot → AppV4 defaults; set theme lazily through ThemeProvider
    }, []);
    return (
      <ThemeProvider container={container}>
        <AppV4 initial={snapshot} onSnapshot={handleState} />
      </ThemeProvider>
    );
  };
  root.render(<W />);
  return { unmount: () => root.unmount() };
}
```
(- Proporciona `defaultProtoSnapshot()` en `state.ts`.)

Exportar también `defaultProtoSnapshot` y `snapshotFromAppState` para el main.ts y settings.

## Cierr de shard: verificación

- [ ] `grep -rn "window\\." src/` → SOLO: los `window` que quedan intencionalmente (events de shard 03, `folderAccent` guard) — documentar cada uno.
- [ ] `grep -rn "document.body" src/` → 0.
- [ ] `npm run build` → exit 0.
- [ ] `npm run lint` → sin errores.
- [ ] Smoke (si Obsidian disponible): abrir view → render completo del prototipo (mock), consola limpia.