## 1. Contrato unificado del seam (ViewHost)

El contrato angostado. Se **dropea** Contract B (`onSelect`/`onActivate`/`onFocus`/
`onListContextMenu`). Todos los views reciben la misma familia. `id === ExplorerRowInput.callbackId`.

```ts
// src/types/typeActionRouting.ts
import type { BadgeKind } from '../badges/serviceBadge';

export interface RowInteractionContract {
  onToggle:            (id: string, e?: MouseEvent | KeyboardEvent) => void;
  onRowClick:          (id: string, e: MouseEvent) => void;   // entry de pointer primario; modifiers leídos de e
  onPrimaryAction?:    (id: string, e: MouseEvent) => void;
  onSecondaryAction?:  (id: string, e: MouseEvent) => void;
  onTertiaryAction?:   (id: string, e: MouseEvent | KeyboardEvent) => void;
  onBoxSelect?:        (ids: string[], e: PointerEvent) => void;
  onContextMenu:       (id: string, e: MouseEvent) => void;   // list dispara esto directo; se borra el bridge
  onRowKeydown?:       (id: string, e: KeyboardEvent) => void;
  onSelectAll?:        (ids: string[], e: Event) => void;
  onBadgeDoubleClick?: (queueIndex: number) => void;
  onHoverBadgeAction?: (id: string, kind: BadgeKind, e: MouseEvent | KeyboardEvent) => void;
}
```

Grid/Cards conservan sus nombres de prop internos (`onTileClick`/`onCardClick`) como binding local;
ViewHost ya mapea `rest.onRowClick`→ellos. El único view que cambia su contrato emitido es
**ViewNodeList**.

## 2. Intent seam — `resolveActionIntent`

```ts
// src/types/typeActionRouting.ts
export type ActionSurface  = 'row' | 'caret' | 'button' | 'fab' | 'badge';
export type ActionGesture  = 'click' | 'aux' | 'dblclick' | 'longpress'
                           | 'swipe-left' | 'swipe-right' | 'drag' | 'hover';
export type ActionPointer  = 'mouse' | 'touch' | 'pen' | 'keyboard';

export interface ActionModifiers { additive: boolean; range: boolean; alt: boolean; }

export interface ActionIntentQuery {
  surface: ActionSurface;
  gesture: ActionGesture;
  modifiers: ActionModifiers;
  pointerType: ActionPointer;
}

// Resultado: qué acción de nodo ejecutar. Reusa la unión existente de serviceMouse.
export type NodeActionKind = 'select' | 'filter' | 'open' | 'node-note' | 'delete'
                           | 'toggle' | 'context-menu' | 'activate' | 'ignored';

export interface ActionIntent {
  kind: NodeActionKind;
  // Para los kinds que mutan selección, los modifiers ya traducidos a {additive,range}.
  selection?: { additive: boolean; range: boolean };
}
```

`resolveActionIntent(query, mouseConfig): ActionIntent`. v1.2.0 resuelve `surface ∈ {row,caret}`,
`gesture ∈ {click,aux,keyboard}`, `pointerType ∈ {mouse,keyboard}`. Para cualquier otra combinación
retorna `{ kind: 'ignored' }` con un comentario `// reserved: <home>`. El mapeo click→kind respeta
`resolveNodeMouseActions` (serviceMouse.ts): default primary=`filter`, secondary=`open`,
tertiary=`delete`.

