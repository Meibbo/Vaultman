---
title: EDP-002 Files snapshot data-plane foundation
type: issue
issue_id: EDP-002
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
  - "[[001-approve-issue-set-and-supersession-notes|EDP-001]]"
created_by: codex
updated_by: codex
---

# EDP-002 Files Snapshot Data-Plane Foundation

## Parent

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]]

## Source

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/14-wave-4-files-tree-snapshot-first-slice|Wave 4 files tree snapshot first slice]]

## What To Build

Introduce the Files-first `ExplorerDataPlane` foundation: typed snapshot contracts, a pure snapshot builder, and a Svelte service that publishes immutable structural snapshots while preserving current `TreeNode` compatibility.

## Acceptance Criteria

- [ ] `typeExplorerDataPlane`, pure snapshot builder, and data-plane service exist with unit tests.
- [ ] Files provider exposes undecorated structural source while `getTree()` and action hooks remain compatible.
- [ ] Snapshot tests cover rows, maps, visible ids, parent links, path/folder lookup, revision replacement, and subscriptions.

## Blocked By

- [[001-approve-issue-set-and-supersession-notes|EDP-001]]

## Verification

- Run focused unit tests for snapshot construction and service revision behavior.
