---
title: BT5-048 — ChangeIcon adapters, fallback, intercept and dedupe
type: issue
status: needs-triage
lifecycle: active
priority: P0
execution: HITL
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-22T13:05:00
updated: 2026-07-22T13:05:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.0, icons, iconic]
---

# BT5-048 — ChangeIcon adapters, fallback, intercept and dedupe

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

Implement Vaultman and Iconic adapters through the canonical router. Iconic must
open with the target's current selection, return the chosen icon/color through an
intercepted result and never duplicate Change icon in Props/Tags. Snippets and
Plugins prefer a capable external picker but retain Vaultman fallback. With Iconic
or the add-on disabled, Files/Props/Tags/Text still expose fallback Change icon.

## Acceptance criteria

- [ ] Iconic picker receives correct stable target identity and current icon/color.
- [ ] Files no longer opens an apparently unselected picker for an existing override.
- [ ] Props and Tags render exactly one Change icon action.
- [ ] Snippets/Plugins use Iconic when supported and fallback otherwise.
- [ ] Disabling Iconic or the integration add-on never removes Vaultman fallback.
- [ ] Picker completion persists via the owning adapter and refreshes once.
- [ ] External cancel/failure leaves state untouched and does not open two pickers.
- [ ] Automated adapter matrix and `plugin-dev` smoke cover enabled/disabled variants.

## Blocked by

- [[047-change-icon-capability-router|BT5-047]].
