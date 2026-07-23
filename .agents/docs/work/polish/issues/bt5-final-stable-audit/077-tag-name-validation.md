---
title: BT5-077 — Reject invalid tag names and repair the soft-lock
type: issue
status: completed
lifecycle: active
priority: P0
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-23T00:10:00
updated: 2026-07-23T02:10:00
created_by: claude-opus-4-8-audit
updated_by: claude-opus-4-8-audit
resolved_by: d4cf0d0f
tags: [agent/issue, triage/completed, initiative/polish, release/1.2.0, tags, data-safety]
---

# BT5-077 — Reject invalid tag names and repair the soft-lock

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

Tag rename validated only that the name was non-empty and different. A name
with a space was written verbatim into the frontmatter of every file with the
tag; Obsidian stops parsing a tag at the first space, so the node could no
longer be found by its own path and every later operation on it silently
matched nothing until reload — while the frontmatter stayed wrong on disk.

## Acceptance criteria

- [x] `validateTagName` owns the rule and rejects rather than sanitizes.
- [x] Space, empty, hash, purely-numeric and slash-edge names are rejected.
- [x] Letters (any script), digits, `_`, `-` and `/` nesting are accepted.
- [x] The inline editor stays open on rejection so the text can be corrected.
- [x] `_renameTag` re-checks, because drag-to-nest bypasses the editor.
- [x] Both rejection messages are localized (space case is specific).

## Blocked by

None.

## Outcome

Resolved by `d4cf0d0f`. This corrupted real files, so it jumped the queue
ahead of the Navbar work. Rename of inline-body tags (not frontmatter) is a
separate defect — see [[../v1-2-1-polish/index|the 1.2.1 backlog]].
