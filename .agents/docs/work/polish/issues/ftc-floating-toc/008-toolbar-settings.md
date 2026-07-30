---
title: FTC-008 — Toolbar Tools menu and Settings IA
type: issue
status: completed
parent: "[[docs/work/polish/issues/ftc-floating-toc/index|FTC index]]"
spec: "[[docs/work/polish/specs/2026-07-15-v1-2-beta1-floating-toc-fixes/02-ftc-008-toolbar-settings|FTC-008 spec]]"
created: 2026-07-15T00:00:00
created_by: codex-gpt-5
tags: [agent/issue, initiative/polish, toolbar, settings, release/1.2.0-beta.1]
---

# FTC-008 — Toolbar Tools menu and Settings IA

## Goal

Keep the current Files toolbar at five visible nodes through an opt-in native Tools menu, and put the saved-view section beside the reusable operations presets it relates to.

## Scope

- Add off-default `toolbarToolsMenu` under Style Config.
- Enabled Files toolbar = Tabs · View · Sort · Search · Tools.
- Tools menu = Auto-reveal · dynamic Expand/Collapse All · future right suffix.
- Disabled layout remains the current six direct nodes.
- Move View Config immediately below the preset list.
- Rename Action Presets to Operations Presets / Presets de operaciones.

## DoD — nonvisual

- [x] Defaults, strings, source order, five-node projection, and menu order have RED/GREEN tests.
- [x] Menu keyboard path invokes the same construction as pointer click.
- [x] Existing auto-reveal and expansion callbacks remain single-source.
- [x] Svelte autofixer + focused tests + check/lint/build pass.
- [x] Code-only commit; no `.agents`, push, tag, merge, or visual automation.

## Implementation

Landed code-only in `d9eb4cf0 feat(explorer): add condensed toolbar tools menu`.
Integrated branch gates were re-run after FTC-009: full unit 70 files / 345 tests, TypeScript + Svelte 0/0, production bundle, ESLint, and Stylelint all passed.

## Non-goals

Toolbar redesign for arbitrary widths · moving Props/Tags controls that already fit · renaming stored queue templates.
