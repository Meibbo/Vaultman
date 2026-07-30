---
title: BT5-046 — Migrate providers to the universal Navbar
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
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.0, navbar, statistics]
---

# BT5-046 — Migrate providers to the universal Navbar

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].
Reopens the incomplete result recorded as BT5-037.

## What to build

Migrate Files, Props, Tags, Text, Snippets, Plugins and Statistics to provider contributions and remove page-local navbar duplication. Statistics contributes its scope selector as an action/menu and exposes the same tab-menu capabilities as the other scenes: Toolbar, Snippets, Plugins and Statistics itself; Index remains absent because Statistics cannot provide it.

## Acceptance criteria

- [ ] No provider/page mounts an independent Navbar renderer.
- [ ] Files retains all existing actions through contributions.
- [ ] Statistics scope is a Navbar menu and updates cards without page-local controls.
- [ ] Statistics tab menu exposes Toolbar, Snippets, Plugins and Statistics, but not Index.
- [ ] Props, Tags, Text, Snippets and Plugins receive shared overflow behavior.
- [ ] Provider switching preserves focus and does not duplicate listeners/actions.
- [ ] Source guards assert the shared host, not page-local markup.

## Blocked by

- [[043-universal-navbar-panel-widget|BT5-043]].
- [[045-navbar-overflow-measured-strategies|BT5-045]].
