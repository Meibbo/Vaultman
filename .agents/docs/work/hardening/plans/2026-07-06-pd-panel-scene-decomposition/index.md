---
title: Plan — P.D panel/scene decomposition kickoff
type: plan
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-07-06T12:20:00
created_by: codex-gpt-5
tags:
  - agent/plan
  - umbrella-v2/wave-1
  - spine/P.D
  - initiative/hardening
---

# Plan — P.D Panel/Scene Decomposition Kickoff

This folder is the source plan for the next spine node after V.D + Thread B.

## Goal

Start **P.D panel/scene decomposition** with a tracer slice that defines typed seams and adapts
the existing Filters `panelExplorer` without changing user-visible behavior.

## Current State

- `origin/sandbox` = `7107b1a`.
- Q4, N.R, V.D, Thread B, PA 1-5, glossary, shim collapse, and deps are landed.
- Next spine node = **P.D** (N3/MyWorkspace tracer).

## Architecture Sources

- [[docs/architecture/explorer-model/03-surfaces-and-interaction|Explorer Model 03 — Surfaces + Interaction]]
- [[docs/architecture/explorer-model/04-panels-axons-mutation-layout|Explorer Model 04 — Panel kinds / axons / mutation / layout]]
- [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/03-dependency-pyramid-and-gates|N0-N4 pyramid]]
- [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/01-locked-decisions-grill|Locked decisions D1-D9 + D-C-8]]

## Source Facts

- Panel owns provider + view-config + panel-scoped controllers and exposes `PanelHandle`.
- Scene owns tile-tree layout/composition only; it holds no panel state.
- WorkspaceMediator is singleton/stateless; it registers scenes/surfaces and routes via `InteractionPolicy`.
- Panel kinds are `panelExplorer`, `panelData`, `panelContent`, and `custom-panel`.
- Input goes through `InputRouter -> ActionProvider -> ActionNode`; navigation is a kind of action.

## Current Code Seams

- `src/components/containers/panelExplorer.svelte` is the concrete Explorer panel implementation.
- `src/components/pages/pageFilters.svelte` owns active Explorer page wiring, `ViewHostService`, providers, toolbar callbacks, search/FnR, operation scope, selection state, and queue calls.
- `src/components/explorer/ViewHost.svelte` already uses the Thread-B `(engine,mode)` bridge.
- `src/components/frame/frameNavigation.svelte.ts` and `src/components/frame/frameOverlays.svelte.ts` are the current frame-level coordination services.
- `src/types/typeActionRouting.ts`, `src/services/serviceKeyboardNav.ts`, and `src/services/serviceRowAction.ts` are current input/action primitives.
- `src/services/serviceLayout.ts` and `src/main.ts` contain current Obsidian workspace/leaf seams.

## Shards

- [[01-task-plan|01 Task Plan]] — executable steps for P.D slice 1.

## Status Log

- **2026-07-06 (codex-gpt-5)** — slice 1 `fcf895e` (Tasks 1-4 en un commit: contracts + policy +
  mediator + panel handle + wiring gated de `pageFilters`); slice 2 `18465c2` (InputRouter focus
  bridge + `frameVaultman`/`main.ts`/`vaultman:open`); slice 3 `0359780` (selection/projection ports
  files-tab + comandos select-visible/clear-selection). Gates por-worktree: focal verde por slice ·
  check 0/0 (slice 3: svelte-check directo tras un `pnpm run check` colgado) · build 0 · full unit con
  flakes worker autorizados por dev. Detalle: session-log 2026-07-06 (3 entries).
- **2026-07-08 (claude-fable-5, coordinador)** — review slice 3 contract-faithful → **FF
  `18465c2`→`0359780`** + docs restore `9a56172` (12 files huérfanos del reset, recuperados de
  `9db3d67`). **Task 5 (Coordinator Verification) COMPLETA @ `9a56172`: check 0/0 · unit 178
  files / 1303 tests (0 flakes) · build ✓ · diff-check ✓.** Live smoke omitido (tracer sin cambio
  de render; gates headless verdes). Tren P.D slice 1-3 CERRADO; push posterior autorizado
  (`origin/sandbox` = `03afccd`). Nota dev pendiente: juicio sobre los 2 comandos palette
  aditivos de slice 3.
- **2026-07-09 (claude-sonnet-pd4 subagente + claude-fable-5 coordinador)** — **slice 4 "route
  node reveal"** `a8e1567` (rebased → `c72381b`, FF a sandbox): router `reveal-node` puro
  (razones `missing-reveal-port`/`reveal-rejected`; projection port como señal de alcanzabilidad,
  contrato `revealNode: void` de slice 1 intacto) + `PanelExplorerImperativeApi.revealNode?`
  opcional (reusa camino `focusKeyboardId` + scroll-target existente) + puerto reveal gated
  files-tab en `pageFilters`. **Cero superficie user-facing** (sin hooks/comandos — cadena
  inerte hasta slice futura). Gates subagente: RED/GREEN focal 2f/14t · check 0/0 · build ✓ ·
  full-unit bonus en RED = 178f/1305t sin regresiones. Review coordinador PASS. **Open:** reveal
  superficial únicamente (sin auto-expand de ancestros — deep reveal = slice futura o
  `PanelExpansionPort`); decidir consumidor real de `reveal-node`. Gate integrado del
  coordinador: ver session-log 2026-07-09.

## Non-Goals

- Do not build WSA/free-canvas/Live Redesign in this slice.
- Do not introduce multi-tile layout editing yet.
- Do not retire existing page tabs or `frameVaultman` shell.
- Do not change visual layout, selectable views, queue behavior, or filters behavior.
- Do not implement `panelData`/`panelContent`; define their typed shape only.
- Do not run plugin-dev smokes from parallel workers unless the coordinator owns Obsidian for that window.
