---
title: BT5 — next 1.2 release train
type: issue-index
status: active
lifecycle: active
parent: "[[docs/work/polish/index|polish]]"
created: 2026-07-19T08:02:57
updated: 2026-07-20T19:20:00
created_by: codex-gpt-5
updated_by: claude-opus-4-8
tags:
  - agent/issues
  - initiative/polish
  - release/1.2.0
  - release/bt5
---

# BT5 — next 1.2 release train

`BT5` es el identificador estable del tren de trabajo posterior a `1.2.0-beta.4`.
El artefacto final sigue abierto entre `1.2.0-beta.5` y `1.2.0` stable; cambiar el
canal no renumera estos issues. Por el volumen de cambios de persistencia, lifecycle
y toolbar, la recomendación técnica no vinculante es publicar primero beta.5.

Origen: pendientes migrados de
[[docs/work/polish/issues/bt4-beta4-batch/index|BT4]] + reporte y decisiones del dev
del 2026-07-19. Los IDs BT4 permanecen como trazabilidad histórica; este índice es
la cola canónica para implementación nueva.

## Decisiones fijadas

1. El vacío al reactivar Vaultman se diagnostica con una matriz de superficies y
   transiciones antes de fijar el alcance; no se asume que solo exista en Files/main leaf.
2. El mensaje de novedades será un aviso no bloqueante que enlaza a un boletín público
   acumulativo, newest-first y editable en `docs/whats-new.md`; el changelog completo queda
   como anexo y el release no empaqueta cuerpo ni media del boletín.
3. La corrección de primera dirección de Remaining tasks pertenece al audit global de
   flechas/direcciones, no a un issue separado.
4. `nested=off` oculta solamente la acción Collapse/expand all. El mecanismo de overflow
   del toolbar sigue funcionando y gana estrategia `condensed menu | horizontal scroll`.
5. En plano, el cell option `Path` hace visible `file.path` —incluido el filename—;
   sort `Name` compara `file.name` y sort `Path` compara `file.path`, como conceptos distintos.
6. El boletín se abre mediante URL fijada al tag instalado; las releases antiguas nunca
   apuntan a contenido mutable de `dev` o `main`.
7. La colorización nativa de Vaultman será opt-in y compartirá una paleta semántica entre
   Floating Index y Explorer: default, faint, accent, custom y rainbow pastel.
8. Snippets y Plugins tendrán sort `State` sobre el booleano/cell id existente `state`;
   Props y Tags tendrán sort `Type` sobre, respectivamente, el tipo efectivo de propiedad y
   la clasificación estructural simple/nested. Todos usan Name como desempate determinista;
   la dirección inicial y el orden canónico de categorías se confirman en triage.
9. La fluidez del editor es un gate P0: ningún trabajo de una leaf Vaultman abierta puede
   introducir stalls periódicos mientras el usuario escribe en otra nota.

## Orden canónico

| Issue | Título | Pri. | Tipo | Origen | Bloqueado por |
|---|---|---:|---|---|---|
| [[001-settings-rerender-hang|BT5-001]] | Hang por settings toolbar/dock/auto-reveal | P0 | AFK | BT4-028 | — |
| [[002-workspace-leaf-reactivation-matrix|BT5-002]] | Explorer vacío al reactivar leaf: matriz de alcance | P0 | HITL | BT4-022 reabierto | — |
| [[003-remaining-tasks-availability-pipeline|BT5-003]] | Remaining tasks: migración, hidratación y prioridad | P0 | AFK | regresión BT4-012 | — |
| [[030-editor-typing-micro-stalls|BT5-030]] | Micro-cuelgues al escribir con una leaf Vaultman abierta | P0 | HITL | bug/regresión nuevo | — |
| [[004-release-bulletin|BT5-004]] | Aviso in-app y boletín público acumulativo | P1 gate | HITL | nuevo | — |
| [[005-sort-direction-semantics|BT5-005]] | Semántica global de sort arrows y defaults | P1 | AFK | BT4-036 + D4 | — |
| [[006-contextual-expansion-action|BT5-006]] | Collapse/expand contextual a nested | P1 | AFK | nuevo | — |
| [[007-popup-sort-parity|BT5-007]] | Paridad popupSort para By level | P1 | AFK | residual BT4-009 | — |
| [[008-tags-scope-toolbar-sync|BT5-008]] | Tags toolbar refleja scope externo | P1 | AFK | residual BT4-009 | — |
| [[009-exclusion-filter-rework|BT5-009]] | Exclusión de files como filtro por nodo | P1 | AFK | BT4-027 | — |
| [[010-shared-cell-registry-hover-info|BT5-010]] | Registro compartido de cells + hover-info | P1 | AFK | BT4-025 + parte BT4-013 | — |
| [[011-cell-activation-order|BT5-011]] | Cells por activación + menús por posición | P2 | AFK | nuevo | BT5-010 |
| [[012-flat-path-cell|BT5-012]] | Path visible en Files plano | P2 | AFK | nuevo | BT5-010 |
| [[013-last-opened-cell-sort|BT5-013]] | Last opened persistente: cell + sort | P2 | AFK | nuevo | BT5-010 |
| [[014-tasks-statistics-card|BT5-014]] | Card Tasks en Statistics | P2 | AFK | BT4-032 | BT5-003 |
| [[015-icon-in-caret-slot|BT5-015]] | Icon cell en slot del caret | P2 | AFK | BT4-026 | BT5-010 |
| [[016-grid-to-cards-natural-height|BT5-016]] | Grid→Cards + box de altura natural | P2 | AFK | BT4-029 | — |
| [[017-collapsed-badge-bubbling|BT5-017]] | Badge bubbling visible solo colapsado | P2 | AFK | BT4-035 | — |
| [[018-files-context-menu-config|BT5-018]] | Context menu Files configurable | P2 | HITL | BT4-013 | — |
| [[019-addon-icon-registry-picker|BT5-019]] | Registro/picker propio de iconos addon | P2 | AFK | residual BT4-030 | — |
| [[029-addon-state-sort|BT5-029]] | State sort en addons + Type sort en Props/Tags | P2 | AFK | nuevo | — |
| [[020-view-config-payload-preview|BT5-020]] | Preview completo del payload de View configs | P2 | AFK | BT4-034 | — |
| [[021-toolbar-overflow-strategy|BT5-021]] | Overflow toolbar: condensed o scroll horizontal | P2 | AFK | nuevo D5 | — |
| [[022-create-actions-placement|BT5-022]] | Create File/Folder: searchbox o toolbar | P2 | AFK | nuevo | — |
| [[023-create-file-command-binding|BT5-023]] | Create File enlazable a comando Obsidian | P2 | AFK | nuevo | — |
| [[024-custom-command-toolbar-actions|BT5-024]] | Comandos Obsidian como acciones de toolbar | P2 | AFK | nuevo | BT5-023 |
| [[025-native-glyph-color-system|BT5-025]] | Sistema nativo de Glyph color para Index y Explorer | P2 | AFK | residual BT4-021 + D38 | — |
| [[026-file-node-cell-glyph-color-override|BT5-026]] | Override de Glyph color por nodo o cell | P2 | HITL | nuevo | BT5-018, BT5-025 |
| [[027-move-current-tab-workspace-region|BT5-027]] | Mover tab actual entre main leaf y sidebars | P2 | HITL | nuevo | — |
| [[028-content-active-file-highlight|BT5-028]] | Highlight de archivo activo en Content Explorer | P1 | AFK | bug nuevo | — |

## Estado de implementación 2026-07-19

| Issue           | Estado               | Evidencia principal                                                                                                                                                                         |
| --------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BT5-001         | completed            | `c60e3bc7`; smoke `plugin-dev` 18 toggles + Auto-reveal, root/listeners estables                                                                                                            |
| BT5-002         | pending HITL         | `c60e3bc7`; escenario main leaf focused/unfocused verde; falta matriz visual completa                                                                                                       |
| BT5-003         | pending HITL         | `c60e3bc7`; cache/prioridad/persistencia verdes en `plugin-dev`; falta benchmark del vault grande por instrucción del dev                                                                   |
| BT5-004         | pending release HITL | `14de6fbb`; implementación/preflight verdes; falta aprobar copy y verificar el tag publicado                                                                                                |
| BT5-005         | completed            | `c60e3bc7`; defaults, flechas, Name/Path y adaptador Table cubiertos                                                                                                                        |
| BT5-006         | completed            | `f1dbe2f5`; expansión disponible solo con `nested`, sin retirar Tools/Auto-reveal/overflow                                                                                                  |
| BT5-007         | completed            | `f1dbe2f5`; navbar y popup comparten modelo/orden/visibilidad de sort + By level                                                                                                            |
| BT5-008         | completed            | `f1dbe2f5`; sync externo Tags sin ping-pong, cubre lazy mount y remount tras Content                                                                                                        |
| BT5-028         | completed            | `017d8049`; active-file separado de reveal, con open/rename/delete/cleanup ejecutables                                                                                                      |
| BT5-030         | ✅ completed          | `149effc6` render diferido (`logicDeferredExplorerRender`); **validado por el dev en runtime 2026-07-20**: sin micro-cuelgues al escribir, "performance mejor que nunca". Gate HITL cerrado |
| BT5-010         | ✅ completed          | `f2e4f8c3` registro central de cells + orden de hover; guards realineados en `fc709d33`/`143ff2e5`                                                                                          |
| BT5-011         | ✅ completed          | `bf0e455c` modelo compartido + `ea498975` renderer (opción B elegida por el dev: todo cell es hermano del row en modo activación)                                                           |
| BT5-016         | ✅ completed          | `374cc59c` + `6e78432d` + `29fcef24` Grid→Cards y altura natural con anclaje estable                                                                                                        |
| BT5-017         | ✅ completed          | `eed4e8a3` dot de actividad en padre colapsado                                                                                                                                              |
| BT5-019         | ✅ completed          | `d0928260` registro propio de iconos addon + picker FuzzySuggestModal                                                                                                                       |
| BT5-020         | ✅ completed          | `79cdf33b` preview de payload de configs guardadas                                                                                                                                          |
| BT5-029         | ✅ completed          | `e0157424` sorts semánticos State/Type                                                                                                                                                      |
| BT5-012         | ✅ completed          | `7c2f5928` proyección del label plano: `file.name` / `file.path`, gate `requiresCellsOff: ['nested']` en el registry                                                                        |
| BT5-013         | ✅ completed          | `843da5ab` store `last-opened.json` coalescido fuera de settings + cell, hover y sort desc                                                                                                  |
| BT5-015         | ✅ completed          | `d396c3f0` icono en el slot del caret que ninguna expansión usa; caret y aria intactos en nodos expandibles                                                                                 |
| BT5-018         | ⏳ pending HITL       | `a188d672` sub-page con DnD, dividers y submenús; merge por id contra el registry vivo. **Falta la revisión de UI del dev**                                                                 |
| BT5-031         | ✅ completed          | `9cd1e3ac` Files escucha también `iconic.onChanged`, reutilizando el coalescer existente                                                                                                    |
| BT5-032         | ✅ completed          | `577789c2` la vista deja de redactar tooltips; el builder del panel es el único dueño. Props/Tags/Content quedan sin hover                                                                  |
| BT5-009         | ✅ completed          | `0a71532f` exclude file por el pipeline (`file_exclude`), sección de settings quitada; ahora session-scoped                                                                                 |
| BT5-015         | ✅ corregido          | `dad3ef32` rehecho: el icono sale del flujo flex a la columna del caret, labels alineados (la versión `d396c3f0` no servía)                                                                 |
| BT5-018         | ⏳ pending HITL       | `b4f0815a` sub-page anidada en context menus + items interceptados y menús padre listados; reorden nativo diferido                                                                          |
| BUG click       | ✅ completed          | `4a61d419` el re-render redundante ya no se come el primer click (4 superficies)                                                                                                            |
| BUG tooltip     | ✅ completed          | `eb8ad91d` tooltip armado en render, no en pointerenter; setting renombrado a Tooltip                                                                                                       |
| BUG last-opened | ✅ completed          | `102bb0b6` Last opened se reordena en vivo al abrir un archivo                                                                                                                              |
| BT5-014 | ✅ completed | `8efd427e` card Remaining tasks: suma cacheada en el snapshot, 3 scopes, sin rescan |
| BT5-021 | ✅ completed | `57739ac5` overflow del toolbar: enum condensed/scroll, fade de overflow, scroll-margin |
| BT5-022 | ✅ completed | `546c376d` placement de Create File/Folder (searchbox/toolbar), sin duplicar |
| BT5-023 | ✅ completed | `3973ed29` Create File enlazable a comando de Obsidian; resolver + fallback seguro |
| BT5-024 | ✅ completed | `546c376d` comandos de Obsidian como nodos de toolbar (add/remove/reorder, disabled reparable) |

Detalle técnico y gates: [[docs/work/polish/plans/2026-07-19-bt5-001-005/02-outcome-verification|BT5-001..005 outcome]].
Continuación 006/007/008/028 y diagnóstico diferido 030:
[[docs/work/polish/plans/2026-07-19-bt5-next-10/index|BT5 next-10 plan]].
Cierre de 012/013/015/018/031/032:
[[docs/work/polish/plans/2026-07-19-bt5-next-10/06-bt5-012-013-015-018-031-032|shard 06]].
Correcciones del dev + 3 bugs + 015 rehecho + 018 + 009:
[[docs/work/polish/plans/2026-07-19-bt5-next-10/07-dev-corrections-and-interaction-fixes|shard 07]].
Próximos 5 (014/021/022/023/024):
[[docs/work/polish/plans/2026-07-19-bt5-next-10/08-bt5-014-021-022-023-024|shard 08]].

## Release gates

- BT5-001, 002, 003 y 030 bloquean cualquier candidato por hang, viewport vacío, datos
  stale o degradación de la escritura de notas. Diferir 030 detiene su implementación,
  pero no equivale a demostrar que la regresión desapareció ni levanta el gate.
- BT5-004 bloquea la publicación, no necesariamente el trabajo paralelo: cada target debe
  tener sección+anchor revisados en el boletín público, enlace al changelog y targets
  relativos válidos, aunque un hotfix use una sola línea breve.
- Si el destino es stable, ejecutar soak real de upgrade, instalación limpia y mobile
  después de los P0; no convertir el nombre `BT5` en evidencia de aceptación.
- Los P2 forman parte del tren solicitado, pero cada issue sigue siendo un tracer bullet
  verificable y no autoriza un refactor horizontal masivo.

## Límites deliberados

- `Last opened` guarda el último timestamp por archivo, no una cronología completa de eventos.
- El aviso no renderiza el boletín ni el changelog técnico dentro de Vaultman y no hace
  tráfico de red hasta que el usuario abre explícitamente el documento público.
- La línea 1.2 no importa la maquinaria ActionNode 2.0; usa un shape local compatible y pequeño.
- La priorización por mtime de estadísticas no puede impedir que archivos viejos progresen.
- Horizontal scroll pierde parte de la descubribilidad del menú único; debe mostrar una
  pista de overflow. Los comandos custom se añaden explícitamente y nunca se autoejecutan.
- Un cell no recibe un segundo menú superpuesto: el handler único del row deriva el target
  desde el hit-test/cell id y ofrece acciones explícitas de nodo o cell.
