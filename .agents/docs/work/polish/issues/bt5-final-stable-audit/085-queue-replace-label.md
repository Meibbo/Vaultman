---
title: BT5-085 — Name the Replace operation in the queue
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
tags: [agent/issue, triage/completed, initiative/polish, release/1.2.0, queue, i18n]
---

# BT5-085 — Name the Replace operation in the queue

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

A staged content replace showed only `find → destination`, a value pair with
no verb, while every other operation names itself. Prefix it with a localized
"Replace".

## Acceptance criteria

- [x] Queue detail reads `Replace find → destination`.
- [x] Verb is localized (`queue.details.replace`).

## Blocked by

None.

## Outcome

Resolved by `d4cf0d0f`.
