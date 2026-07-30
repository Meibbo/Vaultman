---
title: PKM-AI retrieval and discovery audit
type: audit
status: needs-triage
lifecycle: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-07-28T19:05:00
updated: 2026-07-28T19:05:00
created_by: claude-opus-5
updated_by: claude-opus-5
tags:
  - agent/work
  - initiative/pkm-ai
  - tooling/retrieval
  - triage/needs-triage
---

# PKM-AI Retrieval And Discovery Audit

Adversarial pass requested by the dev on 2026-07-28 after a status question ("which BT5 issues stayed open after the last stable release") was answered by reading frontmatter file-by-file instead of querying the existing tooling. The dev had to name the tool explicitly. This audit asks why, and what else the tooling silently fails to cover.

Every finding below is backed by a command run against the live repo or by a cited source line. No inferred behavior.

## Shards

- [01-discovery-gaps.md](01-discovery-gaps.md) — why an agent does not reach for the tool (findings D1–D4).
- [02-index-corpus-and-embeddings.md](02-index-corpus-and-embeddings.md) — the two indexes, their divergent corpora, embedding coverage, staleness (findings R1–R5).
- [03-schema-and-vocabulary.md](03-schema-and-vocabulary.md) — status vocabulary, unindexed fields, missing operators (findings S1–S6).
- [04-fix-plan.md](04-fix-plan.md) — ordered remediation with acceptance criteria.

## Executive Matrix

| ID | Finding | Evidence | Severity |
| --- | --- | --- | --- |
| D1 | `AGENTS.md` frames `query-docs` as topic retrieval only; the structured filters are undocumented outside `--help` | [AGENTS.md:22](../../../../../../AGENTS.md) | high |
| D2 | Four docs/skills point at `.mjs` paths that no longer exist (tools migrated to `.ts` 2026-06-04) | `policies/docs.md:101`, `policies/tools.md:32`, `vm-backlog-manager/SKILL.md:31`, `vm-pkm-ai-guide/SKILL.md:27` | high |
| D3 | `vm-backlog-manager` matches status questions but frames the tool as post-edit index repair, not as a read path | `vm-backlog-manager/SKILL.md:29` | medium |
| D4 | The only SessionStart discovery protocol points at `codebase-memory-mcp` and never mentions pkm-ai | `.claude/settings.json` has no SessionStart hook | high |
| R1 | `search-index` (1129 docs, includes archive) and `retrieval-index` (1074 docs, `excludeArchive: true`) cover different corpora | `retrieval.mjs:31` vs `index-docs.ts:32` | medium |
| R2 | Vector search is the wrong instrument for predicate+completeness questions; frontmatter read is correct here | design analysis, see shard 02 | none (justification) |
| R3 | 212 of 1074 docs have no vector; **0 of 45** docs in the newest issue-set are embedded | live count, shard 02 | high |
| R4 | `lifecycle` is empty on 935 of 1074 docs, so lifecycle-weighted ranking barely discriminates | live count, shard 02 | medium |
| R5 | No staleness guard: `query-docs` serves a stale cache with no warning | [query-docs.ts:117](../../../../tools/pkm-ai/query-docs.ts) | critical |
| S1 | `status` has 31 distinct values across the corpus; "closed" is spelled 6 ways | live count, shard 03 | critical |
| S2 | `buildDocEntry` indexes 8 fields and omits `lifecycle`, `parent`, `created`, `updated_by` | [frontmatter.mjs:95](../../../../tools/pkm-ai/lib/frontmatter.mjs) | high |
| S3 | `initiative` is populated on 51 of 1129 docs (4.5%); the documented filter is effectively dead | live count, shard 03 | high |
| S4 | No negation, OR, or range operators — `updated > <date>` is unexpressible | `filterEntries` at `frontmatter.mjs:137` | high |
| S5 | `blocked_by` and commit hashes live in prose tables, not frontmatter | `bt5-final-stable-audit/index.md:26-45` | medium |
| S6 | Path filtering **does** work through free-text search but is undocumented | verified, shard 03 | low |

## Primary Finding

The tooling is not underpowered; it is **undiscoverable and unguarded**.

Two failures compound. First, nothing in the startup path tells an agent that inventory and status questions have a query path — the bootloader advertises only topic search, and the one hook that does impose a discovery protocol advertises a different system entirely. Second, when the tool *is* used, it has no integrity guard: a stale cache and an unnormalized `status` vocabulary both return confident, wrong answers with no error signal.

R5 and S1 are the dangerous pair. Every other finding costs tokens; those two cost correctness.

## Live Proof Of R5

During this session the index reported 1129 docs while 971 of them had already been moved off disk by the Google Drive client. `query-docs` kept answering from the stale cache without a single warning. The stale-index failure mode is not theoretical — it was reproduced in the same hour the finding was written.

The doc-loss incident itself is recorded separately in [[docs/architecture/operational-watch-list|operational-watch-list]] territory; this audit only claims the retrieval consequence.

## Antecedent

The 2026-07-06 audit already recorded PKM-AI semantic retrieval as unpopulated (`0` vectors) and gated embedding rebuild on doc recovery:
[[docs/work/pkm-ai/items/2026-07-06-codebase-intelligence-and-doc-recovery-audit/index|codebase intelligence and doc recovery audit]].
That gate was partially lifted (862 vectors now exist) but never completed, which is why R3 reads the way it does.
