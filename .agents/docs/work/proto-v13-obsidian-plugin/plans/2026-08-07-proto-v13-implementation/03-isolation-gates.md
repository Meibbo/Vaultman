# Shard 03 — Aislamiento de eventos/scroll + gates finales

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Contexto: el shard 02 dejó un puñado de `window.*` intencionales (events namespaced, drivers de drag/mouse). Este shard centraliza esos puntos en un bus local `events.ts`, cierra la persistencia real y verifica el plugin completo.

## Task A: `events.ts` — bus local del proto

**Files:**
- Create: `src/proto/events.ts`

Sustituir todos los `window.dispatchEvent(new CustomEvent('vm-*', …))` / `window.addEventListener('vm-*', …)` / `window.__vmIconOverrides|__vmCellOrder|__vmSelMode|__vmFocusedParent|__vmCollapseHandled` por un bus local en el módulo, de modo que **ningún evento del proto toque el window real de Obsidian** excepto los drags (`mousemove/mouseup/touchmove/touchend` del propio gesto de arrastre, breves y necesarios — ver Task B).

El inventario completo de eventos (dispatch → listen) está en el `index.md` del plan: **11 CustomEvents** (`vm-surface-action`, `vm-icon-override`, `vm-redesign-cells`, `vm-cell-order`, `vm-focused-parent`, `vm-selmode`, `vm-queue-replace`, `vm-search-submit`, `vm-toggle-collapse-all`, `vm-toggle-expand-all`; `vm-queue-replace` se despacha desde search-island 3 veces). Además de los **5 window.__vm*** (iconOverrides, cellOrder, selMode, focusedParent, collapseHandled).

Escribir `src/proto/events.ts`:
```ts
type Handler = (detail?: unknown) => void;

const listeners = new Map<string, Set<Handler>>();

export const protoBus = {
  on(event: string, h: Handler): () => void {
    const set = listeners.get(event) ?? new Set<Handler>();
    set.add(h);
    listeners.set(event, set);
    return () => { set.delete(h); if (set.size === 0) listeners.delete(event); };
  },
  off(event: string, h: Handler) { listeners.get(event)?.delete(h); },
  emit(event: string, detail?: unknown) {
    listeners.get(event)?.forEach((h) => h(detail));
  },
};

// State compartido del proto (hoy window.__vm*): pasa a módulo
export const protoState = {
  iconOverrides: {} as Record<string, unknown>,
  cellOrder: [] as string[],
  selMode: 'none' as string,
  focusedParent: null as ({ id: string; name: string } | null),
  collapseHandled: false,
};
```
Migración de los call sites (grep `window.dispatchEvent|window.addEventListener\(['"]vm-|window.__vm`):
- Cada `window.dispatchEvent(new CustomEvent('vm-X', {detail}))` → `protoBus.emit('vm-X', detail)`.
- Cada `window.addEventListener('vm-X', h)` → `protoBus.on('vm-X', h)` (y el cleanup `() => protoBus.off('vm-X', h)`).
- `window.__vmIconOverrides` → `protoState.iconOverrides`; similar `__vmCellOrder` → `protoState.cellOrder`, `__vmSelMode` → `protoState.selMode`, `__vmFocusedParent` → `protoState.focusedParent`, `__vmCollapseHandled` → `protoState.collapseHandled`.
- **OJO con `vm-selmode`**: los listeners actuales leen `e.detail` (`{ mode }`) en explorer 942 y pages 374. `protoBus.emit('vm-selmode', { mode: next })` conserva la forma. Igual `vm-redesign-cells` (`{ on }`) y `vm-focused-parent` (`{ id, name }` como detail).
- La línea `onClick={() => window.dispatchEvent(new CustomEvent('vm-surface-action', …))}` en control-island → `protoBus.emit('vm-surface-action', …)`.

Cada sitio: sustituir y **compilar** (`npm run build`) entre archivo y archivo para localizar fallos al momento. Lista de archivos a tocar: control-island, explorer, pages, sidebar, search-island, stack-island, popups (buscar `vm-` en cada uno).

## Task B: drags en window (7 sitios) + panels globales + `document.querySelector('.vm-tab-content')`

### B.1 Drags `mousemove/mouseup/touchmove/touchend` — 7 sitios en 3 archivos

En el proto son listeners de window temporales del gesto (con `removeEventListener` en cleanup, breves). En Obsidian se mantienen en `window` PERO solo durante el gesto; verificar que cada sitio ya hace `removeEventListener` en su cleanup (fuente: explorer 204/205, 1228/1229; views 161/162, 254/255; stack-island 53/54, 78–81, 104/105). No hay código que los deje colgados. NO convertirlos a `container` (rompe el drag fuera del view). Si el linter alerta, documentar sitio por sitio.

### B.2 Panels/overlays con listeners globales `mousedown`/`keydown` — scope a container

- `document.addEventListener('mousedown', onDoc)` — control-island 76, stack-island 116/226 (cierre de popovers al click fuera). Conviértelos a `container.addEventListener('mousedown', onDoc)` (el container `.vm-view` es el host del proto; un click dentro de Obsidian fuera del view NO debe cerrar el popover del proto — y el click fuera del view debe cerrar... decidir: mantener `document` si el comportamiento deseado es "click fuera cierra", pero con el evento namespaced al view es suficiente para el proto; documentar la decisión en el archivo).
- `window.addEventListener('keydown', h)` Escape — search-island 64, sidebar 344: **conviértelos a `container`** (Escape solo debe cerrar cuando el foco está en el view). Cleanup ya existe.
- `window.addEventListener('keydown')` — control-island 77, sidebar 344 son los mismos Escape/close; unificar.

### B.3 `document.querySelector('.vm-tab-content')` — scoping de scroll

Usos: `sidebar.tsx` (líneas 308, 403), `pages.tsx` (609). En el proto eran queries globales sobre el `document` completo (funcionaban porque el `#root.stage` era el único tab-content del documento). Dentro de Obsidian hay otros `.vm-tab-content` posibles → scope a `container`.

- [ ] En `sidebar.tsx` y `pages.tsx`, cambiar `document.querySelector('.vm-tab-content')` por `el.closest('.vm-view')?.querySelector('.vm-tab-content')` donde `el` es el elemento del row/glyph disparador (o pasar el `container` desde `useTheme().container`).
- Verificar visual que el scroll del tab interior sigue funcionando tras el cambio.

## Task C: persistencia real — wiring AppV4 ⇄ settings

**Files:**
- Modify: `src/main.ts` (Task 4 del shard 01 tenía un TODO — resolverlo ahora)
- Modify: `src/proto/app.tsx`, `src/proto/index.tsx`

- [ ] **Step 1:** En `VaultmanPrototypeView.onOpen`, reemplazar TODO por:
```ts
import { mountPrototype } from './proto';
// en onOpen:
const { unmount } = mountPrototype(this.contentEl, {
  initialState: this.plugin.settings.protoState,
  onStateChange: (s) => {
    this.plugin.settings.protoState = s;
    void this.plugin.saveSettings();
  },
});
this.disposeMount = unmount;
```
(declarar `private disposeMount: (() => void) | null = null;` y en `onClose` llamar `this.disposeMount?.()`.)

- [ ] **Step 2**: en `app.tsx`, `AppV4` acepta `{ initial?: ProtoSnapshot | null; onSnapshot?: (s: ProtoSnapshot) => void }`. En cada `setState`/`setMode`/`setTheme`/`setAccent`/`setCustomAccent`/`setBothOpen`/`setControlOpen`, llamar a un helper local `commit()` que llama `onSnapshot(buildSnapshot())` (debounce 300 ms con `useRef`s de timeouts; multiple timers por campo están bien —no se anidan cancelaciones cruzadas).

> OJO: El proto usa muchos `useState` individuales de top-level. Construir snapshot: `{ mode, theme, accent, customAccent, bothOpen, controlOpen, ...state }`. En `index.tsx`, `parseSavedState` hace merge de este snapshot en defaults (shallow por top-level; ver `state.ts`).

## Task D: Ajustes finales del ItemView (estilo y file)

- [ ] Verificar que `container.addClass('vm-view')` se aplica ANTES de montar y que `.vm-view { height:100% }` (styles.css) hace el override del `contentEl` de Obsidian (el contentEl tiene `overflow:auto` nativo; el proto usa su propio scroll interno). Si hay doble scrollbar, en `styles.css`:
```css
.vm-view { height: 100%; overflow: hidden; }
```
(ya quedó en shard 01 Task 2 Step 3; revisar el efecto real en Obsidian).

## Task Gates finales

- [ ] `npm run build` → exit 0.
- [ ] `npm run lint` → sin errores.
- [ ] `grep -rn "document.body" src/` → 0.
- [ ] `grep -rn "window\\.dispatchEvent\\|window\\.addEventListener" src/` → SOLO los **SIETE** drags (`mousemove/mouseup/touchmove/touchend` de explorer.tsx, views.tsx, stack-island.tsx) que permanecen intencionalmente scoped a la duración del gesto (documentado en index.md); todo lo demás centralizado en `events.ts`.
- [ ] `grep -rn "document.addEventListener" src/` → 0 (los mousedown/keydown globales migrados a container).
- [ ] `grep -rn "window\\.__vm\\|protoState" src/` → solo `protoState` (Windows, servir de referencia; verificar con el executor).
- [ ] **Smoke funcional en Obsidian** (dev de validación manual; los agentes no hacen visual testing):
  1. Activar plugin, abrir "Vaultman Prototype".
  2. El render es idéntico al del HTML standalone al primer paint.
  3. FAB control: switch mode/theme/accent → el `data-theme`/CSS var cambian en `.vm-view` (no en body).
  4. Tabs stats/filters/tools, islands, drawer, grid Nautilus, drag resizer: funcionales.
  5. **Persistencia**: cambiar algo + esperar 300 ms → cerrar/reabrir Obsidian → estado restaurdo.
  6. `dev:errors` en consola sin errores del plugin.
- **Registro**: documentar el resultado del smoke + cualquier desviación en `.agents/docs/work/proto-v13-obsidian-plugin/plans/2026-08-07-proto-v13-implementation/index.md` (shards 01–03 completados).

## Notas de diseño de cierre (dudas sobre la mesa para el dev)

1. **Ventana global vs bus**: se optó por reemplazar TODOS los eventos `vm-*` del window por un bus local (cero polución del window de Obsidian). Los `mousemove`/`mouseup` del drag en `explorer` se mantienen en `window` por necesidad de capturar fuera del contenedor mientras arrastras; se aíslan con unsubscribe en el `onclose` del gesto (ya estaba en el proto).
2. **Tipos de props**: el port es JS→TS sin convertir props a TS (paridad; `<eslint-disable react/prop-types>` en cada archivo); el tipado fino de `ProtoSnapshot` solo a máxima utilidad (settings). Si el dev quiere tipar todo, es un trabajo distinto (fuera de scope).
3. **fonts**: `styles.css` conserva los `@import` Goole Ffules del proto intactos; el fallback `system-ui` mantiene legible sin red. Si el dev quiere offline total, cambiar el `@import` por cartografía de fuentes local (backlog).