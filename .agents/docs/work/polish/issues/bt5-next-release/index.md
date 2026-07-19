---
title: BT5 — next 1.2 release train
type: issue-index
status: active
lifecycle: active
parent: "[[docs/work/polish/index|polish]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T12:43:51
created_by: codex-gpt-5
updated_by: codex-gpt-5
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

## Orden canónico

| Issue | Título | Pri. | Tipo | Origen | Bloqueado por |
|---|---|---:|---|---|---|
| [[001-settings-rerender-hang|BT5-001]] | Hang por settings toolbar/dock/auto-reveal | P0 | AFK | BT4-028 | — |
| [[002-workspace-leaf-reactivation-matrix|BT5-002]] | Explorer vacío al reactivar leaf: matriz de alcance | P0 | HITL | BT4-022 reabierto | — |
| [[003-remaining-tasks-availability-pipeline|BT5-003]] | Remaining tasks: migración, hidratación y prioridad | P0 | AFK | regresión BT4-012 | — |
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

| Issue | Estado | Evidencia principal |
|---|---|---|
| BT5-001 | completed | `c60e3bc7`; smoke `plugin-dev` 18 toggles + Auto-reveal, root/listeners estables |
| BT5-002 | pending HITL | `c60e3bc7`; escenario main leaf focused/unfocused verde; falta matriz visual completa |
| BT5-003 | pending HITL | `c60e3bc7`; cache/prioridad/persistencia verdes en `plugin-dev`; falta benchmark del vault grande por instrucción del dev |
| BT5-004 | pending release HITL | `14de6fbb`; implementación/preflight verdes; falta aprobar copy y verificar el tag publicado |
| BT5-005 | completed | `c60e3bc7`; defaults, flechas, Name/Path y adaptador Table cubiertos |

Detalle técnico y gates: [[docs/work/polish/plans/2026-07-19-bt5-001-005/02-outcome-verification|BT5-001..005 outcome]].

## Release gates

- BT5-001, 002 y 003 bloquean cualquier candidato por hang, viewport vacío o datos stale.
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
