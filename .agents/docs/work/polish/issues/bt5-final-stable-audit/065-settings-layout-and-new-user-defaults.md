---
title: BT5-065 — Layout Configuration first + softer new-vault defaults
type: issue
status: completed
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-22T23:40:00
updated: 2026-07-23T02:10:00
created_by: claude-opus-4-8-audit
updated_by: claude-opus-4-8-audit
resolved_by: cf9ba359
tags: [agent/issue, triage/completed, initiative/polish, release/1.2.0, settings]
---

# BT5-065 — Layout Configuration first + softer new-vault defaults

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

Move the Layout Configuration section ahead of the templates / operation-sets / saved-compositions sections, and soften two defaults for new vaults only: the compact preset without tab labels, and one-click cancel for operation badges.

## Acceptance criteria

- [x] Layout Configuration is the first heading on the settings root page.
- [x] `filtersShowTabLabels` defaults off; the one-time label migration still keys off a saved value, so existing vaults are untouched.
- [x] `badgeCancelClickMode` defaults to `single`.
- [x] `normalizeBadgeCancelClickMode` keeps its own corrupt-value fallback.
- [x] Source-order and default-value tests updated.

## Blocked by

None.

## Outcome

Resolved by `cf9ba359`. Defaults apply to fresh vaults only; `plugin-dev` keeps its saved `data.json` values.
