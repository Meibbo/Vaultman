---
title: Performance Spec 01 - Event Delegation
type: optimization-spec
status: active
created: 2026-05-10
tags:
  - performance/dom
  - memory/optimization
---

# Performance Spec 01: Global Event Delegation

## 1. Problema Actual
En `ViewNodeTable.svelte` y `ViewNodeGrid.svelte`, cada fila/tile virtualizada registra sus propios listeners:
- `onclick`, `onauxclick`, `oncontextmenu`, `onkeydown`.
Si hay 10,000 nodos, aunque solo se vean 30, Svelte debe gestionar el ciclo de vida de estos listeners en cada scroll, saturando el "Garbage Collector".

## 2. Solución: Listener Único (Pattern Robo de Svar UI)
Eliminar los atributos `onclick` de los componentes internos y mover la lógica al contenedor raíz.

### Contrato de Implementación:
```svelte
<!-- ViewNodeTable.svelte -->
<div 
  class="vm-node-table" 
  onclick={(e) => handleGlobalClick(e)}
>
  <!-- Las filas ya NO tienen onclick -->
  <div class="vm-node-table-row" data-id={node.id}> ... </div>
</div>

<script lang="ts">
  function handleGlobalClick(e: MouseEvent) {
    const target = (e.target as HTMLElement).closest('[data-id]');
    if (!target) return;
    const id = target.getAttribute('data-id');
    // Despachar a serviceMouse
    mouse.handleClick({ key: id, ... }, e, handlers);
  }
</script>
```

## 3. Beneficios
- **Memoria:** Reducción del ~80% en objetos de escucha.
- **Scroll:** Desaparece el micro-lag al montar/desmontar listeners durante el scroll rápido.
