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

## Non-Goals

- Do not build WSA/free-canvas/Live Redesign in this slice.
- Do not introduce multi-tile layout editing yet.
- Do not retire existing page tabs or `frameVaultman` shell.
- Do not change visual layout, selectable views, queue behavior, or filters behavior.
- Do not implement `panelData`/`panelContent`; define their typed shape only.
- Do not run plugin-dev smokes from parallel workers unless the coordinator owns Obsidian for that window.
