---
title: Catálogo — alineación de taxonomía goal-stream (grill 2026-07-13/14)
type: research
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-07-14T00:00:00
created_by: claude-fable-5
tags:
  - agent/research
  - goal-stream
  - vocabulary
  - taxonomy
---

# Catálogo de taxonomía goal-stream — 2026-07-14

Ledger de renames/definiciones lockeados en el grill dev+claude-fable-5 (chat 2026-07-13/14, sesión kickoff v1.2 floating toc). Mecanismo per D-NIB-6 anti-drift:
este catálogo PRIMERO → review dev → cascada con notas fechadas (glossary = single source; el resto wikilinkea). **Estado: review dev OK 2026-07-14 (con corrección "estados posicionales, no kinds", ya aplicada) → CASCADA DESBLOQUEADA, asignada a codex-gpt-5 (checklist abajo; este doc = la instrucción).**

## Árbol de dominios (dev-locked 2026-07-14)

```text
MyWorkspace
├── WASA — Workspace Actions & Surfaces Abstraction (ex WSA, absorbe "actions")
│   ├── WIR — WorkspaceInputRouting (lado input del ex-NIB; per-panel ve inputs crudos)
│   ├── WAR — WorkspaceActionRouter (lado action; invocaciones resueltas, D-NIB-1 intacta)
│   └── WOW — Workspace Workflow (capabilities+definición de surfaces/workspace;
│             re-parenta adapters, mediators y fragilityRegistry existentes)
├── LIVRE — Live Redesign (sistema; ex-término suelto MD-L2)
│   ├── HOST  — viewPort (mounting + rendering)
│   ├── NAVCO — navComposer (regime slot/coordinates/both · layers embeddings/contentIDs/
│   │           codeblocks · direction drill/container/… · scope holarchy/hierarchy/
│   │           heterarchy + reglas condicionales · sorts condition/forces/relations/manual ·
│   │           groups qualitative/quantitative/custom · space panning / wasd+mouse 3D)
│   └── VIECO — viewComposer (engines · modes · pagination XY_splits|Z_tabs · orientation ·
│               rotation · size · zoom)
└── PVPUI — presets/variables/primitives/user interface (ex UPV; ABSORBE UCV).
            Dueño de las taxonomías de kinds (surfaces/scenes/nodes/cells) + layout,
            custom styles, custom values.

MyConfig
├── PSS    — tri-config: router-config (WIR+WAR) · view-config (= LIVRE: HOST+NAVCO+VIECO)
│            · space-config (PVPUI). Facetas×cascada y storage classes D-PSS intactos.
├── LUPAPI — ex LUPA (Load-Unload Plugins API; se fija la P y la I de API)
└── SASI   — Services/Commands/Scripts Indexing; ROL: maneja providers (service indexing)

MyTools (CANDIDATO) — VFS, otros sistemas lógicos; el dev anticipa huérfanos restantes.
```

- **Symbiont Explorer (dominio): DILUIDO** entre MyWorkspace y MyConfig (dev 2026-07-14).
  Cierra el grill pendiente "Symbiont/ComposedViews al glosario".
- **ComposedViews ≈ VIECO** ("en otro orden") — mismo cierre.

## Renames (viejo → nuevo)

| Viejo | Nuevo | Nota |
|---|---|---|
| NIB (sistema) | **WIR + WAR** bajo WASA | Muere el paraguas "NIB"; locks D-NIB-* y slices intactos |
| WSA | **WASA** | Absorbe "actions"; norte L131 y shard 02 (superficie WSA) a actualizar |
| UPV | **PVPUI** | — |
| UCV | absorbido en **PVPUI** | Cierra colisión UCV/UPV del megadump |
| LUPA | **LUPAPI** | — |
| PLPZRR | **disuelto en LIVRE{HOST,NAVCO,VIECO}** | Confirmado dev; NO es rename 1:1 a VIECO (pan/space→NAVCO · pagination/rotation/zoom→VIECO · mounting→HOST) |
| viewComposer / "VIEWCO" | **VIECO** (spelling fijado) | Cierra pendiente viewComposer-vs-viewScene |
| Symbiont Explorer | **diluido** (MyWorkspace+MyConfig) | Ya no es dominio pilar independiente |
| sceneManagerScene / workspaceScene | alias de **S-24 ScenesManagerScene** | CORE + own lever (CR-1/ADR 0011); "toolbar on/off" v1.2 = precursor de su visibility-manager |

## Taxonomías de kinds (dueño: PVPUI)

**surface-kinds**: `adapted` (superficies provistas por el host Obsidian: leaves main/ sidebars/tabs/ribbon/status/settings **+ cmenu + codeblock**) · `base` (normal, propio, como un leaf) · `underlay` (debajo de otro surface; ej. host de slide-anim de sandbox) · `overlay` (encima: islands, cmenus propios, rails asistivos) · `hover` · `modal`.
- Nota dev: PSS puede **reemplazar** un adapted por scene propia (ej. cmenu circular con miller explorer estilo rueda GTA V = own scene sobre overlay, NO adapted).
- Rationale registrado: `adapted` = seam de portabilidad (idea Logseq/Joplin, sin compromiso) — aísla lo host-específico.
- Mapping desde la lista canon vieja (tab/modal/pop-up/cmenu/codeblock): tab→adapted o base según provenga del host o de VM · modal→modal · pop-up→hover u overlay (afinar en cascada) · cmenu/codeblock→adapted (reemplazables por PSS).
- Distinción de tier (grill): CSS position NUNCA decide tier — Surface = mount host + lifecycle + capacidad de hostear scene. Bar persistente compuesto por la Scene = `panelWidget` aunque sea sticky/fixed; rail flotante asistivo con lifecycle propio y mini-scene = overlay surface (carve-out D-NIB-3, dev-approved).

**scene-kinds**: `default` (provistos por PVPUI) · `intercepted` (reconstrucciones por WASA de core plugins + add-ons hechos con LUPAPI). Quality lockeada: una scene puede hostear sus propias surfaces **recursivamente** (precedente: islands).

**node-kinds**: `action` (WAR) · `data` (providers) · `container` (groups de NAVCO).

**Estados posicionales (corrección dev en review 2026-07-14: son ESTADOS computados de la posición jerárquica, NO kinds; combinables):** **GP / P / C / GC / AD**.
- Un nodo puede ser **P y C a la vez** (folder dentro de folder); GP/GC = extremos (nada arriba / nada abajo en su jerarquía).
- **GC redefinido (enmienda al shard 02 node-distribution)**: GC = último eslabón SIN importar nivel (un file suelto en root = estado `gc` en L1) — ya no "L3+".
- **AD**: condición EXTERNA impuesta por un config (o state si temporal). Los estados se re-evalúan sobre la jerarquía INCLUYENDO adopciones: adjuntar un AD debajo de un GC le quita el estado GC; el AD mismo puede ser GC por la misma lógica.

**cell-kinds**: `action` · `content` (texto largo/preview) · `metadata` (file_info / frontmatter / inline_properties / backmatter) · `provided` · `deco` (media / glyph / primitives / states: highlights, animaciones).
- **Resolución action node-vs-cell (dev-aceptada)**: UN solo dominio ActionNode (WAR);
  nodes y cells son HOSTS que referencian un action id. `action_node` = la entidad ES la acción; `action_cell` = celda en el row de otro node que invoca un ActionNode. Misma invocación, cero taxonomía duplicada (coherente D-NIB-4).
- **glyph** (def): símbolo renderizado (letra/dígito/icono/nombre corto) — superset de "character"; el proto ya lo usa así (`niaGlyph` modos letter|icon|name).

## PSS tri-config → mapa de facetas

`router-config` (WIR+WAR) · `view-config` = LIVRE (HOST mounting/rendering + NAVCO regime/layers/direction/scope/sorts/groups/space + VIECO engines/modes/pagination/ orientation/rotation/size/zoom) · `space-config` (PVPUI layout/styles/values).
Semilla v1.2: "save config" persiste `viewModeByTab`→VIECO.engines/modes · `sortStateByTab`→NAVCO.sorts · `visibleCellsByTab`→faceta TBD (candidata VIECO).
El split view-state vs view-config por faceta (D-NIB-2) SOBREVIVE intacto.

## Estado real en código (verificado 2026-07-14)

- sandbox HOY: `src/types/typeActionRouting.ts` + `src/services/serviceWorkspaceInputRouter.ts` (nombres pre-split). Branch **`nib/slice-0` @ `deb7b9b0`** (60 files, catálogo a-h) EJECUTADA con gates verdes, **FF pendiente** (bloqueada por contención del checkout).
- Los targets de slice-0 YA coinciden con el split: `typeInputRouting.ts` = WIR · `serviceWorkspaceActionRouter` = WAR. Contenido de slices NO cambia; solo muere el paraguas "NIB" (nota fechada en el doc de slices).
- Stream main/v1.2: NO se construye WIR (interacciones nativas + hotkeys Obsidian, sin apoderarse); solo mini-seam WAR-shaped (spec v1.2).

## Opens (para la cascada / grills futuros)

- Censo de huérfanos sin dominio: VFS (candidato MyTools) · queue/diff · decoration · i18n · perf/diagnostics · …(completar en cascada).
- Mapping fino pop-up→hover|overlay.
- Node/cell taxonomies: PVPUI las registra; verificar si su SEMÁNTICA de datos queda citada también en el territorio data (providers) al cascadear explorer-model.
- Addressing/serialización de invocaciones (`l1_gc_file/action_move_+2::Hora.md`):
  criticado (separadores colisionan con labels; posicional frágil como identidad) → columna nueva en el mini-grill de shape ActionNode (ex D-NIB-7, Q-SH-*).

## Docs afectados por la cascada (checklist)

- [ ] `docs/architecture/glossary.md` — entradas nuevas + renames (single source).
- [ ] `docs/architecture/dev-glossary.md` — espejo dev.
- [ ] `docs/current/norte.md` — L131-134 (WSA→WASA · NIB→WIR/WAR · LUPA→LUPAPI + árbol).
- [ ] `docs/architecture/explorer-model/02..05` — notas fechadas (GC/AD, surface-kinds, VIECO, WASA).
- [ ] Umbrella shard 02 node-distribution — enmienda GC/AD.
- [ ] `02-nib-slices.md` — nota NIB→WIR/WAR ✅ (hecha 2026-07-14).
- [ ] `docs/current/pendientes.md` — cierres Symbiont/viewComposer ✅ + item review.
- [ ] Megadump cross-refs (UCV/UPV) — nota de absorción.
- [ ] ADR nuevo o nota en 0011/0012 si la cascada lo pide (decisión en review).
