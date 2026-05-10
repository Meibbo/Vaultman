---
title: Spec 11 - Bits UI Bridge & Multi-Column Main View
type: architecture-spec
parent: "[[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/index|index]]"
created: 2026-05-10
tags:
  - architecture/ui
  - bits-ui
  - multi-column
  - main-view
---

# Specification: Bits UI Bridge & Multi-Column Main View

## 1. El Rol de Bits UI (Headless Engine)
Vaultman usará Bits UI v1.0 para inyectar lógica de accesibilidad y comportamiento sin imponer un DOM rígido. Esto es esencial para el **Mimetismo del DOM**.

### Estrategia de Intercepción:
- **Breadcrumbs:** Envolver el HTML nativo de Obsidian en un `DropdownMenu.Root` de Bits UI. Al hacer clic, se activa el menú de navegación de Vaultman sobre el elemento nativo.
- **Properties:** Usar `Accordion.Root` de Bits UI para mimetizar y expandir las propiedades nativas del documento, permitiendo "Adopted Nodes" (headers) dentro de la vista de propiedades.

## 2. Main View: El Layout Dinámico
El Big Picture consiste en una vista adaptativa que pasa de "Single Tab" (Mobile/Sidebar) a "Multi-Column Dashboard" (Main Leaf).

### Orquestación por `serviceLayout`:
- **Breakpoint Detection:** El frame detectará su propio ancho.
- **Modo Dashboard (Width > 800px):**
  - Columna 1: Filtros Activos (Fijo).
  - Columna 2: Explorador Principal (Files/Tags/Props).
  - Columna 3: Detalles/Add-ons (Markdown Rendered / Stats).

### Snippet-Based Layout:
```svelte
{#if layoutService.isDashboard}
  <div class="tw-grid tw-grid-cols-3 tw-gap-4">
    {@render col1()}
    {@render col2()}
    {@render col3()}
  </div>
{:else}
  <div class="tw-flex tw-flex-col">
    {@render mobileTabs()}
  </div>
{/if}
```

## 3. Adopted Nodes & Cross-Pollination
- **Concepto:** Permitir que un explorador "adopte" la jerarquía de otro.
- **Implementación:** El `provider` de archivos (`explorerFiles`) consultará al `provider` de outlines (`explorerOutline`) si la opción "Adopt Headers" está activa, inyectando los headers de un `.md` como `children` virtuales del nodo archivo.

## 4. Intercepción de Snippets y Plugins (Ctrl+Click)
- **Snippets:** Capturar clics en la lista de snippets de Obsidian. Si `Ctrl+Click`, disparar la creación/apertura de la nota vinculada con el alias `$snippetname`.
- **Plugins:** Capturar clics en el Settings de Obsidian. Si `Ctrl+Click` sobre el nombre de un plugin, abrir la nota con alias `%pluginname`.
