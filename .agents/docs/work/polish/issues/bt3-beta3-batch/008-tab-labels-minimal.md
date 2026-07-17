---
title: BT3-008 — Tab labels en minimal + responsive searchbox
type: issue
status: pending
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish]
---

# BT3-008 — Tab labels en minimal + responsive searchbox

**Bug (D16).** `filtersShowTabLabels` (default true) solo alimenta `NavbarTabs`
(barra experimental); en minimal esa barra no se renderiza
(`pageFilters.svelte:692`) → toggle inerte para el default de usuario nuevo
(`minimalStyle: true`). El label del botón de tabs del header se gobierna aparte
(`showTabsButtonLabel`, `navbarFilters.svelte:1101-1128` — hoy solo Content lo
muestra, herencia SDF-009).

**Fix.** En minimal, `filtersShowTabLabels` controla el **label del tab activo en el
botón de tabs** (generaliza el mecanismo SDF-009 a todos los tabs; `false` → solo
icono, comportamiento Content incluido). **Parche temporal asumido** — el refactor
sandbox abstrae esto después; anotar TODO-refactor en el código.

**Responsive.** El label consume ancho del host frame: extender
`logicResponsiveLayout.ts` para que el colapso por falta de width esconda TAMBIÉN el
searchbox cuando label activo + ancho insuficiente (prioridad de sacrificio: nodos
condensables → searchbox; el min-width del frame no debe romperse).

**DoD (AFK):**
- Unit `logicResponsiveLayout`: matriz width×label → visibilidad searchbox.
- Unit/guard: toggle off → botón sin span de texto; on → label del tab activo.
- Gates estándar + autofixer.

**HITL dev:** breakpoint exacto/feel en frame estrecho.
