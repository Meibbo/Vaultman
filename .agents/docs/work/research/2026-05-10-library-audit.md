---
title: Audit - Dependency Health & Purgatory List
type: library-audit
status: active
created: 2026-05-10
tags:
  - architecture/audit
  - technical-debt
  - bundle-optimization
---

# Library Audit: Vaultman v1.0-rc.2

## 1. Librerías Core (Mantenimiento Crítico)
- **Svelte 5 & Runes:** Base de reactividad.
- **TanStack Suite:** Gestión de datos y virtualización.
- **@thisux/sveltednd:** Motor de arrastre nativo para Svelte 5.
- **PretextJS:** Motor de medición ultra-rápida.

## 2. Lista de Purga (Technical Debt)
- **@svar-ui/svelte-filemanager:** 
  - **Motivo:** DOM propietario incompatible con el mimetismo de Obsidian. Gran tamaño de bundle.
  - **Acción:** Eliminar tras verificar que `ViewNodeTable` y `ViewNodeGrid` cubren sus casos de uso.
- **Plugins de Esbuild (Legacy):**
  - **Motivo:** El proyecto ha migrado a `Vite+`. Estos plugins son ruidos en el `package.json`.
  - **Acción:** Eliminar `esbuild-svelte` y `esbuild-sass-plugin`.

## 3. Estrategia de Carga (Startup Optimization)
- **@git-diff-view/svelte:**
  - **Crítica:** Demasiado pesada para el `onload`.
  - **Acción:** Implementar carga perezosa (Lazy Load) en el shard de la Cola de Operaciones.

## 4. Próxima Integración (The Chameleon Stack)
- **UnoCSS:** Sustituirá la necesidad de más librerías de componentes (UI Kits).
- **Bits UI:** Proveerá la accesibilidad sin añadir peso visual.
- **DaisyUI:** Solo como capa de utilidades semánticas para el modo "Thick".

## 5. Riesgos de Versión
- `typescript ~5.8.0`: Estamos en la vanguardia. Asegurar que los tipos de `obsidian` nativos no se rompan con las versiones más estrictas de TS.
