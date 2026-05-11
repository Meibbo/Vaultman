---
title: Performance Spec 02 - Data Flattening & Normalization
type: optimization-spec
status: active
created: 2026-05-10
tags:
  - performance/data
  - architecture/normalization
---

# Performance Spec 02: Index-Time Data Flattening

## 1. Problema Actual
La función `applyFilter` en `ExplorerService.svelte.ts` realiza una búsqueda O(n) sobre un árbol jerárquico en cada renderizado. El `flattenMeasured` se ejecuta durante la vista, lo que bloquea el hilo principal si hay miles de nodos.

## 2. Solución: Normalización (Pattern Robo de Obsidian Core)
Mover el aplanado y el pre-procesamiento al `NodeIndex`.

### Contrato de Implementación:
1. **Pre-cálculo:** El `explorerFiles` debe generar un mapa plano `ID -> FlatNode` una sola vez al indexar.
2. **Search Cache:** Mantener un índice de búsqueda en minúsculas pre-calculado para evitar miles de llamadas a `.toLowerCase()`.

```typescript
// serviceExplorer.svelte.ts optimizado
class ExplorerService {
  // Solo filtramos sobre IDs, la data ya está aplanada en el Index
  filteredIds = $derived.by(() => {
    return this.idx.flatIds.filter(id => this.idx.getSearchBuffer(id).includes(this.query));
  });
}
```

## 3. Beneficios
- **Latencia de búsqueda:** Pasa de ~100ms a < 5ms en vaults de 10k archivos.
- **Renderizado:** La tabla virtualizada consume una lista plana estática, eliminando recursión en el render.
