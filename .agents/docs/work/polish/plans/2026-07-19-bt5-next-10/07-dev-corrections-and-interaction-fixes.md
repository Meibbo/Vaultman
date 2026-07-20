---
title: "BT5 shard 07: correcciones del dev, 3 bugs de interacción, 015 rehecho, 018 y 009"
type: verification
status: completed
lifecycle: active
parent: "[[docs/work/polish/plans/2026-07-19-bt5-next-10/index|BT5 next-10 plan]]"
created: 2026-07-20T18:25:00
updated: 2026-07-20T18:25:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags: [agent/verification, initiative/polish, release/bt5]
---

# Shard 07 — correcciones del dev + 3 bugs + 015 rehecho + 018 + 009

Sesión del 2026-07-20 (tarde), `claude-opus-4-8`. Continúa el shard 06 tras el
reporte del dev al probar los seis issues. Worktree
`C:/tmp/vaultman-release-beta2-final2`, rama `codex/bt5-next-10`, base `102bb0b6`
… HEAD final `0a71532f`.

## Commits de producto (8 sobre `577789c2`)

| Commit | Qué |
|---|---|
| `4a61d419` | fix: el re-render redundante se comía el primer click |
| `eb8ad91d` | fix: tooltip armado antes de que llegue el puntero |
| `102bb0b6` | fix: Last opened se reordena en vivo |
| `dad3ef32` | fix: BT5-015 rehecho — el icono alinea los labels de verdad |
| `b4f0815a` | feat: BT5-018 — sub-page anidada + items interceptados listados |
| `0a71532f` | feat: BT5-009 — exclude file por el pipeline de filtros |

(`4a61d419`, `eb8ad91d`, `102bb0b6` cierran bugs nuevos que el dev reportó en
esta ronda; `dad3ef32` corrige trabajo defectuoso mío del shard 06.)

## Gate por commit (salida leída, no exit code)

Base 843 (tras shard 06 + primeros fixes). Final: **129 files / 854 tests**,
svelte-check 0/0, scorecard 17/17. Build sincronizado SOLO a `plugin-dev`,
SHA-256 idéntico (`1b2ed295…`). **Smoke de runtime NO ejecutado**: todo
verificado por gates, no por observación en Obsidian.

## Los tres bugs de interacción

### Click perdido al reactivar la leaf (`4a61d419`)

Reporte del dev: al tener una nota abierta y clicar otro nodo, no pasa nada; hay
que clicar dos veces. Igual al expandir un parent tras cambiar el foco al main
leaf.

Causa: activar la leaf de Vaultman dispara `active-leaf-change`
(`VaultmanFrame.ts:29`), que agenda un `refreshViewport()`. El refresco re-renderiza
la ventana visible, y **cada fila reciclada** ejecutaba `parent.appendChild(row)`
incondicionalmente. `appendChild` sobre un elemento ya montado lo **desengancha y
reengancha**, así que la fila que recibió el `mousedown` deja de ser el elemento
bajo el `mouseup` → el navegador nunca dispara `click`. El mismo churn cancelaba
un hover en vuelo (parte del doble-hover de abajo).

Las filas son recicladas y de posición absoluta, así que el orden en el documento
es irrelevante y el re-parent no aportaba nada. Las **cuatro** superficies de fila
(tree, grid, node-table, files-grid) ahora hacen append solo si la fila no está ya
montada donde toca. Guard: `test/unit/rowInteractionSurvivesRefresh.test.ts`.

### Doble hover para que aparezca el tooltip (`eb8ad91d`)

Reporte: hay que hacer hover dos veces para que empiece el tooltip. (El dev pidió
además renombrar el setting "Files hover info" a **Tooltip**; hecho, keys sin
cambiar para no romper configs.)

Causa: BT5-032 dejó al panel como único autor del tooltip, pero el texto se
aplicaba dentro de `pointerenter` — demasiado tarde para que Obsidian lo muestre
en esa misma entrada. La vista sigue sin redactar nada: ahora pide el texto al
panel vía la opción `rowTooltip` y lo aplica **en render**, así el tooltip está
armado antes de que llegue el puntero. El hook de hover se conserva para el
upgrade asíncrono (word counts, tasks perezosos): una fila repintada bajo el
puntero lo re-ejecuta. Files usa `filesHoverInfo`; Plugins/Snippets su builder de
addon; Props/Tags no configuran ninguno y por diseño siguen sin tooltip. Guard:
`test/unit/tooltipReadyBeforeHover.test.ts`.

### Last opened no se actualizaba en vivo (`102bb0b6`)

Reporte: con el sort Last opened descendente, abrir una nota no la coloca de
primera; debería comportarse como un historial de navegador.

Causa: el orden de recencia es incorrecto en el instante en que deja de
refrescarse. Files ahora re-ordena en `file-open`, **solo** mientras Last opened
es el sort activo; cualquier otro sort conserva el contrato de BT5-030 (sin render
en `file-open`, lo que quitó los micro-cuelgues al escribir), así que no cuesta
nada salvo cuando el orden de recencia está en pantalla. El re-sort va en un
microtask, que difiere tras el propio listener `file-open` del plugin, así que el
timestamp ya está registrado al re-ordenar, sin depender del orden de registro de
listeners.

**Guard sensible:** `explorerViewportRefresh.test.ts` protege BT5-030 (el P0 de
micro-cuelgues validado por el dev). Se re-apuntó para fijar la condición
(`!== 'opened' return`), no la ausencia de render. No relajarlo más.

## BT5-015 rehecho (`dad3ef32`)

Mi implementación del shard 06 estaba mal: movía el icono al elemento del caret,
pero solo en nodos que reservan caret y no pueden expandir — un caso que no causa
el problema. **La intención real del dev:** la fila es una línea flex, así que un
icono **añade ancho** y empuja el label; un hermano sin icono (sin custom, o con
la celda apagada) queda más a la izquierda y se rompe la alineación — visible en
"custom icons only".

Con la opción activa, una fila que renderiza icono y no reserva caret **saca el
icono del flujo flex** hacia la columna del caret vía CSS
(`.vaultman-tree-row--icon-in-caret > .vaultman-tree-icon { position: absolute }`),
así todos los labels caen en la misma x tengan icono o no. El icono conserva su
lugar en el DOM y su semántica; solo se mueve su caja. Las filas con caret no se
tocan (el caret ya posee esa columna). Guard reescrito.

## BT5-018 — dos correcciones del dev (`b4f0815a`)

1. **La sub-page ahora vive dentro** de la página de context menus existente, no
   como entrada hermana en el root; su botón de volver regresa allí.
2. **El catálogo listaba solo el registry propio.** Ahora también hace un probe
   del menú real: dispara el mismo evento `file-menu` contra un archivo de prueba
   y la raíz del vault, lee los títulos resultantes y los lista con un id estable
   = slug del título (`native:<slug>`). Los menús padre (submenús que abren
   Core/otros plugins) se marcan como tales. Los items interceptados encabezan el
   layout por defecto en orden de descubrimiento y un item nuevo se mergea al
   frente, no al final. Se pueden mostrar/ocultar en vivo (splice de `menu.items`,
   mismo patrón que las hide rules) pero no llevan grip: Vaultman no posee ni su
   orden ni su handler.

**Diferido explícito:** reordenar items nativos cruzando la frontera con los de
Vaultman. Requiere reconstruir instancias `MenuItem` sin acceso a su `onClick`;
diseño runtime + smoke pendiente.

## BT5-009 adelantado (`0a71532f`)

Exclude file era una lista persistida aplicada como segunda pasada en el render,
paralela al árbol de filtros. Ahora es un filtro de nodo componible,
`file_exclude` (path exacto), coherente con exclude-folder: el file desaparece por
el pipeline y se muestra de nuevo quitando su chip de filtro. **La sección de
settings desapareció** (pedido del dev). La acción añade un nodo de filtro en vez
de escribir settings; `_filesForDisplay` ya no tiene su pasada propia. Migración
one-time de `excludedFilePaths` al filtro en el primer load, con limpieza del
setting. Rename lleva la exclusión al nuevo path (incluido cada file bajo una
carpeta renombrada); delete la purga.

**Cambio de comportamiento declarado:** la exclusión pasa a ser session-scoped
como exclude-folder, no persistida entre reinicios. Es la lectura coherente de la
AC ("coherente con exclude-folder" + quitar la sección de settings), pero el dev
puede vetarlo si quería persistencia.

## Nota MCP — resuelto + residual

El shard 06 afirmó que `codebase-memory-mcp` estaba roto. **Era error mío de
invocación:** el parámetro es `project`, no `project_path`. Con
`project: 'C-tmp-vaultman-release-beta2-final2'` responde `ready`. Corregido en el
shard 06.

Residual real (con evidencia): el servidor sirve un snapshot fijo. `index_status`
ok, pero `index_repository` con `mode='full'` falla ("Pipeline failed") y
`fast`/`moderate` responden `indexed` sin re-extraer — el `.db` sigue en 3524
nodos y no contiene los símbolos nuevos (`clearRowTooltip`, `withFileOpened`,
`projectFilesMenu`), el WAL crece y `PRAGMA wal_checkpoint` da `busy=1`. Apunta a
una conexión abierta del servidor con snapshot congelado. **Necesita reinicio del
servidor MCP** (proceso externo, no arreglable desde esta sesión) y luego
re-index. Mientras tanto el descubrimiento se hizo con Grep/Read sobre `src/`.

## Guards re-apuntados en esta tanda (ninguno borrado)

`singleRowTooltip` y `viewTreeSource` (`clearRowTooltip` → `applyRowTooltip`);
`explorerViewportRefresh` (BT5-030, ahora fija la condición del sort opened);
`explorerFilesSource` (exclude ya no es lista de render); guard de BT5-015
reescrito. Total acumulado con el shard 06: **11**.

## Pendientes

1. **Smoke de runtime** de los 3 bugs + 015 + 018 + 009 en `vault=plugin-dev`.
2. **BT5-018:** reorden de items nativos cross-boundary (diferido).
3. **BT5-009:** confirmar con el dev el cambio a exclusión session-scoped.
4. **MCP:** reiniciar el servidor y re-indexar.
5. Continuar con los próximos 5 issues del tren BT5.
