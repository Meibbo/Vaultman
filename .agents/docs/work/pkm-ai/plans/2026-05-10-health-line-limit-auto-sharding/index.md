---
title: Health line-limit auto sharding
type: implementation-plan
status: done
parent: "[[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index|agent-control-plane-plan]]"
created: 2026-05-10T10:37:30
updated: 2026-05-10T10:37:30
created_by: codex
updated_by: codex
tags:
  - agent/plan
  - initiative/pkm-ai
  - agent/workflow
---

# Health Line-Limit Auto Sharding

## Goal

Make the PKM-AI doc health check repair active Markdown `line-limit` failures without deleting context. Oversized docs are split into continuation shards that carry frontmatter identifying their source and parent document.

## Scope

Implemented:

- `check-doc-health.mjs --repair-line-limits`.
- Deterministic continuation shard generation beside each oversized source doc.
- Source doc truncation to the 200-line limit with a final continuation link.
- Shard frontmatter with `parent`, `shard_source`, `shard_of`, `shard_part`, created/updated timestamps, and `agent/shard` tag.
- Multi-shard continuation links when overflow exceeds one shard.
- `line_limit_sharded` metric events.
- Regression coverage in `doc-health.test.mjs`.

Not implemented in this slice:

- Parent-shape repair.
- Timestamp-offset repair.
- Forbidden `docs/superpowers` migration.
- Glossary candidate acceptance/rejection.

## Behavior

Normal health checks remain read-only:

```powershell
node .agents/tools/pkm-ai/check-doc-health.mjs
```

Repair mode mutates only active non-archive Markdown files that exceed the line limit:

```powershell
node .agents/tools/pkm-ai/check-doc-health.mjs --repair-line-limits
```

For each oversized source, the tool keeps the original frontmatter, preserves the first source lines that fit, appends:

```markdown
Continua en [[docs/path/to/source-shard-1|continuacion 1]].
```

and writes one or more `*-shard-N.md` files with YAML like:

```yaml
type: continuation-shard
parent: "[[docs/path/to/source|Source title]]"
shard_source: ".agents/docs/path/to/source.md"
shard_of: "[[docs/path/to/source|Source title]]"
shard_part: 1
```

## Live Repair Result

The live repair sharded all active `line-limit` residuals:

- 11 oversized source docs repaired.
- 12 continuation shard docs created.
- Follow-up health output dropped from `doc health: FAIL (46)` to `doc health: FAIL (35)`.
- No `line-limit` failures remain in the filtered health output.

Remaining failures are outside this slice:

- `forbidden-path` for `docs/superpowers`.
- `parent-shape` failures in superpowers/template/research draft docs.
- `timestamp-offset` failures in node-note UI assimilation research.
- Glossary warnings remain warnings.

## Verification

- RED: `node --test .agents/tools/pkm-ai/test/doc-health.test.mjs` failed on the new repair test because `long-plan.md` still reported `line-limit`.
- GREEN: focused doc-health test passed, 3/3.
- Full PKM-AI tool tests passed, 18/18:
  `npm --prefix .agents/tools/pkm-ai test`.
- `pnpm run lint` passed with 0 warnings and 0 errors.
- Scoped `git diff --check` passed for the tool, tests, docs, generated shards, current docs, and metrics.
- `node .agents/tools/pkm-ai/check-doc-health.mjs` still exits 1 with `doc health: FAIL (35)`, but no `line-limit` failure remains.
