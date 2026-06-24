---
title: "Reporte de Regresión: Navbar (Arquitectura Dual y Gestión de Badges)"
type: regression-report
status: draft
initiative: hardening
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-04T15:00:00
updated: 2026-05-04T15:55:00
tags:
  - agent/regression
  - hardening/ui
---

# Regresión Estructural: Navbar (beta.1 vs HEAD)

## 1. Mapeo de los 7 Puntos de Control
El Navbar de la beta.1 era un centro de mando unificado. En HEAD, esta lógica se ha fragmentado entre `navbarExplorer.svelte`, `navbarTabs.svelte` y el sistema de `PopupIslands`.

| Botón (beta.1) | Icono | Estado en HEAD | Ubicación Actual |
| :--- | :--- | :--- | :--- |
| **1. Panel Left** | `panel-left` | ❌ Eliminado | N/A (Se asume control nativo de Obsidian) |
| **2. Filter** | `filter` | ⚠️ Desplazado | Movido al `ActiveFiltersIsland` (Popup) |
| **3. Search** | `search` | ✅ Preservado | Integrado en el `search-pill` de la barra |
| **4. List Filter** | `list-filter`| ❌ Eliminado | El filtrado por Scope ya no es accesible vía icono rápido |
| **5. Sort** | `arrow-up-down`| ✅ Preservado | `navbarExplorer.svelte:130` |
| **6. Plus** | `plus` | ❌ Eliminado | La creación de propiedades rápidas no tiene punto de entrada |
| **7. Wrench** | `wrench` | ⚠️ Desplazado | Movido al `QueueIsland` (Popup) |

## 2. El "Strip Lateral" (Regresión de Orientación)
En la beta.1, el Navbar podía colapsar en un **Strip Vertical de 36px**.

- **Lógica de CSS Perdida:**
```scss
.vm-navbar.is-vertical {
    flex-direction: column;
    width: 36px;
    height: 100%;
    .vm-nav-icon { margin: 8px 0; }
}
```
- **Problema en HEAD:** `navbarExplorer.svelte` está diseñado exclusivamente como un header horizontal (`vm-glass--top`). Si el explorador de Vaultman se estrecha, el input de búsqueda se rompe visualmente en lugar de mutar a una lista de iconos vertical.

## 3. Gestión de Badges de Notificación
Originalmente, el botón de `filter` y el de `wrench` (Queue) mostraban conteos en tiempo real sobre el icono.

```typescript
// Lógica de badge en beta.1 (NavbarComponent.ts)
this.filterBadge = this.filterIcon.createDiv({ cls: 'vm-nav-badge' });
this.filterBadge.setText(count.toString());
```

**Estado Actual:**
- El conteo de la cola solo es visible **dentro** de la isla una vez abierta.
- No hay feedback visual en la interfaz principal de que existen filtros activos o cambios pendientes en la cola hasta que se interactúa con el componente.

## 4. Conclusión: Pérdida de la "Central de Mando"
La fragmentación actual mejora la limpieza visual pero degrada la **velocidad de operación**. Un usuario experto en la beta.1 podía ver el estado del sistema (filtros y cola) sin abrir ningún popup; en HEAD, el sistema es "opaco" hasta el click.

## 5. Referencias
- `src/components/layout/navbarExplorer.svelte` (Análisis de botones L88-L139)
- `src/superseded/NavbarComponent-beta1-WIP.ts` (Referencia histórica)
