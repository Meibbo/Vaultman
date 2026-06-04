---
title: 2026-05-28 Checkpoint — close of architecture wave + next-chat prompt
type: agent-handoff-shard
status: active
parent: "[[docs/current/handoff|handoff]]"
created: 2026-05-28T00:00:00
updated: 2026-05-28T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/current
  - agent/checkpoint
  - agent/handoff
---

# 2026-05-28 Checkpoint — close of architecture wave

Sharded from `handoff.md` (line-limit policy) to absorb the long multi-day session: the architecture +
style + version-streams grill **plus** the post-grill waves — proto/filter, Bases hybrid (ADR 0009),
storage architecture recon, DnD design (library + foreign-drop adapters), identity + dev-glossary +
tooling registry + watch-list. **Next chat is reserved for the dev's incoming feature-request list** to
evaluate against the locked architecture + plan the mega-refactor / reconstruction wave + tighten the
publish / commit / branch / release discipline.

## What landed in this wave (post-2026-05-27)

- **Bases strategy** — `ADR 0009` Accepted: hybrid (native shells PRIMARY + Bases-IN + import/export
  ALWAYS + Bases-OUT as opt-in `registerBasesView` PlatformAdapter add-on + foreign Bases views stay
  OPAQUE). Resolves replace-vs-interop tension; user can disable core Bases anytime.
- **Storage Architecture recon** — `storage-architecture-findings`: IDB confirmed not-synced;
  `.obsidian/` all-or-nothing sync (no per-folder opt-out); `data.json` mod-date-flap + LWW + iffy
  key-merge; quality-tier cache = innovation gap. PROPOSED 6-tier per-subsystem map (now incl. note
  frontmatter for node-attribute cells only).
- **`.vmscene` own scene file format** — PROPOSED: single polymorphic ext, YAML, `{type, name, version,
  payload}`; `registerExtensions(['vmscene'], 'vaultman-scene')`; bridges to `.base` / `.canvas` /
  dataview / datacore (latter two pending R-1 research).
- **DnD design grounded**:
  - Library: **`dnd-kit-svelte` (HanielU)** PROPOSED (S-10).
  - Foreign drops: `EditorSurfaceAdapter` (CodeMirror 6 `domEventHandlers` + `posAtCoords` +
    `view.dispatch`) and `HoverFloatAdapter` / `ForeignEmbedAdapter` (hover-editor template:
    `monkey-around` for prototype wrapping + popover DOM + `interact.js` for floating drag/resize).
  - Public Obsidian DnD API mapped (`Workspace.onDragLeaf` / `getDropLocation` / `recursiveGetTarget`).
  - PlatformAdapter Registry concretized: `HoverFloatAdapter` · `ForeignEmbedAdapter` ·
    `EditorSurfaceAdapter` · `HometabAdapter` · `BasesViewAdapter`.
  - S-11 raised — adopt `monkey-around` + `interact.js`.
- **New cross-cutting docs** in `docs/architecture/`:
  `zoom-out-map` · `dev-glossary` · `operational-watch-list` · `research-inventory` ·
  `pending-decisions` · `tooling-libraries` · `vaultman-identity`.
- **Reconstruction-not-refactor framing** parked as **S-8**: rename internally to "reconstruction wave";
  preview-prototype artifact per spec for any style/UI-heavy slice
  (under `docs/work/<initiative>/previews/`).
- **Periodic stability-promotion mechanic** parked as **S-9** (publish-track owns the cadence).
- **Context-hook policy fix**: agent no longer self-closes at inferred-low-context; asks dev about
  window remaining + checkpoint-vs-close intent. Edits in `.claude/settings.json` UserPromptSubmit hook
  + `AGENTS.md` §Size-And-Context.
- **Publish stable 1.0.1** SHIPPED (Codex 2026-05-27) — mis-release fixed; GitHub Release `1.1.0`
  renamed `1.1.0-beta.1` + marked prerelease.

## Key architecture surfaces (read these first, in this order)

| # | Surface | Purpose |
|---|---|---|
| 1 | [[docs/architecture/zoom-out-map\|zoom-out-map]] | subsystem registry + buildable-now |
| 2 | [[docs/architecture/dev-glossary\|dev-glossary]] | VM domain ↔ technical terms disambiguation |
| 3 | [[docs/architecture/operational-watch-list\|operational-watch-list]] | cross-cutting invariants (sync · mobile · API churn · release · security · fragility · perf · architecture locks · docs discipline · memory surfaces) |
| 4 | [[docs/architecture/research-inventory\|research-inventory]] | research backlog (done · in-progress · pending) |
| 5 | [[docs/architecture/pending-decisions\|pending-decisions]] | dev-blocked decisions S-1..S-11 |
| 6 | [[docs/architecture/tooling-libraries\|tooling-libraries]] | stack inventory + transition tracker |
| 7 | [[docs/architecture/vaultman-identity\|vaultman-identity]] | product definition (README / manual / marketing) |
| 8 | [[docs/architecture/glossary\|canonical glossary]] · [[docs/architecture/adr/README\|ADR index 0001–0009]] · [[docs/architecture/explorer-model/index\|explorer-model (4 shards)]] | architecture canon |

**Findings shards** under `docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/`:
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/bases-interop-findings|bases-interop-findings]] ·
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/obsidian-extension-api-findings|obsidian-extension-api-findings]] ·
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/storage-architecture-findings|storage-architecture-findings]] ·
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/dnd-library-findings|dnd-library-findings]] ·
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/obsidian-dnd-findings|obsidian-dnd-findings]] ·
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/open-inventory|open-inventory]] ·
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-ledger|decision-ledger]] ·
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-changelog|decision-changelog]] ·
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/roadmap-dispatch|roadmap-dispatch]].

## Pending dev decisions (summary; full detail in `pending-decisions`)

| ID | Topic | Recommendation | Status |
|---|---|---|---|
| S-1 | Per-subsystem storage tier table | accept after note-frontmatter addition | open |
| S-2 | Media-cache strategy | (b) hybrid IDB thumbs + vault sidecar full | open |
| S-3 | Schema-aware deep-merge for settings | yes | open |
| S-4 | Cache-controls UX scope (size cap · quality ladder · LRU/TTL · clear-cache UI) | yes — innovation gap | open |
| S-5 | Write ADR 0010 (Storage tiering) | yes once S-1..S-4 lock | open |
| S-6 | Note-frontmatter as tier 6 (node-attribute cells only) | confirm narrow scope + `vm:` namespace | open |
| S-7 | `.vmscene` own polymorphic format | single ext + YAML | open |
| S-8 | Reconstruction framing + preview-prototype strategy | yes — rename internally + preview artifact per spec | open |
| S-9 | Periodic stability-promotion mechanic | scope in `publish` initiative | open |
| S-10 | DnD library lock = `dnd-kit-svelte` | yes — UNBLOCKED | open |
| S-11 | Adopt `monkey-around` + `interact.js` | yes; upstream-vs-fork open | open |

## Open research backlog (full detail in `research-inventory`)

- **Holistic Storage Architecture grill** (awaits S-1..S-7 lock).
- **R-1 Dataview / Datacore interop** (feeds `.vmscene` bridges).
- **R-DND-B Outliner + Notion paragraph DnD** (LayoutBuilder complement).
- **R-UNOCSS — UnoCSS for Obsidian** (style-system transition; verify whether a `unocss` skill exists).
- **search backend** — minisearch own-index vs Omnisearch bridge (H1).
- **agentic-IDE chunk-acceptance pattern**.
- **PlatformAdapter monkey-patch targets** beyond DnD (Excalidraw · iconize · menu-intercept · ribbon-relocate).
- **virtua vs tanstack-virtual** prototype-behind-harness.
- **bits-ui** FnR breakage diagnosis.
- **`columns` plugin** (EditorScene) + **Obsidian Workspaces** (LayoutBuilder/Workspace-profiles).
- **NN engine internals** (I.E swap).

## Next chat — copy-pasteable starter prompt

```
Mode: grill/brainstorm. Caveman in chat (full detail in docs). Long-context model, no rush to close.

Read first (in order):
1. AGENTS.md → .agents/docs/start.md → .agents/docs/current/status.md → .agents/docs/current/handoff.md → .agents/docs/current/2026-05-28-checkpoint.md.
2. Architecture cluster: .agents/docs/architecture/{zoom-out-map, dev-glossary, operational-watch-list, research-inventory, pending-decisions, tooling-libraries, vaultman-identity}.md
3. ADRs 0001–0009 + canonical glossary + explorer-model (4 shards).
4. Skim findings shards under .agents/docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/ for any topic that comes up.

I will deliver a list of feature requests. For each one:
- Cross-check against the locked architecture (ADRs, model shards, operational-watch-list locks).
- Place it under the right axis (Surface · View · Node · Logic · Style/Theme · Process · Operations · Navigation).
- Flag conflicts with locked decisions; if a supersession is needed, draft a decision-changelog row.
- Park dev-blocked questions in pending-decisions (continuing S-12 onwards).
- Queue any research needed in research-inventory.
- Estimate impact on the reconstruction wave (S-8): small reshape or foundation change?
- Tie each to a roadmap tier (NOW / NEXT / LATER / MAJOR).

Goal: evaluate the feature requests against the foundation so we know which to absorb cleanly and which need a deeper grill before the mega-refactor starts. Then tighten publish / commit / branch / release discipline (publish initiative + version-streams + tooling-libraries).

Discipline (enforce):
- caveman in chat; docs full detail.
- ARCHIVE FIRST before removing current-doc content (use archive-active-doc.mjs + link).
- log decision changes in decision-changelog; do not silently overwrite.
- created_by / updated_by = agent-model identifier.
- line-limit tiered (≤200 clean / 201–300 soft-WARN dev-decides / >300 hard, shard or trim).
- no per-sub-system specs until dev greenlights.
- research subagents = read-only Explore agents (not general-purpose write); 706-file deletion incident on record.
- when context seems heavy, ASK the dev about window remaining + checkpoint vs handoff (do NOT self-close).

Best-practices research applied: [[docs/architecture/agent-memory-routing-best-practices|agent-memory-routing-best-practices]] (P0 + P1 seeds applied; S-12/S-13/S-14 parked). Session log: [[docs/sessions/session-log|docs/sessions/session-log.md]]. Decision graph: [[docs/architecture/decision-graph|docs/architecture/decision-graph.md]].
```

## Status

Wave closed 2026-05-28. Architecture canon stable; foundation grounded across model · style · streams ·
Bases · storage · DnD · identity. Next session = feature-request evaluation + publish discipline. The
copy-pasteable prompt above is the bootstrap.
