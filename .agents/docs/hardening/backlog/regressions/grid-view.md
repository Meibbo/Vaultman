---
title: "Reporte de Regresión: Grid View (Densidad Tabular y Selección Masiva)"
type: regression-report
status: draft
initiative: hardening
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-04T15:00:00
updated: 2026-05-04T16:05:00
tags:
  - agent/regression
  - hardening/ui
---

# Regresión Estructural: Grid View (beta.15)

## 1. Densidad de Información Tabular
La `GridView` original no era solo una lista, era una **herramienta de auditoría rápida**. Permitía comparar archivos por su "peso" de metadatos (`propCount`) y su frescura (`mtime`) de forma alineada, algo que en las "Cards" actuales requiere un escaneo visual mucho más lento.

### Lógica de Metadatos Dinámicos (L25-30):
El sistema no solo contaba propiedades, sino que discriminaba la posición del frontmatter para dar un número real de "Data Points" al usuario. Esta métrica (`propCount`) es vital para identificar notas vacías o sobre-indexadas.

## 2. El "Master Checkbox" y el Estado Indeterminado
Esta es quizás la regresión de UX más sutil pero dañina. En HEAD, el checkbox de "Seleccionar Todo" es binario (On/Off).

### La Lógica de Feedback (beta.15 - L36):
El estado `indeterminate` informaba al usuario cuando **solo una parte** de la vista filtrada estaba seleccionada.
- **Checked:** Todos los visibles seleccionados.
- **Unchecked:** Ninguno seleccionado.
- **Indeterminate:** Mezcla (algunos sí, algunos no).

Sin este estado (presente en L46), el usuario puede ejecutar operaciones sobre archivos que no sabía que estaban seleccionados "fuera de cámara" (scroll arriba/abajo).

## 3. Ordenamiento por Columnas (Sort-by-Click)
La `GridView` permitía cambiar el orden de la lista haciendo click directamente en el encabezado de la columna (`Name`, `Date`, `Path`), disparando una re-ordenación instantánea.

```typescript
// beta.15 - Lógica de Click en Header
headerCell.onclick = () => {
    if (this.sortColumn === columnId) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        this.sortColumn = columnId;
        this.sortDirection = 'asc';
    }
    this.refresh();
};
```
**Estado en HEAD:** El ordenamiento ahora está escondido detrás de un popup independiente en la Navbar, lo que añade un click extra (fricción) por cada cambio de criterio.

## 4. Conclusión
La unificación hacia componentes Svelte 5 priorizó la consistencia visual y la reactividad, pero sacrificó la **densidad de datos** y los **atajos de ordenamiento** que hacían de Vaultman una herramienta de gestión de datos superior a la búsqueda nativa de Obsidian.

## 5. Referencias
- `src/superseded/viewGrid-WIP.ts` (Lógica de cabeceras dinámicas)
- `src/superseded/GridView-beta12-WIP.ts` (Implementación de estado indeterminado)
