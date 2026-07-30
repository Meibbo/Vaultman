---
title: BT5-086 — Text heading shows "with N excluded" in primary text
type: issue
status: completed
lifecycle: active
priority: P3
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-23T00:10:00
updated: 2026-07-23T02:10:00
created_by: claude-opus-4-8-audit
updated_by: claude-opus-4-8-audit
resolved_by: d4cf0d0f
tags: [agent/issue, triage/completed, initiative/polish, release/1.2.0, content-search]
---

# BT5-086 — Text heading shows "with N excluded" in primary text

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

The Content preview link read "with active filters" in accent — the colour reserved for inclusive state across the explorers. Change the copy to "with N excluded" and the colour to primary text.

## Acceptance criteria

- [x] Link reads `with {count} excluded`, localized, count derived from the non-content filters' effect on the scope.
- [x] Colour is `--text-normal`, hover reveals accent.

## Blocked by

None.

## Outcome

Resolved by `d4cf0d0f`. The count is only visible once the non-content filters actually narrow the Text result set; the restructure that surfaces the excluded matches under the collapsed header is separate — see [[../v1-2-1-polish/index|the 1.2.1 backlog]].
