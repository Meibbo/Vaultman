---
title: PSS grill — notas corrientes (sesión 2026-06-10, EN CURSO)
type: spec-shard
status: active
parent: "[[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/index|Vaultman 2.0 Synthesis Umbrella]]"
created: 2026-06-10T00:00:00
updated: 2026-06-10T00:00:00
created_by: claude-fable-5
updated_by: claude-fable-5
tags:
  - agent/spec
  - initiative/hardening
  - pss
  - agent/grill
---

# 05 — PSS Grill: Notas Corrientes

Registro incremental del grill de PSS (Presets Saving System). Al cerrar el grill, las decisiones se consolidan en el shard 01 (D-PSS-*) y este shard queda como memoria de la conversación. Visuales: [[visuals/pss-model-visuals|Mermaid]] · `visuals/pss-model.canvas`.

## Confirmado por el dev (en orden)

1. **Modelo de composición = B con la razón de C** ("C dentro de B"): presets tipados por faceta (style/layout/load/view/workspace/input) + Profile = composición nombrada; la RESOLUCIÓN entre scopes es cascada de overrides (el más específico gana, faceta por faceta). Built-ins: barebones/native/polish(demo)/custom.
2. **Ley de estilo headless**: todos los componentes/primitives se comportan como bits-ui (mínimo o cero estilo propio) — usar bits-ui DE VERDAD, no de adorno; es el motivo por el que no se fue directo a tailwind+shadcn. Se desean varios componentes shadcn en versión NO opinionada para UPV. Todo estilo = **pseudo-snippets** (CSS que el usuario puede convertir en snippets reales) → preserva el lenguaje de diseño de Obsidian y evita que agentes IA (de toda la comunidad, incluidos nosotros) generen UI fuera de lenguaje.

## En evaluación (propuesto, sin confirmar)

3. **Estrategia de clases 4+3 — CONFIRMADA por el dev (2026-06-10)** tras aclaración de niveles de data-attrs (§7) y modelo de sourcing UPV. Mover a D-PSS al cierre:
   - Identidad estructural = `data-vm-*` (nunca cambia entre presets; herencia natural de los data-attrs de bits-ui; los atributos llevan VALOR: `data-vm-depth="2"`).
   - Vocabulario de clases = inyectado POR el style preset (native → clases Obsidian reales = presetObsidian en DOM; polish → `vm-*`). El attr `class` pasa a ser propiedad 100% del sistema de estilo.
   - Tokens `--vm-*` puenteados a vars Obsidian (0-B).
   - Índice de clases nativas usadas vs `app.css` del web-lab = extensión del Fragility Registry (ADR 0004).
   - Contexto: stable 1.1 probó clases nativas directas en producción (SDF-011);
     sandbox usa `vm-`; `vaultman-` legacy en stable sin actualizar.

## Adiciones del dev (2026-06-10, segunda ronda)

4. **Índice de primitives de Obsidian** (research nueva): inventariar todos los primitives que Obsidian proporciona a plugins — docs oficiales, forums, API, y web-lab para los que existen pero no se exponen oficialmente. Se materializan como **providers que trabajan con UPV y se muestran en el explorer**: el user los llama desde MyWorkspace para uso inmediato, o los navega como guía (cells con URL de referencia a docs). Suma al propio índice de Vaultman. Research → spec de `ObsidianPrimitivesIndex/Provider`.
5. **Config export para debugging** (requisito PSS): al tener la app control total de sus configs vía PSS, debe poder **exportar un log de la config efectiva resuelta** (qué facetas/presets/overrides activos a qué scope) para reportes de bug — reemplaza el "tenía a,b,c encendido y d,e,f apagado" manual y optimiza el ciclo dev↔agente. Liga con ops log/diagnostics.
6. **Icon packs = ASSETS importables, no presets**: el plugin debe poder RECIBIR el archivo de pack que el user descarga (p. ej. opendesktop: estructura freedesktop icon-theme con `index.theme` + SVGs) y registrarlo como pack nuevo, elegible como fuente de `cell_icon` a scope global o scoped, con override por nodo (auto-pack / manual) — el modelo que proto v12 ya demostró con Adwaita hardcodeado, ahora con import real. **Principio de payload PSS: los presets REFERENCIAN assets por id (packId), nunca embeben binarios.** El almacén de packs + caché = lane C del roadmap (media/icon caches) + nota de umbrella v1 (Theme Builder §10: "user importa Gnome icons"). Licencias: el user importa sus archivos; no bundleamos.

7. **Modelo de sourcing UPV** (aclaración 2026-06-10): shadcn no es librería sino recetas copy-paste = bits-ui (behavior) + capa tailwind (look). Recrear sus componentes para Vaultman = mismo primitive bits-ui + nuestra faceta style (pseudo-snippets) en lugar de tailwind — se intercambia la capa diseñada para ser intercambiada. daisyUI = vocabulario CSS puro sin behavior → inspiración para el preset polish, jamás base de native. Adaptar las librerías al revés (traer su pipeline/reset/tokens a Obsidian) = pelear sus supuestos; descartado (decisión original bits-ui se reafirma). Niveles de data-attrs en el DOM: (a) protocolo Obsidian sin prefijo cuando hablamos su idioma (`data-path` en filas Files, ya lo hacemos para DnD/core), (b) internos de librería (bits-ui `data-state`…, intactos), (c) **contrato público de identidad VM = `data-vm-*`** (namespaced porque es API estable para snippets de users y tests; sin prefijo colisiona con core/otros plugins).

8. **Profile `legacy-1.1` como TEST DE ACEPTACIÓN de las fundaciones** (dev 2026-06-10): si LUPA/PSS/WSA son suficientemente abstractos, debe poder expresarse un profile experimental que haga que el 2.0 funcione Y se vea como stable v1.1. Si no se puede expresar v1.1 como profile, la abstracción falló.
   Mecanismo por faceta: style = port del `styles.css` de stable como pseudo-snippets; layout = dock Data+Statistics + header minimal; load = LUPA apaga todo módulo post-1.1; view = tree/table/grid con defaults 1.1; workspace = frame único; input = bindings 1.1. Behavior-equal ya está garantizado por D3 (paridad por sistema vía ledger) = gate; look-equal = best-effort experimental.
9. **Terminología de superficies y paginación** (dev 2026-06-10, pendiente de glossary): unificación — el workspace es un **árbol recursivo de surfaces** donde los splits X|Y son paginación espacial y los tab-stacks son paginación Z (layers); ambos son paginación (whiteboard). Escalera: **Leaf** (unidad nativa Obsidian, técnica) · **Surface** (nuestro host de montaje: leaf-tab, modal, popup, cmenu, codeblock) · **Scene** (composición lógica montada en un surface) · **Page** (ADR 0007: editor-group) · tabs internos VM (Files/Props/Tags/…) = paginación Z de scenes/panels dentro de UN surface. "Tab detached" queda DEPRECADO como término: decir "Scene montada en surface propio"; detach = mover una scene del Z-stack de un surface a un surface nuevo del árbol X|Y.
   Dos niveles de tile-tree: workspace-level (surfaces, implementado por los splits nativos de Obsidian) y scene-level (panels dentro de una scene, el i3 del proto).
   El editor nativo = editorScene (chameleon) sobre un leaf-surface (glossary ya lo tenía).
10. **Matriz faceta × scope — progreso**: r1 (style×Surface ✓), r4 (load bajo profile = —), r5 (view×Surface = —) confirmados por dev. r6 RESUELTO por la unificación de §9: workspace×Surface = — (el surface es un NODO del árbol, no dueño de sub-árbol; el tile-tree interno pertenece a la Scene). r2 (style×Scene solo tokens) y r3 (style×Node = — porque eso es serviceMark/decorate) pendientes tras ejemplos. r7 NIB refinado: Scene ✓ (contextos de binding por scene focada, InputRouter), Panel = ?-diferido a P.D (focus model), Surface/Node = —.

11. **Test de aceptación ampliado** (dev): el profile `legacy-1.1` debe ejercitar TODOS los subsistemas (LUPA/PSS/WSA **+ NIB + providers/view/queue/etc.**) — todos participan en que la abstracción sea real, no solo los tres nombrados primero.
12. **Modelo de propiedad del estilo** (dev): en runtime TODO estilo termina siendo CSS de dos orígenes — themes/snippets de la comunidad (no controlamos) + pseudo-snippets (CSS de profiles/scenes configurado por users). Implicaciones:
    - **serviceMark ↔ PSS boundary = grill item nuevo**: mark = dato durable DEL NODO (contenido del vault); preset = config DE LA APP. No es "PSS viejo", pero la infraestructura de persistencia podría compartirse (storage + queued batcher).
      DÓNDE guarda serviceMark hoy = verificar en código (no leído esta sesión);
      parking-lot ya tenía "serviceMark god-object".
    - Render de marks = data-attrs (`data-vm-mark="x"`) estilados por pseudo-snippets;
      y los users pueden CSS-target nodos directo (`[data-path="…"]` — los snippets de colorear carpetas de la comunidad ya hacen esto contra el File Explorer nativo; nuestros `data-vm-*` les dan selectores estables).
    - **UnoCSS y el user**: UnoCSS es build-time — el user de vault NO corre nuestra pipeline; consume el CONTRATO (attrs/clases/`--vm-*` vars) en CSS plano, y los pseudo-snippets se exportan ya compilados. Theme devs (que sí tienen build) sí podrían consumir un **preset UnoCSS publicado** (presetObsidian/presetVaultman en npm) — contribución de tooling a la comunidad. Registrar junto al open del motor de variables UPV.
13. **r6 cerrado — UNA gramática, DOS dominios de propiedad** (dev tenía razón):
    la paginación es UN solo modelo recursivo — región → {Z-stack de layers | split X|Y de regiones} → recursión; cada layer Z puede contener splits y viceversa.
    Mis "dos niveles" eran de PROPIEDAD, no de gramática: el árbol exterior lo implementa/posee Obsidian (sus splits/tabs nativos — participamos, no reemplazamos), el interior de nuestros surfaces lo posee VM (panels de scene).
    Surface = nodo frontera entre dominios. i3 vs flexbox: flexbox = mecánica de render (splits anidados = flex anidados; proto y Obsidian lo hacen igual); i3 = modelo de árbol + gramática de operaciones (split/close/focus/move/resize con bindings). Lo que falta al nativo = input bindings para resize/move de grupos (extras i3wm = pendiente/adicional). Valor VM workspace-level = NIB conduciendo las operaciones del árbol nativo donde la API lo permita; gramática i3 completa solo dentro de surfaces propios.
14. **Referencia MCL multi-columns** (dev): snippet CSS famoso que convierte markdown escrito de cierta forma (callouts) en columnas de texto — prueba del poder del CSS en Obsidian. Candidato a pseudo-snippet. Diferencial VM futuro: editar columnas síncronamente en live-preview (sin saltar a source mode), columnas grabadas EN el markdown. Liga con editorScene/editor-layers (post-2.0).
15. **r7 afinado — el nodo recibe EVENTOS, no configura BINDINGS**: claro que el click/ctrl-click/drag aterrizan en un nodo (selection, abrir, send-to-search) — el nodo es el SUJETO del evento. Pero la REGLA evento→acción se configura a scope ≥ panel/scene/global ("node mouse actions" ya existe en settings sandbox) y aplica a todo nodo de ese scope. Lo que parece config por-nodo es config por **node-KIND** (files vs tags reaccionan distinto) = scope Panel (engine+provider) o Scene. Input × Node sigue — (ninguna regla se ata a UN nodo individual);
    acciones por nodo individual = cmenu/action-cells, no bindings.

16. **Matriz faceta × scope — CERRADA** (dev confirmó r2 tokens-only en Scene, r3 style×Node = — vía marks/decorations, y sort DENTRO de la faceta view). Única celda diferida: input × Panel = ?-P.D (focus model). Matriz final = la tabla del chat 2026-06-10; volcar al spec de PSS en Fase C.
17. **Taxonomía de almacenamiento — PROPUESTA (pregunta abierta)**: cuatro clases de estado durable, una sola infra de persistencia (storage + queued batcher de PSS):
    - **Presets/Profiles (PSS)** — config de la app; compartible; vault-agnóstico.
    - **Library items** — contenido reusable del user PARA la app: filter templates, action presets (batches de queue nombrados), futuros scripts. Los presets los REFERENCIAN por id (mismo principio que icon packs: nunca embeber).
    - **Marks (serviceMark)** — dato durable atado a nodos; vault-específico.
    - **Session state** — working memory de las scenes: filter stack vivo, queue staged actual, chips, expansión. Sobrevive reload; no compartible por defecto (el setting "session file path" de sandbox ya apunta a esto).
    `.scene` export puede OPCIONALMENTE bundlear library items + snapshot de session state (el "data" del data-vs-code de CR-2). Aparte: batches de queue como js/python arbitrario stageado por el user = tema aparte (SASI/scripting, liga MD-F2/MD-J1), post.
18. **Test de aceptación — segunda ampliación** (dev): en el preset **native**, los explorers deben trabajar EXACTAMENTE igual que core Bases (paridad de comportamiento, no solo look — refuerza el lazo con B.P). Y precisión de **barebones**: ≈ "casi desactivado" — retiene solo el mínimo: **config_scene, snippet_scene y plugin_scene**; queda pendiente definir desde cuál(es) se cambia el profile global y se activa/desactiva cada módulo/subsistema.
19. **r7 completado — ActionNodes** (dev): el ActionNode no es el sujeto del evento, lo PROVOCA. Cuarteto completo: evento de input → **binding** (regla NIB, vive en un scope) → **ActionNode** (el verbo; ADR 0005, ActionProvider) → **Operation** (cambio stageado, cuando muta). El nodo = sujeto/argumento del verbo. Los action-cells = puntos de invocación visual del MISMO ActionNode dentro de la fila del nodo; su COLOCACIÓN (qué verbos se muestran en qué node-kind) = faceta view (cells config), mientras el binding gesto→verbo = faceta input. Así input × Node sigue — sin perder nada: lo por-nodo es el argumento, jamás la regla.

20. **Taxonomía de almacenamiento CONFIRMADA** (dev, 2026-06-10) — alcance PSS;
    caches/IndexedDB = tema aparte (infra de performance, lane C), no estado durable de usuario.
21. **marks_scene** (dev): reinterpretación VM del core plugin Bookmarks — guarda la POSICIÓN EXACTA del cursor (o palabra seleccionada) de una nota para retomar lectura en el punto exacto; lo nativo solo bookmarkea headers (inútil en Excalidraw, json-canvas o textos largos sin headers). Encaje: serviceMark = capa de datos; **mark kinds** (taxonomía): position-mark (cursor/selección; en canvas/excalidraw = coordenadas — liga xyz del whiteboard), style-mark (carpeta amarilla), pin-mark, size-mark…; marks_scene = Scene sobre un MarksProvider que navega/gestiona marks. La nota lateral del whiteboard "Helper Docs / real bookmarks" ahora tiene dueño: ESTO son los real bookmarks. Dominio Symbiont Explorer; captura de posición en editor = integración editorScene.
22. **⚠️ Esquema de labels pre-release — fix necesario a D4**: semver ordena prereleases ALFABÉTICAMENTE → `alpha < beta < canary < rc`; "canary" ordenaría DESPUÉS de beta y rompería la detección de updates (la trampa que la distillation ya advertía). Propuesta: canary queda como nombre de STREAM solamente; el label semver del stream canary = **alpha**. Línea: `2.0.0-alpha.N` (sandbox) → `2.0.0-beta.N` (dev) → `2.0.0-rc.N` → `2.0.0`. El primer artefacto de la línea = `2.0.0-alpha.1` al aterrizar wave 1 (enmienda a D4: era "2.0.0-canary.N").
    Consolidar en shard 01 + index al cierre del grill.

## Pendiente del grill (expandido 2026-06-10)

- **Q-PSS-5 — payload `.scene`** (CR-2): secciones YAML por clase de la taxonomía (meta · facets por faceta · library embebido opt · session-snapshot opt · asset-refs por id · code/UPV pseudo-snippets); kinds de archivo (profile export · scene export · workspace export).
- **Q-PSS-6 — semántica del "queued batcher"**: desambiguar el término del megadump (write-batching de disco ≠ operation queue del user). Propuesta: cambios de config = aplicación instantánea + undo-stack propio (no necesitan el trust del queue);
  aplicaciones que TOCAN vault (import .scene escribiendo archivos, export de pseudo-snippets a snippets reales) = por el operation queue con preview/diff.
- **Q-PSS-7 — ubicaciones de storage**: data.json vs carpeta del vault (`.vaultman/`?) por clase (presets compartibles · library · marks · session);
  implicaciones de sync (Obsidian Sync/iCloud) y mobile.
- **Q-PSS-8 — Workspace-profile ↔ Profile**: probable identidad (Profile a scope workspace CON faceta load = el Workspace-profile del glossary); confirmar y fusionar términos.
- **Q-PSS-9 — mark kinds + marks_scene**: taxonomía de kinds, mecánica de captura por tipo de surface (offset de texto vs coordenadas), spec propio en dominio Symbiont Explorer.
- **Q-PSS-10 — labels**: confirmar el esquema alpha/beta/rc (§22).
- Diferidos fuera del grill: input × Panel (P.D) · desde qué scene de barebones se cambia profile/módulos (definición posterior, §18) · verificación en código del storage actual de serviceMark · MCL/columnas síncronas (post-2.0).

(La lista original de pendientes quedó superseded por la sección expandida Q-PSS-5..10 de arriba: estrategia de clases CONFIRMADA en §3, matriz CERRADA en §16, y el resto absorbido con propuestas inline.)
