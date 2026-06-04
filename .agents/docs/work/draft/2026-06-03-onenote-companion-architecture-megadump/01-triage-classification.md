---
title: Megadump triage + classification
type: backlog-intake-shard
status: active
parent: "[[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/index|onenote companion megadump]]"
created: 2026-06-03T10:33:47
updated: 2026-06-03T10:33:47
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/backlog
  - initiative/draft
---

# Megadump Triage + Classification

~50 atomic items extracted from the verbatim dump (parts 1–2). IDs = `MD-<bucket><n>`.
No item is decided here — this is comprehension + routing only.

**Type**: FEAT feature · DEC decision/fork · RES research · Q confirm · META process · ID identity.
**Target artifact**: SPEC · ADR · S-NN pending-decision · R-NN research · GRILL · DEFER · DOC.

## A. Theme / style engine + theme builder
- **MD-A1** onenote-parity: draw-over-text + xlsx editor = Grid-mode table + spreadsheet add-on; avoid proprietary onenote format. — FEAT → SPEC. Ties Grid view, editorScene.
- **MD-A2** how callout-manager plugin works. — RES → R-CALLOUT.
- **MD-A3** how style-settings parses CSS + theme folders to detect patterns → feed theme-scene snippet/theme providers. — RES → R-STYLESET. Ties style-source-reconciliation.
- **MD-A4** sharded-docs research unocss + bits-ui + daisyui → full theme builder. — RES/DEC → R-LIBS (decision-gated).
- **MD-A5** style engine as companion ("myspace") that validates+renders VM CSS vars in live-preview/reading-mode; VM keeps builder controls. — DEC → GRILL (core/companion fork).
- **MD-A6** html↔markdown converter so HTML codeblocks use bits-ui/daisyui; user writes md, transforms to html for components. — DEC/RES → GRILL + R-OBSIDIAN-RENDER.

## B. Node geometry
- **MD-B1** each node own size/position/rotation → coordinate system. — DEC → GRILL. Ties S-26 NodeOccurrence, explorer-model.
- **MD-B2** css-class-per-node-id / per-NodeIdentity; index rebuild → loss; manage class when identity changes. — DEC → GRILL (conflict, see CR-3). Ties S-26.

## C. Branch / version strategy
- **MD-C1** rename `sandbox` → `dev`; creative work starts from there. — DEC → GRILL (conflict CR-7 w/ version-streams). Ties version-streams, publish.
- **MD-C2** what defines manifest minAppVersion? today arbitrary. options: eslint/stylelint vs manual obsidian-changelog tracking (monkeypatch risk). — RES/DEC → R-MINVER. Ties tooling-libraries, operational-watch-list.
- **MD-C3** stable feature-update path: forward layer-extraction/reconstruction or commit-recovery (css→scss already done) vs reverse downgrade-from-beta mega-refactor. — DEC → GRILL. Ties publish.

## D. Redesign / canvas / layout
- **MD-D1** "Redesign mode": live layout edit (reorder/resize, workspace-as-canvas). — FEAT → SPEC. Ties Layout Design API, Live Redesign.
- **MD-D2** canvas (entire leaves) pan/zoom/rotation; Concepts-app extraction. — FEAT+RES → R-CANVAS-REF.
- **MD-D3** is krita open source? layer concept as reference. — RES → R-KRITA.
- **MD-D4** vm-layout_editor: figma-style persistent visual element editor via devtools element-picker + VM API; modes. — FEAT → SPEC (companion candidate).

## E. devtools layer
- **MD-E1** devtools layer: perf meter; electron devtools rendered in any surface; persistent visual edit; modes. — FEAT → SPEC.
- **MD-E2** bundle/bridge useful obsidian devtools plugins into VM (bridges, keep credit). — DEC/FEAT → GRILL (bridge pattern, see CR-1/F2).

## F. Core-vs-companion / bridge architecture (FOUNDATIONAL FORK)
- **MD-F1** VM = framework/logic w/ native preset; theme presets (bits-ui/daisyui/unocss) = companion plugins. — DEC → GRILL (CR-1).
- **MD-F2** VM as "bridge": plugins expose actions to VM API index; other plugins call instead of recreating; user binds as action_node/input_binding. — DEC/FEAT → ADR candidate. Ties SASI.
- **MD-F3** plugins-provider intercepts STORE plugins (not installed) → VM mega-plugin installs own companions fed by VM APIs. — DEC → GRILL (CR-1).
- **MD-F4** move opinionated pieces out of core: layout-builder as companion `vm_layoutbuilder` from catalog-scene, toggle via serviceUnload/plugins-scene. — DEC → GRILL (CR-1).
- **MD-F5** companions: `vm_input-remap`, `vm_operations` (queue+vfs+view-diff); presets NOT companions — prefer exported json/yaml/html/xml. — DEC → GRILL (CR-1, CR-2).
- **MD-F6** remove ALL internet-fetch from core → companion `vm-online_fetch` (media cells, url cell values, youtube/spotify providers). core = 100% local. — DEC → GRILL (CR-1, security win).
- **MD-F7** .scene stores which providers/online-sources to call; needs vm-online_fetch to load; vm-layout_editor restyles e.g. youtube_scene; save style+index-cache into youtube.scene. — DEC → GRILL (CR-2). Ties .scene format.

## G. .scene / .preset file format (FORK)
- **MD-G1** .scene = JSON+HTML, svelte-inspired; bundles SPS+LUPA data, multi-md notes, custom HTML+CSS (UCV); no inline script, imports only; share like .base. — DEC/DESIGN → GRILL (CR-2) → SPEC.
- **MD-G2** rename .scene → .preset? built like svelte file w/o precompiler. — DEC → GRILL (CR-2).
- **MD-G3** deep research how obsidian really works (live-preview/render md→html); mirror it, or reverse html→md realtime. — RES → R-OBSIDIAN-RENDER.
- **MD-G4** pseudo-cells (filled by provider/index, not physical) e.g. "is-companion" badge. — FEAT → SPEC.
- **MD-G5** combined format xhtml (html+xml) or yaml+json → whole scene-abstraction system across obsidian+VM. — DEC/RES → GRILL (CR-2).
- **MD-G6** SCENE detail (readme): deps from VM-Modules API or html imports; multi-note frontmatter; no inline script. — DESIGN → folds into MD-G1.

## H. scenesManagerScene + surfaces
- **MD-H1** scenesManagerScene: explorer of all scenes incl. obsidian-native core scenes/leafs as providers (needs DOM + app.js/.css excavation via cli + web-lab); works w/ serviceUnload + layout-builder. — FEAT+RES → R-NATIVE-SURFACES + SPEC.
- **MD-H2** confirm: action-routing (attach actions to inputs + config) + mediator (action-node in scene A alters scene B config) — correct? — Q → answer inline. Ties A.R, mediator.
- **MD-H3** surfaces experiment: right-click empty sidebar → convert tabs to scene w/ pagination/page → mount as floating window → action returns to sidebar; monkeypatch sidebar-leaf → controlled surface; surface-kind conversion. — FEAT → SPEC. Ties explorer-model surfaces.

## I. serviceUnload deep
- **MD-I1** serviceUnload can unload internal obsidian (app.js/app.css); unload all but active editor → obsidian as light as notepad (like native restricted-mode). — FEAT → SPEC. Ties serviceUnload, LUPA, operational-watch-list.

## J. Actions / rules
- **MD-J1** create-action: index a custom action based on a file. — FEAT → SPEC. Ties SASI.
- **MD-J2** auto-move-node from rules (auto-note-mover takeover). — FEAT → SPEC.

## K. Docs / privacy meta
- **MD-K1** remove ALL AI traces + non-`doc/` docs from ALL branches (sensitive/private); only public docs = what dev chooses. — DEC/META → GRILL (CR-8). Ties branch-policy, AI-file guard.

## L. Identity / README (product framing)
- **MD-L1** description tagline: "Ready-to-use bundled framework that flows seamlessly with your themes/snippets/plugins." — ID → DOC. Ties vaultman-identity.
- **MD-L2** Layout Design API pillars: Workspace Surface Abstraction; UCV (UI components + presetWind4 vars); Live Redesign; paginate/layers/pan/zoom/rotate + Excalidraw add-on. — ID → DOC/SPEC.
- **MD-L3** Modular config: SPS (saving presets + queued batcher); LUPA (debloat, component choice, compat score); NIB (kbd/mouse/touch binding); SCENE files. — ID → DOC.
- **MD-L4** System Modules Library: SASI (public facade, NIB buttons/rules, own provider); Node-Notes Explorers (data/metadata/intercepted/fetched, views, sort); Storage (rw, batch queue, GIT add-on). — ID → DOC.

## M. Excalidraw
- **MD-M1** use excalidraw plugin as library for editorScene drawing-mode + backmatter layerScene to hide excalidraw code; any .md → excalidraw. — FEAT/RES → R-EXCALIDRAW + SPEC. Ties MD-A1/D1.

## N. Misc features
- **MD-N1** cell_path in active-node FORM (noteScene) to change file storage path; warn if path outside vault. — FEAT → SPEC.
- **MD-N2** real file metadata rw; reveal hidden files/folders; open any device path w/o leaving vault (admin/root; maybe paid external app). — FEAT → GRILL (scope/security).
- **MD-N3** left/right mousepad scroll = back/forth page (input_binding). — FEAT → SPEC. Ties NIB.
- **MD-N4** noteScene for outline/frontmatter/backlinks/outgoing-links. — FEAT → SPEC.
- **MD-N5** n8n / ComfyUI / Scrap action-binding workflow. — FEAT → DEFER.
- **MD-N6** execute python & js scripts w/ UI-library API + runtime selector. — FEAT → GRILL (security). Ties no-inline-script policy.

## O. Git add-on
- **MD-O1** git add-on: file version comparison + line history. — FEAT → SPEC. Ties Storage GIT add-on.

## P. Process / meta
- **MD-P1** Polished proto-design = preset "Polished"; translation needs strong abstraction/granularity due to SPS + LUPA. — META → ties proto-integration grill.
- **MD-P2** apply templates into selected files. — FEAT → SPEC.
- **MD-P3** PKM-AI: verify interconnectivity + mind-routing BEFORE product pre-brainstorm/decisions. — META → SEQUENCING GATE (dev-stated order). Ties S-31 memory-routing.
- **MD-P4** docs cleanup+archive round so superseded info loses working-memory weight; improve memory-orchestration discipline. — META → ties docs health/archive.
- **MD-P5** list of all plugins replaceable by installing VM. — DOC → ties identity, MD-J2/F1.
- **MD-P6** import dataview text syntax to VM. — FEAT → SPEC.

## Addendum 2026-06-03 #2 (second chunk + grill refinements)

Second dump chunk ([[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/04-intake-verbatim-part-3|04 verbatim]]) + CR-1 grill outcomes.

- **MD-L5** "symbiont plugin" identity framing — overhaul of Obsidian UI/UX; "common ground where all community plugins converge / a plan to connect them all"; "one UI that morphs to any preset with one file + one click"; enabled by the app.js/app.css publication for obsidian-web-lab. — ID/marketing → DOC. Ties vaultman-identity, MD-F2 bridge.
- **Term expansions** (wanted for official docs → glossary candidates): UCV = UI Components + presetWind4 Variables; SPS = Saving Presets System; LUPA = Load-Unload Plugins API; NIB = Node/Input Binding; SASI = Services/Commands/Scripts Indexing; "Layout Design API" = Workspace Surface Abstraction + UCV + Live Redesign + paginate/layers/pan/zoom/rotate. — DOC/glossary.
- **MD-H1 refinement** scenesManager = CORE SceneProvider (Q3): nodes = scenes (incl. native-as-chameleon editorScene/fileScene/ribbon/statusbar) + composing modules; visibility manager (show/hide ≠ LUPA unload ≠ LayoutBuilder arrange). Refines S-24.
- **SCENE readme detail** (re-raised → CR-2): opinionated HTML + YAML/JSON, svelte-inspired; deps via VM-Modules API or html import declarations; multi-note frontmatter; no inline script (imports only); share like `.base`. Folds into MD-G1/G6; conflicts S-7 `.vmscene` YAML.
- **CR-1 RESOLVED** → [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/decisions/CR-1-core-vs-companion|CR-1 decision record]].
