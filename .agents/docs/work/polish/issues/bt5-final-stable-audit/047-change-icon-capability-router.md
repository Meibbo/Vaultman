---
title: BT5-047 — Canonical ChangeIcon capability router
type: issue
status: needs-triage
lifecycle: active
priority: P0
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-22T13:05:00
updated: 2026-07-22T13:05:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.0, icons, integration]
---

# BT5-047 — Canonical ChangeIcon capability router

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].
Corrective successor to [[../bt5-next-release/019-addon-icon-registry-picker|BT5-019]].

## What to build

Define one `ChangeIcon` action and capability router for file, folder, property, tag, content, snippet and plugin targets. The router selects a registered picker adapter by capability and priority, then falls back to Vaultman's picker. Explorers must not register competing Iconic/fallback actions independently.

## Acceptance criteria

- [ ] One stable action id is projected per eligible node and menu surface.
- [ ] Target identity is typed and independent from display labels.
- [ ] Picker adapters register supported target kinds and priority explicitly.
- [ ] Absence or failure of an external adapter routes to Vaultman fallback.
- [ ] Registry supports future third-party pickers without explorer changes.
- [ ] Files/Props/Tags/Text/Snippets/Plugins consume the same router.
- [ ] Tests cover resolution, priority, unsupported kinds and fallback.

## Blocked by

None — can start immediately.
