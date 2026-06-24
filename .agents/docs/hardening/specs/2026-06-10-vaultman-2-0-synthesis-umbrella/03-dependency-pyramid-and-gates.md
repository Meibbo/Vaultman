---
title: Pirámide de dependencias N0-N4 + clasificación de gates 2.0.0
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
  - agent/roadmap
---

# 03 — Pirámide de Dependencias + Gates

Jerarquía bottom-up por dependencia funcional (pedida por el dev como autocrítica
estructural). **Regla de gates: nada de Nx entra a gate de 2.0.0 si su N(x-1) no está
cerrado.** La clasificación gate/flag/post-2.0 de D6 queda subordinada a este orden.
Fase C refina por componente con el ledger en mano.

Contexto de la autocrítica: el diseño inicial del grill se construyó con snapshot
2026-05-29; el sótano real (megadump 2026-06-03: PSS —allí "SPS"—/LUPA/SASI/
module-contract, ADR 0011, `.scene`, anchor checkpoint 2026-06-04) no estaba en los
inputs, así que la primera clasificación de gates mezclaba niveles. Este shard corrige eso.

## N0 — Cimientos (contracts + seams)

Sin esto, nada de arriba se sostiene. **= Wave 1.**

- module-contract + extraction seams (ADR 0011): comms SOLO vía registro interno,
  sin deep cross-module imports (eslint-enforced).
- SASI (Services/Commands/Scripts Indexing) como registro interno mínimo.
- Node contract (N.R: cell = node-element) + relation kinds del whiteboard
  (holarchy GrandParent · heterarchy Related · Adopted).
- Namespaced IDs (`note.X`/`file.X`/`formula.X`) desde los providers reconstruidos (D6).
- ViewConfig schema: 4 ejes (engine/mode/orientation/viewScope) + campos reservados
  placement/layerId/relations (designed-for).
- PlatformAdapter + Fragility Registry (ADR 0004).
- Q4 logic-extraction (lógica pura fuera de god-providers).

## N1 — Estructura portante (data + mutación + persistencia)

- Data plane consolidado (providers/indexes/snapshots — sandbox lo tiene; se consolida
  sobre N0).
- Render-projection + render-runtime compartido (ADR 0008, 2 capas).
- Queue/diff/VFS **reconciliado** (duales mutable/inmutable de sandbox — el delta
  matrix lo exige pre-stable).
- **PSS core** (Presets Saving System, antes SPS: presets + queued batcher; persiste
  view/layout/scene snapshots incluyendo xyz/layers). ⚠️ UNDEFINED — **PSS grill gatea
  este nivel**.
- LUPA core (load/unload de módulos internos como virtual plugins).
- NIB básico (input binding mínimo para acciones).

## N2 — Pisos (render + interacción)

- V.D view shells: engines lineal+grid completos sobre el runtime compartido.
  ⚠️ Reconciliar naming de engines (glossary: Linear/Geometry/Table/Canvas · v12:
  lineal/grid/matrix/canvas) en Fase C.
- Scenes core preset-agnósticas: Filters/Queue/View/Sort/Search + StackIsland primitive.
- Decoration layer (selection/filter/badges — lo que sandbox ya tiene y proto no).
- Iconos semánticos base (resolver + overrides persistidos).
- Axons (Selection/DnD por scope) + reconciliación de los 4 caminos DnD y del binding
  nativo duplicado.

## N3 — Fachada (composición + presets) — dominio MyWorkspace

- P.D panel/scene + SF surface foundation (Scene/Panel/Workspace, tile-tree,
  WorkspaceMediator, InteractionPolicy).
- **WSA** (Workspace Surface Abstraction = "Layout Design API"): paginate X|Y +
  Z layers + pan/zoom/rotate + Live Redesign.
- **UPV** (UI, Primitives and Variables): token/component layer del chameleon.
  Motor de variables OPEN (presetWind4 vs presetObsidian).
- Presets completos barebones/native/polish(demo)/custom sobre SPS.
- scenesManagerScene (CORE SceneProvider; visibility ≠ LUPA unload ≠ LayoutBuilder).
- Scoped views (per-level/per-parent) · floating/xyz · Niagara index.

## N4 — Techo (extensiones)

- Canvas/matrix engines (graph/mindmap/json-canvas · chart/form) — flags; research de
  integración con core Obsidian (`.canvas` JSON Canvas = formato abierto; Graph core
  cerrado); graph puede requerir librerías nuevas → **disciplina de tooling primero**.
- Panel-tree i3 multi-tile.
- Bases-OUT (`registerBasesView`) + C.D cross-provider cells (2.x no-breaking).
- Editor-layers (CodeMirror/Excalidraw) — post-2.0, brainstorm propio.
- NN interop · symbiont bridge completo (MD-F2: plugins llaman al API index).

## Clasificación inicial (D6 reordenada por pirámide)

| Nivel | Gate 2.0.0 | Flag en 2.0.0 | Post-2.0 |
|---|---|---|---|
| N0 | todo | — | — |
| N1 | todo (incl. duales queue) | — | — |
| N2 | V.D lineal+grid · Scenes core · decorations · iconos base · DnD/binding reconciliados | — | — |
| N3 | P.D/SF básico · PSS presets native+polish funcionales | WSA completo · scoped views · xyz/floating · Niagara · barebones completo | — |
| N4 | — | canvas/matrix engines · panel-tree i3 | editor-layers · NN interop · Bases-OUT/C.D · symbiont bridge |

Más la condición transversal de D3: unión con stable 1.1.1 cerrada en el ledger para
todos los sistemas gate.

## Mapeo dominios ↔ niveles

- **Symbiont Explorer** ≈ N0 + N1 (data) + N2 (+ graph en N4).
- **MyWorkspace** ≈ N1 (PSS/LUPA/NIB) + N3.
