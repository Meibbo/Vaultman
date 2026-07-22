---
title: BT5-044 — Move Has/Hasn't text into the Text Navbar
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
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.0, navbar, content]
---

# BT5-044 — Move Has/Hasn't text into the Text Navbar

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].
This requirement was not present in the three original prompts and is captured
explicitly here rather than silently folded into another issue.

## What to build

Remove the Has/Hasn't text toggle from the Text explorer body and contribute it
as a Text-provider action node between Pause/Resume search and Sort in the shared
Navbar. It continues to control `contentIsExclusion` and uses localized state copy.

## Acceptance criteria

- [ ] `tabContent.svelte` no longer renders the body-level toggle.
- [ ] The Text contribution order is Pause/Resume → Has/Hasn't → Sort.
- [ ] Toggle state, icon, tooltip and aria label update without remounting Text.
- [ ] Search behavior is unchanged for both include and exclude modes.
- [ ] Keyboard activation and persisted/view-composition state remain coherent.
- [ ] Tests cover ordering, state transition and absence of duplicate controls.

## Blocked by

- [[043-universal-navbar-panel-widget|BT5-043]].
