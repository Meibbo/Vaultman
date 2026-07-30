## 3. `serviceRowAction` — builder

```ts
// src/services/serviceRowAction.ts
import type { NodeSelectionService } from './serviceSelection.svelte';
import type { MouseGestureService, NodeMouseActionConfig } from './serviceMouse';
import type { KeyboardNavController } from './serviceKeyboardNav';

export interface RowActionContext {
  explorerId: string;
  orderedIds: () => readonly string[];        // projection visible (range + keyboard); función para frescura reactiva
  selection: NodeSelectionService;
  mouse: MouseGestureService;
  mouseConfig: NodeMouseActionConfig;
  keyboard: KeyboardNavController;
  isExpandable: (id: string) => boolean;
  isExpanded:   (id: string) => boolean;
  onToggle:     (id: string, e?: Event) => void;
  onContextMenu:(id: string, e: MouseEvent) => void;
  // sinks resueltos por kind (filter/open/select/node-note/delete/activate)
  dispatch: (intent: ActionIntent, id: string, e: Event) => void;
}

export interface RowProps {
  role: 'treeitem' | 'row' | 'gridcell' | 'option';   // según topology/native vocab
  tabindex: 0 | -1;
  'aria-selected': boolean;
  'aria-expanded'?: boolean;                            // solo si isExpandable
  'data-row-key': string;                               // = callbackId  (T.G assert)
  onclick:      (e: MouseEvent) => void;
  onauxclick:   (e: MouseEvent) => void;
  oncontextmenu:(e: MouseEvent) => void;
  onkeydown:    (e: KeyboardEvent) => void;
}

export interface CaretProps {
  role: 'button';
  tabindex: -1;
  'aria-hidden': true;        // el caret es afordancia redundante; la row (treeitem) maneja aria-expanded
  onclick: (e: MouseEvent) => void;   // stopPropagation + onToggle
}

export interface RowActionBuilder {
  getRowProps(id: string): RowProps;
  getCaretProps(id: string): CaretProps;
  getKeyboardHandlers(id: string): { onkeydown: (e: KeyboardEvent) => void };
}

export function createRowAction(ctx: RowActionContext): RowActionBuilder;
```

Los views hacen `{...getRowProps(id)}` / `{...getCaretProps(id)}` sobre su markup existente. El builder es función pura (sin estado de componente) → testeable en jsdom (T.G Tier-1).

## 4. `serviceKeyboardNav` — state machine topology-aware

```ts
// src/services/serviceKeyboardNav.ts
export type NavTopology = 'linear' | 'planar' | 'planar-drill';

export interface PlanarGeometry {
  columnsAt: (id: string) => number;     // columnas de la fila/plane actual
  indexOf:   (id: string) => number;     // índice en orderedIds
}

export interface KeyboardNavContext {
  explorerId: string;
  topology: NavTopology;
  orderedIds: () => readonly string[];
  geometry?: PlanarGeometry;             // requerido si topology !== 'linear'
  selection: NodeSelectionService;
  isExpandable: (id: string) => boolean;
  isExpanded:   (id: string) => boolean;
  parentOf:     (id: string) => string | null;
  firstChildOf: (id: string) => string | null;
  expand:   (id: string) => void;
  collapse: (id: string) => void;
  activate: (id: string, e: KeyboardEvent) => void;   // Enter → secondary action (paridad con hoy)
  drill?:   { descend: (id: string) => boolean; ascend: () => boolean };  // planar-drill (3D)
  labelOf:  (id: string) => string;      // para type-ahead
  reveal:   (id: string) => void;
}

export interface KeyboardNavResult { handled: boolean; }

export interface KeyboardNavController {
  handleKeydown(focusedId: string, e: KeyboardEvent): KeyboardNavResult;
  resetTypeAhead(): void;
}

export function createKeyboardNav(ctx: KeyboardNavContext): KeyboardNavController;
```

### Tabla de teclas (mandatoria, WAI-ARIA Tree + extensiones)

| Tecla | linear | planar | planar-drill |
|---|---|---|---|
| ArrowDown / ArrowUp | `moveFocus ±1` | mover una fila (±columns) | igual planar |
| ArrowLeft / ArrowRight | tree: collapse / expand-o-firstChild; otros: prev/next si aplica | mover ±1 en x | x; en container: Left=ascend, Right=descend |
| Home / End | first / last (orderedIds) | first / last | first / last del plane |
| Enter | `activate` (secondary action) | igual | container → descend; hoja → activate |
| Space | `toggleFocused {additive,range}` | igual | igual |
| Backspace | — | — | ascend (pop plane) |
| Shift+Arrow | range vía `moveFocus {range:true}` | range | range |
| Ctrl/Cmd+A | `onSelectAll` | igual | igual |
| type-ahead (a-z…) | match prefijo de `labelOf`, buffer con timeout | igual | igual |

Type-ahead: buffer interno keyed por `explorerId`, reset por timeout (~500ms). Es el gap principal a construir (no existe hoy en ningún view). Home/End también es gap a nivel panel (hoy solo en ViewNodeList inline).

