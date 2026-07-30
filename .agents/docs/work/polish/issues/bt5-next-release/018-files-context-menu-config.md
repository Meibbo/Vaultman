---
title: BT5-018 — Context menu Files configurable
type: issue
status: pending-hitl
lifecycle: active
priority: P2
execution: HITL
source_ids:
  - BT4-013
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-20T18:25:00
created_by: codex-gpt-5
updated_by: claude-opus-4-8
tags: [agent/issue, initiative/polish, release/bt5]
---

# BT5-018 — Context menu Files configurable

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Migra la parte files-cmenu de BT4-013; hover-info DnD vive en BT5-010.

## What to build

Crear en Layout Settings una sub-page que configure el context menu de nodos Files:
show/hide por acción, orden DnD y dividers agregables. Persistir ids estables y hacer merge contra el catálogo runtime para que acciones nuevas aparezcan sin romper configs.

## Acceptance criteria

- [x] La sub-page presenta todas las acciones disponibles con visibilidad, DnD y dividers.
- [x] El context menu real respeta exactamente la proyección guardada.
- [x] Acciones nuevas se insertan con regla determinista; ids retirados no rompen carga.
- [x] No se permiten dividers líderes, finales o duplicados vacíos tras normalizar.
- [x] Reset restaura el orden default aprobado por el dev.
- [x] Configs migran por id, no por label traducido ni índice posicional.
- [x] Tests cubren merge futuro, DnD, dividers, show/hide y render final.

## Blocked by

None — can start immediately. HITL: aprobar el orden default antes de fijar fixtures.

## Outcome 2026-07-20

**Commit `a188d672`.** Gate verde: 126 files / 833 tests, svelte-check 0/0, scorecard 17/17. Test focal `test/unit/filesContextMenuConfig.test.ts` (11 casos).

Modelo puro en `src/logic/logicFilesContextMenu.ts`: lista plana ordenada (`action` | `divider` | `submenu`), porque eso es lo que arrastra la página de settings; un submenú posee las acciones cuyo `parent` lo apunta, así que anidar no obliga a mantener un segundo árbol sincronizado.

Default = orden del context menu de Core Files con las acciones propias plegadas en su sección (decisión del dev); Reset lo restaura. Todo persiste por id estable:
nunca por label traducido ni por posición. El merge contra el registry vivo hace que un id retirado desaparezca sin romper la carga y que una acción futura entre en el rank que le da el orden default, no al final. La normalización garantiza cero dividers líderes/finales/duplicados y cero submenús vacíos, y la proyección re-aplica esa regla después de que `when` descarte lo que el nodo no ofrece.

La sub-page se construye desde `panelActionCatalog()` (registry vivo), así que no puede desviarse de lo que el menú ofrece. UI como los settings de hover-info:
arrastrar para reordenar, toggle para mostrar/ocultar, más crear divider, crear submenú, reset y selector de submenú por acción.

Detalle: [[docs/work/polish/plans/2026-07-19-bt5-next-10/06-bt5-012-013-015-018-031-032|shard 06]].

**Gate HITL abierto:** el dev revisa la UI cuando la vea funcionando y corrige el orden default, tal como pidió. No se bloqueó esperando aprobación previa.

## Corrección 2026-07-20 (tarde)

**Commit `b4f0815a`.** Dos correcciones del dev sobre el cierre de `a188d672`:

1. La sub-page de Files cmenu ahora vive **dentro** de la página de context menus existente, no como entrada hermana; su botón de volver regresa allí.
2. El catálogo listaba solo el registry propio. Ahora hace un probe del menú real (dispara `file-menu` contra un archivo y la raíz, lee títulos) y lista los items **interceptados** (Core Files, otros plugins) y los **menús padre**, con id estable = slug del título. Encabezan el layout por defecto; show/hide en vivo por splice; sin grip (Vaultman no posee su orden ni su handler).

**Diferido:** reordenar items nativos cruzando la frontera con los de Vaultman (requiere reconstruir MenuItem sin acceso a su onClick).

Gate verde (final 854 tests). Detalle: [[docs/work/polish/plans/2026-07-19-bt5-next-10/07-dev-corrections-and-interaction-fixes|shard 07]].

**Gate HITL abierto:** el dev revisa la UI y el orden default cuando la vea.
