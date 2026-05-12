---
title: EDP-003 Files panel snapshot compatibility and revisioned reveal
type: issue
issue_id: EDP-003
status: needs-triage
issue_kind: AFK
parent: "[[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]]"
created: 2026-05-11T20:55:00
updated: 2026-05-11T20:55:00
labels:
  - needs-triage
tags:
  - agent/issue
  - initiative/hardening
  - explorer/views
blocked_by:
  - "[[002-files-snapshot-data-plane-foundation|EDP-002]]"
created_by: codex
updated_by: codex
---

# EDP-003 Files Panel Snapshot Compatibility And Revisioned Reveal

## Parent

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]]

## Source

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/16-wave-4-panel-reveal-compatibility|Wave 4 panel and reveal compatibility]]

## What To Build

Move Files panel selection, prune/range helpers, and tree reveal to the
snapshot visible-order contract while keeping legacy recursive helpers as
fallbacks for non-snapshot providers.

## Acceptance Criteria

- [ ] Files path uses snapshot visible order for prune/range/box selection.
- [ ] Tree reveal target includes snapshot revision and late id-to-index
      lookup.
- [ ] Legacy recursive helpers remain fallback for non-snapshot providers.
- [ ] Existing panel/tree selection and scroll tests remain green.

## Blocked By

- [[002-files-snapshot-data-plane-foundation|EDP-002]]

## Verification

- Run focused panel, tree, selection, and scroll tests that cover Files reveal.
