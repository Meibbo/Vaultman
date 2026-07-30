# Sesión 2026-07-22 — auditoría forense pre-release v1.2.0

## Identidad y alcance

- Agente: `codex-gpt5-root` (Codex, GPT-5).
- Modo inicial: `review/update`; no se debe modificar producto hasta presentar y aprobar el diseño/desglose de issues.
- Tamaño: `large`.
- Workspace de coordinación y memoria: `C:\Users\vic_A\Desktop\vaultman`.
- Worktree de producto auditado: `C:\tmp\vaultman-release-beta2-final2`.
- Rama: `codex/bt5-next-10`.
- HEAD al comenzar la auditoría: `b56b9a788409d7d00bfc798e891bddcd648550f3` (`feat(backlog): attempt of solving bugs.`).
- Baseline indicado por el usuario: beta.6, tag/commit `fefdde48`; coincide con `origin/dev` en la inspección inicial.
- Objetivo del usuario: convertir los tres prompts originales en issues completos, auditar qué hizo el agente anterior, qué omitió y qué dejó parcial, diseñar la reparación teniendo en cuenta las composiciones de Vaultman, y después implementar/verificar lo necesario antes de aprobar v1.2.0 estable.
- Restricción de memoria: conservar el texto literal y todos los hallazgos en este shard. `current/status.md` y `current/handoff.md` son sólo índices; no deben recibir el registro exhaustivo.

## Prompts originales del usuario — copia literal y ordenada

### Prompt 1

> brindo las siguientes aclaraciones: el plugin si debe poder desactivarse así mismo, más no desinstalar. la acción duplicada si estaba bien, pero ahora la acción que quedó no tiene i18n (aparece código en vez de texto en el cmenu de snippets) y tiene un ícono distinto al interceptado por file explorer. la opción de "hide explorer scrollbar" cuando esté "on" debería quitar a la opción de "reserve index lane" y aunque esconda el scrollbar, hacer que el index conserve la separación que tenían los nodos del explorer al borde del frame (osea, que del scrollbar lo único que desaparezca sea el bar pero que su lane se la quede el index). para el mecanismo de iconos debes reparar la regresión (porque en beta.6 si funcionaba) de que ahora en file explorer no funciona el pícker de iconic, cuando desactivo el add-on y el plugin Iconic los cuatro principales explorers (files, props, tags y text) pierden su cmenu_option "change icon" pese a que tenemos fallback propio; y cuando está activo no funciona como te comenté en los principales explorers (aparece el picker como si no fuese seleccionado nada; regresó el bug de change icon doble en props y tags; el change icon de snippets y plugins sigue siendo el fallback cuando podríamos usar el picker y nosotros inteceptar el resultado). el tab_menu de statistics le siguen faltando opciones que al resto de scenes no les faltan, como el toolbar, snippets, plugins, él mismo (index no porque no puede); y su selector de scope fácilmente podría un menú en su toolbar (recordemos que se supone que el toolbar es su propio scene que se nutre según cada provider, pero si no me equivoco actualmente en el codebase su código está esparcido en muchos sitios, específicamente entre los pages y los explorers). devuelve los textos esperados que yo edité de en.ts (más específicamente los de filters para que tengan nombres cortos y precisos) y actualiza los tests. los filtros de exclusión debes trabajarlos para que los nodos de props y tags muestren el cell_highlight pero en vez de color active, que sea primary (el color del texto), igual su bubbledot (un color para filter inclusive y otro para exclusive), también que en "filter mode" de esos dos presionar una vez sea inclusivo, dos veces consecutivas y rápidas exclusivo (lentas no, un doble click básicamente) y otra vez para quitar. para el toolbar overflow añade la opción wrap y mejora los valores hardcodeados de condense files, porque el auto y el manual condense actual solo oculta a active reveal y a expand/collapse, cuando debería ser específicamente por el tamaño del width del viewhost a todos los action_nodes que no quepan en el frame (osea que cuando tab label esté encendido solo deberían haber 4 íconos en una línea cuando frame= min-width, 5 si label está desactivado y más sucesivamente según crezca el frame).

### Prompt 2

> disculpa por interrumpirte. debo agregar otro issue: que en el cmenu de prop explorer falta la opción change type/Date & Time y que reconozca cuál de los typos ya es el nodo; también el option convert/Wikilink en un nodo value (y renombrar los otros como lowercase, UPPERCASE y Titlecase); además de agregar el cell_format para los values, que haga que se muestren de la misma forma que lo hace el properties view de Obsdian (recomiendo investigar en web-lab e indexar dicho lab al codebase-mcp; especialmente cómo renderiza los a los wikilinks, los checkboxes, date -incluso su botón de dirigirse a la nota diaria de ese date- y datetime). que los action_nodes del widget del floating index cuando formen parte del rail también sean afectados por el option de glyph color. así como que en files explorer el glyph color también debe afectar al cell_name. y ver si se puede quitar una barritak, padding o margin que empuja al toolbar y al explorer hacia abajo en el frame de vaultman, incluso cuando el toolbar está oculto, y no permite que los nodos del explorer al hacer scroll desaparezcan en el borde del frame instance.

### Prompt 3

> disculpa por interrumpirte, me faltó agregar el último issue de que el toolbar overflow está mal hecho (se suponen que condense debería quitar a los dos últimos nodos de la derecha y ponerlos dentro del condesed tools menu y después al nodo de la izquierda sucesivamente hasta el min_width del frame, pero lo está haciendo hardcodeado con active-reveal y expand/collapse; horizontal scroll está haciendo lo que debería hacer wrap en vez de estar igual que condense (estar en el centro) pero en vez de un menú simplemente hacer scroll cuando ya no le quede espacio (sin scrollbars oíste! que no pase lo que está sucediendo con el floating inde cuando está en posición top o down de colocar scrollbars donde no deberían estar) como el ribbon pero en horizontal, y wrap es lo que hace naturalmente obsidian y sería encargarle ese navbar al workspace que resuelva su problema.

## Estado del repositorio y del intento anterior

### Historial relevante observado

- Commits posteriores a beta.6 observados antes de `b56b9a78`: `ff083b91`, `2bdea929`, `3353cd88`, `b4b625f7`, `e0945039`.
- Commits adicionales del intento anterior en el worktree objetivo:
  - `3eda8d05 feat(addons): native confirm modals for deletion operations`
  - `2d499e66 docs: agent session log for confirm modals`
  - `9afa0e07 fix(addons): wire up snippet rename using FileRenameModal`
  - `b56b9a78 feat(backlog): attempt of solving bugs.`
- `b56b9a78` mezcla 47 archivos y aproximadamente `+1897/-540` sin plan/spec/items asociados que preserven intención, contratos, dependencias ni decisiones a través de compactaciones.
- Esta mezcla transversal impide distinguir con facilidad cambios correctos, regresiones, imitaciones superficiales y deuda introducida. Es evidencia del problema metodológico señalado por el usuario.

### Cambios sueltos preexistentes que no pertenecen a este agente

- El worktree objetivo ya estaba dirty antes de editar nada: `src/logic/logicResponsiveLayout.ts` modificado.
- Diff actual exacto: elimina `scroll` de `ToolbarOverflowStrategy` y comenta `toolbarUsesHorizontalScroll` con el comentario `Doesn't work properly`.
- Ese cambio suelto contradice explícitamente el Prompt 3 y rompe compilación/tests. No sobrescribirlo silenciosamente; al implementar habrá que resolver su autoría/alcance y sustituirlo con el contrato aprobado.
- El workspace de memoria también tenía cambios ajenos preexistentes: `.agents/metrics/pkm-ai.jsonl` modificado y `.agents/docs/work/polish/issues/bt5-next-release/036-handoff-prompt.md` untracked. No tocarlos.

### Verificación ejecutada

- Suite focalizada:
  - `pnpm exec vitest run --config vitest.unit.config.mts test/unit/toolbarOverflowStrategy.test.ts test/unit/serviceIcons.test.ts test/unit/addonIcons.test.ts test/unit/iconicPropsTagsSource.test.ts test/unit/filterService.test.ts test/unit/statisticsPageSource.test.ts test/unit/explorerPropsContextMenuSource.test.ts`
  - Resultado: 7 archivos, 101 tests, 1 fallo.
  - Fallo: `toolbarUsesHorizontalScroll is not a function` en `toolbarOverflowStrategy.test.ts`.
- `pnpm run check` falla:
  - Settings todavía pasa `"scroll"`, pero el cambio suelto redujo el union a `"condensed" | "wrap"`.
  - Falta el export `toolbarUsesHorizontalScroll`.
  - El test con argumento `"scroll"` ya no tipa.
- `git diff --check e0945039..HEAD` detectó whitespace final en:
  - `src/modals/modalConfirm.ts:35`
  - `src/services/serviceOperationQueue.ts:259`
- Conclusión verificable: el worktree actual no está release-ready aunque numerosos tests superficiales estén verdes.

## Auditoría requisito por requisito — estado provisional

Las categorías son: `correcto`, `parcial`, `regresión`, `omitido/no demostrado`, `sobreaplicado`.

### 1. Autoprotección del plugin y acción de snippets

- `correcto`: `plugin.toggle` permite al propio Vaultman desactivarse (`when` admite `pluginId`).
- `correcto`: `plugin.uninstall` excluye a Vaultman (`!meta.isVaultman`), por lo que no puede autodesinstalarse.
- `regresión/parcial`: la acción superviviente `snippet.see-details` usa label hardcodeado `'Reveal in system explorer'`, no i18n, e icono `lucide-folder-open`. No reutiliza la identidad canónica de la acción interceptada por Files/File Explorer; coincide con el síntoma del usuario.
- Hallazgo adicional no pedido directamente: el commit de confirmaciones añadió una `ConfirmModal` propia pese al historial de discusión sobre modales nativos. No ampliar alcance sin decisión explícita; sí registrarlo como posible deuda separada.

### 2. Hide explorer scrollbar y reserva del lane del Floating Index

- `parcial/estructuralmente correcto`:
  - existe setting `tocHideExplorerScrollbar`;
  - Settings oculta `Reserve index lane` cuando hide está activo;
  - `tocReservedLanePosition` conserva el lane vertical si está activo `tocReservedLane` **o** `tocHideExplorerScrollbar`;
  - CSS oculta el bar con `scrollbar-width:none`/`::-webkit-scrollbar` y conserva padding/scroll-padding del lane.
- No hay prueba conductual suficiente para Tree/Table/Grid/Cards, izquierda/derecha y combinaciones con top/bottom. Requiere smoke visual/DOM antes de llamarlo terminado.

### 3. Iconic y fallback propio en Files/Props/Tags/Text/Snippets/Plugins

- `regresión confirmada por comparación de fuente con beta.6`:
  - beta.6 intentaba primero `propertyIconManager.onContextMenu` / `tagIconManager.onContextMenu` y sólo después el picker crudo;
  - `b56b9a78` eliminó esa ruta preparada por los managers y llama directamente `runtime.openIconPicker(item, callback)` para props/tags/files;
  - eso explica de forma plausible que el picker abra sin selección: el item crudo no necesariamente cumple el contrato que preparan los managers. Debe demostrarse en runtime, no quedarse sólo en inferencia.
- `parcial`: `canChangePropertyIcon`, `canChangeTagIcon` y `canChangeFileIcon` ahora anuncian disponibilidad siempre, y se añadió storage fallback para Files/Props/Tags. Estructuralmente preserva Change icon cuando Iconic/add-on están desactivados, pero no existe prueba end-to-end de los cuatro explorers principales.
- `parcial`: Snippets/Plugins fabrican un `IconicRuntimeItem` virtual y llaman el picker; si falla, vuelven al fallback. El usuario observa que sigue apareciendo el fallback, por lo que el adaptador virtual no está probado contra el contrato real de Iconic.
- `regresión/no deduplicado`: el servicio de context menu agrega acciones Vaultman después de disparar el `file-menu` nativo para TFile/TFolder y no deduplica una eventual acción Change icon inyectada por Iconic. En props/tags la causa exacta del duplicado todavía requiere instrumentación runtime; no afirmar una única causa hasta observar quién aporta cada item.
- Cambio de semántica implícito: los getters de icono dan precedencia a override persistido fallback antes que Iconic. Esa precedencia debe especificarse y probarse; hoy quedó accidental.
- Calidad de tests insuficiente: predominan asserts de disponibilidad y source-string guards; no se prueba manager real, selección inicial, callback de resultado, dedupe ni hot enable/disable.

### 4. Tab menu y scope de Statistics; toolbar como scene/provider

- `parcial`:
  - el tab menu actual incluye Statistics, Files, Props, Tags, Content/Text, Snippets y Plugins;
  - falta Toolbar;
  - Index está correctamente ausente porque no puede actuar como scene seleccionable;
  - el selector de scope sí se implementó como `statisticsHeaderActions` y abre un menú desde toolbar.
- `deuda arquitectónica confirmada`: `pageStatistics.svelte` mantiene su propia lista y `navbarFilters.svelte` concentra aproximadamente 1800 líneas con imports/tipos y decisiones específicas de providers/explorers. El toolbar no está modelado como scene autónoma alimentada por un catálogo de acciones de cada provider.
- Recomendación provisional de release: introducir contrato/catálogo provider-driven incremental, no reescribir todo el navbar antes del release.

### 5. Textos cortos de filtros en `en.ts`

- `regresión`:
  - se introdujeron textos cortos como `Has prop`, `Not prop`, `Has value`, `Not value`, `In folder`, `Not folder`, `Not name`, `Has text`, `Not text`;
  - se eliminó accidentalmente `filter.file_name` de `en.ts`, aunque `modalAddFilter.ts` lo consume; la UI puede mostrar el código de traducción;
  - `filter.multiple_values` fue reutilizado como `Not value`, pero `multiple_values` es un tipo distinto de `not_specific_value`; semántica incorrecta.
- `parcial`: `FilterService.getFlatRules()` continúa hardcodeando numerosos labels ingleses (`Missing property`, `Not ${property}`, `Has tag`, etc.) en vez de consumir el catálogo i18n.
- Tests fueron modificados para bendecir algunos strings nuevos, pero no detectan la key ausente ni la colisión semántica.

### 6. Filtros inclusivos/exclusivos de Props y Tags

- `parcial/estructuralmente próximo al pedido`:
  - click simple crea filtro inclusivo;
  - `event.detail >= 2` reemplaza por exclusivo;
  - siguiente click quita el filtro;
  - un segundo click lento llega como detail 1 y no produce exclusivo;
  - se añadieron sets/clases de exclusión, highlight con `var(--text-normal)` y bubbledot `filter-excluded`, distinto del inclusivo/accent.
- Riesgo no probado: un doble click real genera primero click 1 y luego click 2, por lo que puede emitir/renderizar dos estados intermedios y producir flicker o efectos duplicados. Deben existir tests conductuales de secuencia/timing, triple click, teclado y touch; hoy el test sólo valida estado de servicio.

### 7. Toolbar overflow: condensed, scroll y wrap

- El issue previo BT5-021 estaba marcado completed, pero los prompts redefinen/corrigen el contrato; debe reabrirse o ser sustituido explícitamente junto con el solapamiento BT5-039.
- `parcial` en `b56b9a78`:
  - añadió `wrap`;
  - creó un orden lógico de nodos;
  - condensed esconde un sufijo: primero los dos de la derecha, luego uno adicional hacia la izquierda;
  - el cálculo intenta producir 4 iconos visibles en min-width con tab label y 5 sin label;
  - las acciones ocultas aparecen en Tools menu;
  - scroll usa una sola fila, overflow horizontal y scrollbar visualmente oculto;
  - wrap usa `flex-wrap`.
- Problemas:
  - auto-condense sólo corre si `activeSectionTab === 'files'`, no como contrato provider-generic;
  - cálculo hardcodeado (36 px por nodo + extra del label) usa `frameWidth`, no medición del toolbar/viewhost ni anchos reales;
  - puede desincronizarse con markup condicional, i18n, comandos dinámicos, zoom/fuente y acciones de ancho distinto;
  - el fade de scroll está siempre presente y su pseudo-elemento puede consumir/ocultar el extremo;
  - tests afirman aritmética/source strings, no fitting real ni accesibilidad/scroll.
- `regresión actual`: el cambio suelto elimina por completo `scroll`, contradice Prompt 3 y rompe `pnpm run check` y unit test.
- Contrato explícito a conservar:
  - `condensed`: centrado mientras cabe; al desbordar mueve primero los dos nodos más a la derecha a Tools, y luego el siguiente hacia la izquierda sucesivamente;
  - `scroll`: centrado mientras cabe, una fila; al desbordar permite scroll horizontal tipo ribbon, sin scrollbar visible y sin convertirlo en condensed/wrap;
  - `wrap`: delega el wrapping natural al navbar/workspace de Obsidian.

### 8. Context menu de Property Explorer: tipos y conversiones

- `parcial/implementado sin robustez`:
  - Change type incluye text/number/checkbox/date/datetime/list;
  - datetime se etiqueta `Date & Time`;
  - el checked predicate usa `_effectivePropType`, por lo que reconoce el tipo actual;
  - Convert incluye `lowercase`, `UPPERCASE`, `Titlecase` y `Wikilink`.
- Huecos:
  - labels/submenus están hardcodeados en inglés, no i18n;
  - no hay tests conductuales dedicados suficientes; prevalecen source guards;
  - conversiones sobre arrays, aliases, links existentes, valores vacíos y tipos compuestos no están especificadas ni probadas.

### 9. Cell formatting de property values con paridad de Properties de Obsidian

- `regresión conceptual/imitación superficial`:
  - se añadió `src/utils/renderPropertyValue.ts` sin test dedicado;
  - checkbox es disabled/pointer-events none;
  - wikilink sólo reconoce regex de string completo y crea un `<a class=internal-link>` simple;
  - dates usan `Date` de JS y locale strings;
  - botón de nota diaria abre el string raw `YYYY-MM-DD` con `openLinkText`.
- Investigación local en `C:\Users\vic_A\Desktop\obsidian-web-lab` sobre Obsidian 1.12.7:
  - wikilink usa `metadata-link-inner`, wrapper `metadata-link`, flair/pencil y lógica de componente;
  - checkbox usa `input.metadata-input-checkbox`, `data-indeterminate`, cambios, teclado y blur;
  - date usa `input.metadata-input.metadata-input-text.mod-date`, `type=date`, `max=9999-12-31`;
  - datetime usa `mod-datetime`, `type=datetime-local`;
  - Daily Notes comprueba el plugin interno `daily-notes`, resuelve `getDailyNote(this.date)` y abre el archivo real con `workspace.getLeaf(modEvent).openFile(file)`, respetando carpeta/formato configurados.
- Por tanto, la implementación actual no tiene paridad funcional ni accesible, y la navegación diaria es incorrecta con configuración personalizada.
- Intento de indexar todo `obsidian-web-lab` en codebase-memory cerró el transporte MCP por el tamaño de artefactos generados/minificados (`obsidian/app.js` ~3.7 MB y árbol Obsidian grande). Se cambió a búsquedas literales acotadas, permitido por fallback. Al reintentar, excluir artefactos generados o indexar sólo un corpus reducido.

### 10. Glyph color en Floating Index y Files

- Floating Index: `sobreaplicado`.
  - los action nodes dentro del rail (`trackIndex >= 0`) sí reciben `glyphColorStyle`, cumpliendo el pedido;
  - pero los action nodes fuera del rail llaman también `glyphColorStyle(Math.max(0, -1), ...)`, así que reciben color aunque el usuario limitó el pedido a “cuando formen parte del rail”. Debe aclararse/gatearse al contrato exacto.
- Files cell_name: `parcial`.
  - Tree asigna `node.labelColor = glyph` y `viewTree` lo aplica;
  - el renderer genérico de NodeTable también soporta `labelColor`, pero Files usa su propia `FilesTableView/viewGrid`, cuya celda `.vaultman-file-name` no recibe glyph color;
  - cards colorea el nombre con `resolvedIcon?.color`, pero `_resolveFileIcon` no incorpora el glyph global; por tanto no cubre el setting global de forma consistente.
- Requiere un único resolved visual style por file/folder consumido por Tree/Table/Cards y tests por modo/scope/precedencia Iconic.

### 11. Barra/padding/margin superior del frame

- `no demostrado`: no se debe borrar CSS a ciegas.
- Fuente observada:
  - `.view-content` de `vaultman-frame` ya tiene `padding: 0`;
  - `.vaultman-toolbar-slot.is-hidden-mode` tiene `height: 0`;
  - `.vaultman-toolbar-peek` es `position:absolute; top:0; height:6px`, por lo que no debería empujar el layout;
  - `.vaultman-page`/tab content no añaden padding superior en desktop;
  - mobile sí añade padding explícito.
- Hipótesis pendientes: header nativo de `ItemView`, geometría/overflow del page scroller padre frente al scroller hijo, o estilo computado del host/theme. Se necesita medición DOM viva con toolbar visible/oculto y Tree/Table/Cards para identificar qué box genera el offset y dónde debe estar el clip edge.

## Problemas transversales del intento anterior

1. No hubo contrato único por subsistema; se parchearon symptoms en 47 archivos.
2. Se usaron source-string tests como sustituto de comportamiento/runtime.
3. Se omitieron matrices de composición: provider × view mode × plugin Iconic state × toolbar strategy × width × platform.
4. Se cambiaron precedencias y semánticas sin decisiones escritas (Iconic vs override propio, multiple_values vs exclusive value).
5. Se imitó UI privada de Obsidian sin reproducir su semántica, accesibilidad ni integración con Daily Notes.
6. Se corrigió el caso visible de Files con aritmética hardcodeada, no el modelo provider-driven que el usuario describió.
7. Un cambio suelto posterior intentó “arreglar” scroll eliminando la feature, dejando el worktree objetivamente roto.

## Issues existentes que se solapan — mapeo provisional

- BT5-009: `Exclusión de files como filtro por nodo` está completed y trata `file_exclude`; **no** es el dueño correcto del ciclo inclusive/exclusive de Props/Tags. No reabrirlo por semejanza nominal.
- BT5-019: addon icon registry/picker — el archivo sigue `needs-triage`, mientras el índice lo marca completed por `d0928260`; esta inconsistencia debe corregirse. El contrato original prefería picker propio para Snippets/Plugins, pero la nueva decisión del usuario exige intentar el picker Iconic y capturar su resultado cuando exista, conservando fallback. Reabrir/ampliar por slices.
- BT5-021: toolbar overflow — completed por `57739ac5`, pero su Outcome ya declaraba diferida la relocalización real a Tools. Reabrir/superseder: el contrato anterior es insuficiente y el worktree actual está roto.
- BT5-025: glyph color — follow-up porque el Outcome sólo declara `iconColor`; Files `cell_name` es parcial y Floating Index está sobreaplicado.
- BT5-026: per-node/cell glyph override — vigilar dependencia; no mezclar override granular con corrección del glyph global sin decisión.
- BT5-033: compositions — dependencia/criterio de matriz, no absorber todo su alcance en esta reparación.
- BT5-035: condense tabs/context menu granular — solapa configuración, no confundir con fitting físico del toolbar.
- BT5-037: no tiene archivo propio, pero el índice/plan lo marca completed por `871a837e`; implementó paridad de toolbar Statistics para cuatro data tabs, no el scene/tab menu completo de D14. Crear follow-up, no fingir que el completion anterior incluía la nueva aclaración.
- BT5-038: tampoco tiene archivo propio; el plan de `6e64f28b` separó `exact` y `bubbled` sólo para filtros activos inclusivos. El nuevo estado exclusivo/polaridad debe ser follow-up de esta presentación, no de BT5-009.
- BT5-039: ya describe explícitamente el problema del Prompt 3 — catálogo reordenable, overflow real y tres modos— y sigue `needs-triage`. Debe ser el umbrella principal junto con la reapertura de BT5-021. Su `Fixed amount of nodes` numérico no debe imponerse sobre el fitting medido pedido ahora; separar esa preferencia como decisión HITL para no crear dos autoridades de capacidad.
- Decisiones históricas todavía vigentes: beta3 D14 fija el orden del tabs cmenu y beta4 D23 fija que el index se mueve al lane reservado de 22/26 px. Los nuevos criterios refinan esas decisiones, no las reemplazan silenciosamente.
- Nuevos IDs deben empezar después del inventario actual (observado hasta 042), pero no crear archivos definitivos hasta que el usuario apruebe desglose, dependencias y granularity.

## Estrategia provisional que debe presentarse al usuario

### Opción recomendada: estabilización forense por vertical slices

- Conservar `b56b9a78` como evidencia y reparar por slices demoables, reabriendo issues existentes cuando expresan la misma intención y creando nuevos sólo para capacidades realmente nuevas.
- Cada slice debe empezar con contrato y matriz, test rojo conductual, implementación mínima, checks y smoke de Obsidian cuando corresponda.
- Ventaja: preserva aciertos reales sin bendecir el commit monolítico ni perder cambios correctos.

### Alternativa: revertir todo `b56b9a78` y reimplementar

- Más limpio conceptualmente, pero perdería partes correctas (autoprotección, lane, opciones de types/conversion, scope de Statistics) y aumentaría el riesgo/tiempo pre-release.

### Alternativa desaconsejada: seguir parchando el monolito

- Más rápida en apariencia, pero repetiría la misma falla: regresiones cruzadas, tests de fuente y decisiones no persistidas.

## Desglose preliminar de slices/issues para aprobación

1. Reabrir BT5-021/BT5-039: modelo medido y provider-aware de toolbar fitting/orden.
2. Follow-up BT5-021: UX diferenciada de condensed/scroll/wrap, scroll sin bar, centro mientras cabe, accesibilidad y pruebas de ancho real.
3. Reabrir BT5-019: fallback propio estable en Files/Props/Tags/Text con Iconic ausente/desactivado y precedencia explícita.
4. Follow-up BT5-019: integración con managers/picker de Iconic, selección inicial, adapters de Snippets/Plugins y dedupe de acciones.
5. Nuevo: identidad canónica/i18n de Reveal in system explorer + reglas de autoprotección como aceptación verificable.
6. Nuevo/follow-up FTC: hide scrollbar conserva lane en todas las superficies/posiciones.
7. Follow-up BT5-037: catálogo provider-driven de scenes/toolbar actions; completar tab menu de Statistics y scope menu sin gran rewrite.
8. Follow-up BT5-038 + issue i18n: restaurar catálogo corto correcto y ciclo inclusive/exclusive/remove con presentación diferenciada; no reabrir BT5-009.
9. Nuevo: Property context menu type/conversion con i18n y semántica compuesta probada.
10. Nuevo: adapter/renderers de property values con paridad funcional de Obsidian (wikilink, checkbox, date, datetime, Daily Notes).
11. Follow-up BT5-025: glyph color exacto en Floating Index rail y Files cell_name para Tree/Table/Cards, con precedencias.
12. Nuevo diagnóstico/repair: top-edge geometry del VaultmanFrame basada en medición DOM, no en eliminación especulativa de padding.

## Adversarial pass pendiente antes de bloquear diseño

Debe cubrir, como mínimo:

- Iconic ausente, instalado pero desactivado, add-on Vaultman desactivado, reload/hot toggle, manager que inyecta acción nativa, overrides previos, rename/move y items virtuales.
- Toolbar con labels largos traducidos, comandos dinámicos, zoom/fuente, split mínimo, providers con distinto número/ancho de acciones, mobile, teclado y reduced motion.
- Filtros con doble/triple click, click lento, keyboard, touch, bubbling desde descendientes colapsados y emisiones duplicadas.
- Values con arrays, aliases, links existentes, checkbox indeterminate, invalid dates, Daily Notes desactivado o con carpeta/formato personalizados.
- Frame con toolbar visible/oculto, themes, Tree/Table/Cards, index left/right/top/bottom, dock visible/oculto.
- Integraciones de terceros que añaden items al `file-menu`.
- Declarar explícitamente lo que no cubre el plan (por ejemplo, refactor total del navbar, SavedLayout/BT5-033 completo, rediseño visual, deuda de custom confirmation modal) y la calidad que se perdería si se usa API interna privada de Obsidian frente a un renderer local.

## Consolidación 2026-07-22 tras leer issues/planes históricos

### Contratos históricos que el intento anterior no gobernó

- Beta3 D14 ya fija tabs cmenu: Files → Props → Tags → Content / Filters + Queue / Floating TOC / Statistics → Snippets → Plugins / toggle Toolbar. El follow-up de Statistics debe consumir este catálogo compartido, no copiar otra lista local.
- Beta4 D23 fija que Reserve index lane mueve el rail al lane de 22/26 px. Hide scrollbar debe ocultar sólo el bar y mantener exactamente esa geometría.
- BT5-021 se cerró aunque su Outcome decía que la relocalización real a Tools en condensed quedaba diferida. El completion no cubría el contrato actual.
- BT5-039 ya describía casi literalmente el Prompt 3 y permanecía needs-triage. El agente anterior lo implementó parcialmente dentro de `b56b9a78` sin actualizar el issue, sin plan y sin smoke.
- BT5-019 está `needs-triage` en su archivo y `completed` en el índice. BT5-037 y BT5-038 figuran completed en índice/plan pero no tienen issue file. Antes de release hay que reconciliar fuente de verdad y evidence links.

### Diseño recomendado

- Un `SceneDescriptor` catalog único aporta id/label/icon/availability/command a todos los tab menus; Statistics deja de mantener su copia.
- Cada provider aporta `ToolbarActionDescriptor[]` ordenados. El navbar sólo renderiza; un layout controller calcula fitting sobre ancho realmente medido.
- Condensed usa el orden real y reserva primero espacio para Tools: desplaza los dos últimos candidatos y después uno por uno hacia la izquierda. Un eventual `Fixed amount` manual es un **cap**, nunca una cifra que fuerce más nodos que el ancho medido.
- Scroll y wrap usan el mismo catálogo: scroll conserva una fila y overflow-x sin scrollbar visual; wrap delega flex-wrap. Ninguno mueve items al Tools menu.
- Iconos: adapter por capacidad. Cuando existe Iconic, usar el manager preparado para Files/Props/Tags y un adapter virtual explícito para Snippets/Plugins;
  capturar el callback en el store Vaultman. Si no existe/falla, usar fallback propio. Una identidad canónica de acción deduplica contribuciones externas.
- Property values: adapter híbrido. Reusar el widget/manager metadata de Obsidian cuando la capacidad exista; fallback local semántico y accesible. Daily Notes siempre resuelve el archivo real/configurado, nunca `openLinkText(YYYY-MM-DD)`.

### Issues/slices propuestos para aprobación

1. `BT5-039-R1` (AFK): catálogo provider-aware de action nodes + fitting medido.
2. `BT5-021-R/BT5-039-R2` (AFK, smoke HITL; depende 1): condensed/scroll/wrap con contratos mutuamente exclusivos y migración del dirty state roto.
3. `BT5-019-R1` (AFK): fallback estable de Change icon en Files/Props/Tags/Text, precedencia y refresh con Iconic ausente/desactivado.
4. `BT5-019-R2` (AFK + smoke HITL; depende 3): managers/picker de Iconic, selección inicial, adapters Snippets/Plugins, intercept de resultado y dedupe.
5. `BT5-043` (AFK): identidad/i18n/icono canónicos de Reveal in system explorer + tests de self-disable/self-uninstall guard.
6. `BT5-044` (AFK + smoke HITL): Hide explorer scrollbar conserva lane D23 en todas las superficies/posiciones y oculta Reserve lane en settings.
7. `BT5-045` (AFK; coordina con 1): SceneDescriptor compartido, tab menu completo de Statistics según D14 y scope action como toolbar provider.
8. `BT5-046` (AFK): catálogo i18n correcto de filters + ciclo Props/Tags inclusive → exclusive → remove y highlights/bubbledots distintos; follow-up de BT5-038, no reapertura de BT5-009.
9. `BT5-047` (AFK): Property context menu type/conversion con i18n, checked state y semántica compuesta testeada.
10. `BT5-048` (HITL en elección/fidelidad; depende 9 parcialmente): renderer híbrido de values con wikilink/checkbox/date/datetime/Daily Notes.
11. `BT5-049` (AFK + smoke HITL; depende BT5-025): glyph color sólo en action nodes unidos al rail y Files cell_name en Tree/Table/Cards con precedencias.
12. `BT5-050` (diagnóstico AFK + validación HITL): medir y reparar top-edge/clip geometry del VaultmanFrame sin eliminar padding/barra por conjetura.

### Adversarial pass ejecutado sobre la propuesta

- Iconic puede instalarse/desinstalarse o activarse durante la sesión; el adapter no puede cachear managers indefinidamente. Rename/move debe migrar overrides y contribuciones duplicadas de terceros requieren dedupe por identidad/semántica, no por label traducido.
- Fitting del toolbar debe sobrevivir labels i18n largos, zoom/font scale, comandos custom de ancho distinto, provider sin ciertas acciones, min split y la anchura que consume el propio Tools button. Medir sólo nodes visibles crea feedback loop;
  se necesita measurement pass estable/offscreen o cache invalidable.
- Double click produce click 1 + click 2; el servicio no debe persistir dos estados ni emitir operaciones costosas dos veces. Touch/keyboard necesitan ruta accesible para exclusive aunque el doble click siga siendo el shortcut pedido.
- Values: arrays, aliases, links ya formateados, checkbox indeterminate, dates inválidas y Daily Notes disabled/custom path/format. No parsear dates con UTC de JS de forma que cambie el día local.
- Index: left/right/top/bottom, dock on/off, toolbar on/off, short frame, mobile y themes con scrollbar overlay/clásico. Top/bottom no deben ganar scrollbar.
- No cubre: refactor total de `navbarFilters.svelte`, clasificación completa de BT5-033, BT5-035 completo, custom confirmation modal ni rediseño visual. El adapter híbrido pierde estabilidad si usa APIs privadas de Obsidian; el fallback local pierde fidelidad exacta. Ambos riesgos deben quedar explícitos y testeados.

## Próximos pasos exactos

1. Terminar lectura de metadata/status de issues existentes relevantes y consolidar el mapping reopen/supersede/new.
2. Presentar al usuario auditoría resumida, tres estrategias, recomendación, issues con tipo HITL/AFK, dependencias y user stories.
3. Ejecutar adversarial pass y pedir una sola aprobación explícita del diseño/desglose.
4. Sólo tras aprobación: publicar/actualizar los issue files locales y la spec/plan exhaustiva.
5. Implementar por TDD y verificar por slice; no hacer cambios monolíticos.

## Corrección del usuario posterior a la propuesta de 12 slices — copia literal

> al self disable de vaultman desde plugins explorer le debo añadir que tengo entendido que añadió la funcionalidad, pero la ui/ux, el cell_toggle que se supone debería invocar esa action de SASI sigue mostrando el warning de que no se puede desactivar a sí mismo; por lo que es implementación incompleta. al hide scrollbar cuando se activa tiene el problema de que también activa reserve lane pero mal, porque el chiste de ocultar el scrollbar es que el index se quede en su sitio pero que los nodos del explorer no reclamen ese espacio para que no queden por debajo del index y este no oculte información de los nodos, pero como el reserve lane tiene hardcodeado el mover al index entre el explorer y el scrollbar se vuelve un escenario feo y mal UI (porque queda el lane del scrollbar + el lane del index que encima es del width de cuando index_plain_style está off pero cuando está on es demasiado espacio (es una diferencia microscópica de px así que no hay que exagerar con las cantidades; pero en resumen es un fallo de no contar con las variaciones del mismo setup). el de iconic + fallback es que me parece que todos los explorers, o al menos los que menciono en los prompts de issues tienen diferentes invocaciones a "change icon" cuando deberían todas manejar por la misma ruta si me entiendes (e igual anticipar las variaciones, porque "iconic" no es el único addon con otro plugin que tenga icon picker el cual tendrá vaultman). statistics duplica el toolbar (creo que todos lo hacen, cuando deberían nutrir un mismo toolbar universal con las mismas reglas de overflow y así, que también vi que el de files si tiene overflow y los otros no...). del exclusive props/values/tags debo añadir que aún no muestran al cell_highlight que tanto he peleado (solo lo hace en cards mode, y que después de activarlo no se desactiva con un click como si lo hace el cell_highlight de active filter). toolbar overflow scroll está mal diseñado, no entiendo qué tan difícil es dejar un lane fijo para el toolbar en ese overflow_mode como si lo tiene nuestro floating index y el ribbon leaf de obsidian. del prop value rendering es que tampoco está el cell "format" que pedí que activa/desactiva dicho rendering de los values. del glyph color (específicamente folders) de files no creo que haga falta en table/cards porque estos no tienen folders (aún). de la separación superior del frame hay dos referencias, el que tiene beta.5 y lo que dejó el último commit. agrego que me da coraje que el issue de quitar el "toggle has/hasn't tex" del text explorer y colocarlo en el toolbar del text provider entre el action_node de pause/resume search y el sort menu no aparezca en tu propuesta (dime si fue que no te lo mencioné o si fue que no lo leíste). dime cómo y qué tanto afecta este mensaje a tu proposición de 12 slices que aún no había leído cuando escribí lo anterior, por lo que pude haber dicho contradicciones o cosas que ya habías tomado en cuenta.

### Deltas obligatorios que introduce

- Self-disable deja de considerarse correcto end-to-end: la action/guard puede existir, pero el `cell_toggle` mantiene warning/prohibición y no invoca coherentemente la misma operación. El slice debe cubrir action + cell + mensajes + estado externo.
- Hide scrollbar no equivale a activar Reserve lane. Debe conservar la posición overlay actual del index y **no permitir que los nodos reclamen la huella liberada del scrollbar/index**, de modo que no queden debajo del rail. Debe existir un solo gutter:
  ocultar el bar no puede aplicar el desplazamiento de Reserve lane (`right: 14px`) además del padding. La huella depende levemente de `index_plain_style`; ajustar sólo esa diferencia real, sin crear un segundo lane ni exagerar píxeles microscópicos.
- Change icon necesita una única ruta/capability adapter para todos los explorers y un protocolo extensible a Iconic u otros plugins con picker; no seis invocaciones ad hoc.
- El toolbar debe ser una superficie universal alimentada por providers; Statistics y los demás no deben duplicar renderers ni perder las reglas de overflow de Files.
- Exclusive Props/Values/Tags falla en engines: cell_highlight sólo aparece en Cards y no se elimina con el siguiente click. El test matrix debe cubrir Tree/Table/Cards y transición inclusive/exclusive/remove, no sólo estado de servicio.
- Scroll mode debe reservar un lane horizontal fijo para el toolbar/ribbon, con scroll del contenido dentro de ese host y sin scrollbar visible; no resolverlo como flex-wrap ni como condensed.
- Property values requiere una cell configurable `format` que enciende/apaga el renderer;
  la propuesta anterior cubría el renderer pero omitía el control de cell registry/layout.
- Glyph color de folders se limita por ahora a Tree, porque Table/Cards no proyectan folders. No inventar soporte para nodos inexistentes; file names se revisan según scope.
- Top-edge geometry debe comparar beta.5 contra el último commit, además de medir DOM.
- Requisito nuevo para esta auditoría: retirar el toggle `Has/Hasn't text` del cuerpo del Text explorer y registrarlo como action node del provider Text entre Pause/Resume search y Sort. Este requisito **no aparece en ninguno de los tres prompts literales** recibidos en esta sesión; por eso no entró en los doce slices. Debe buscarse en backlog/specs o en un prompt anterior no incluido antes de decidir si es issue recuperado o nuevo.

### Evidencia de fuente para las correcciones

- `explorerPlugins.toggle()` corta en `meta.isVaultman`, muestra `addons.plugins.self_protected` y nunca llega a `setCommunityPluginEnabled`; en cambio `logicPluginContextMenu` registra `plugin.toggle` sin excluir Vaultman. El test `addonExplorerSource.test.ts` todavía exige “without allowing Vaultman to disable itself”. Es una contradicción action/cell/test, no sólo copy desactualizado.
- `tocReservedLanePosition` retorna left/right si `tocReservedLane` **o** `tocHideExplorerScrollbar` están activos. Esa misma clase aplica padding 22/26 px y, a la derecha, mueve el index a `right: 14px`. Confirma el doble gutter descrito.
- El CSS de exclusión incluye `.vm-tree-row-surface`, pero el renderer actual emite `.vaultman-tree-row`; por eso Tree no recibe el highlight. Table sí tiene selector, pero necesita smoke porque el usuario observa que tampoco funciona de extremo a extremo.
- `removeNodeByProperty` sólo elimina `specific_value`/`has_property` y `removeNodeByTag` sólo `has_tag`; no eliminan `not_specific_value`, `missing_property` ni `not_has_tag`. Por eso el click posterior detecta estado excluded pero no logra retirarlo.
- No existe una cell `format` en el registry; `renderPropertyValue` se aplica directamente al label de values. El control pedido fue omitido completamente.
- `tabContent.svelte` contiene el toggle de `contentIsExclusion`. El array `contentHeaderActions` contiene `content-pause` seguido de `content-sort`, exactamente el seam donde debe insertarse la action del provider Text.
- La investigación histórica `2026-05-17-toolbar-architecture/01-current-map.md` ya diagnosticaba que el toolbar estaba acoplado a Filters, que otras páginas resolvían controles localmente y que no existía un capability/command registry universal. La corrección del usuario confirma que esa deuda ya es bug de consistencia/overflow.
- Top-edge: `1.2.0-beta.5` ya contiene toolbar slot/peek y padding cero del view-content;
  `b56b9a78` vuelve a tocar los cuatro archivos de la geometría. Ambos son oráculos de comparación, pero aún hace falta DOM computed geometry para atribuir la barra exacta.

### Efecto sobre el desglose anterior

- El diseño cambia de forma material, no cosmética. Los doce slices anteriores eran demasiado gruesos en toolbar, self-actions, i18n y formatting.
- Propuesta revisada: **16 slices finos**. Se preservan todos los user stories, se añade el requisito Text omitido y se evita implementar folders inexistentes en Table/Cards.
- Los IDs son provisionales hasta aprobación; publicar en orden de dependencia.

1. Universal Toolbar host + contrato `ToolbarProvider` (AFK).
2. Text provider tracer: mover Has/Hasn't text entre Pause/Resume y Sort (AFK; bloqueado 1).
3. Overflow universal medido: condensed/scroll/wrap, scroll con lane fijo (AFK + smoke HITL;
   bloqueado 1).
4. Migrar Statistics y demás providers al host, retirando toolbars duplicados (AFK + smoke HITL; bloqueado 1 y 3).
5. `ChangeIcon` action/router único + registry de picker capabilities extensible (AFK).
6. Adapters Vaultman/Iconic, selección inicial, fallback, intercept y dedupe (AFK + smoke HITL; bloqueado 5).
7. Plugin self-toggle end-to-end: cell/action/test permiten disable; uninstall sigue bloqueado (AFK + smoke HITL).
8. Snippet Reveal in system explorer: id/label/i18n/icon canónicos (AFK).
9. Hide scrollbar con una sola huella del index y variación plain-style, separado de Reserve lane (AFK + smoke HITL).
10. Restaurar catálogo i18n corto/correcto de filters (AFK).
11. Props/Values/Tags polarity end-to-end: inclusive/exclusive/remove + highlight/dot por engine y input (AFK + smoke HITL).
12. Property context menu: type/Date & Time/current checked + conversions con i18n (AFK).
13. Cell `format` registrable/configurable y raw-vs-formatted toggle (AFK).
14. Property value parity renderer: wikilink/checkbox/date/datetime/Daily Notes (HITL de fidelidad; bloqueado 13).
15. Glyph color follow-up: action nodes sólo dentro del rail y folder `cell_name` sólo donde folders existen hoy (Tree); no inventar Table/Cards folders (AFK + smoke HITL).
16. Top-edge/clip geometry: beta.5 + último commit + medición DOM (diagnóstico AFK, validación HITL).

## Aclaración del usuario: format parcial y semántica Navbar — copia literal

> el renderer de cell format se aplica correctamete solo a los wikilinks. "show date/data and time picker" y los chechboxes no se están renderizando (repito, obsidian no tiene api para estos botones que aparecen en su core plugin "properties", hay que sacarlos si o si del web-lab pues creo que del cli sigue siendo complicado porque hay que interceptar o monkey patch eso). el toolbar creo que es mejor declararlo como un navbar que vendría siendo un panelWidget (lo digo con la semántica del stream goal/sandbox porque ya sabes, en algún momento hay que convergerlos), pero tal vez sea algo más de nombres que funcional en el estado actual del proyecto.

### Delta de diseño

- Conservar el seam de wikilinks que ya funciona; no describir `format` como renderer completamente ausente. Lo ausente/roto es el control configurable y la paridad de checkbox/date/datetime.
- Obsidian no expone API pública para esos widgets del core Properties. La investigación en `obsidian-web-lab` es gate obligatorio. Recomendación provisional: instrumentar o monkey-patchear **el lab para observar** constructores, DOM, eventos y state transitions;
  implementar widgets Vaultman con ese contrato observado. No monkey-patchear producción por defecto porque sería frágil entre versiones y puede interferir con terceros.
- Renombrar la frontera arquitectónica de `Universal Toolbar` a **Navbar**, clasificada como `panelWidget`. `Toolbar` puede persistir como label UX/alias legacy durante v1.2.0.
  Funcionalmente sí importa: Navbar pertenece al frame/panelWidget y recibe action_nodes de providers; no pertenece a Files ni a cada page.

## Aclaración del usuario: action_cells queued y regresión de rename modal — copia literal

> y debo agregar que estos renderers hacen cambios inmediatos que debemos interceptar para poder agregar al queue list (por lo menos el widget de open date picker y el checkbox -que en nuestra semántica vendrían a ser action_cells- hacen lo mismo que un operation rename solo que interactivo; por lo que también usarlos dejaría un badge_rename en el value node). también debo agregar que el agente anterior hizo una mala implementación/cambio al operation rename de nodos individuales, porque nosotros tenemos un modal que es más o menos práctico con variedad de opciones y que la única que le faltaba era que para nodos individuales no debería mostrar {basename} sino el nombre como tal (ej, pepito), en cambio reemplazó a ese modal por otro demasiado básico que encima está mal hecho en cuanto a UI/UX se refiere (por favor, que al momento de trabajar ese issue se vea que otros actiones hacen call a esa excusa de modal y reemplazar por el más práctico).

### Delta de diseño

- Checkbox y date/datetime no son formatters pasivos: son `action_cells`. Su evento produce un intent tipado de cambio de value y **no escribe directamente**. El provider resuelve el conjunto de files representado por el value node, crea una operación rename/value-change en `queueService` y la proyección normal de queue coloca `badge_rename` en ese value node.
- Navegación a Daily Note sigue siendo una action de navegación, no una operación queued.
- Separar widgets interactivos en tracer bullets: checkbox queued y date/datetime queued, porque el segundo necesita investigación/picker del web-lab y tiene más riesgo HITL.
- Añadir issue de regresión para operation rename de nodo individual. Encontrar `COMMIT_BUENO` con el modal rico y `COMMIT_MALO` que lo sustituyó; adaptar el modal rico para que un target individual muestre el nombre literal (`pepito`) en vez de `{basename}`. Auditar todos los callers del modal básico y migrarlos cuando correspondan, sin eliminar capacidades del modal rico.
- Efecto provisional: el desglose pasa de 16 a **18 slices** (se divide format interactivo y se añade la regresión rename-modal). IDs aún no publicados.

### Diagnóstico confirmado de la regresión rename-modal

- El modal rico sigue existiendo en `src/modals/modalFileRename.ts` como `FileRenameModal`: soporta `{basename}`, `{date}`, `{counter}`, propiedades de frontmatter, preview y entrega un `PendingChange` al queue callback. Su valor inicial continúa hardcodeado como `private pattern = '{basename}'`; la corrección exacta es permitir un initial pattern/contexto y usar el basename literal sólo cuando hay un target individual.
- `file.rename` en `explorerFiles.ts` todavía usa correctamente `FileRenameModal` y `queueService.addOrRun`; no fue esa ruta la sustituida.
- La regresión concreta fue introducida por `e0945039` (`feat(content): add configurable Rename/Delete to content search nodes`, 2026-07-21): `content.rename` llama `app.fileManager.promptForFileRename(file)`. Ese prompt nativo hace un rename inmediato, no usa el modal rico y no crea `PendingChange`/badge. El test nuevo `contentContextMenu.test.ts` cristaliza explícitamente esa conducta equivocada al exigir `promptForFileRename`.
- El último estado bueno reutilizable no es un único commit inmediatamente anterior para Content, porque la acción Content fue creada ya defectuosa. El oráculo bueno es la ruta canónica preexistente `file.rename`/`FileRenameModal`, presente al menos desde `2793c899`; el commit malo de la nueva ruta es `e0945039`. En el issue se documentará como **good implementation oracle + bad introducing commit**, no como falso revert lineal.
- Inventario de callers file-rename:
  - correctos/queue: `explorerFiles.ts`, `basesMultiSelectOperations.ts` y el viejo `sidebarOps_old.ts` usan `FileRenameModal` con queue callback;
  - regresión: `logicContentContextMenu.ts` usa el prompt nativo;
  - adaptación incompleta: `logicSnippetContextMenu.ts` fabrica un `TFile`, abre el modal rico, extrae `_RENAME_FILE` del `logicFunc` y luego llama `adapter.rename` directamente;
    conserva UI rica pero se salta el queue, por lo que también debe converger si Snippets expone operation rename.
- `showInputModal` es otro modal básico, usado por folder rename/move, prop rename, value rename y Save Layout. No todos deben migrarse mecánicamente al modal de archivos:
  Save Layout no es una operation; prop/value/folder tienen semánticas distintas. El issue debe auditar cada caller y extraer una frontera reutilizable de `OperationRenameModal` sólo donde conserve preview/opciones/queue sin imponer placeholders de archivos a otros dominios. Tag rename ya es inline y encola, por lo que es otro control legítimo, no un caller del prompt básico.
- Aceptación añadida: desde Content/Text, Rename abre el mismo modal rico que Files, el campo inicial de un único `pepito.md` contiene `pepito` (no `{basename}`), confirmar crea la operación en queue y proyecta `badge_rename`; las pruebas dejan de defender el prompt nativo. Delete puede conservar la confirmación nativa porque es una semántica separada.

### Pase adversarial de action_cells y queue

- Ya existe el seam de dominio correcto: `_replaceValueInVault` crea un `PropertyChange { action: 'set', property, oldValue, value, files }` mediante `queueService.addOrRun`. La proyección de Props considera tanto `rename` como `set` una actualización con icono pencil/badge azul. No hace falta inventar una segunda clase de operación sólo para el widget; sí hace falta formalizar el intent de la `action_cell` y conservar la semántica visual `badge_rename` pedida.
- El renderer actual contradice el requerimiento: crea checkbox con `disabled = true`; para date/datetime sólo imprime texto y un botón de Daily Note. No hay picker ni intent de edición. Esto confirma que sólo Wikilink está funcional como formato interactivo de navegación.
- Riesgo no mencionado: la política actual trata dos `set` distintos sobre la misma propiedad y files solapados como conflicto. Si el usuario cambia una checkbox/date dos veces antes de ejecutar el queue, el segundo intent puede ser rechazado y el widget quedar visualmente incoherente. Aceptación obligatoria: por identidad exacta de value node (`property + oldValue + target files`), el último intent sustituye al pendiente; si vuelve al valor original, cancela la operación y quita el badge. No ejecutar dos writes.
- En mode `stage`, el widget proyecta el valor pendiente de forma optimista y muestra el badge cancelable; en mode `bypass`, `addOrRun` aplica inmediatamente. El handler debe impedir que el evento observado del widget core también escriba por debajo, o se produciría doble mutación.
- `open picker` por sí solo no es una operación. Sólo select/clear/commit de una fecha o datetime produce intent queued. Escape/cancel no cambia nada. El botón Daily Note es navegación y nunca genera badge.
- Value nodes agregan varios files: la operación debe usar exactamente el conjunto representado por el nodo y conservar arrays/boolean YAML. Checkbox no debe degradarse a string; date no debe cambiar de día por UTC y datetime debe preservar timezone/precisión observados en web-lab.
- `TreeNodeCell`/`onCellClick` existe hoy principalmente en Tree; Table renderiza values por `renderLabel`. La semántica `action_cell` debe ser de dominio y tener adapters por engine, no depender de que el DOM sea literalmente `TreeNodeCell`, o Table/Cards volverán a quedar inconsistentes.

### Desglose revisado consolidado: 18 slices provisionales

1. Navbar universal como `panelWidget` + contrato de contribution por provider.
2. Text tracer: mover Has/Hasn't entre Pause/Resume y Sort.
3. Overflow universal medido: Condensed/Scroll/Wrap; Scroll con lane fijo y sin bar.
4. Migrar Statistics y demás providers, retirando navbars duplicadas.
5. Router único `ChangeIcon` + capability registry extensible.
6. Adapters Vaultman/Iconic/terceros, selección inicial, intercept, fallback y dedupe.
7. Plugin self-disable end-to-end desde cell/action; uninstall sigue prohibido.
8. Snippet Reveal canónico: identidad, i18n e icono.
9. Hide scrollbar con una sola huella, separado de Reserve lane y plain-style.
10. Restaurar copy i18n corto de filters y actualizar pruebas.
11. Props/Values/Tags polarity inclusive/exclusive/remove + highlight/dot en engines.
12. Property cmenu: Date & Time/current checked + conversion labels/Wikilink.
13. Cell `format` configurable + raw/formatted y seam Wikilink ya funcional.
14. Checkbox `action_cell`: intent tipado, queue/bypass, proyección pendiente y badge.
15. Date/datetime `action_cell`: contrato web-lab, picker, queue/bypass y Daily Note separada.
16. Glyph color: rail action_nodes y folder cell_name sólo en Tree existente.
17. Top-edge/clip geometry comparando beta.5, b56 y DOM computed.
18. Regresión operation rename: restaurar modal rico en Content, initial literal para target individual, queue/badge, corregir test erróneo y auditar/migrar callers básicos o bypass (incluido Snippets) según la matriz de dominio.

## Implementation checkpoint 1 — BT5-060 rich queued rename

- Worktree/branch advanced from `b56b9a78` to product commit `45c86373`:
  `fix(operations): restore rich queued rename flows`.
- Root cause confirmed by Git/source comparison: `e0945039` introduced a new Content route using `promptForFileRename`, while Files/Bases already used the correct `FileRenameModal → queueService.addOrRun` route. Snippets kept the modal but extracted `_RENAME_FILE` and mutated the config adapter immediately.
- TDD reds observed independently:
  - `initialFileRenamePattern is not a function`;
  - injected rich Content opener received zero calls;
  - missing `logicSnippetOperations` module;
  - missing rename-badge model/wiring in Content and Snippets.
- Final implementation:
  - single target starts with literal basename; bulk target retains `{basename}`;
  - modal accepts a typed change builder and preserves rich preview/validation;
  - Content uses the rich queued route; Delete remains native;
  - new `snippet_rename` queue type owns config-adapter rename and CSS reload on Apply;
  - `cssSnippetPath` centralizes configured-folder resolution;
  - Content/Snippets share a cancellable pencil badge resolved by original path;
  - queue change listener repaints Snippets; Content reactivity uses `queuedCount`.
- Verification:
  - focused: 7 files, 45/45 tests green;
  - full unit: 142/143 files, 932/933 tests green;
  - only failure is the exact pre-slice baseline in `toolbarOverflowStrategy.test.ts` (`toolbarUsesHorizontalScroll` commented out by the pre-existing dirty `logicResponsiveLayout.ts` edit);
  - changed-path ESLint, Svelte autofixer (0 issues), Svelte format and diff check green;
  - `pnpm run check` contains only the same three overflow diagnostics.
- Caller audit: Files/Bases/old sidebar remain rich+queued; Content and Snippets converged;
  Save Layout and folder/property/value inputs are separate domain operations; Tag inline rename remains legitimate. Runtime/HITL smoke remains before issue closure.

## Implementation checkpoint 2 — BT5-049 self-disable

- Product commit `1c689ef1`: `fix(plugins): allow Vaultman self-disable`.
- Root cause: `logicPluginContextMenu` already allowed self-disable, but `explorerPlugins.toggle` duplicated an obsolete `meta.isVaultman` prohibition and warning.
- TDD red confirmed both missing shared policy exports and the stale cell source contract.
- `logicAddonCells` now provides `canToggleCommunityPlugin`, `canUninstallCommunityPlugin`, and `toggleCommunityPlugin`; both callers use that route.
- Cell orchestration tracks a successful self-disable as caller teardown and performs no later refresh/rebuild. Failure paths still clear pending state and repaint.
- Uninstall is denied in both `when` and `run`; obsolete i18n entries were removed.
- Verification: 82/82 focused tests; changed-path ESLint, format and diff check green.
  Type-check remains red only for the three baseline overflow errors in the preserved foreign `logicResponsiveLayout.ts` edit. Runtime self-disable/re-enable remains HITL.

## Implementation checkpoint 3 — BT5-050 canonical Snippet Reveal

- Product commit `70d36f56`: `fix(snippets): canonicalize reveal action`.
- Direct read-only inspection of installed `obsidian.asar` established the Files menu oracle:
  `lucide-arrow-up-right`, “Show in system explorer”, with Finder copy on macOS.
- New `logicSystemExplorer` centralizes id/icon/label/capability/invocation.
- Reveal is now `snippet.reveal`; the old `snippet.see-details` saved-layout id migrates without losing position or visibility. Static translated registration prevents catalog id leakage.
- `when` checks `showInFolder`; `run` uses `cssSnippetPath`, including custom config folders.
  Open in default app is unchanged and remains independently capability-gated.
- Verification: dedicated 3/3 and related 86/86 tests, changed-path ESLint and diff check green.
  Issue completed AFK and remains listed in the final integrated visual smoke matrix.

## Implementation checkpoint 4 — BT5-051 one hidden-scrollbar footprint

- Product commit `3fb23d17`: `fix(layout): preserve one hidden-scrollbar gutter`.
- Root cause was a shared `Reserve || Hide` lane projection: Hide inherited both content padding and Reserve's 14 px rail displacement.
- `resolveFloatingTocLaneLayout` now projects four independent outputs. Hide keeps the rail at its overlay edge, supplies one content gutter, and overrides stale saved Reserve state.
- Effective footprints use actual dimensions: desktop 20/22 px and mobile 28/30 px for plain/pill. A common 2/4 px edge variable fixes mobile left and explicit-right precedence.
- Vertical gutters are absent at Top/Bottom; rail scrollbars remain hidden by the existing scoped rules. Reserve remains hidden in Settings while Hide is on.
- Verification: pure 7/7, related 49/49, Stylelint, Svelte format, diff check and official Svelte autofixer (zero issues) green. Only the five known foreign overflow diagnostics remain in global Svelte check. DOM geometry HITL remains.

## Implementation checkpoint 5 — BT5-052 concise filter copy

- Product commit `a9c8fdc9`: `fix(i18n): restore concise filter labels`.
- Forensics corrected the provisional diagnosis: `b56b9a78` retained eight dev-authored short labels but deleted `filter.file_name`, despite its live Add Filter consumer.
- Restored the symmetric `Has name`; aligned all Spanish filter polarity copy to `Con/Sin`.
  Keys, filter ids and saved payload shapes are unchanged.
- New catalog/consumer contract covers ten labels in both locales and ensures Add Filter/Text never fall back to raw keys. Related 15/15, ESLint and diff check green. Issue completed AFK.

## Implementation checkpoint 6 — BT5-053 atomic filter polarity

- Product commit `cde64206`: `fix(filters): make polarity interaction reversible`.
- Root causes were compound: exclusive remove helpers only knew positive filter types; the first browser click wrote inclusive before the second replaced it; Props and Tags duplicated mutation routes; and Tree exclusive CSS still named the removed `.vm-tree-row-surface`.
- TDD red established missing negative removal, missing atomic setters, missing deferred coordinator/wiring, stale Tree selector and absent Tree keyboard activation.
- New `DeferredFilterClickCoordinator` owns the temporal gesture contract. Inactive single click is delayed 250 ms; a fast pair emits exclusive exactly once; a slow second click is a normal remove; active double-click cannot re-add because of a short expiring tombstone.
  Semantic keys survive repaints/view switches, teardown cancels timers, and expired tombstones are pruned.
- `FilterService` replaces/removes both polarities recursively and calls `applyFilters` once.
  Both explorers and their context menus converge on that route; negative metadata filter types now participate in metadata refresh invalidation.
- Tree rows gained Enter/Space activation. Tree/Table/Cards retain active/excluded class projection; CSS now targets `.vaultman-tree-row`, with accent inclusive and primary-text exclusive descendant dots.
- Verification: focused 41/41; full unit 957/958 with only the known foreign toolbar failure;
  changed-path ESLint, Stylelint, Prettier and diff check green. Global type-check still has exactly the three foreign toolbar diagnostics. Issue remains HITL for the live multi-engine, theme and touch/pointer smoke.
