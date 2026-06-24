---
title: Wave 1 — task contracts (Q4 ∥ PlatformAdapter ∥ tracer)
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
  - agent/dispatch
---

# 04 — Wave 1 Task Contracts

Wave 1 = N0 completo de la pirámide. Tres lanes según el template de dispatch del
roadmap (worktree por agente, contexto angosto, sin archivos compartidos, verify gate).
Cada lane requiere su propio SPEC→PLAN antes de implementar (no pre-spec'ear waves
posteriores). Arranque gateado por: review del dev de esta umbrella + tag de respaldo.

## Lane A — Q4 logic-extraction (spine, serial)

```yaml
id: q4-logic-extraction
worktree: umbrella-v2/wave-1-q4 (desde sandbox HEAD)
input:
  pre-reads:
    - roadmap-dispatch (DAG + tier NOW)
    - explorer-model 01-responsibility-map
    - ADR 0011 (module-contract: sin deep cross-module imports)
    - delta matrix shard 05 §009-§013 (providers)
  constraints:
    - lógica pura fuera de god-providers → logicFiles/Props/Tags/Badge/FnR
    - providers reconstruidos emiten namespaced IDs (note.X/file.X/formula.X) — D6
    - relation kinds del Node contract (holarchy/adopted/related) tipados — shard 02
output:
  schema: módulos logic* puros + providers delgados + tests focused
  channel: aterriza a sandbox al verificar
depends_on: []
parallelizable: false  # cabeza del spine; estado compartido con waves siguientes
verify_gate: focused RED/GREEN + pnpm run check/lint + pnpm verify + smoke plugin-dev
priority: highest (gates N.R → V.D → P.D → todo)
```

## Lane B — PlatformAdapter + Fragility Registry (∥)

```yaml
id: platform-adapter
worktree: umbrella-v2/wave-1-pa (desde sandbox HEAD)
input:
  pre-reads:
    - ADR 0004 (PlatformAdapter + Fragility Registry)
    - delta matrix shard 05 §028 (native bindings: caminos duplicados)
    - dev-glossary (Adapter/PlatformAdapter)
  constraints:
    - probe + fallback + serviceUnload-revert por adapter
    - registro de fragilidad: selector sources, asunciones de versión Obsidian,
      fallback, comportamiento mobile
output:
  schema: adapters + Fragility Registry + tests
  channel: aterriza a sandbox al verificar
depends_on: []
parallelizable: true
verify_gate: focused tests + pnpm verify + smoke plugin-dev
priority: alta (desbloquea SF/menu-curator/iconize/ForeignEmbed)
```

## Lane C — Tracer ViewConfig + spike cascade (∥, timeboxed)

```yaml
id: viewconfig-tracer
worktree: umbrella-v2/wave-1-tracer (desde sandbox HEAD)
input:
  pre-reads:
    - explorer-model 02-render-and-data (engines × modes × orientation)
    - proto v12 shard 04 §07 (taxonomía 4 ejes) + §16 (ViewIslandV4) + §20 (cascade)
    - shard 02 de esta umbrella (campos designed-for)
  constraints:
    - ViewConfig tipado: engine/mode/orientation/viewScope + reservados
      placement/layerId/relations; defaults centralizados (evitar el split-brain
      DEFAULT_VIEW vs app.jsx del proto)
    - spike cascade (MillerColumns) tras flag experimental, montado vía ViewHost
      existente, datos de provider real, sin scoped-views
    - SPIKE DESCARTABLE: entregable = schema validado + aprendizajes del pipeline
      jsx→Svelte5/runas/virtualización, NO el código
output:
  schema: typeViewConfig + spike + informe de aprendizajes (doc corto en la umbrella)
  channel: schema aterriza; spike puede morir en la rama
depends_on: []
parallelizable: true
verify_gate: pnpm run check + focused tests del schema; spike solo smoke manual
priority: media-alta (de-riska la tesis de traducción; desbloquea specs de V.D)
```

## Reglas de coordinación

- Lanzar A y B primero; C cuando haya capacidad (máx 3 agentes, per roadmap-dispatch:
  escalar solo si coordinación < 15%).
- Validar no-overlap de archivos antes de lanzar (los 3 lanes no comparten archivos;
  si C necesita tocar ViewHost, coordinar con A).
- Cada lane: commit local por slice verificado; aterrizaje a sandbox = PR/merge local
  del worktree tras verify completo.
- Metadata bump a `2.0.0-canary.1` ocurre en el PRIMER aterrizaje de wave 1 (D4).
