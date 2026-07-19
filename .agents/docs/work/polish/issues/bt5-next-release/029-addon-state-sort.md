---
title: BT5-029 — State sort para Snippets y Plugins
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T13:38:07
updated: 2026-07-19T13:38:07
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5, addons, sorting]
---

# BT5-029 — State sort para Snippets y Plugins

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Reporte del
dev del 2026-07-19.

## What to build

Añadir el sort option `State` a Snippets Explorer y Plugins Explorer usando el booleano
`enabled` que ya alimenta el cell `state`. El comparador debe ser compartido por ambos
explorers y conservar Name como desempate determinista.

Recomendación de triage: primera activación `desc` —enabled antes que disabled— y segunda
activación `asc`. Esta dirección debe seguir la semántica física fijada por BT5-005, no una
inversión especial de flechas.

## Acceptance criteria

- [ ] `State` aparece únicamente en los sort menus de Snippets y Plugins.
- [ ] Primera activación ordena enabled antes que disabled; la segunda invierte el grupo.
- [ ] Dentro de cada grupo, Name ascendente es el desempate estable y numérico/base.
- [ ] El plugin Vaultman protegido se ordena por su estado real; `protected` no se convierte en un tercer estado.
- [ ] Un toggle confirmado reubica el nodo cuando State está activo sin duplicarlo ni perder selección/scroll.
- [ ] El estado pendiente mientras se ejecuta el toggle no altera el valor persistido usado para ordenar.
- [ ] Scope/direction sobreviven al round-trip de settings igual que los demás sorts de cada explorer.
- [ ] El label, icono y flecha usan el registro/semántica común; no se duplican inventarios por panel.
- [ ] Tests cubren Snippets, Plugins, ambos sentidos, ties, Vaultman protegido y toggle async.

## Blocked by

None. Coordinar el orden visual del menú con [[011-cell-activation-order|BT5-011]] si ese
issue aterriza primero, pero no acoplar la semántica del comparador a dicho layout.
