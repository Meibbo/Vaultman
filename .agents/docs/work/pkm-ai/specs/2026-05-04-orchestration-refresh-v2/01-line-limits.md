---
title: Line limits as paging ergonomics
type: spec-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T08:50:28
tags:
  - agent/spec
---

# Line Limits As Paging Ergonomics

## Rule

The 200-line rule is not a content budget. It is a page size. Like pages in a
book, it says when to turn the page, not when to stop the chapter.

## Why V1 Failed

V1 translated "under 200 lines" into "short docs." That created a risk: valuable
design rationale and accepted nuance could be compressed into slogans. A future
agent would then obey the slogan without seeing the reason, exception, or
recovery path.

## Correct Pattern

When a topic grows:

```text
topic/
  index.md
  01-context.md
  02-rules.md
  03-examples.md
  04-failure-modes.md
```

The index routes. The shards preserve detail. Nothing important disappears
because a file hit the page size.

## Forbidden Interpretation

- Do not remove accepted detail to satisfy a line count.
- Do not replace concrete decisions with "keep it concise."
- Do not create summaries that cannot route to their source detail.
- Do not treat raw archive files as active docs needing edits.

## Health Check Meaning

A line-limit failure means: create pages, shards, or indexes. It does not mean:
delete, compress, or flatten meaning.

