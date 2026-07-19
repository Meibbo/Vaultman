---
title: BT5-029 — Sorts State para addons y Type para Props/Tags
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T13:38:07
updated: 2026-07-19T14:34:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5, addons, props, tags, sorting]
---

# BT5-029 — Sorts State para addons y Type para Props/Tags

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Reporte del
dev del 2026-07-19.

## What to build

Añadir estos sort options, sin convertirlos en cells nuevos por accidente:

1. `State` en Snippets Explorer y Plugins Explorer, usando el booleano `enabled` que ya
   alimenta el cell `state`. El comparador debe ser compartido por ambos explorers.
2. `Type` en Props Explorer. Debe ordenar los nodos de propiedad por el tipo efectivo que
   ya resuelve y muestra el explorer (`_effectivePropType`/`typeText`), no por el valor raw
   ni por una tabla de tipos duplicada. Solo aplica al scope `properties`: los value nodes
   no tienen un tipo propio y el option no debe aparecer en el scope `values`.
3. `Type` en Tags Explorer. Aquí `Type` significa la clasificación estructural que la UI
   ya presenta como `simple`/`nested`; no significa procedencia inline/frontmatter. El
   comparador y el filtro `By type` deben consumir un único clasificador compartido. Para
   obtener una clave total, un nodo con hijos se clasifica `nested` y uno sin hijos,
   `simple`; si un parent con ocurrencia directa también satisface el filtro `simple`,
   `nested` tiene precedencia únicamente para el sort.

Todos los comparadores deben conservar Name como desempate determinista.

Recomendación de triage para `State`: primera activación `desc` —enabled antes que
disabled— y segunda activación `asc`. Para ambos `Type`, triage debe fijar y documentar un
orden canónico estable de categorías antes de implementar; no se debe depender del locale
del sistema. Las direcciones deben seguir la semántica física fijada por BT5-005, sin
inversiones especiales de flechas.

## Acceptance criteria

- [ ] `State` aparece únicamente en los sort menus de Snippets y Plugins; `Type`, únicamente
      en los de Props y Tags y en scopes donde existe una clave semántica válida.
- [ ] Primera activación ordena enabled antes que disabled; la segunda invierte el grupo.
- [ ] Dentro de cada grupo, Name ascendente es el desempate estable y numérico/base.
- [ ] El plugin Vaultman protegido se ordena por su estado real; `protected` no se convierte en un tercer estado.
- [ ] Un toggle confirmado reubica el nodo cuando State está activo sin duplicarlo ni perder selección/scroll.
- [ ] El estado pendiente mientras se ejecuta el toggle no altera el valor persistido usado para ordenar.
- [ ] Props `Type` usa exactamente el tipo efectivo mostrado por su cell y reordena al
      cambiar ese tipo; no se ofrece ni inventa tipo para value nodes.
- [ ] Tags `Type` reutiliza la clasificación `simple`/`nested`, con precedencia `nested`
      para nodos con hijos, y nunca aplana ni rompe la jerarquía para formar grupos globales.
- [ ] Ambos sorts `Type` funcionan en asc/desc, usan un orden canónico testeado y Name como
      desempate; empates no producen saltos entre renders.
- [ ] Scope/direction sobreviven al round-trip de settings igual que los demás sorts de cada explorer.
- [ ] El label, icono y flecha usan el registro/semántica común; no se duplican inventarios por panel.
- [ ] Tests cubren Snippets, Plugins, Props y Tags; ambos sentidos, ties, Vaultman protegido,
      toggle async, cambio efectivo de tipo y tags simple/nested con parents de ocurrencia directa.

## Adversarial constraints

- `Type` de Tags no puede inferirse como inline/frontmatter: el modelo actual agrega ambas
  procedencias y no conserva una fuente única por nodo.
- `Type` de Props no debe quedar activo silenciosamente en `values`, donde todos compararían
  como `undefined` y la UI aparentaría ordenar sin hacerlo.
- En árboles nested el sort solo reordena siblings dentro del scope legal. Agrupar todos los
  `simple` y `nested` globalmente destruiría estructura y expansion state.

## Blocked by

None. Coordinar el orden visual del menú con [[011-cell-activation-order|BT5-011]] si ese
issue aterriza primero, pero no acoplar la semántica de los comparadores a dicho layout.
