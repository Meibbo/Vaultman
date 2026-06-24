---
title: Migration and normalization
type: spec-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T08:50:28
tags:
  - agent/spec
---

# Migration And Normalization

## Migration Priority

When rebuilding active docs:

1. current codebase truth
2. accepted decisions from developer review
3. recent verified handoffs
4. old architecture docs by relevance
5. raw archive only when needed

## Normalization Scope

Normalize agent docs into `docs`. Do not move product code outputs or
explicit public docs unless the user asks.

## Superpowers Output

If a plugin creates giant files in its own folder:

1. archive raw output
2. create active manifest
3. shard into topic files
4. link raw original from the manifest

## Public Docs

The developer selects what belongs in `docs`. Agents should not infer that
agent memory belongs in public docs.

