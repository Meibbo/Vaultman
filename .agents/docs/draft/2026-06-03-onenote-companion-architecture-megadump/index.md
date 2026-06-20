---
title: OneNote / companion-architecture megadump
type: backlog-intake
status: active
parent: "[[docs/work/draft/index|draft]]"
created: 2026-06-03T10:33:47
updated: 2026-06-03T10:33:47
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/backlog
  - initiative/draft
glossary_candidates:
  - companion-plugin
  - bridge-plugin
  - scene-file
  - vm-online_fetch
  - vm-layout_editor
  - scenesManagerScene
  - Live-Redesign-mode
---

# OneNote / Companion-Architecture Megadump

Dev product dump, 2026-06-03. Captured lossless, triaged, NOT decided. This is a
`work/draft` intake; promote to initiative only after the dev grills the forks below.

## Shards

- [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/01-triage-classification|01 — triage + classification]] (~50 items, IDs MD-A1..MD-P6).
- [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/02-intake-verbatim-part-1|02 — verbatim part 1]] (lossless).
- [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/03-intake-verbatim-part-2|03 — verbatim part 2]] (lossless).
- [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/04-intake-verbatim-part-3|04 — verbatim part 3]] (second chunk: symbiont + acronyms + SCENE readme).
- [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/decisions/CR-1-core-vs-companion|decisions/CR-1]] — **RESOLVED** 2026-06-03 (modular monolith; partition; scenesManager=core).
- [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/decisions/CR-2-scene-format|decisions/CR-2]] — **container locked** 2026-06-04 (layered-YAML, ext `.scene`); payload pending SPS grill.
- [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/previews/cr2-scene-format-demos|previews/cr2-demos]] — 4 mockups + data-vs-code reframe + storage facts.
- [[docs/sessions/2026-06-04-claude-opus-anchor-checkpoint|2026-06-04 anchor checkpoint]] — session state + open threads (SPS · multi-stream readiness · missing_concept · inventory readjustment).
- [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/research/index|research/]] — 5 Explore records (R-CALLOUT, R-STYLESET, R-KRITA, R-OBSIDIAN-GIT, R-GIT-VSCODE). DONE 2026-06-03.
- [[docs/work/pkm-ai/items/2026-06-03-mind-routing-and-health-audit|PKM-AI mind-routing + health audit]] — MD-P3 done; routing intact; 121 health FAILs = P4 backlog.

## Conflict register (forks — dev decides, not agent)

- **CR-1 Core vs companion split** (MD-A5/E2/F1/F3/F4/F6). Is VM a monolith or
  thin core + companions? Gates theme-engine, layout-builder, online-fetch,
  input-remap, operations. Dev leans thin-core; explicitly unsure how far. **Biggest fork.**
- **CR-2 .scene format + name** (MD-F5/F7/G1/G2/G5). JSON+HTML vs svelte-like-no-precompiler
  vs xhtml/yaml+json; `.scene` vs `.preset`; vs old `.vmscene`. Also: presets-as-files vs presets-as-companions.
- **CR-3 css-class-per-NodeIdentity vs index-rebuild loss** (MD-B2). Identity change
  breaks class mapping. Conflicts with S-26 (identity ≠ label; rebuild can lose occurrence).
- **CR-4 manifest minAppVersion basis** (MD-C2). No real foundation today; lint-derived vs
  manual changelog tracking — sharpened by incoming monkeypatch layer.
- **CR-5 stable-update direction** (MD-C3). Forward layer-extraction/reconstruction vs
  reverse downgrade-from-beta mega-refactor.
- **CR-6 html-first vs md-first** (MD-A6/G3). md→html (write md, transform for components) vs
  html→md realtime. Which is source of truth?
- **CR-7 branch rename `sandbox`→`dev`** (MD-C1). CONTRADICTS 2026-05-27 version-streams
  (main=stable / dev=beta / sandbox=canary). Reconcile with [[docs/work/hardening/research/2026-05-27-version-streams-distillation/index|version-streams]] before renaming.
- **CR-8 strip all AI/docs from all branches** (MD-K1). Conflicts with current model where
  dev/sandbox/hardening CARRY `.agents/`. Where do agent docs live if removed everywhere? Ties branch-policy + AI-file guard.

## Grill agenda (proposed order)

1. **CR-1 core/companion** — unblocks the most items; everything downstream depends on it.
2. **CR-7 + CR-8 branch/privacy** — cheap to lock, prevents a contradiction with version-streams and a destructive AI-file purge.
3. **CR-2 .scene format** — needed before any SPEC on scene/preset/export.
4. **CR-6 html/md direction** + **CR-3 node-identity-css** — design-deep, gate theme-builder + geometry.
5. **CR-4 minAppVersion** + **CR-5 stable-update** — release-mechanics; can run with publish agent.

## Research candidates

DONE 2026-06-03 (see [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/research/index|research/]]):
- **R-CALLOUT** (MD-A2) callout-manager mechanics — MIT; getApi + multi-source CSS scan.
- **R-STYLESET** (MD-A3) style-settings `/* @settings */` parsing — the theme-builder reference impl.
- **R-KRITA** (MD-D3) krita = GPLv3 (borrow concepts, not code); Image/View split.
- **R-OBSIDIAN-GIT** (MD-O1) obsidian-git already ships blame/diff/history/hunk-stage.
- **R-GIT-VSCODE** (MD-O1) VSCode/GitLens + hunk staging + agent-diff curation (jj split, worktree-per-agent).

Decision-GATED (defer until grill resolves the fork):
- **R-LIBS** (MD-A4) unocss/bits-ui/daisyui — gated on CR-1/CR-6.
- **R-OBSIDIAN-RENDER** (MD-G3) live-preview/render internals — gated on CR-2/CR-6.
- **R-NATIVE-SURFACES** (MD-H1) native scenes/leafs excavation — gated on CR-1.
- **R-CANVAS-REF** (MD-D2), **R-EXCALIDRAW** (MD-M1), **R-MINVER** (MD-C2).

## Dev-stated sequencing (honor before product brainstorm)

MD-P3 + MD-P4: dev wants (1) PKM-AI interconnectivity + mind-routing verification, then
(2) a docs cleanup/archive round, BEFORE product pre-brainstorm + decisions. Treat as a
gate on starting the grills above unless dev reorders.

## Related architecture docs

- [[docs/architecture/pending-decisions|pending-decisions]] (S-26 identity locked; S-27 panelData next).
- [[docs/architecture/explorer-model/index|explorer-model]] (surfaces, render-data).
- [[docs/work/hardening/research/2026-05-27-version-streams-distillation/index|version-streams]] (CR-7).
- [[docs/architecture/vaultman-identity|vaultman-identity]] (MD-L1..L4).
- [[docs/work/hardening/research/2026-05-26-style-source-reconciliation/index|style-source-reconciliation]] (MD-A3/A5).
- [[docs/work/publish/index|publish]] (CR-5, CR-7, MD-C*).
- [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/roadmap-dispatch|roadmap-dispatch]] (reslot target once promoted).
