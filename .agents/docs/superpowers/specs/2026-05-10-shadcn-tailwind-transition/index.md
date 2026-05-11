---
title: Implementation Spec - Index (Elastic UI Transition)
type: implementation-index
status: active
created: 2026-05-10
tags:
  - implementation/sharding
  - architecture/transition
  - unocss
  - bits-ui
---

# Implementation Spec: Vaultman Elastic UI Transition

Esta especificación detalla la transformación de Vaultman en un **Plugin Camaleónico** capaz de mimetizar el Core de Obsidian y otros plugins (Bases, Outlines), utilizando un stack de alto rendimiento y bajo acoplamiento.

## Stack Tecnológico Definitivo
- **UnoCSS:** Motor de estilo atómico para mimetismo (Shortcuts) e iconos (`i-lucide-*`).
- **Bits UI v1.0:** Motor de comportamiento headless (Svelte 5) para accesibilidad y lógica.
- **DaisyUI:** Capa semántica de componentes para el modo "Thick" (`.btn`, `.card`).
- **Svelte 5:** Runes (`$state`, `$derived`) y Snippets para polimorfismo del DOM.

## Plan de Sharding (Paralelizable)

1.  [[01-shard-alpha-core-bridge|Shard ALPHA: Estilos & Camaleón Bridge]]
    - Instalación de UnoCSS + DaisyUI. Configuración de mimetismo nativo.
2.  [[02-shard-beta-data-virtualization|Shard BETA: Data & Virtualization Engine]]
    - Medición con PretextJS e integración de tablas virtualizadas con Bits UI.
3.  [[03-shard-gamma-overlays-portals|Shard GAMMA: Overlays & Multi-window Portals]]
    - Gestión de modales y popovers seguros para Obsidian Pop-outs.
4.  [[04-shard-delta-interaction-a11y|Shard DELTA: Interaction & Event Hijacking]]
    - Mapeo de `serviceMouse` y `serviceSelection` a los nuevos componentes.

## Expansión de Capacidades (Roadmap v1.1)
- [[07-expansion-dom-interception|Spec 07: Intercepción Profunda del DOM]]
- [[08-expansion-new-explorers|Spec 08: Snippets, Plugins & Adopted Outlines]]
- [[09-expansion-services-dnd|Spec 09: Advanced Services (DnD @thisux, Groups)]]
- [[10-expansion-visual-logic|Spec 10: Faint Mode & FAB Animations]]
- [[11-bitsui-mainview-spec|Spec 11: Main View (3-Column Dashboard)]]
- [[12-interactive-diff-review|Spec 12: Interactive Diff Review & Robust VFS]]
- [[12-data-layer-vfs-immutability|Spec 12: Data Layer - Interactive Diff Review & Robust VFS]]
