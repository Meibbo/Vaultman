---
title: BT5-052 — Restore short filter i18n copy
type: issue
status: completed
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-22T13:05:00
updated: 2026-07-22T14:59:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/issue, initiative/polish, release/1.2.0, i18n, filters]
---

# BT5-052 — Restore short filter i18n copy

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

Restore the concise, precise English filter labels edited by the dev before
`b56b9a78`, align Spanish keys and update tests to assert the intended catalog
instead of the agent's rewritten wording. Do not silently rename semantic filter ids.

## Acceptance criteria

- [x] `en.ts` filter labels match the dev-authored short wording recovered from Git.
- [x] `es.ts` contains every corresponding key with equivalent meaning.
- [x] No context menu, bubble, tooltip or Navbar displays raw i18n keys.
- [x] Tests assert stable keys and expected user-facing copy.
- [x] Existing saved filters remain compatible because ids/shapes do not change.

## Blocked by

None — can start immediately.

## Completion evidence — 2026-07-22

- Product commit: `a9c8fdc9 fix(i18n): restore concise filter labels`.
- Git/blame showed `b56b9a78` already introduced the dev's short `Has/Not` wording for eight
  keys, but accidentally removed `filter.file_name` while `modalAddFilter` still translated it.
  `Has name` restores the missing half of that pair and prevents a raw key.
- Spanish now mirrors polarity with `Con/Sin` rather than the obsolete
  Specific/Multiple/Exclude wording. No filter id or serialized shape changed.
- New `filterI18n.test.ts` locks ten English/Spanish labels and verifies every Add Filter and
  Text consumer resolves an existing key.
- Verification: focused red captured missing `Has name` and stale Spanish; final related suite
  15/15, changed-path ESLint and diff check green.
