---
title: Wave 2 test and performance gates
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-11T19:31:39
updated: 2026-05-11T19:31:39
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
  - testing
  - performance
created_by: codex
updated_by: codex
---

# Wave 2 Test And Performance Gates

## Evidence Read

- Docs: current status, current handoff, engineering context, Wave 2 task breakdown, and Explorer data-plane transition PRD.
- Tooling: `package.json`, `vitest.config.ts`, `wdio.conf.mts`, `src/dev/perfProbe.ts`, `src/services/perfMeter.ts`, `test/unit/dev/perfProbe.test.ts`, and `test/unit/services/perfMeter.test.ts`.
- Inventoried but not fully read in this pass: requested service, utility, component, integration, stress, and CodeQL tests.

## Existing Commands

From `package.json` and local test configuration:

- `pnpm run test:unit`
- `pnpm run test:component`
- `pnpm run test:integrity`
- `pnpm run test:e2e`
- `pnpm run test:cover`
- `pnpm run lint:full`
- `pnpm run check`
- `pnpm run build:plugin`
- `pnpm run verify`

`vitest.config.ts` defines separate `unit`, `component`, and `integration` projects. Unit tests run in Node. Component tests run in jsdom with the Svelte plugin. Integration tests use the Obsidian integration setup, serialize file parallelism, and use a longer timeout. `wdio.conf.mts` targets `test/e2e/**/*.e2e.ts` with `wdio-obsidian-service` and the e2e vault.

## Existing Coverage Strengths

- `serviceViews.test.ts` covers view modes, semantic row layers, selection, cache hit/miss/eviction probe counters, queue badges, active filters, property/tag/file projections, model build, and selection metrics.
- `serviceSelection.test.ts` covers pointer, keyboard, range, box selection, focus/active/hover separation, pruning, immutable snapshots, and timed single-id paths.
- `serviceVirtualizer.test.ts` covers tree flattening, expansion, window overscan, and range clamping.
- `utilBadgeBubbling.test.ts` covers hidden descendant badge bubbling, duplicate collapse, and reference reuse.
- `panelExplorer*.test.ts` covers selection adapter behavior across tree, grid, table, and cards, provider action routing, empty states, badge collisions, refresh isolation, keyboard expansion/page movement, and probe metrics.
- `viewTree*.test.ts` covers selection gestures, chevron isolation, badges, decorations, hover badges, scroll fallback, and adopted nodes.
- `perfProbe.ts` and `perfMeter.ts` have pure tests around counters, timings, DOM scenarios, sync/async timing, marks, subscribers, and failure-safe emission.

## Missing Gates

- Versioned snapshot contract tests for stable ids, `id -> row`, `id -> index`, path/domain-key lookup maps, and source/projection revisions.
- Structural-versus-decorative invalidation tests proving queue/filter-only changes do not rebuild source structure.
- Files tree data-plane snapshot tests before `ViewService` and before Svelte component mounting.
- Batch `ViewService` parity tests proving one snapshot/layer build equals current per-node behavior.
- Reveal-by-id revision tests proving stale indexes are rejected and lookup is late-bound to the newest row map.
- Cross-surface overlay consistency tests for Files, Tags, and Props using the same `ViewLayers` vocabulary.

## Performance Gates

The next implementation specs should add explicit counters/timings for:

- snapshot creation;
- provider tree reads;
- flattening and visible-row projection;
- badge bubbling and inherited-layer projection;
- `ViewService` layer batching;
- lookup-map creation;
- reveal id-to-index lookup;
- total panel refresh cost.

Use existing perf probe scenarios as baselines: filters search, tree scroll, filter select, and operation badges. Add a scenario for repeated queue/active-filter changes while row structure remains stable.

## Live Smoke Boundary

Runtime smokes must target `plugin-dev` explicitly:

```powershell
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev dev:errors
```

Do not rely on the focused vault or the repository vault `vaultman` for live smoke work unless the user explicitly asks.

