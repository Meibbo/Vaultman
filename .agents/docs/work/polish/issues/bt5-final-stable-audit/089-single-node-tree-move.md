---
title: BT5-089 — Single-node tree move for the Last opened sort
type: issue
status: completed
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-23T00:40:00
updated: 2026-07-23T02:10:00
created_by: claude-opus-4-8-audit
updated_by: claude-opus-4-8-audit
resolved_by: d8367255, ced1c078
tags: [agent/issue, triage/completed, initiative/polish, release/1.2.0, performance, explorer]
---

# BT5-089 — Single-node tree move for the Last opened sort

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

Under the recency sort, every `file-open` rebuilt the whole Files model — re-sort plus every decoration pass plus a full projection. Obsidian emits `file-open` on every tab switch, so moving between notes stuttered. A reusable single-node move API reorders just the opened file within its sibling group.

## Acceptance criteria

- [x] `moveNodeWithinSiblings` / `moveNodeToSiblingEdge` rebuild only the moved sibling array and its ancestors; untouched subtrees keep their identity.
- [x] Re-opening the file already at the edge, or bouncing between the top two, reports `changed: false` and costs nothing.
- [x] A `partitionOf` grouping keeps a file within the file run, so with `parentsFirst` it never jumps above the folders.
- [x] The shortcut is gated to `parentsFirst && fixedFolders`, where the result provably equals a full re-sort; other layouts fall through to the rebuild.
- [x] Table and Cards keep the full rebuild (no equivalent projection yet).

## Blocked by

None.

## Outcome

Shipped in `d8367255`; the folder-partition correction is `ced1c078`. Reused by [[090-folder-recency-and-mtime-tiebreak|BT5-090]].
