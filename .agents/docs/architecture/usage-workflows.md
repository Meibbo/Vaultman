---
title: Usage Workflows — índice canónico de ejemplos de uso del dev
type: architecture
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-07-09T21:40:00
updated: 2026-07-09T21:40:00
created_by: claude-fable-5
updated_by: claude-fable-5
tags:
  - agent/architecture
  - navigation
  - usage-workflows
---

# Usage Workflows (índice canónico)

> **Por qué existe (pedido dev, grill NIB 2026-07-09):** en ~5 meses el dev ha dado múltiples
> ejemplos de uso/workflows en chats que se perdieron o quedaron enterrados en drafts — sin
> forma de conseguirlos, retomarlos y expandirlos contra la arquitectura vigente. Este índice
> es su home canónico.
>
> **Policy de mantenimiento:** cada ejemplo de uso que el dev dé en un grill/chat se registra
> aquí COMO ENTRY (aunque sea embrión), con: descripción fiel, mapeo a sistemas del canon,
> refs a source records, estado por sistema, y opens. Al evolucionar la arquitectura, los
> entries se RE-MAPEAN (nota fechada), nunca se borran. Los agentes enlazan este índice al
> tocar los sistemas involucrados.

## W-001 — youtubeScene (custom Scene con provider remoto)

**El ejemplo (formulación dev, 2026-06-03 megadump + re-formulación 2026-07-09 grill NIB):**
el user compone un `youtubeScene`: un **`panelExplorer`** cuyos nodos vienen de fetched-data (customProvider: playlist de YouTube) rendereados por composed views; un **panel de widgets** con action-nodes/cells que operan sobre esos nodos (like, quitar de la lista); y un **`panelContent`** (ro/rw según contexto/config del user, editor CodeMirror de Obsidian) con la descripción del video o las anotaciones del user. La scene se guarda/comparte como archivo.

**Mapeo al canon vigente (2026-07-09):**

| Pieza del ejemplo | Sistema canónico | Estado hoy |
|---|---|---|
| Contenedor compartible | `.vmscene` DATA declarativo (CR-2: [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/previews/cr2-scene-format-demos|demos]] — Demo 1 ES este ejemplo, layered YAML) | dirección destrabada (D-PSS payload `.scene`); spec formal pendiente |
| customProvider fetched-data | `vm-online_fetch` module (MD-F6: core 100% local, fetch = companion) + R-REMOTE-PROVIDER ([[docs/architecture/research-inventory|research-inventory]] §S-16/17) | LATER/MAJOR; no construido |
| ¿Provider en TS o declarativo? | **AMBOS, artefactos separados** (CR-2 data-vs-code): `.vmscene` referencia providers por id+params (jamás código inline, share-like-`.base`); provider con LÓGICA propia = `.vmmodule.ts` (module-contract ADR 0011, reviewed/trusted) que puede EMITIR `.vmscene` | decidido como frontera de seguridad; formato module = S-15/16 API |
| Composed views sobre nodos | engines × modes ([[docs/architecture/explorer-model/05-view-canon|05-view-canon]]) + cells (D-PSS-2 `data-vm-*`) | núcleo construido (V.D/Thread B) |
| Action-cells (like/remove) | `action-cell` + ActionNode/ActionProvider ([[docs/architecture/adr/0005-actionnode-unification|ADR 0005]]; glossary L187) | NIB slice 1 en grill |
| Panel de widgets | **OPEN — grill panelWidget** (ver abajo, W-opens) | pageStats = precursor de facto |
| panelContent ro/rw | panel-kind `panelContent` ([[docs/architecture/explorer-model/04-panels-axons-mutation-layout|shard 04]]) | typed only (P.D slice 1); sin implementación |
| Composición/tiles | Scene tile-tree ([[docs/architecture/explorer-model/03-surfaces-and-interaction|shard 03]]) | tracer P.D: scene single-tile |

**Opens que este workflow acumula:** spec formal `.vmscene` (CR-2→PSS) · `vm-online_fetch` (auth/cache/offline, R-REMOTE-PROVIDER) · grill panelWidget (¿bars/primitives = panel-kind propio o Overlays? conflicto con glossary L140 Overlay y shard 04 `panelData` "mostly read-only" — el propio pageStats ya lo tensiona) · término Symbiont/ComposedViews sin entrada de glosario (grill corto pendiente; hipótesis dev 2026-07-09: la mecánica symbiont aplica a TODO panel-kind que soporte nodos/celdas, no solo al explorer).

## W-002 — índices explorables (index-as-provider, efecto SDK)

**El ejemplo (dev, grill NIB 2026-07-09):** todos los índices internos (SASI commands/services/scripts/gestures · provider-index · fragility registry · presets) exponen su propio provider para que el user explore las capacidades de Obsidian+Vaultman+plugins desde explorers — "documentación viva dentro del workspace": experimentación profunda sin tocar código. Complemento: research de visual node-based programming (Node-RED/Blueprints/n8n) para composición de macros/ActionNodes.

**Mapeo:** contrato `ExplorerProvider` ya lo soporta sin cambios (`src/types/typeExplorer.ts:45` — dominio→nodos+operaciones); precedentes canónicos: queue = explorer de OperationNodes, `scenesManagerScene`, `FilterProvider` (glossary). Candidato a canon registrado en [[docs/current/pendientes|pendientes]]; research visual-programming ídem.

## W-003 — anatomía de un tab actual (main) re-mapeada a la taxonomía 2.0

**El ejemplo (dev, grill NIB 2026-07-10):** el modelo viejo de main, traducido nivel a nivel:
un **tab** (= Surface) contiene lo que entonces llamábamos "un explorer" (= ahora **Scene**, faltaba un nivel jerárquico) con datos propios (= **provider**); muestra una **toolbar** (= ahora **panel**, específicamente **`panelWidget`**: su función actúa sobre la navegación del frame y el renderizado del explorer, NO sobre los datos en sí) que opera vía los **mediators** (cambiar scenes/viewConfigs a través de **Actions** — nodes o cells — y manejar interacción entre niveles del workspace: surfaces/scenes/panels/nodes/cells); sigue el explorer en sí (= **`panelExplorer`**: nodos + data relevante como cells) para abrir notas que se editan en el main leaf de Obsidian (= **`panelContent`**). Idea futura anotada para panelContent: **media_cells con coordenadas** — imágenes colocadas sobre notas .md como estampillas/stickers.

**Valor:** es la piedra Rosetta main→2.0 (jerarquía LOCKED: surface > scene > panel > node > cell) y el origen del rename `panelData`→`panelWidget` (ver [[docs/architecture/explorer-model/04-panels-axons-mutation-layout|shard 04]] nota 2026-07-10). Refs: [[docs/architecture/glossary|glossary]] (panelWidget/Overlay corregidos), pendientes (grill Symbiont/viewComposer).

## Cómo añadir un entry

`## W-NNN — nombre` + formulación fiel del dev (fecha+fuente) + tabla de mapeo a sistemas con estado + opens. Si el ejemplo nace en un chat: registrarlo AQUÍ en la misma sesión (no posponer). Si la arquitectura cambia un mapeo: nota fechada, no reescritura silenciosa.
