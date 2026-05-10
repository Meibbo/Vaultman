---
title: Implementation Spec - Index (Sharded Transition)
type: implementation-index
status: draft
created: 2026-05-10
tags:
  - implementation/sharding
  - architecture/transition
---

# Implementation Spec: Vaultman UI Modernization

Esta especificación detalla la transición de Vaultman a **shadcn-svelte v1.0** y **Tailwind v4**, manteniendo la compatibilidad con el sistema actual de **SCSS (ITCSS)**.

## Arquitectura de Transición: "Hybrid Semantic"

Para evitar contenedores sin clases ("naked divs") y asegurar que el sistema de **SCSS (mixins, tokens, extends)** siga siendo el motor de diseño, adoptamos la siguiente regla:

> **Regla de Oro:** Todo componente UI debe mantener su clase semántica `.vm-*`. Las utilidades de Tailwind se inyectarán mediante `@apply` en los archivos SCSS o como clases complementarias con el prefijo `tw-`.

## Plan de Sharding (Paralelizable)

1.  [[01-shard-alpha-core-bridge|Shard ALPHA: Core & SCSS Bridge]]
    - Configuración de Tailwind v4 con prefijo `tw-`.
    - Ingesta de tokens SCSS en el tema de Tailwind.
    - Porting de Primitivas Base (Button, Input, Badge).
2.  [[02-shard-beta-data-virtualization|Shard BETA: Data & Virtualization Engine]]
    - Migración de `ViewNodeTable` y `ViewNodeGrid`.
    - Integración de **PretextJS** para alturas dinámicas.
3.  [[03-shard-gamma-overlays-portals|Shard GAMMA: Overlays & Floating Layer]]
    - Migración de Modales, Popovers e Islas (FnR) a Bits UI.
    - Gestión de Portales anclados a `.vm-root`.
4.  [[04-shard-delta-interaction-a11y|Shard DELTA: Interaction & A11y Bridge]]
    - Vinculación de `serviceMouse` y gestos semánticos.
    - Inyección de `i18n` y auditoría de accesibilidad.

## Verificación Cruzada
Ningún Shard se considera completado hasta que `pnpm run build` sea exitoso y no existan colisiones de CSS en el entorno de Obsidian.
