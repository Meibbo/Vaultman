---
title: Toolbar target architecture
type: research
status: draft
parent: "[[docs/work/polish/research/2026-05-17-toolbar-architecture/index|toolbar architecture]]"
created: 2026-05-17T11:49:10
updated: 2026-05-17T11:49:10
tags:
  - agent/research
  - initiative/polish
  - toolbar
  - architecture
created_by: codex
updated_by: codex
---

# Toolbar Target Architecture

## Dirección para hacerlo agnóstico

La separación clave es esta:

- **Primitive:** unidad estable de toolbar, por ejemplo `search`, `sort`,
  `view-mode`, `operation-scope`, `field-pills`, `node-expansion`, `crear`,
  `queue`, `active-filters`, `grid-nav`.
- **Adapter:** traduce una superficie concreta a la interface común. El adapter
  de Filters conserva las llamadas existentes a `FnRIslandService`,
  `frameFiltersSearch`, `overlaySortMenu`, `overlayViewMenu`, queue service y
  settings.
- **Resolver:** decide presencia y orden. Lee capabilities, preset y policy,
  filtra primitives no disponibles y devuelve un `ToolbarModel`.
- **Renderer:** pinta el modelo. No sabe si está en Filters, Tools, Stats o un
  tab detachado.

Interface objetivo mínima:

```ts
type ToolbarSurfaceId = 'filters' | 'tools' | 'statistics' | 'active-filters' | string;

interface ToolbarContext {
  surfaceId: ToolbarSurfaceId;
  activeTabId?: string;
  presetButtons: 'core' | 'full' | readonly string[];
  capabilities: ReadonlySet<string>;
}

interface ToolbarPrimitive {
  id: string;
  slot: 'primary' | 'secondary' | 'overflow';
  defaultOrder: number;
  isAvailable(context: ToolbarContext): boolean;
}
```

El punto importante: esa interface no debe contener handlers arbitrarios
serializados en settings. Los handlers viven en adapters runtime. La config del
usuario solo manipula ids, slots, regiones y orden.

## Unificar orden y presencia sin destruir lógica

No conviene que el usuario o el theme builder editen el DOM ni branches de
`Toolbar.svelte`. Conviene que editen una policy declarativa validada:

```ts
interface ToolbarPlacement {
  primitiveId: string;
  slot?: 'primary' | 'secondary' | 'overflow';
  order?: number;
  visible?: boolean;
}
```

Reglas de seguridad:

- Si `visible: true` pero el adapter no expone capability, el resolver omite la
  primitive y registra motivo debug. Ejemplo: `field-pills` no aparece en
  `statistics`.
- Si el usuario omite un primitive, se usa el default del preset.
- Si dos primitives tienen el mismo `order`, gana el orden estable del registry.
- Si una custom list contiene ids desconocidos, se ignoran sin romper boot.
- `core` y `full` son aliases del registry, no branches hard-coded del
  renderer.
- Los side effects quedan donde ya están: services, page adapters y command
  hooks. El resolver no ejecuta comandos.

Así se puede reordenar y ocultar primitives sin tocar la lógica que aplica
filtros, agrega operaciones, cambia vista, o actualiza settings.

## Plan incremental recomendado

1. Extraer un `ToolbarModel` desde el estado actual de Filters sin cambiar UI:
   mismo DOM, mismos handlers, tests verdes.
2. Introducir `filtersToolbarAdapter` que construya ese modelo desde las props
   actuales de `pageFilters.svelte`.
3. Hacer que `Toolbar.svelte` renderice primitives del modelo para
   `search/sort/view/node-expansion/crear`, manteniendo los popups existentes.
4. Añadir `ToolbarPrimitiveRegistry` con `core` y `full`, y conectar
   `themeService.activePreset.toolbar.buttons`.
5. Migrar primitives vecinas: active-filters squircle row, queue FAB, grid nav
   o PageTools solo cuando cada una tenga adapter propio.
6. Solo después, diseñar el theme builder / WYSIWYG para placement. La UI
   manipula placement policy, no implementación.

## Tests que deberían proteger el cambio

- Unit: `resolveToolbarModel` para `core`, `full`, custom ids, ids inválidos,
  capabilities ausentes y empate de orden.
- Component: Filters toolbar conserva search, sort, view, crear y expansion.
- Component: native preset oculta lo que `core` no permite cuando se conecte.
- Regression: `openViewMenuHook`, `openSortMenuHook` y
  `openContentSearchHook` siguen funcionando desde Filters.
- Component futuro: PageTools puede montar un toolbar con primitives propias
  sin pasar props de Filters.

## Resultado esperado

El theme builder o un preset deja de manipular componentes. Solo produce una
policy de placement. El adapter de cada superficie declara qué puede hacer. El
resolver cruza policy, registry y capabilities. El renderer recibe una lista
estable. Esa es la parte que vuelve versátil al toolbar sin mover de golpe la
lógica de filtros, queue, FnR o explorer views.
