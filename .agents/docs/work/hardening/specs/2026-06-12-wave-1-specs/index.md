---
title: Wave 1 specs (Fase C-lite) — Q4 ∥ PlatformAdapter ∥ tracer ViewConfig
type: spec-index
status: active
parent: "[[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/index|Vaultman 2.0 Synthesis Umbrella]]"
created: 2026-06-12T00:00:00
updated: 2026-06-12T00:00:00
created_by: claude-fable-5
updated_by: claude-fable-5
tags:
  - agent/spec
  - initiative/hardening
  - umbrella-v2/wave-1
---

# Wave 1 Specs — Fase C-lite

Specs ejecutables de los tres lanes de wave 1 (contratos en [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/04-wave-1-contracts|umbrella shard 04]]).
Consumen: ledger [[docs/work/hardening/research/2026-06-11-function-union-ledger/09-sintesis-transversal|síntesis (09)]] §7, decisiones D1-D9 + D-PSS-1..10 + **D-C-1/5/7** (grill 2026-06-12, en [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/01-locked-decisions-grill|umbrella shard 01]]).

**Prioridad alpha declarada por el dev (2026-06-12): robustez de MyWorkspace + Symbiont Explorer + node-notes.** Cada spec ordena su alcance bajo ese criterio.

C-lite = spec suficiente para que un agente con worktree propio escriba su PLAN e implemente sin re-derivar contexto; NO duplica los pre-reads — los enlaza.

## Shards

| # | Lane | Spec | Estado |
|---|---|---|---|
| 01 | A (spine, serial) | [[01-q4-logic-extraction\|Q4 logic-extraction]] | **aprobado (dev 2026-06-13)** — listo para PLAN |
| 02 | B (∥) | [[02-platform-adapter\|PlatformAdapter + Fragility Registry]] | **aprobado (dev 2026-06-13)** — listo para PLAN |
| 03 | C (∥, timeboxed) | [[03-tracer-viewconfig-cascade\|Tracer ViewConfig + spike cascade]] | **aprobado (dev 2026-06-13)** — listo para PLAN |

Tag de respaldo `sandbox-pre-umbrella-v2-2026-06-10` creado (local, `de4e29b`) 2026-06-13.

## Gates de arranque (de la umbrella, sin cambio)

- Review del dev de estos specs (este index marca draft hasta entonces).
- Tag de respaldo `sandbox-pre-umbrella-v2-2026-06-10` se crea AL ARRANCAR wave 1.
- Lanzar A y B primero; C cuando haya capacidad (máx 3 agentes).
- No-overlap de archivos validado antes de lanzar; si C toca ViewHost, coordina con A.
- Metadata bump a `2.0.0-alpha.1` en el PRIMER aterrizaje de wave 1 (D4 + D-PSS-7;
  el shard 04 decía `canary.1` — superseded por la enmienda de labels).
