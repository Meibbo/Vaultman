---
title: Research - shadcn-svelte vs Manual Primitives
type: architecture-comparison
status: completed
created: 2026-05-10
tags:
  - research/ui
  - architecture/decision
---

# Comparativa: shadcn-svelte vs. Sistema Actual de Vaultman

## 1. El Costo de "Seguir como estamos"
Actualmente, cada nuevo componente UI en Vaultman requiere:
- Escribir la estructura Svelte 5.
- Escribir el SCSS ITCSS correspondiente.
- Implementar manualmente el manejo de teclado y accesibilidad (WAI-ARIA).
- Mantener la sincronización de variables de Obsidian vía `$derived`.

**Riesgo:** La deuda técnica de accesibilidad crece linealmente con cada componente. No hay un "standard" de interacción entre el `Toggle` y el `Dropdown`.

## 2. El Beneficio de shadcn-svelte (v2 / Svelte 5)
- **Base Robusta:** Bits UI maneja los estados complejos (open/close, focus, aria-expanded).
- **Tailwind v4 Integration:** Permite usar variables de Obsidian como tokens de diseño de forma nativa (`tw-text-accent`).
- **Developer Experience:** Menos archivos SCSS que mantener. El estilo vive con el componente.

## 3. Matriz de Paridad (Componentes Clave)

| Componente Vaultman | Equivalente shadcn | Ganancia Técnica |
| :--- | :--- | :--- |
| `BtnSquircle.svelte` | `Button` | Variantes (ghost, outline) y estados de carga nativos. |
| `Badge.svelte` | `Badge` | Mejor manejo de escalado y colores semánticos. |
| `Dropdown.svelte` | `Select` / `Dropdown Menu` | Accesibilidad de teclado (flechas, escape) completa. |
| `TextInput.svelte` | `Input` | Estilos de foco consistentes y validación visual. |
| `Island (manual)` | `Popover` / `Card` | Portaling correcto en el workspace de Obsidian. |

## 4. ¿Qué perdemos realmente?
1. **Compacidad del CSS:** El CSS generado por Tailwind puede ser más grande que tu SCSS optimizado a mano si no se configura bien el purgado.
2. **Semántica de Inspector:** En lugar de ver `.vm-badge`, verás una cadena de clases `tw-inline-flex tw-items-center...`. (Solucionable con el patrón `@apply` en SCSS).
3. **Control Químico:** La lógica interna de Bits UI es una "caja negra" comparada con tus funciones manuales. Si hay un bug en el manejo del foco de Bits UI dentro de Obsidian, dependerás de un upstream fix o de un parche manual.

## Conclusión
La migración a **shadcn-svelte v2** es recomendada porque Vaultman ha alcanzado un nivel de complejidad donde mantener la accesibilidad y consistencia visual a mano es ineficiente. La pérdida de "control total" se compensa con una velocidad de desarrollo 3x superior en la Fase 4 y 5 del Roadmap.
