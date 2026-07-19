---
title: "BT5-002 — Explorer vacío al reactivar leaf: matriz de alcance"
type: issue
status: pending
lifecycle: active
priority: P0
execution: HITL
source_ids:
  - BT4-022
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T12:43:51
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, initiative/polish, release/bt5, regression]
---

# BT5-002 — Explorer vacío al reactivar leaf: matriz de alcance

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Reabre BT4-022.

## What to build

Diagnosticar primero si la desaparición de nodos pertenece únicamente al escenario
reportado —Files en un main leaf, abrir otro tab y volver— o a un lifecycle compartido.
Construir una matriz mínima de ubicación, transición, explorer y view mode; solo después
fijar el seam de activación/medición correcto. La hipótesis actual —el arreglo anterior
observa el tab interno pero no la reactivación del `WorkspaceLeaf`— no se considera causa
cerrada hasta obtener RED y controles negativos.

## Acceptance criteria

- [ ] La matriz cubre main leaf, sidebar y popout; cambio de tab Obsidian, cambio de tab interno, colapsar/reabrir sidebar y focus entre leaves.
- [x] Files se prueba enfocado y no enfocado antes de crear/cambiar el tab.
- [ ] Se prueban todos los view modes soportados de Files y los demás explorers virtualizados como controles.
- [ ] El dossier declara combinaciones afectadas y no afectadas antes de implementar el fix.
- [x] Volver al main leaf muestra nodos sin scroll ni blank frame en el escenario reportado.
- [x] El fix vive en el lifecycle compartido más estrecho que explique la matriz y no dispara renders en cada focus irrelevante.
- [ ] RED/GREEN automatizado; la matriz visual/runtime se ejecuta como HITL del dev y el agente no reclama aceptación visual por inferencia.

## Blocked by

None — can start immediately.

## Implementation checkpoint

Implementado y commiteado en `c60e3bc7`. El seam compartido escucha
`active-leaf-change` por identidad exacta y `onResize`, coalesce a un RAF de la ventana
propietaria y refresca únicamente el explorer interno activo. El helper cubre Files,
Props, Tags, Snippets, Plugins, Content/no-op y panel aún no montado.

Smoke automatizado-vivo en `plugin-dev`: un Vaultman temporal en main leaf mostró 45
filas inicialmente y 45 al volver, tanto partiendo enfocado como ya desenfocado; el root
no se remontó, no se hizo scroll, las leaves temporales se eliminaron y no hubo errores.
Permanece HITL la matriz visual completa de sidebar/popout, todos los view modes,
scroll/selection/expansion y controles negativos; por eso el issue no se marca completed.
