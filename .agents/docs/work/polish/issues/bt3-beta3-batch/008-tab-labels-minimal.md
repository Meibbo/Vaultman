---
title: BT3-008 — Tab labels en minimal + responsive searchbox
type: issue
status: completed
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
updated: 2026-07-17T13:25:04
updated_by: codex-gpt-5
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

## Implementation closeout (2026-07-17)

- Code-only commit: `46243479 fix(filters): honor tab labels in minimal header`.
- `filtersShowTabLabels` controla ahora el label del tab activo para todos los tabs en
  minimal; `false` conserva el botón solo-icono, incluido Content. El puente está marcado
  `TODO(refactor)` para retirarlo cuando el header del sandbox sea dueño del contrato.
- Añadido `shouldShowMinimalSearchInput` en `logicResponsiveLayout.ts`. El escalonado
  conserva primero el umbral existente de condensación de tools (`220px`) y, con label
  activo, oculta el searchbox expandido por debajo de `200px`. Width desconocido (`0`),
  label off y experimental mantienen el comportamiento previo; el estado de búsqueda no
  se muta y reaparece al ensanchar.
- TDD: matriz width×label y source guards fallaron primero y pasaron después. Gate final:
  focal 2 files / 15 tests; full unit 93 files / 486 tests; `pnpm run check` 0/0;
  ESLint, Prettier, build y diff-check verdes; autofixer de
  `navbarFilters.svelte` con `issues:[]`. Sin CSS tocado, Stylelint N/A por alcance.

### Adversarial pass C2

Cubiertos width desconocido, boundary exacto, label off, experimental y search cerrado.
El helper conserva `searchExpanded` y el filtro activo durante el ocultamiento para evitar
pérdida de estado. No mide el ancho real de cada traducción ni garantiza el feel de un
frame <200px: el breakpoint nombrado es temporal y queda HITL. La calidad perdida frente
al status quo es la visibilidad momentánea del input en ese extremo; se evita romper el
min-width y el input vuelve al recuperar ancho.
