---
title: BT5-067 — Focus commands stop closing Vaultman
type: issue
status: completed
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-22T23:40:00
updated: 2026-07-23T02:10:00
created_by: claude-opus-4-8-audit
updated_by: claude-opus-4-8-audit
resolved_by: 7ef2e69d
tags: [agent/issue, triage/completed, initiative/polish, release/1.2.0, commands, regression]
---

# BT5-067 — Focus commands stop closing Vaultman

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

`Open Vaultman` is a toggle in sidebar/main mode, which is intended. Every command that only needs a frame to act on went through that same toggle, so running a focus command with Vaultman open detached every frame and then focused nothing — a regression against beta.6. Separate opening from toggling.

## Acceptance criteria

- [x] `ensureVaultmanFrame` reveals-or-opens and never detaches.
- [x] `activateView` keeps the toggle for the explicit Open command only.
- [x] `shouldToggleCloseFrame` isolates the decision; `new_instance` never closes.
- [x] Focus commands reveal/focus instead of toggling.
- [x] The stale source guard that required `activateView` inside the helper is replaced with the idempotent route.

## Blocked by

None.

## Outcome

Resolved by `7ef2e69d`. Runtime HITL confirmed by the dev: focus no longer closes the instance, and the explicit Open command still toggles.
