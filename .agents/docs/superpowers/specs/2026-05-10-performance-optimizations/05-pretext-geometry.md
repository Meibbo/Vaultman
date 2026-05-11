---
title: Performance Spec 05 - Dynamic Geometry with Pretext
type: optimization-spec
status: active
created: 2026-05-10
tags:
  - performance/geometry
  - pretextjs
  - virtualization/dynamic-height
---

# Performance Spec 05: Dynamic Geometry with PretextJS

## 1. Problema Actual
Vaultman usa una altura de fila fija (`TABLE_ROW_HEIGHT = 32`). Esto impide mostrar labels multilínea o "Adopted Nodes" (headers) sin romper el virtualizador. Medir el DOM en tiempo real (`getBoundingClientRect`) durante el scroll o el redimensionamiento de columnas causa **Layout Thrashing**, degradando los FPS.

## 2. Solución: Medición en Memoria (Pattern Pretext)
Utilizar `serviceTextMeasure.ts` (basado en `@chenglou/pretext`) para delegar el cálculo de geometría al motor de Canvas en memoria, evitando cualquier lectura del DOM.

### Contrato de Implementación:
1. **Configuración de Estilo:** Extraer dinámicamente las variables de fuente de Obsidian (`--font-interface`, `--nav-item-size`) para sincronizar Pretext con el tema visual.
2. **Virtualización Dinámica:** Inyectar la medición en el `estimateSize` de TanStack Virtual.

```typescript
// Integración en ViewNodeTable.svelte o ViewNodeGrid.svelte
const rowVirtualizer = createVirtualizer({
    count: nodes.length,
    estimateSize: (index) => {
        const node = nodes[index];
        // Medición instantánea en memoria
        const { height } = textMeasureService.measure(
            node.label, 
            { font: currentThemeFont, lineHeight: 1.4 }, 
            currentColumnWidth
        );
        return Math.max(MIN_ROW_HEIGHT, height + PADDING);
    },
    // ...
});
```

3. **Real-time Resizing:** Al arrastrar el resizer de columnas, actualizar `currentColumnWidth`. El virtualizador recalculará las alturas instantáneamente gracias a la caché de Pretext, logrando un efecto "sedoso".

## 3. Beneficios
- **Elasticidad:** Permite que las filas "engorden" o "enflaquen" según el contenido sin perder el scroll virtual.
- **Zero Reflow:** No se realizan lecturas de `offsetHeight` en el hilo principal durante el scroll.
- **Precisión:** Posicionamiento exacto para la Spec 04 (GPU-Acceleration).
