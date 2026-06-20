---
name: vm-explorer-virtualization
description: Use when working on Vaultman explorer scroll performance, row virtualization, blank frames or scroll jank, TanStack Virtual (@tanstack/svelte-virtual), variable-height rows, pretext text measurement, the shared render-runtime (V.D), or any view (tree/list/table/grid/cards) rendering. Reference skill; full detail lives in the linked research docs.
---

# VM Explorer Virtualization

## Overview

Vaultman virtualizes explorer rows with `@tanstack/svelte-virtual` (DEFAULT; `virtua` only behind a
harness). The 1.1.0 beta.1 release was abandoned for terrible virtualization perf — **never trust the
virtualizer blindly**. The virtualizer mounts only the visible window (~30–60 rows), so the perf lever is
list orchestration, not the per-row framework.

## When to use

- Explorer scroll jank, blank windows on jumps, FPS drops, event-loop spikes.
- Adding/changing a view engine (tree/list/table/grid/cards) or the shared render-runtime (V.D).
- Variable-height rows, row measurement, `pretext` text sizing.

## Core rules (DO / DON'T)

- DO use the Fenwick geometry (`serviceExplorerScrollGeometry.ts`) for variable heights — O(log n), never O(n) scans.
- DO size overscan to the viewport (`ceil(viewportH / estimateSize)`), not a magic constant.
- DO feed `estimateSize` from `pretext` (`serviceTextMeasure.ts`) for a close first frame; defer/batch `measureElement`.
- DO wrap `setOptions` in `untrack()` inside `$effect` (else infinite loop); key `{#each}` by stable row id.
- DON'T trust a perf claim without the **blank-frame burst detector** (`src/dev/perfProbe.ts`): assert
  `blankFrameCount===0 && blankWindowOver100ms===0 && (!strict || flickerFrameCount===0)`.
- DON'T re-implement the virtualizer per view — one shared layout service owns geometry/fallback/measurement.

## Reference (full detail — read before changing render code)

- [[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/01-tanstack-virtual|TanStack Virtual deep dive]] (mechanics, failure modes, shared-runtime orchestration, API).
- [[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/02-pretext-and-render-tag|pretext measurement]] (+ theme-change cache invalidation gotcha).
- [[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index|multiview virtualization]] (prior decision: shared layout service + blank-frame gate).

## Status

Reference skill (2026-06-15). NOT yet retrieval-tested with subagents — verify discovery/application before relying in CI-gated work.
</content>
