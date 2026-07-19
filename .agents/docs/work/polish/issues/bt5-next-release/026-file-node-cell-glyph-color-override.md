---
title: BT5-026 — Override de Glyph color por nodo o cell
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: HITL
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T10:02:50
updated: 2026-07-19T10:02:50
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5, context-menu]
---

# BT5-026 — Override de Glyph color por nodo o cell

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Extiende
BT5-018 y reutiliza la paleta de BT5-025.

## What to build

Añadir `Change glyph color` inmediatamente después de `Change icon` en el context menu de
los nodos Files. El target puede ser el nodo o el cell concreto sobre el que comenzó el
`contextmenu`; el override se persiste por identidad estable (`file.path` + cell id cuando
aplica), permite clear/reset y cae después al color global del Explorer.

No crear context menus rivales superpuestos. Cada renderer debe propagar un único contexto
tipado desde el hit target. Los wrappers de cells interactivos llevan `data-cell-id` y
`pointer-events: auto`; SVG/path decorativos usan `pointer-events: none`. El handler de row
lee el target explícito/composed path y construye un solo menú. Table es el control positivo,
pero Tree/List/Grid/Cards deben declarar si pueden identificar el cell sin convertir cada
pixel del row en una zona ambigua.

## Adversarial critique

Separar handlers de node y cell haría que ambos reciban el mismo right-click por bubbling,
o que `stopPropagation` robe selección, drag y menús de plugins. Con overlays, aumentar
`pointer-events` indiscriminadamente también puede bloquear el click principal del nodo.
Un solo router de contextmenu conserva precedencia y permite que el menú nombre el target
real; si una vista no ofrece hit target fiable, debe presentar solo override de nodo, no
adivinar un cell por coordenadas.

## Acceptance criteria

- [ ] `Change glyph color` aparece después de `Change icon` y usa la paleta compartida.
- [ ] El menú identifica de forma visible si cambia node o un cell nombrado.
- [ ] Override de cell vence al de nodo; nodo vence al setting global; clear revela el
      siguiente nivel de precedencia.
- [ ] La identidad sobrevive sort/view switches; rename/move migra el path sin duplicar.
- [ ] Un contextmenu produce un único menú en todos los engines.
- [ ] Click, multi-select, drag, hover y acciones de cells conservan su comportamiento.
- [ ] Tests de pointer-events/hit routing cubren Table y controles negativos en las demás
      vistas; ningún renderer infiere el cell por coordenadas frágiles.

## Blocked by

BT5-018 y BT5-025. HITL: validar labels/precedencia del menú una vez exista fixture real.
