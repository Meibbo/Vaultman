---
title: CR-1 resolution — core vs companion (modular monolith)
type: decision-record
status: resolved-pending-adr
parent: "[[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/index|onenote companion megadump]]"
created: 2026-06-03T10:33:47
updated: 2026-06-03T10:33:47
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/decisions
  - initiative/draft
glossary_candidates:
  - module-contract
  - detachable-module
  - scenesManagerScene
  - editorScene
  - fileScene
---

# CR-1 — Core vs Companion (resolved by grill 2026-06-03)

Decision: **modular monolith with plugin-parity extraction seams.** Resolved with dev over Q1–Q3.
Pending: dev approval to promote to an ADR + canonical glossary.

## Q1 — mechanism (LOCKED)

**All-in-plugin now**, architected **detachable**. Validate everything works as one bundle first.
**LUPA** (Load-Unload Plugins API) treats internal modules as *virtual plugins* — same load/unload path
as external plugins. → derived: **MD-F3 (intercept store plugins / VM installs its own companions) is
DEFERRED**, keeping `vaultman-identity`'s "not a general-purpose plugin manager" true. Revisit only if
ever going all-separate.

## Q2 — module seam (LOCKED)

**Plugin-parity contract + eslint boundary enforcement:**
1. Each detachable module = mini-manifest `{id, vmApiVersion, capabilities, onLoad/onUnload}`; `onUnload`
   is `serviceUnload`-revertible (ADR 0004 pattern).
2. Cross-module comms **only** via VM's internal registry (SASI command/service index + provider/index
   registry + ActionNode index + WorkspaceMediator). **No deep imports across module lines.**
3. LUPA enumerates internal modules + external plugins **uniformly** → one load/unload UI = the barebones
   add-on-explorer (already in `glossary`).
4. Enforced by an **eslint boundary rule** (repo already has `eslint-rules/`).
- Consequence: the internal registry/contract built now **= the public API later** (S-15/S-16). Keep
  S-16's internal-first sequencing; expose publicly after the spine stabilizes.

## Q3 — core/module partition (LOCKED)

Principle: **data-workbench moat + systems + scenesManager = core; presentation-builders + peripheral/IO
= detachable modules.**

| CORE (always loaded) | MODULE (in-plugin now, LUPA-toggleable, extractable later) |
|---|---|
| provider + index registry; render (projection/runtime/View) | ThemeBuilder (token/snippet authoring; unocss/bits-ui/daisyui) |
| explorer + filter/sort/group builder (moat) | LayoutBuilder (visual spatial editor) |
| operations/queue/VFS/diff + chunk-accept (moat) | input-remap (InputBinding UI) |
| WorkspaceMediator + InteractionPolicy | online-fetch (remote providers/network) — **OFF by default** |
| preset + serviceUnload + LUPA (the toggle system) | git-addon · devtools-layer · richer scene-packs |
| PlatformAdapter + Fragility Registry; chameleon token layer | |
| **scenesManager** (visibility manager) | |

Derived locks:
- **Operations stays CORE** — MD-F5 `vm_operations`-as-companion **REJECTED** (it's the moat per identity).
- **online-fetch OFF by default** → shipped core makes **zero network calls** = local-first / store-trust
  (satisfies MD-F6 without a separate plugin yet); #1 extraction candidate for hybrid; gated by **S-17**.
- Systems stay core, their **builders** split: token-layer=core / ThemeBuilder=module; layout-system=core /
  LayoutBuilder=module.

## scenesManager refinement (refines S-24)

`scenesManagerScene` = **core** SceneProvider. Nodes = all scenes (with identity) + the modules composing
them. Under native/core preset, the chameleon-wrapped Obsidian surfaces appear as active scenes:
**editorScene** (live-preview, main-leaf `page`), **fileScene** + other core-plugins-as-scenes (sidebar
`page`s), **ribbon**, **statusbar**. Manages **visibility (show/hide) WITHOUT unloading** — distinct from
LUPA (unload) and LayoutBuilder (spatial arrange). S-24 should be updated: ScenesManager is core + its own
lever, not merely LayoutBuilder-family.

### scenesManager ↔ LayoutBuilder interaction (2026-06-03 dev clarification)

They interact: scenesManager's explorer renders each scene/surface node with (a) an **action-cell** — a
Cell whose role is action, bound to an ActionNode (the visibility toggle on/off; the "badge / primitive
with a bound action" the dev referenced — canonical term proposed: `action-cell`), and (b) a **cell_media
thumbnail** = referential preview of the scene/surface. Editing a scene via **redesign_mode** (LayoutBuilder)
updates that scene's thumbnail in scenesManager.

**Perf invariant** (→ operational-watch-list §7): live redesign editing + live thumbnail regeneration of
surfaces+scenes-as-Figma-primitives = perf nightmare. Mitigation: **decouple** the edit loop from thumbnail
refresh; thumbnails are **on-demand / lazy** (only when scenesManager visible + in viewport), **debounced**,
**cached** (device-local, regenerable). Reuse the SHARED render-runtime (ADR 0008); never regenerate per
redesign frame; never regress the zero-blank-frame guarantee. Needs its own design pass (ThumbnailProvider).

## Open / next

- **ADR written: [[docs/architecture/adr/0011-modular-monolith-extraction-seams|ADR 0011]]** (Accepted
  2026-06-03). 0010 left RESERVED for Storage tiering (S-5). Glossary + S-24 + watch-list §7 updated.
- **Follow-up specs**: ThumbnailProvider (scenesManager perf); module-manifest + eslint boundary rule
  (logic-extraction wave); online-fetch module gating (S-17).
- Ties: S-15, S-16, S-17, S-24, ADR 0004, `vaultman-identity`, glossary barebones-preset.
- Still open in CR cluster (not part of CR-1): CR-2 `.scene`/`.vmscene` format (S-7 + new SCENE readme),
  CR-6 html/md direction, CR-3 node-identity-css.
