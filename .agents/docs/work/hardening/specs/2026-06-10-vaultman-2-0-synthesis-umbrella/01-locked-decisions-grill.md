---
title: Locked decisions — grill de alineación 2026-06-10
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
  - agent/decision
---

# 01 — Locked Decisions (grill 2026-06-10, dev: Meibbo)

Decisiones estructurales de la sesión de brainstorm/grill que fundó la iniciativa.
Cada una fue confirmada explícitamente por el dev. Reconciliar con el decision-ledger de foundation-discovery en Fase C (el ledger está en soft-WARN de líneas; este shard es el source record).

## D1 — Umbrella v2 absorbe el spine

La síntesis no es un item paralelo del roadmap: ES el roadmap. Q4 logic-extraction, N.R NodeRow, V.D view shells y P.D panel/scene se vuelven sus primeras waves. Un solo roadmap re-anclado en Fase C. Rechazadas: lane paralelo (divergencia garantizada + doble trabajo) y big-bang línea v2 con sandbox congelado (repite el trauma de divergencia original).

## D2 — Topología: sandbox sigue siendo el canary

- `sandbox` = canary y autoridad; NO se crea rama sucesora.
- Trabajo en worktree con ramas cortas `umbrella-v2/wave-N` desde sandbox HEAD;
  cada wave verificada aterriza a sandbox (mismo patrón probado con `hotfix/1.0.2-css-scorecard`).
- Tag de respaldo al arrancar wave 1: `sandbox-pre-umbrella-v2-2026-06-10`.
- `dev` queda INTACTO (= main) hasta gates de promoción. Rechazado explícitamente:
  pasar el sandbox viejo a `dev` — mislabel inverso (canary-grade etiquetado beta), rompería el staging de hotfixes stable, y la preservación ya la dan historia + tag.
- No dependemos de `dev` durante la iniciativa; beta vacía = beta correcta.

## D3 — Paridad stable por sistema, dentro de cada wave

El function-union ledger (Fase B) fija stable `1.1.1` como oráculo de comportamiento por sistema. DoD de cada wave = "columna stable cerrada para los sistemas tocados" (ej.: V.D incorpora tablas/resizers/grid de SDF-011/016; la wave de queue porta la conflict policy de SDF-015). Hotfixes y minors 1.1.x futuros se registran en el ledger al ocurrir — drift rastreado, no descubierto. Rechazadas: wave-0 dedicada de port temprano (trabajo doble hacia arquitectura por reformar) y paridad solo en gate final (drift máximo).

## D4 — Línea v2 directa

- La síntesis = `2.0.0`. Stable `1.1.x` queda hotfix-only.
- Minors `1.1.x` opcionales en paralelo con otro agente SÍ permitidos (no afectan el desarrollo 2.0); regla única: registrarlos en el ledger.
- Sandbox corrige metadata a `2.0.0-alpha.N` al aterrizar wave 1 (ENMIENDA 2026-06-11, PSS grill Q10: semver ordena prereleases alfabéticamente — `alpha < beta < canary < rc` — así que "canary" como label rompería la detección de updates; **canary queda solo como nombre de stream, su label semver = alpha**).
  Línea: `2.0.0-alpha.N` (sandbox) → `2.0.0-beta.N` (dev) → `2.0.0-rc.N` → `2.0.0`.
- Primera promoción a `dev` = `2.0.0-beta.1` vía BRAT.
- Rechazadas: cadencia de minors con la reconstrucción (un "minor" que en percepción es producto nuevo) e híbrido con cherry-picks inversos (doble mantenimiento).

> **ENMIENDA 2026-07-14 (grill v1.2, dev + claude-fable-5):** "hotfix-only" queda
> superseded — la línea 1.x continúa con **feature-minors oficiales** (v1.2 floating
> toc en curso; v1.3…) con ciclo beta BRAT propio, hasta paridad+estabilidad de 2.0;
> `2.0.0` = major por incompatibilidades reales; **no hard-sunset** de 1.x al aterrizar
> 2.0. La regla original "minors se registran en el ledger" (D3) queda intacta; lo
> rechazado que se reinstala es la cadencia de minors — respaldo: research
> release-discipline 2026-07-13 (strangler-fig/Spolsky/DORA small-batches/Caudill;
> fuentes en [[docs/architecture/policies/release|policy release]]) + el flujo continuo
> que version-streams ya preveía. Spec:
> [[docs/work/polish/specs/2026-07-14-v1-2-floating-toc/index|v1.2 Floating TOC]].

## D5 — Wave 1: spine + lanes paralelos con tracer

- Agente A (serial): Q4 logic-extraction.
- Agente B (∥): PlatformAdapter + Fragility Registry (ADR 0004).
- Tracer (∥, delgado): ViewConfig schema tipado + spike cascade descartable.
- Detalle: [[04-wave-1-contracts|shard 04]].

## D6 — Frontera del core 2.0.0 (principio; Fase C refina por componente)

Tres niveles: **gate** (bloquea 2.0.0) / **flag experimental** (presente, no bloquea) / **post-2.0** (2.x). Asignación inicial en [[03-dependency-pyramid-and-gates|shard 03]], reordenada por la pirámide de dependencias (D8).

**Nuance B.P**: los namespaced IDs (`note.X`/`file.X`/`formula.X`) se adoptan DESDE wave 1 en los providers que el spine reconstruye — el breaking entra en el único evento breaking de la línea (2.0.0). B.P-features (`registerBasesView`, C.D) = 2.x no-breaking. Evita dos breakings seguidos.

**Nota canvas/matrix** (dev): aunque "medio funcionaban" en el proto, necesitan trabajo real; graph y json-canvas son features de core Obsidian que hoy no trabajan para Vaultman → research de integración (`.canvas` = JSON Canvas, formato abierto;
Graph core es cerrado). Supersede el "Map/ViewNodeMap deferred" del preserve viejo:
mindmap vive bajo el canvas engine flag.

## D7 — Whiteboard Node Distribution como design-input #2

- Digitalizado en [[02-node-distribution-presentation-model|shard 02]]; se promueve a explorer-model tras review del dev.
- Wave 1 acomoda schemas **designed-for, no implementado**: ViewConfig + Node contract tipados para placement/layers/relations.
- Layers en explorer + coordinates/floating = flag experimental; **editor-layers (CodeMirror/Excalidraw) = post-2.0** con brainstorm + research propio (decisión dev:
  la superficie de seguridad de mutar markdown por capas requiere queue/diff maduro).
- Bookmarks provider → candidato al ledger.

## D8 — Canon por preset + pirámide como orden de gates

- Proto v12 = canon del preset **polish ("demo")**, NO del diseño global. Stable `1.1.1` minimal=on = referencia del preset **native**. Sandbox = decoration layer (selection/filter/badges). Barebones = add-on-explorer mínimo (ADR 0011).
  Ya anticipado por MD-P1 del megadump: "Polished proto-design = preset 'Polished';
  translation needs strong abstraction/granularity due to SPS + LUPA".
- El ledger Fase B gana columnas: preset-mapping · decorations · overlaps/contradicciones.
- La pirámide N0-N4 ([[03-dependency-pyramid-and-gates|shard 03]]) ordena los gates:
  nada de Nx entra a gate si su N(x-1) no está cerrado.
- **PSS grill gatea N1** (PSS está UNDEFINED per anchor checkpoint 2026-06-04, allí "SPS").

## D9 — Nomenclatura de dominios (dev, 2026-06-10)

- **Symbiont Explorer** = conjunto de la riqueza de explorers (nodos, bindings, view engines, cells, sort, grouping, relaciones; presentación reactiva/dinámica aprendida de Bases, expandida a más campos de información).
- **MyWorkspace** (alias **elasticUI**, dev 2026-06-13) = conjunto del control del UI del workspace entero (actions, btns, primitives, panels, scenes, surfaces, presets) + edición user-facing "como Figma con componentes reales" (Live Redesign, LayoutBuilder, snippets/themes Obsidian, config import/export, `.scene`). El alias `elasticUI` denota el modo armar/desarmar (construction blocks); contraparte = "solo actuar" vía actions con pre-binding (ver D-C-8).
- **UPV** oficial (UI, Primitives and Variables) — reemplaza el acrónimo UCV del megadump; "Primitive" ya es término VM del glossary. Motor de variables ABIERTO:
  presetWind4 vs **presetObsidian** (conservar lenguaje de diseño Obsidian como preset, no como limitante) — decidir en disciplina de tooling, otro momento.
- **PSS** oficial (Presets Saving System, dev 2026-06-10) — orden invertido sobre el "SPS / Saving Presets System" del megadump; SPS queda como referencia superseded en el glossary (entrada añadida 2026-06-10). Leer menciones históricas de SPS como PSS.
- Estos nombres entran al dev-glossary en Fase C (PSS ya está en el glossary canónico).

## D-PSS — Decisiones del PSS grill (CERRADO 2026-06-11)

Registro completo con racional: [[05-pss-grill-notes|shard 05]]. Resumen ejecutivo:

- **D-PSS-1 Composición**: facetas tipadas (style/layout/load/view/workspace/input) + Profile (composición nombrada; built-ins barebones/native/polish/custom) + resolución en cascada por scope — "C dentro de B". Matriz faceta × scope CERRADA (§16; única celda diferida: input × Panel → P.D). Sort vive dentro de la faceta view.
- **D-PSS-2 Ley de estilo**: primitives headless (bits-ui real; shadcn re-skinneado no-opinionado; daisyUI solo inspiración polish) + estrategia 4+3: identidad `data-vm-*` (API estable) · vocabulario de clases POR preset (native = clases Obsidian reales) · tokens `--vm-*`; índice de clases nativas vs app.css (web-lab) en el Fragility Registry. Todo estilo = pseudo-snippets exportables.
- **D-PSS-3 Almacenamiento**: 4 clases — Presets/Profiles · Library items · Marks · Session — sobre UNA infra (write-batcher + atomic writes). Presets referencian assets/library por id, nunca embeben. Caches/IndexedDB = tema aparte (lane C).
- **D-PSS-4 Payload `.scene`** (Q5 a-h): multi-doc layered YAML (meta/facets/library/assets/session/code/notes), merge sparse, `vm-scene: 1`, session opt-in OFF, cero script. **Library items viven DENTRO de `.scene`** (precedente `.base`); `.scene` = archivo normal de Obsidian → directorio nativo de archivos nuevos. CR-2 payload DESTRABADO (CR-2 actualizado).
- **D-PSS-5 Batcher**: write-batcher (disco, transparente) ≠ operation queue. El queue protege el VAULT (imports/exports que escriben archivos = preview); la config se protege con undo-stack + snapshot efímero al aplicar Profile.
- **D-PSS-6 Ubicaciones**: presets → `.obsidian/plugins/vaultman/presets/` · marks → `marks.json` propio · session → localStorage device-local (file = opt-in) · assets → directorio del vault ELEGIDO por el user · multi-device = last-write-wins en alpha (riesgo aceptado, se reajusta con experiencia).
- **D-PSS-7 Labels** (enmienda a D4): `2.0.0-alpha.N` (sandbox) → `beta.N` (dev) → `rc.N` → `2.0.0`; canary = solo nombre de stream (orden alfabético semver).
- **D-PSS-8**: Workspace-profile = Profile a scope workspace (términos fusionados).
- **D-PSS-9 Tests de aceptación de fundaciones**: profile `legacy-1.1` ejercitando TODOS los subsistemas · preset native = paridad de COMPORTAMIENTO con core Bases · barebones = {config_scene, snippet_scene, plugin_scene}.
- **D-PSS-10**: marks_scene + mark kinds (position-mark = "real bookmarks" del whiteboard; coordenadas en canvas/excalidraw) = spec propio, dominio Symbiont Explorer.

## D-C — Decisiones Fase C (grill 2026-06-12, dev: Meibbo)

Resuelven los CONTRADICE que gateaban el spec Q4 (ledger [[docs/work/hardening/research/2026-06-11-function-union-ledger/09-sintesis-transversal|shard 09]] C-1/C-5/C-7). Prioridad dev declarada para la primera alpha: robustez de **MyWorkspace + Symbiont Explorer + node-notes** — content search NO gatea alpha.

- **D-C-1 Content search (resuelve C-1)**: alpha usa **NativeSearchAdapter** (stable 1.1.1, oracle probado, cero costo de índice) detrás de un **seam `SearchEngine` swappable** definido en el tracer spec; el contrato `content_search` como filter rule componible se preserva. **ContentIndex de sandbox se ARCHIVA como referencia** (no se borra ni se estabiliza — sus ideas per-scene index/provider pasan al research). El **research minisearch (H1, branch 3 deferred)** decide el engine propio definitivo (fuzzy/omnisearch del proto); cuando llegue, entra por el seam sin tocar el contrato de rules. Racional: minisearch reemplazaría el core de matching del ContentIndex actual — estabilizarlo ahora sería trabajo tirado.
- **D-C-5 Conflict gate (resuelve C-5)**: la **policy nombrada de stable** (`operationIdentity`/`operationsConflict`/`assessChange` → duplicate/merge/conflict) es el **gate primario** en el plano de operaciones; el **node-bound delete-purge de sandbox queda como segunda barrera** dentro de la capa VFS. Une policy-stable + arquitectura-sandbox sin perder ninguna.
- **D-C-7 Diff canónico (resuelve C-7)**: el diff se computa **desde los snapshots inmutables del VfsChain** — UN solo servicio de diff; se elimina el espejo `serviceDiff`/`serviceDiffSnapshot` (dual N1). El replay de closures de stable muere con su motor.
- **D-C-8 ViewConfig = forma normal + capa de bindings (dev 2026-06-13)**: la tupla `engine+mode+orientation(+viewScope)` NO es la clave primaria de una vista ni está hardcodeada al selector de 3 ejes; es **una** ruta de direccionamiento. El artefacto resuelto `ViewConfig` es la **forma normal**; las vistas se direccionan por un **registry de `ViewBinding`** (3-ejes, lista plana, `"miller"` a secas, command, hotkey — todos resuelven a la misma `ViewConfig` vía `resolveViewConfig`, merge sparse por la cascada D-PSS-1) + `normalizeViewConfig` para reflejar estado activo. **Es ADR 0005 aplicado a views** (binding→ActionNode→Operation `setViewConfig`) y el reshape del conflicto #8 del ledger cluster 02 (proto window-globals → registry+resolver).
  Corrección de framing: NO "índice de resultados pre-enumerados" (explota, no compone, no valida) sino **resolver + registry**. Generaliza más allá de views: view/sort/etc.
  son explorers modificables por MyWorkspace, así que toda selección = action con pre-binding (muchas rutas → un resultado, proyectadas desde UNA fuente → "muchas rutas" no es "muchos bugs"). Constraint heredada: **base irreducible** — factory-reset/`barebones` siempre alcanzable; el usuario no puede borrar el control que necesita para reconstruir (SF/P.D la implementan). Tracer (lane C) deja SOLO los TIPOS del seam; registry runtime + proyección multi-surface = P.D (InputRouter/ ActionNode) + SF (WorkspaceMediator). Detalle:
  [[docs/work/hardening/specs/2026-06-12-wave-1-specs/03-tracer-viewconfig-cascade|tracer spec §Aclaración dev]].
  **Resuelto (dev 2026-06-13):** el ViewBinding registry se **folda en P.D** (InputRouter/ActionNode), NO spec dedicado — mismo eslabón binding→ActionNode, sin sistema paralelo. Breadcrumb en el card P.D del roadmap-dispatch.
