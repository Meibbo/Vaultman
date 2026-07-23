---
title: BT5-090 — Folder recency and mtime tie-break for Last opened
type: issue
status: completed
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-23T00:55:00
updated: 2026-07-23T02:10:00
created_by: claude-opus-4-8-audit
updated_by: claude-opus-4-8-audit
resolved_by: 404c33b4
tags: [agent/issue, triage/completed, initiative/polish, release/1.2.0, sort, explorer]
---

# BT5-090 — Folder recency and mtime tie-break for Last opened

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

Under the recency sort a folder fell through to a name comparison, so it
drifted to a nonsensical position while the header claimed to sort by recency
(the "stress vault" folder floating to the top). A folder has no recency of its
own, so it takes the newest open of any file beneath it; opening a nested note
floats its whole branch.

## Acceptance criteria

- [x] `bubbleMaxToFolders` climbs each opened file's ancestor chain once
      (O(entries x depth)), stopping when an ancestor already holds a newer
      descendant; `LastOpenedService` memoizes and invalidates it.
- [x] A folder sorts by its newest descendant open; a nested open floats it.
- [x] Recency ties fall back to modification time, not the alphabet: files by
      their own mtime, folders by the newest mtime beneath them.
- [x] With Fixed folders on (default) the tree still name-sorts folders; the
      folder order only reacts to recency once Fixed folders is off.

## Blocked by

[[089-single-node-tree-move|BT5-089]] (reuses its move within the fast path).

## Outcome

Resolved by `404c33b4`. Fixes the "stress vault first" report and delivers the
folder-recency behavior the dev specified.
