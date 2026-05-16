---
title: Orchestration And Test Gaps
type: spec-shard
status: active
parent: "[[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/02-vaultman-gap-analysis|Vaultman Gap Analysis]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/spec
  - explorer/performance
  - vaultman
---

# Orchestration And Test Gaps

## Gap 6: Scroll Intents Are Not Centralized Like NN

Vaultman has targeted one-shot guards such as consumed scroll target serials,
and some direct `scrollToIndex(... behavior: 'auto')` calls. That is an
improvement over repeated reactive scrolls, but it is not Notebook Navigator's
full model.

Missing or incomplete compared with NN:

- central pending-scroll queue per surface;
- typed scroll reasons/intents;
- priority/coalescing;
- explicit index/revision gate;
- late target resolution after the current projection/rebuild version;
- stale pending rejection when selected target changes.

Vaultman has pieces of this in `serviceExplorerScrollGeometry` and projection
revision data, but the view components still perform local direct effects.

Required change:

- introduce one Explorer scroll coordinator contract used by tree/list/table/
  grid/cards;
- requests carry target id/path, reason, align, and minimum projection revision;
- execution happens only after the view has non-zero viewport rect and the
  projection/revision is current;
- lower priority pending scrolls are replaced by newer/higher priority ones.

## Gap 7: Current UI Suppression Is Broader Than NN

Recent Vaultman changes hide icons/badges/actions while scrolling:

- `viewTree.svelte` hides direct badges, child badges, hover badges, and row
  icons.
- `ViewNodeList.svelte` hides row icon, badges, and actions.

Notebook Navigator suppresses hover/quick action churn while scrolling. It does
not suppress core row content or row identity. Hiding non-essential adornments
may reduce work, but it is not the main NN trick and can make a starvation window
look worse if text/content paint is delayed elsewhere.

Required change:

- keep labels/text always paintable;
- suppress hover/action panels first;
- defer expensive icon/media hydration through memo/cache, not by making rows
  visually empty.

## Gap 8: Media Cache Semantics Are Not NN-Equivalent Yet

Notebook Navigator separates:

- synchronous row-height metadata in memory;
- preview text LRU;
- feature image blob LRU;
- async object URL creation after row mount.

Vaultman has media descriptor/cache work (`serviceExplorerMediaCache` and
synthetic media descriptors), but the scroll acceptance test currently does not
prove that:

- media metadata is available synchronously for row sizing;
- blob/image loading never blocks first text paint;
- visible rows can paint without media;
- repeated jumps with media descriptors stay bounded.

Required change:

- define the Explorer media row contract explicitly:
  - metadata can affect reserved size;
  - blob/content load cannot block row text;
  - unloaded media displays a stable placeholder;
  - image/GIF load may update content but must not trigger full-list remeasure.
- add tests for hidden media cost and visible media subscribe cost that include
  repeated scroll jumps, not only descriptor build timing.

## Gap 9: Existing NN Bridge Test Is Too Abstract

`test/unit/performance/explorerNotebookNavigatorComparison.test.ts` imports
Notebook Navigator builders and compares:

- list builder timing;
- tree builder timing;
- map lookup timing;
- a synthetic direct fixed-height scroll bridge.

This is useful but not sufficient for the live bug:

- it does not mount the Svelte Explorer views;
- it does not observe whether the viewport becomes blank;
- it does not run in Obsidian/plugin-dev;
- it models fixed-height fallback math, not cards/grid/table variable-height
  fallbacks;
- it repeats jumps in a tight CPU loop, not through actual scroll events and DOM
  paint;
- it does not assert long-frame thresholds after every jump.

The prior perfProbe bug also matters: the earlier `waitFrames()` style could
underreport by racing `requestAnimationFrame` with a timeout. The current
`setTimeout(0)` loop is better for event-loop delay, but the live scenario still
needs viewport content assertions.

Required change:

- keep the unit bridge, but treat it as a math/build benchmark only;
- add a plugin-dev DOM probe for repeated jump bursts and blank-frame detection;
- compare against NN's invariants, not just median CPU time.

## Ranked Root-Cause Hypotheses For The Current Blank Window

1. High probability: one or more fallback paths renders too much or scans too
   much after repeated jumps, starving Svelte/TanStack updates.
2. High probability: repeated scroll events execute intermediate work rather
   than coalescing to the final intent.
3. Medium probability: current scroll-time suppression hides enough row
   adornment to amplify blank perception while row text is delayed elsewhere.
4. Medium probability: live plugin-dev still has a measurement blind spot.
5. Lower probability but must test: Obsidian itself was left busy by a prior
   long eval run; plugin-dev should be restarted before final timings.

## Implementation Direction Implied By The Gaps

1. Add the plugin-dev burst-scroll blank detector first.
2. Make all fallbacks bounded.
3. Add shared variable-height offset indexing for cards/grid/table.
4. Add centralized scroll intent queue/revision gate.
5. Restore or narrow scroll-time suppression so row identity is always visible.
6. Re-run live plugin-dev and unit bridge comparison before accepting.

