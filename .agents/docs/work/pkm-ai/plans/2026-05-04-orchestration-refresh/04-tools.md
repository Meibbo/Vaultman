---
title: Tools
type: plan-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T00:00:00
updated: 2026-05-04T07:26:01
tags:
  - agent/plan
---

# Tools

## Task 1: Create Tool Folder

**Files:**
- Create folder: `tools/pkm-ai/`
- Create: `tools/pkm-ai/package.json`

- [ ] Use TypeScript/Node-compatible tooling.
- [ ] Do not add Python unless a task clearly benefits from Python libraries.

## Task 2: Add Frontmatter And Line Checks

**Files:**
- Create: `tools/pkm-ai/check-doc-health.mjs`

- [ ] Check Markdown line limits.
- [ ] Check timestamp format.
- [ ] Check parent link format.
- [ ] Check forbidden paths such as active `docs/superpowers/**`.
- [x] Add `update-frontmatter.mjs` to set `created` and `updated` mechanically for touched docs.

## Task 3: Add Index Helpers

**Files:**
- Create: `tools/pkm-ai/index-docs.mjs`
- Create: `tools/pkm-ai/query-docs.mjs`
- Create: `tools/pkm-ai/update-indexes.mjs`

- [ ] Parse frontmatter structurally.
- [ ] Output compact route summaries.
- [ ] Keep cache rebuildable under `cache/`.

## Task 4: Add Sharding Helper

**Files:**
- Create: `tools/pkm-ai/shard-index.mjs`

- [ ] Split large indexes into manifest plus shards.
- [ ] Preserve links to raw originals when present.
