---
title: 0011 — Modular monolith with plugin-parity extraction seams
type: adr
status: active
parent: "[[docs/architecture/adr/README|adr]]"
created: 2026-06-03T10:33:47
updated: 2026-06-03T10:33:47
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/adr
  - explorer/architecture
---

# 0011 — Modular Monolith with Plugin-Parity Extraction Seams

**Decision status:** Accepted (resolved with dev via CR-1 grill). **Date:** 2026-06-03.
Source: [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/decisions/CR-1-core-vs-companion|CR-1 decision record]].

## Context

The 2026-06-03 product dump proposed splitting Vaultman into a thin core + separate "companion"
plugins (ThemeBuilder, LayoutBuilder, online-fetch, input-remap, operations) installable from a
catalog-scene. Tension: `vaultman-identity` states VM is **"not a general-purpose plugin manager"**
(plugin-provider scoped to interop with a few core plugins), and the **barebones preset** is already
defined as an in-plugin load/unload service UI. "Companion" conflated three different mechanisms:
(a) in-plugin load/unload module, (b) separate community plugin, (c) bridged third-party plugin.

## Decision

**Modular monolith.** All features ship **in one plugin now**; build them as **detachable modules**.

- **LUPA** (Load-Unload Plugins API) treats internal modules as *virtual plugins* — internal modules and
  external plugins share one load/unload path + UI (the barebones add-on-explorer).
- **Plugin-parity seam (enforced):** each detachable module = manifest `{id, vmApiVersion, capabilities,
  onLoad/onUnload}`; `onUnload` is `serviceUnload`-revertible (ADR 0004). Cross-module communication is
  **only** via VM's internal registry (SASI command/service index + provider/index registry + ActionNode
  index + WorkspaceMediator). **No deep imports across module lines**, enforced by an **eslint boundary
  rule** (`eslint-rules/`).
- **Core/module partition** — principle *workbench-moat + systems + scenesManager = core; presentation-
  builders + peripheral/IO = modules*:
  - **Core:** provider/index registry · render (projection/runtime/View) · explorer + filter/sort/group
    builder · operations/queue/VFS/diff + chunk-accept · WorkspaceMediator + InteractionPolicy · preset +
    serviceUnload + LUPA · PlatformAdapter + Fragility Registry · chameleon token layer · **scenesManager**.
  - **Modules (in-plugin now, extractable later):** ThemeBuilder · LayoutBuilder · input-remap ·
    online-fetch (**OFF by default**) · git-addon · devtools-layer · richer scene-packs.
- **online-fetch OFF by default** → shipped core makes **zero network calls** (local-first / store-trust);
  #1 hybrid-extraction candidate; gated by S-17.
- **Operations stays core** (it is the mass-action moat per identity) — `vm_operations`-as-companion rejected.
- **MD-F3 deferred** (intercept store plugins / VM installs its own companions) — keeps identity's
  "not a plugin manager" true; revisit only if ever going all-separate.

## Consequences

- Extraction to separate plugins later is cheap because the seam is enforced from day 1 (the cost is
  module discipline now).
- The internal registry built now **= the public API later** (S-15/S-16): keep S-16 internal-first; expose
  publicly after the spine stabilizes.
- `scenesManager` (core) ↔ LayoutBuilder interaction introduces a thumbnail perf invariant
  (on-demand/cached, decoupled from the redesign_mode edit loop) — see operational-watch-list §7.
- One bundle grows; module boundaries must be policed (eslint) or "detachable" erodes.

## Alternatives considered

- **All separate plugins now:** N store submissions, N version streams, premature public-API freeze,
  contradicts identity.
- **Loose/pragmatic boundaries:** faster now, but detachability rots → extraction becomes a big refactor.
- **Fatter core (builders always in core):** builders guaranteed present, but more bundle bloat + less seam
  discipline.
