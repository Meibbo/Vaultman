---
title: EDP-008 Overlay projection extraction
type: issue
issue_id: EDP-008
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
  - "[[004-batched-files-overlay-layers-viewservice|EDP-004]]"
  - "[[006-tags-props-snapshot-adapters|EDP-006]]"
created_by: codex
updated_by: codex
---

# EDP-008 Overlay Projection Extraction

## Parent

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]]

## Source

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices#slice-b---overlay-projection-module|Wave 4 Slice B]]

## What To Build

Extract queue/filter projection rules behind a tested module while keeping
`ViewLayers` as the output vocabulary and preserving existing badge registry
semantics.

## Acceptance Criteria

- [ ] Queue/filter projection rules move behind a tested module while
      `ViewLayers` stays output.
- [ ] Queue popup and active-filter list presentation have pure projection
      tests outside Svelte components.
- [ ] Existing `serviceBadge` and `badgeRegistry` vocabulary is reused.

## Blocked By

- [[004-batched-files-overlay-layers-viewservice|EDP-004]]
- [[006-tags-props-snapshot-adapters|EDP-006]]

## Verification

- Run focused overlay projection, badge registry, queue popup, and
  active-filter presentation tests.
