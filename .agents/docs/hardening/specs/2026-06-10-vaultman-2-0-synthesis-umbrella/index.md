---
title: Vaultman 2.0 Synthesis Umbrella — proto-v12 × sandbox × stable hacia la línea 2.0.0
type: spec-index
status: draft
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-06-10T00:00:00
updated: 2026-06-10T00:00:00
created_by: claude-fable-5
updated_by: claude-fable-5
supersedes: "[[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella (proto-v5)]]"
tags:
  - agent/spec
  - initiative/hardening
  - explorer/umbrella
  - version-streams
  - release/2.0.0
aliases:
  - umbrella v2
---

# Vaultman 2.0 Synthesis Umbrella

Iniciativa que convierte la **gramática** de proto v12 en Scenes/engines **preset-agnósticos**
sobre la arquitectura producto (Svelte 5 + TS + Obsidian), montando su look como preset
`polish` ("demo") dentro del sistema PSS, y entregando la **unión de funciones**
proto + sandbox + stable como línea `2.0.0`. Absorbe el spine del roadmap-dispatch
(Q4 → N.R → V.D → P.D) como sus primeras waves. Supersede la Explorer Merge Umbrella
2026-05-19 (construida contra proto-v5); aquel contenido queda como input histórico.

Canon por preset (D8): proto v12 = canon del preset **polish/demo** · stable `1.1.1`
minimal=on = referencia viva del preset **native** · sandbox (beta.1 = canary real)
aporta el **decoration layer** (selection/filter/badges) que proto no tiene ·
barebones = add-on-explorer mínimo (ADR 0011). Las Scenes son preset-agnósticas
(glossary); el look floating-island es solo el rung polish del chameleon.

## Dominios pilares (nomenclatura dev, D9)

- **Symbiont Explorer** — conjunto de la riqueza de los explorers: nodos, bindings,
  view engines, cells, sort, grouping, relaciones (holarquía/heterarquía/adopted);
  el ordenado y presentación reactivo/dinámico aprendido de Bases, expandido y
  extrapolado a más campos de información. Cubre ~N0-N2 de la pirámide (+ graph
  engine en N4 con disciplina de tooling).
- **MyWorkspace** — conjunto que abarca el control del UI del workspace entero
  (actions, btns, primitives, panels, scenes, surfaces, presets) + la capacidad del
  user de modificarlo a su antojo "como Figma con componentes reales que funcionan":
  Live Redesign, LayoutBuilder, snippets/themes de Obsidian, config import/export,
  archivos `.scene`. Cubre ~N1 (PSS/LUPA/NIB) + N3 de la pirámide.

## Shards

| Shard | Contenido |
|---|---|
| [[01-locked-decisions-grill\|01 Locked decisions]] | D1-D9 del grill 2026-06-10 con rationale |
| [[02-node-distribution-presentation-model\|02 Node Distribution & Presentation Model]] | digitalización del whiteboard 2026-06-02 (design-input #2, vive bajo WSA) |
| [[03-dependency-pyramid-and-gates\|03 Pirámide de dependencias + gates]] | N0-N4 bottom-up, clasificación gate/flag/post-2.0, regla de orden |
| [[04-wave-1-contracts\|04 Wave 1 task contracts]] | Q4 ∥ PlatformAdapter ∥ tracer ViewConfig+cascade |
| [[05-pss-grill-notes\|05 PSS grill notes]] | notas corrientes del PSS grill (confirmados · propuestos · adiciones · pendientes) |

## Pipeline de fases

| Fase | Output | Estado |
|---|---|---|
| A — Alineación | este spec + decisiones + fixes de docs | cerrada 2026-06-10 (este grill) |
| B — Function-union ledger | matriz función-level proto-v12 × sandbox × stable-1.1.1 con columnas preset-mapping · decorations · overlaps/contradicciones · clasificación ADOPT/RESHAPE/MAP/DROP/DEFER × dueño destino. Subagentes read-only; base = shards 02-06 del version-streams analysis; re-read serio único = stable re-baseline 1.0.1→1.1.1 | pendiente |
| C — Spec completo umbrella | merge map · re-validación de locked decisions v5-era contra v12 · schemas ViewConfig/Scene/Panel (PSS con xyz/layers) · capability matrices · plan de waves completo · reslot roadmap-dispatch · slotting de duales | pendiente (requiere B + PSS grill) |
| D — Ejecución por waves | por wave: SPEC→PLAN→issues→TDD→verify+smoke→aterrizaje a sandbox | gateada por C parcial (wave 1 puede arrancar con specs propios) |

## Topología git/streams (D2, D4)

```text
worktree (umbrella-v2/wave-N, ramas cortas desde sandbox HEAD)
  └─ aterriza → sandbox (canary, autoridad; metadata → 2.0.0-canary.N al aterrizar wave 1)
       └─ promoción curada en gates → dev (beta, 2.0.0-beta.N, BRAT)
            └─ release → main (stable 2.0.0)
main 1.1.x: hotfix-only (+ minors opcionales por otro agente) → SIEMPRE registrados en el ledger
proto v12: nunca mergea — solo se traduce
tag de respaldo al arrancar wave 1: sandbox-pre-umbrella-v2-2026-06-10
```

## Design inputs

1. **Proto v12** (canon preset polish/demo) —
   [[docs/work/hardening/research/2026-05-29-version-streams-vertical-codebase-analysis/04-proto-design-v12-vertical-read|shard 04 vertical read]];
   reglas duras de traducción en su §29 (no copiar `window.*`, script order, mock data,
   DOM-query nav, `_hiddenSecs`, desktop taxonomy stale).
2. **Whiteboard Node Distribution 2026-06-02** — [[02-node-distribution-presentation-model|shard 02]].
3. **Megadump OneNote 2026-06-03 + ADR 0011** — PSS (allí "SPS") · LUPA · NIB · SASI · UPV · WSA ·
   module-contract · `.scene` files · symbiont framing:
   [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/index|megadump]] ·
   [[docs/architecture/adr/0011-modular-monolith-extraction-seams|ADR 0011]].
4. **Anchor checkpoint 2026-06-04** —
   [[docs/sessions/2026-06-04-claude-opus-anchor-checkpoint|checkpoint]] (PSS grill = open #1; allí "SPS").
5. **Oráculo de comportamiento**: stable `1.1.1` por sistema (D3) — delta matrix
   [[docs/work/hardening/research/2026-05-29-version-streams-vertical-codebase-analysis/05-system-by-system-stream-delta-matrix|shard 05]]
   + promotion spec
   [[docs/work/hardening/research/2026-05-29-version-streams-vertical-codebase-analysis/06-promotion-and-reconciliation-spec|shard 06]].

## Opens (no bloquean wave 1)

- **PSS grill** (Presets Saving System; antes SPS — glossary actualizado 2026-06-10) —
  UNDEFINED; gatea specs de N1+. Arrancado 2026-06-10 en sesión con el dev.
- **TanStack virtualizer (adaptador Svelte) — research + spec dedicado** antes del
  render-runtime compartido (N1, ADR 0008): estado real del adapter Svelte, patrones
  Svelte 5 runas, límites medidos (50k/100k), decisión keep/extend/replace. El spec DEBE
  incluir una sección de **working-memory pkm-ai** con el tooling disponible para los
  agentes — [[docs/work/pkm-ai/items/2026-06-10-agent-tooling-working-memory|agent tooling working-memory]] —
  para que los agentes de implementación sepan con qué instrumentos cuentan (gap
  ejemplo: el dato `is-phone` de Obsidian para mobile testing quedó sin doc, solo
  mencionado en session-log 2026-06-09).
- **Motor de variables de UPV** — presetWind4 vs **presetObsidian** (preset UnoCSS propio
  que conserve el lenguaje de diseño Obsidian para compat con themes/snippets que alteran
  componentes nativos, "como preset para no convertirlo en limitante"). Decidir en
  disciplina de tooling / fase N. No-limitante by design.
- **Graph engine** — puede requerir librerías nuevas → disciplina de tooling primero (N4).
- **Índice de primitives Obsidian** (research, dev 2026-06-10): inventario de
  primitives que Obsidian da a plugins (docs/forums/API + web-lab para los no
  expuestos) → provider UPV navegable en el explorer, invocable desde MyWorkspace,
  cells con URLs de referencia. Ver [[05-pss-grill-notes|notas PSS §4]].
- **Icon packs importables** (dev 2026-06-10): packs como assets (freedesktop
  icon-theme desde opendesktop) referenciados por id desde presets; almacén + caché =
  lane C. Ver [[05-pss-grill-notes|notas PSS §6]].
- **Naming de engines** — glossary dice Linear/Geometry/Table/Canvas; v12 dice
  lineal/grid/matrix/canvas. Reconciliar en Fase C.
- **ADR 0010** — hueco en la numeración ADR (0009 → 0011). Confirmar si reservado o perdido.
- Fase B y Fase C completas.

## Non-goals

Editor-layers impl (post-2.0, brainstorm propio) · minors 1.1.x (otro agente, solo registro
en ledger) · NN interop · re-lectura test-suite · merges downward · push a `main`/`dev`.

## Status

- Status: 🟡 draft — Fase A cerrada, pendiente review del dev; Fase B no arrancada.
- Aprobador del grill: dev (Meibbo), sesión 2026-06-10.
- Próximo paso: review del dev de este index + shards → PSS grill (arrancado 2026-06-10) → Fase B.
