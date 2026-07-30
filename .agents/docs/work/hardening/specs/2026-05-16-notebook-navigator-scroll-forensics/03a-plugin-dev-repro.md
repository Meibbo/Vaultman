---
title: Plugin Dev Repro
type: spec-shard
status: active
parent: "[[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/03-repro-and-acceptance|Repro And Acceptance Criteria]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/spec
  - explorer/performance
  - plugin-dev
---

# Plugin Dev Repro

## Required Repro: Repeated Jump Burst With Blank Detection

The current perfProbe scenarios are single-action final-state probes. The bug is reported after many jumps. The live repro must model a burst.

Required sequence:

1. Load Explorer in plugin-dev with 50k visible rows.
2. Ensure the target scroller is visible and has non-zero width/height.
3. Record initial visible row count and first/last visible row labels.
4. Execute a deterministic burst of large jumps:
   - top;
   - 50%;
   - bottom;
   - 25%;
   - 75%;
   - repeat at least 100 times, preferably 1,000 for the stress run.
5. After each jump, observe the next animation frame and the next timeout tick.
6. Record:
   - visible row count;
   - blank frame count;
   - max blank duration;
   - max event-loop delay;
   - max time until first visible row after a jump;
   - rendered row count;
   - scrollTop;
   - total scrollHeight;
   - current view mode.

Blank means:

- row count is zero while dataset count is non-zero and scroller rect is visible;
- or row text content is absent for the virtual viewport while skeleton/loading is not expected;
- or `getVirtualItems()`/fallback returns rows but DOM row text is not painted.

## Required Live Commands

Build and reload:

```powershell
pnpm run build
obsidian plugin:reload id=vaultman vault=plugin-dev
obsidian dev:errors vault=plugin-dev
```

Unit/component suite after implementation:

```powershell
pnpm check
pnpm exec vitest run --project unit test/unit/performance/explorerNotebookNavigatorComparison.test.ts
pnpm exec vitest run --project unit test/unit/services/serviceScroll.test.ts
pnpm exec vitest run --project component test/component/viewTreeScrollFallback.test.ts
```

The final suite must include new tests for cards/grid/table fallbacks and the plugin-dev burst-scroll probe. The exact test filenames should be chosen during implementation, but they must be named clearly enough that future agents do not mistake a pure CPU bridge for the live scroll acceptance test.

## Notebook Navigator Comparison Standard

Do not accept "Vaultman is faster" from one median CPU bridge alone.

Acceptance requires both:

- Vaultman does no more work than NN on comparable scroll math/build paths; and
- Vaultman has no visible blank window under the live plugin-dev burst-scroll repro.

The bridge should keep importing NN source where useful:

- `buildListItems`;
- `buildFilePathToIndexMap`;
- `flattenFolderTree`;
- `listPaneMeasurements` invariants if we add equivalent measurement contracts.

But the bridge must not pretend to test what it does not mount. Its label should say builder/math bridge, not final scroll parity.

