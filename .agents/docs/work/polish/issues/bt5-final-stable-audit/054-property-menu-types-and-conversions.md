---
title: BT5-054 — Property types and value conversions
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
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.0, properties, context-menu]
---

# BT5-054 — Property types and value conversions

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

Complete the Properties context menu with Change type → Date & Time, check the
node's effective current type, add Convert → Wikilink for value nodes and use the
exact conversion labels `lowercase`, `UPPERCASE`, `Titlecase`. All state-changing
conversions must use the operation queue.

## Acceptance criteria

- [ ] Date & Time is available and maps to the native effective type.
- [ ] Exactly one current type is checked, including aliases/legacy metadata.
- [ ] Wikilink conversion is offered only when conversion is meaningful.
- [ ] Conversion labels and submenu copy are localized.
- [ ] Case/Wikilink conversions stage `oldValue`/`value` against represented files.
- [ ] Pending conversions project the correct operation badge and are cancelable.
- [ ] Tests cover scalar/list values, incompatible types and no-op conversions.

## Blocked by

None — can start immediately.
