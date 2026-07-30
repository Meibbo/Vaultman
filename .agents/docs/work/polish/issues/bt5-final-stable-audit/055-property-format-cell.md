---
title: BT5-055 — Configurable Property value format cell
type: issue
status: needs-triage
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-22T13:05:00
updated: 2026-07-22T13:05:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.0, properties, cells]
---

# BT5-055 — Configurable Property value format cell

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

Register a `format` cell for the Properties provider. When active, value labels use typed formatting; when inactive, raw serialized text is shown. Preserve the working Wikilink rendering/navigation seam and make the setting flow through view configurations, activation order and all supported engines.

## Acceptance criteria

- [ ] `format` exists in the shared cell registry with localized label/icon/order.
- [ ] Raw mode never creates links, checkboxes, pickers or date controls.
- [ ] Formatted mode preserves working Wikilink display and navigation.
- [ ] Tree/Table/Cards honor the same cell state where they project value nodes.
- [ ] Saved view configurations migrate without forcing `format` on.
- [ ] Toggling the cell rerenders values without rebuilding the property index.
- [ ] Tests cover raw/formatted Wikilink and persistence/availability.

## Blocked by

None — can start immediately.
