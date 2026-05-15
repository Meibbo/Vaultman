---
title: Explorer view-layer brainstorm — thread handoff
type: agent-handoff
status: active
parent: "[[docs/work/hardening/research/2026-05-14-explorer-libraries-and-parity-research/index|explorer-libraries-and-parity-research]]"
created: 2026-05-14T00:00:00
updated: 2026-05-14T00:00:00
tags:
  - agent/handoff
  - explorer/views
  - hardening
created_by: claude
updated_by: claude
---

# Explorer View-Layer Brainstorm — Thread Handoff

Handoff for the `brainstorming` skill thread on the Vaultman Explorer view layer.
A fresh session should resume from here.

## What this thread is

The user invoked `/superpowers:brainstorming` to design the Explorer's view/UX
layer — the "one explorer to govern them all" vision: 6 view modes, bulk-edit
orientation, 2:1 parity with Obsidian core plugins with a settings dial back to
1:1, a theme selector, and a core-plugin "disguise" layer. The user required
deep library + parity research first, executed autonomously with parallel
subagents, before any scope decomposition.

## Done

- **Research** — four parallel subagents covered: performance libraries; Obsidian
  core-plugin parity for File Explorer / Tags / Outline; parity for Properties /
  Search / Bases; and serviceTheme + service-unload. A fifth agent synthesized
  the four reports.
- **Worldview doc formalized** —
  [[docs/work/hardening/research/2026-05-14-explorer-libraries-and-parity-research/index|explorer-libraries-and-parity-research]].
  This is the canonical research record. Read it first.
- **Scratch sources** (`C:\tmp\`, may not persist — the repo doc is canonical):
  `vm-research-theme.md`, `vm-research-libraries.md`, `vm-research-parity-fto.md`,
  `vm-research-parity-psb.md`, `vm-research-SYNTHESIS.md`.
- **Decomposition** — the missing work is grouped into sub-systems A–K across
  Phases 0–3 (see research doc section 5). The user chose **Phase 0 —
  Foundations** as the first sub-project to brainstorm.

## Resume point — brainstorm Phase 0

First sub-project = **Phase 0 — Foundations**, three coupled sub-systems:

- **B — serviceTheme unification.** Merge the two disconnected theme services
  (`serviceTheme.svelte.ts` runes class + the older `applyVaultmanTheme`
  class-list toggler); add a `unocss-preset-theme` token layer; one
  `vm-theme-<name>` root class driven by the runes service.
- **A — native-DOM parity contract.** Every view (especially `viewTree.svelte`)
  and every provider emits the correct Obsidian-native class set under
  `useNativeDom`. Highest-leverage single deliverable — unlocks the 1:1
  dial-back across all providers at once.
- **H — virtualizer consolidation.** Delete the custom `TreeVirtualizer`;
  standardize on `@tanstack/svelte-virtual`.

Resume the `brainstorming` skill at its "offer visual companion" step (its own
message), then clarifying questions one at a time, then 2–3 approaches, then
design sections with per-section approval, then write the design doc to
`docs/superpowers/specs/2026-05-14-explorer-phase-0-foundations-design.md` and
commit it, then transition to the `writing-plans` skill. The brainstorming
HARD-GATE holds: do NOT write code or invoke an implementation skill until the
design is approved.

## Open questions to settle during Phase 0 design (research section 6)

1. Does Vaultman target in-editor / embedded surfaces, or is the panel the whole
   scope? Product decision — affects sub-system A's contract surface.
2. "Truly replace" vs "look like + add" risk appetite for the disguise layer —
   relevant because B feeds Phase 3's `service-unload`.
3. `list` vs `grid` lowercase/capital component-pair ambiguity — affects H's
   scope; needs a look at `panelExplorer.svelte`'s view-mode switch.
4. Obsidian core DOM/class names were reconstructed from community sources, not
   verbatim-confirmed — verify against a live `app.css` before committing A to
   pixel-1:1.

## Environment constraints

- **Subagents hit a usage limit** during this session ("You're out of extra
  usage", was resetting ~10:20am America/Lima on 2026-05-14). Re-check
  availability before dispatching. `SendMessage` to resume cut-off agents is NOT
  available in this harness — cut-off agents cannot be resumed, only
  re-dispatched. The resilience pattern that worked: have each agent write its
  report to a `C:\tmp\` file early, so partial work survives a cutoff.
- **Caveman mode (full)** is active for chat (plugin `caveman`). Chat only —
  docs, code, and commits stay normal and full-detail.
- Canonical explorer branch = `claude/explorer` (worktree `jovial-wilson-f81c67`
  under `.claude/worktrees/`). Current checkout = `sandbox`; the new research doc
  and this handoff are written but uncommitted, alongside pre-existing
  uncommitted user changes in the working tree.

## Status/handoff sync

`current/status.md` and `current/handoff.md` still point at the prior route (the
Notebook Navigator comparison thread). Add a compact pointer to this brainstorm
thread + the research doc when convenient.
