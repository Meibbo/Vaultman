---
title: CR-2 — scene file format (container locked, payload pending)
type: decision-record
status: partial
parent: "[[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/index|onenote companion megadump]]"
created: 2026-06-04T00:00:00
updated: 2026-06-04T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/decisions
  - initiative/draft
---

# CR-2 — Scene File Format (PARTIAL: container locked, payload pending)

## Locked 2026-06-04 (dev)

- **Container = layered-YAML-first** (Demo 1, [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/previews/cr2-scene-format-demos|demos]]):
  YAML/frontmatter config (source of truth) + OPTIONAL declarative presentation section (UCV, never
  executed) + embedded markdown notes. svelte-INSPIRED sections, NO svelte runtime / NO script execution.
- **Extension = `.scene`** (dev pick over `.vmscene`, "for simplicity's sake").
- **data-vs-code split accepted**: `.scene` = DATA (shareable like `.base`, rendered by VM). The
  "compressed-plugin" desire = a separate **VM code-module** track (Demo 3; ADR 0011 module-contract /
  public API S-15-16 / script-runner). Two artifacts, not one.

## Reconciliation with S-7

S-7 (pending-decisions) recommended polymorphic `.vmscene` YAML + `registerExtensions` + bridges to
`.base`/`.canvas`/`.json`/dataview/datacore. **Still valid** — only the extension name changes to
`.scene` and the structure becomes layered (config + optional presentation + embedded notes). Update S-7
when CR-2 fully locks.

## Still OPEN (do not lock yet)

- **Payload shape** depends on **SPS** (Saving Presets System) — undefined term; gates what a saved
  preset/template serializes into a `.scene`. **Needs its own grill** (tangled with Workspace-profile
  OPEN + preset-taxonomy parking-lot). CR-2 cannot fully close before SPS.
- Polymorphic single `.scene` (`{type: filter|queue|sort|view|composite}`) vs per-type — lean single.
- `registerExtensions(['scene'], …)` mount + the md↔html / render path (CR-6) — better demos requested.
- Script-import security policy for the code-module track (import-only, reviewed/shipped).

## Ties

S-7 · SPS (undefined) · Workspace-profile (OPEN) · ADR 0009 (bridges) · ADR 0011 (code-module track) ·
sync-boundary (watch-list §1: `.scene` = vault file = synced + shareable).
