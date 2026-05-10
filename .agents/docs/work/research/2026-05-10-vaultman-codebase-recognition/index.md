---
title: Vaultman Codebase Recognition - Index
type: research-index
status: active
created: 2026-05-10
tags:
  - research/sharding
  - architecture/recognition
---

# Vaultman Codebase Recognition

This folder contains the vertical recognition specs for the current Vaultman codebase. These specs map the "transversal" logic across modules to facilitate multi-threaded implementation planning (sharding) for the shadcn-svelte/Tailwind transition.

## Shards

1. [[01-styling-engine|Shard 1: Styling Engine & Primitives]]
   - ITCSS structure, SCSS variables, and manual Svelte primitives.
2. [[02-data-grid-virtualization|Shard 2: Data Grid & Virtualization]]
   - TanStack Table/Virtual integration, row height logic, and provider-to-view adapters.
3. [[03-overlays-portals|Shard 3: Overlays, Modals & Portals]]
   - Island services, floating UI logic, and Obsidian workspace leaf integration.
4. [[04-interaction-gestures|Shard 4: Interaction, Mouse & Commands]]
   - `serviceMouse`, keyboard logic, and command registration.
5. [[05-state-reactivity|Shard 5: State & Reactivity (Svelte 5)]]
   - Runes usage, cross-service reactivity, and performance metering.

## Goal
To provide a non-poor, technically exhaustive view of the current state, including code snippets, to inform the implementation plan for the upcoming UI modernization.
