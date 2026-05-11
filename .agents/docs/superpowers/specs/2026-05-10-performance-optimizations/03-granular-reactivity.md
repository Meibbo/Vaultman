---
title: Performance Spec 03 - Granular Selection Reactivity
type: optimization-spec
status: active
created: 2026-05-10
tags:
  - performance/reactivity
  - svelte5/runes
---

# Performance Spec 03: Granular Selection with SvelteMap

## 1. Problema Actual
En `NodeSelectionService.svelte.ts`, el estado de selección es un `Set` global.
```typescript
selectedIds = $state(new Set());
```
Cuando el usuario selecciona un archivo, se crea un nuevo `Set`. Svelte 5 detecta que la referencia cambió e invalida TODAS las filas visibles. Si hay 40 filas visibles, las 40 se re-renderizan aunque solo una haya cambiado de color.

## 2. Solución: SvelteMap (Pattern Robo de Svar UI)
Usar `SvelteMap<string, boolean>` para que cada fila sea un consumidor aislado.

### Contrato de Implementación:
```svelte
<!-- ViewNodeTableRow.svelte -->
<script>
  // Esta fila solo se re-renderiza si SU ID cambia en el mapa
  const isSelected = $derived(selectionService.map.get(id) ?? false);
</script>
<div class:is-selected={isSelected}> ... </div>
```

## 3. Beneficios
- **Surgical Updates:** Al seleccionar 1 archivo de 10,000, solo se ejecuta el trabajo de pintado para ese nodo exacto.
- **CPU:** Ahorro masivo de ciclos de CPU en selecciones múltiples por rango (`Shift+Click`).
