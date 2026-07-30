---
title: Multiview virtualization research
type: research-index
status: active
parent: "[[docs/work/hardening/index|Hardening]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/research
  - explorer/performance
  - explorer/virtualization
  - explorer/views
created_by: codex
updated_by: codex
---

# Multiview Virtualization Research

This research extends the Notebook Navigator scroll forensics with a broader survey of libraries, applications, browser limits, and rendering patterns for large multi-view node explorers. The target is stricter than Notebook Navigator: Vaultman must support list, tree, table, grid, and cards, with future media-rich nodes, without blank windows during repeated large jumps.

## Executive Answer

Notebook Navigator is a strong baseline, but not the ceiling. The best path is not to copy it literally or swap one virtualizer for another. The stronger target is:

1. keep the current TanStack Virtual direction for DOM linear views;
2. add a shared virtual layout service that owns fixed-height math, variable-height prefix/Fenwick offsets, lanes, range fallback, and total size policy;
3. add a plugin-dev burst-scroll blank-frame detector before accepting any performance claim;
4. prototype `virtua` against the same detector as a candidate adapter, not as an unmeasured replacement;
5. reserve canvas/data-grid renderers for a future dense table view only, not for the Explorer-wide node UI.

The immediate bug should still be attacked through the existing forensics acceptance matrix: no zero-row visible window, no all-row fallback, no scroll-time O(total rows) offset scans, and no media decode dependency before row text paint.

## Shards

1. [[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/01-library-and-app-survey|Library and app survey]]
2. [[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/02-patterns-better-than-nn|Patterns better than Notebook Navigator]]
3. [[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/03-vaultman-recommendation|Vaultman recommendation]]

## Relationship To Existing Records

- Builds on [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/index|Notebook Navigator scroll forensics]].
- Confirms and sharpens the 2026-05-14 data-plane conclusion:
  [[docs/work/hardening/research/2026-05-14-explorer-data-plane-scroll-research|Explorer data-plane and jump-scroll research]].
- Does not replace the next implementation order. The next code pass still starts with the live `plugin-dev` burst-scroll detector.

## Decision Summary

TanStack Virtual remains the conservative engine because Vaultman already uses Svelte, needs headless control, and must share view contracts across several DOM layouts. `virtua` is the only surveyed drop-in-style candidate worth a focused spike for Svelte. React Virtuoso, AG Grid, MUI Data Grid, Glide Data Grid, VS Code, CodeMirror, and RecyclerListView are more valuable as pattern sources than as direct Explorer replacements.

The ceiling above Notebook Navigator is a Vaultman-owned layout/index layer:
browser-pixel-limit aware, media-budgeted, coalesced by scroll intent, and tested live under repeated large jumps.
