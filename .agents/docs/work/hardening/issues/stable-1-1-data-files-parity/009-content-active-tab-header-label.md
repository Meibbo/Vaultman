---
title: SDF-009 Content active tab header label
type: issue
issue_id: SDF-009
status: needs-triage
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T07:53:25
updated: 2026-06-06T07:53:25
labels:
  - needs-triage
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - explorer/content
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-009 Content Active Tab Header Label

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

When Content is the active Data tab, show the Content label in its minimal filters header button so
the header does not look empty when that button is the only visible control.

## Acceptance Criteria

- [ ] Content active tab header button shows its label while Content is active.
- [ ] Props and Tags keep the current minimal header behavior unless their active-tab affordance also becomes visually empty.
- [ ] The label uses existing tab/header classes and does not introduce a separate visual language.
- [ ] The behavior is reactive when switching Data tabs.
- [ ] Runtime smoke confirms Content header is not visually blank in minimal style.

## Blocked By

None - can start immediately.

## Verification

- Run `pnpm run check`.
- Build, sync, reload `plugin-dev`, switch to Data/Content, and inspect visible header text with `obsidian-cli`.
