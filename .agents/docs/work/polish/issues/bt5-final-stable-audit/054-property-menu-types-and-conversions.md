---
title: BT5-054 — Property types and value conversions
type: issue
status: completed
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-22T13:05:00
updated: 2026-07-23T02:10:00
created_by: codex-gpt5-root
updated_by: claude-opus-4-8-audit
resolved_by: d764b424, fea7c9c3
tags: [agent/issue, triage/in-progress, initiative/polish, release/1.2.0, properties, context-menu]
---

# BT5-054 — Property types and value conversions

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

Complete the Properties context menu with Change type → Date & Time, check the node's effective current type, add Convert → Wikilink for value nodes and use the exact conversion labels `lowercase`, `UPPERCASE`, `Titlecase`. All state-changing conversions must use the operation queue.

## Acceptance criteria

- [x] Date & Time is available and maps to the native effective type.
- [x] Exactly one current type is checked, including aliases/legacy metadata.
- [x] Wikilink conversion is offered only when conversion is meaningful.
- [x] Conversion labels and submenu copy are localized.
- [x] Case/Wikilink conversions stage `oldValue`/`value` against represented files.
- [x] Pending conversions project the correct operation badge and are cancelable.
- [x] Tests cover scalar/list values, incompatible types and no-op conversions.

## Blocked by

None — can start immediately.

## Outcome (2026-07-23)

Landed the uncommitted slice as d764b424, then fixed the Convert submenu the dev found: it is bidirectional, so a linked value keeps the case conversions and gains a `plain` inverse instead of hiding the whole submenu; Titlecase now opens a word after `[` or `(` so it stops duplicating lowercase for links (fea7c9c3). HITL confirmed. Completed.
