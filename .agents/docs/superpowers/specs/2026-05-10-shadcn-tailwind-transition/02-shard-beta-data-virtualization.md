---
title: Shard BETA - Data & Virtualization Engine
type: implementation-shard
parent: "[[index]]"
created: 2026-05-10
---

# Shard BETA: Data & Virtualization Engine

## 1. Objetivo Técnico
Migrar las vistas de alto rendimiento (`ViewNodeTable`, `ViewNodeGrid`) a shadcn-svelte e integrar **PretextJS** para el cálculo de alturas dinámicas en las filas virtualizadas.

## 2. Acciones de Implementación

### 2.1. Integración de PretextJS
Sustituir la constante `TABLE_ROW_HEIGHT = 32` por un medidor dinámico:

```typescript
import { Pretext } from '@chenglou/pretext';

const pretext = new Pretext({
  font: 'var(--font-interface)',
  fontSize: '14px',
});

// En el virtualizador
estimateSize: (index) => {
  const node = nodes[index];
  return pretext.measure(node.label, { width: currentColumnWidth }).height;
}
```

### 2.2. Componentes de Tabla shadcn
Migrar el renderizado de `ViewNodeTable.svelte` para usar los componentes de shadcn, pero manteniendo el posicionamiento absoluto:

```svelte
<Table.Root class="vm-node-table tw-w-full">
  <Table.Header>
    <!-- Renderizado de cabeceras de TanStack Table -->
  </Table.Header>
  <Table.Body class="tw-relative" style="height: {totalHeight}px">
    {#each renderedRows as virtualRow}
      <Table.Row 
        class="vm-node-table-row tw-absolute tw-w-full"
        style="top: {virtualRow.start}px"
      >
        <!-- Celdas -->
      </Table.Row>
    {/each}
  </Table.Body>
</Table.Root>
```

## 3. Manejo de Contenedores
Para evitar "naked divs" en el Grid:
- Cada tile del grid debe mantener la clase `.vm-node-grid-tile`.
- Usar Tailwind para el layout del grid (`tw-grid`, `tw-gap-2`) aplicado directamente sobre la clase `.vm-node-grid-inner`.

## 4. Definición de Hecho (DoD)
- `ViewNodeTable` renderizando con componentes de shadcn.
- El scroll virtual sigue siendo fluido (60fps) con 10,000 nodos.
- Las alturas de fila se ajustan si el texto del nodo hace wrap (vía Pretext).
