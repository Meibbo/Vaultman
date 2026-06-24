---
title: "Reporte de Regresión: File Ops (Motor de Filtrado y Performance)"
type: regression-report
status: draft
initiative: hardening
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-04T15:00:00
updated: 2026-05-04T16:00:00
tags:
  - agent/regression
  - hardening/logic
---

# Regresión Estructural: FileListComponent (beta.5)

## 1. El Motor de Filtrado Multiaxial (Triple Search)
La implementación de la beta.5 superaba a HEAD en la capacidad de **refinamiento cruzado**. Mientras que HEAD usa un buscador de "un solo eje", beta.5 permitía segmentar archivos por criterios independientes pero acumulativos.

### Lógica de Intersección (beta.5):
El sistema realizaba un "pipeline" de filtrado donde cada paso reducía el set de datos:
1. **SearchTerm:** Búsqueda difusa global.
2. **SearchName:** Filtro estricto por nombre de archivo.
3. **SearchFolder:** Filtro por jerarquía de carpetas.

```typescript
// Fragmento de lógica acumulativa
let filtered = this.currentFiles;
if (this.searchTerm) filtered = filtered.filter(f => f.basename.toLowerCase().includes(this.searchTerm));
if (this.searchFolder) filtered = filtered.filter(f => f.path.includes(this.searchFolder)); // Intersección
```

### El "Filtro de Selección" (L40)
Una funcionalidad crítica perdida es `filterSelectedOnly`. Esto permitía al usuario seleccionar 50 archivos dispersos por todo el vault y luego **aislarlos visualmente** para revisarlos antes de ejecutar una operación masiva. En HEAD, el usuario debe confiar en que los archivos seleccionados (que pueden estar fuera de vista por el scroll) son los correctos.

## 2. Performance: RENDER_LIMIT vs Virtualizer
Aunque el nuevo `Virtualizer.svelte` es técnicamente superior (virtualización real de scroll), la beta.5 tenía una lógica de "Carga Progresiva" más predecible para el usuario.

- **beta.5:** Renderizaba los primeros 200 y ofrecía un botón de "Show All". Esto permitía una interacción instantánea sin depender del motor de cálculo de alturas del virtualizador, que a veces falla en Obsidian con fuentes personalizadas.

## 3. Acciones de Lote (Bulk Actions)
beta.5 exponía una API directa para la manipulación de la selección:
- `selectAll()`
- `deselectAll()`
- `invertSelection()`

En la arquitectura actual de Svelte 5, estas acciones requieren pasar por el `ExplorerService` y mutar un `Set` reactivo, lo que ha introducido una latencia visual pequeña pero perceptible en vaults de +5000 archivos que antes no existía debido a la manipulación directa del DOM.

## 4. Conclusión
La migración a Svelte 5 trajo reactividad, pero sacrificó el **aislamiento de selección** (`filterSelectedOnly`) y la **búsqueda jerárquica** independiente.

## 5. Referencias
- `src/superseded/FileListComponent-beta5-WIP.ts` (Implementación completa del motor)
