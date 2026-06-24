---
title: "Reporte de Regresión: Feedback Visual (Highlight y Bubbling)"
type: regression-report
status: draft
initiative: hardening
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-04T14:55:00
updated: 2026-05-04T15:50:00
tags:
  - agent/regression
  - visuals/explorer
---

# Regresión de Feedback Visual: Highlight y Bubbling

## 1. Highlight de Filtro Activo: El "Grifo sin Agua"
Existe una contradicción crítica entre el contrato de la UI y el suministro de datos en los proveedores.

### Estado en el Componente (`viewTree.svelte`):
Sorprendentemente, el componente visual **SÍ** está preparado para recibir filtros activos:
```svelte
// viewTree.svelte L12
activeFilterIds?: Set<string>;
// viewTree.svelte L145 (aproximado)
class:is-active-filter={activeFilterIds?.has(node.id)}
```

### El Fallo en el Proveedor (`explorerTags.ts` / `explorerProps.ts`):
La regresión reside en que los proveedores de datos (Providers) han dejado de inyectar el `Set` desde el `filterService`. 

**Lógica Perdida (beta.15 - Estructura de Referencia):**
En las versiones beta, el método `_decorateTree` realizaba una consulta activa al servicio de filtros para cada nodo:
```typescript
const activeIds = this.plugin.filterService.getActiveFilterIds(); // <-- ESTA LLAMADA DESAPARECIÓ
// ...
const nodes = this._decorateTree(rawNodes, activeIds);
```

**Consecuencia:** El componente visual tiene la capacidad de brillar (`is-active-filter`), pero nunca recibe la orden porque el proveedor le envía un `Set` vacío o `undefined`.

## 2. Bubbling de Badges: La Pérdida de la Recursividad
El "bubbling" es la capacidad de un nodo padre de mostrar insignias (badges) de sus hijos cuando están colapsados. Esto es vital para saber si hay archivos pendientes de renombrar o mover dentro de una carpeta cerrada.

### Lógica Técnica de Reconstrucción (beta.15):
El algoritmo de decoración original era recursivo y condicional al estado de expansión.

```typescript
private _bubbleBadges(node: TreeNode): Badge[] {
    let badges: Badge[] = [...(node.badges || [])];
    
    // Solo hacemos bubbling si el nodo está colapsado
    if (!this.expandedIds.has(node.id) && node.children) {
        for (const child of node.children) {
            const inherited = this._bubbleBadges(child); // RECURSIÓN
            for (const b of inherited) {
                // Evitar duplicados (ej: varios archivos con el mismo badge de operación)
                if (!badges.some(existing => existing.label === b.label)) {
                    badges.push({ ...b, accent: 'var(--text-muted)', isInherited: true });
                }
            }
        }
    }
    return badges;
}
```

### Situación en HEAD:
La lógica de `_decorateTree` actual es lineal. Procesa cada nodo de forma aislada, perdiendo la visibilidad de la profundidad del árbol.

## 3. Plan de Restauración
1. **Inyección en Provider:** Modificar `explorerTags.ts` y similares para que hereden de `BaseExplorerProvider` (si existe) o inyecten manualmente el `filterService` en el loop de decoración.
2. **Implementación de `_bubbleBadges`:** Re-introducir el método recursivo en la lógica de decoración de los proveedores Svelte.
3. **CSS Hook:** Verificar que `.is-active-filter` tenga un estilo definido (ej: `border-left: 2px solid var(--interactive-accent)`).

## 4. Referencias
- `src/components/views/viewTree.svelte` (Soporte visual presente)
- `src/components/containers/explorerTags.ts` (Lógica de datos rota)
