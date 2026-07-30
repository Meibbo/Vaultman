---
title: Vaultman Identity — what VM is (for README / manual / marketing / contributors)
type: architecture
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-27T00:00:00
updated: 2026-05-27T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/architecture
  - agent/identity
  - agent/onboarding
---

# Vaultman Identity

What Vaultman IS — the source-of-truth definition for: the README, the user manual, in-app helpers / infoboxes, contributor onboarding, and marketing. Without this, capabilities don't sell themselves; with it, every surface speaks the same story. Created 2026-05-27 at dev request ("doc de definición de qué es realmente vaultman"). Initial draft — refine collaboratively, sharpen the voice with the dev.

Pair with: [[docs/architecture/dev-glossary|dev-glossary]] · [[docs/architecture/zoom-out-map|zoom-out-map]] · [[docs/architecture/tooling-libraries|tooling-libraries]] · [[docs/work/publish/index|publish]].

## One-liner (current draft — sharpen)

> **Vaultman** is an Obsidian-native explorer + bulk-operations workbench that turns notes into a
> queryable, drag-droppable, scriptable database while staying portable to the Bases / Canvas /
> Dataview / Datacore ecosystem. The interactive builder + the orchestrated mass-action pipeline are
> the moat.

## What VM IS

- A native-first **explorer + filter/sort builder + queue/operation pipeline** over the vault.
- A **chameleon** — same logic, different presets: `barebones` (mobile-minimum, mostly off) / `native` (1:1 with Obsidian, core CSS reused as a pseudo-snippet, not reimplemented) / `polish` (richer floating-island UX). The user chooses how "lite or rich" Vaultman feels.
- A **Bases / Canvas / Dataview / Datacore citizen** — read + write via import/export, and a Bases-view provider via the opt-in `registerBasesView` add-on (ADR 0009 hybrid).
- An **operations engine** — `read → plan → enqueue → preview → execute` with diffview + chunk-acceptance (agentic-IDE UX) over the VFS + queue.
- A **layered scalability ladder** — barebones → native → polish. Each rung load/unload-toggleable;
  power users override every default.

## What VM IS NOT

- Not a replacement for Obsidian's editor.
- Not a Bases / Dataview consumer-only — VM is itself a view-and-mutation surface.
- Not a theme — themes stay in Obsidian; VM ships a token layer that RESPECTS the user's theme.
- Not a general-purpose plugin manager — though the plugin-provider concept bridges to / intercepts a few core plugins, that is scoped (File Explorer · Search · Tags · Outline · Properties · Bookmarks · Workspaces; **interop**, not replace, for Bases / Canvas / Graph).

## Core promises (what the user can rely on)

1. **Disable core Bases anytime, keep all view functions** (ADR 0009 hybrid; native shells primary).
2. **No lock-in** — every config exports to `.base` / `.canvas` / `.vmscene` / `.json` / dataview-codeblock / datacore-codeblock and re-imports.
3. **Mass-action safely** — every mutation previews + chunk-accepts before commit, via one pipeline (drag-drop · agent · FnR · rename · manual all flow the same way).
4. **Mobile-aware** — barebones preset + platform gating + tier-aware storage.
5. **Don't fight your theme** — chameleon presets keep Vaultman feeling native unless you opt into polish.
6. **Power-user gets levers** — per-setting storage selector, granular preset toggles, scene-builder composition, view-config editing, custom panels.

## Differentiators

| Against | Their strength | VM's edge |
|---|---|---|
| Obsidian native (File Explorer / Search / Tags / Outline / Properties) | invisible + stable | combined into ONE interactive builder · bulk-ops · richer engines |
| Bases | data model + view-type ecosystem (citizen) | content / block / outline logic · operations / mutation pipeline · interactive drag-drop builder (Bases is static-form + raw YAML) · cross-surface generality |
| Dataview / Datacore | query language | interop (read + emit codeblocks) without making the user learn a DSL |
| Notion-style block editing | best-in-class editor blocks | (deferred — EditorScene research) but native operations + Obsidian portability win on data, not editing |
| Notebook Navigator | tree perf | brownfield I.E swap planned · interop research queued |

## User personas (initial draft — refine)

- **Basic note-taker** — wants File Explorer parity + nice cards / grid view; barebones preset by default.
- **Power user** — filter / sort / group-by / mass rename / bulk tag; uses the interactive builder; polish preset.
- **Developer / scripter** — wants `.vmscene` export · dataview-codeblock interop · the AI agent-action API.
- **Integrator** — third-party plugin author registering complementary views via Bases / our codeblock.

## 30-second pitch (draft)

> Obsidian's File Explorer + Search + Tag pane + Outline + Properties — combined into one drag-drop
> builder that batches mass changes safely, exports to every database format in the ecosystem, and
> stays out of your theme. Turn off core Bases and keep every database function. Power users get the
> levers; basic users get a barebones mode that feels like native Obsidian.

## Helper / infobox snippets (seed in-app docs)

- "Preset = how lite or rich Vaultman feels. Switch any time."
- "Every mass action previews before it commits."
- "Your `.base` files open here. Export back any time."
- "Bases off? Vaultman keeps every view function."
- "Tap a node → see what cells came from where (note / file / formula)."
- "Filter group operators cycle: AND → OR → NONE."

## To fill (open)

- Tagline candidates (5–10 short options).
- Visual identity (logo / palette / type — out of arch grill scope; brand pass needed).
- Manual outline (sections / depth / interlinks).
- README structure (problem-it-solves · install · quick-start · presets · interop · contributing).
- Onboarding flow (first-launch helper sequence; preset selector intro).
- Marketing-site content.

## Status

Initial draft 2026-05-27. Grow with the dev's voice; rewrite for final README + manual. Identity is load-bearing for community adoption — protect it.
