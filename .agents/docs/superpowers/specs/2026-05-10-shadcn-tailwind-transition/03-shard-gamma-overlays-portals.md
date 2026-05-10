---
title: Shard GAMMA - Overlays & Floating Layer
type: implementation-shard
parent: "[[index]]"
created: 2026-05-10
---

# Shard GAMMA: Overlays & Floating Layer

## 1. Objetivo Técnico
Modernizar la capa flotante (islas, popovers, modales) usando **Bits UI** (foundation de shadcn-svelte) para garantizar accesibilidad y un manejo de portales robusto en el entorno multi-ventana de Obsidian.

## 2. Acciones de Implementación

### 2.1. El Ancla del Portal
Configurar todos los componentes flotantes para que su `Portal` apunte al contenedor raíz del plugin (`.vm-root`) en lugar de `document.body`. Esto evita que los modales "desaparezcan" detrás de la interfaz de Obsidian.

```svelte
<Dialog.Portal target=".vm-root">
  <Dialog.Overlay class="tw-fixed tw-inset-0 tw-bg-black/50" />
  <Dialog.Content class="vm-modal tw-fixed tw-left-1/2 tw-top-1/2 ...">
    <!-- Contenido -->
  </Dialog.Content>
</Dialog.Portal>
```

### 2.2. Migración de Islas (Find & Replace)
`serviceFnRIsland` se conectará a un componente `Popover.Root` controlado:

```svelte
<Popover.Root bind:open={fnrService.expanded}>
  <Popover.Trigger class="vm-btn-find ...">
    <!-- Trigger -->
  </Popover.Trigger>
  <Popover.Content>
    <!-- Formulario de shadcn -->
  </Popover.Content>
</Popover.Root>
```

## 3. Sincronización de Estado
- El `OverlayStateService` debe exponer Runes que se vinculen directamente a los props `bind:open` de los componentes de shadcn.

## 4. Definición de Hecho (DoD)
- Todos los Dropdowns e Islas migrados a Bits UI.
- Los modales se cierran correctamente al presionar ESC (manejo nativo de Bits UI).
- Los portales renderizan dentro del contexto del plugin (verificación visual).
