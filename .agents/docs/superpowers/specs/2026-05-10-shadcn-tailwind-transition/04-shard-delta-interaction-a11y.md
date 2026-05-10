---
title: Shard DELTA - Interaction & A11y Bridge
type: implementation-shard
parent: "[[index]]"
created: 2026-05-10
---

# Shard DELTA: Interaction & A11y Bridge

## 1. Objetivo Técnico
Garantizar que la sofisticada lógica de interacción de Vaultman (`serviceMouse`, `logicKeyboard`) se integre sin fricciones con los nuevos componentes de shadcn, inyectando accesibilidad e i18n transversalmente.

## 2. Acciones de Implementación

### 2.1. Hijacking de Eventos
Los componentes de shadcn (como `Button`) deben pasar sus eventos de clic al `serviceMouse` para mantener la lógica de doble-clic y selección:

```svelte
<Button 
  class="vm-node-action"
  onclick={(e) => mouseService.handleClick({ key: node.id }, e, handlers)}
>
  <Icon name="pencil" />
</Button>
```

### 2.2. Inyección de i18n
Crear un wrapper o directiva que inyecte automáticamente las traducciones de `translate()` en los props de shadcn:

- `placeholder` en Inputs.
- `aria-label` en Botones.
- `title` en Tooltips.

### 2.3. Auditoría de Selectores de Ignorado
Actualizar `NODE_MOUSE_IGNORE_SELECTOR` en `serviceMouse.ts` para incluir los nuevos atributos de shadcn/radix (ej. `[data-radix-collection-item]`) para asegurar que la selección de filas no se dispare al interactuar con sub-componentes.

## 3. Teclado y Foco
Asegurar que el Focus Trap de los modales de shadcn no bloquee los atajos globales de Obsidian (como `Ctrl+P`) mediante la configuración de `preventScroll` y `loop` en Bits UI.

## 4. Definición de Hecho (DoD)
- Atajos de teclado (`ArrowUp`, `Enter`, `Shift+Click`) funcionando en las nuevas tablas virtualizadas.
- Todos los nuevos componentes tienen etiquetas ARIA traducidas.
- La interacción se siente idéntica a la versión previa pero con el feedback visual de shadcn.
