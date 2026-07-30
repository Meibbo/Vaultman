---
title: Index corpora, embeddings and staleness
type: audit-shard
status: needs-triage
lifecycle: active
parent: "[[docs/work/pkm-ai/items/2026-07-28-retrieval-discovery-audit/index|retrieval-discovery-audit]]"
created: 2026-07-28T19:05:00
updated: 2026-07-28T19:05:00
created_by: claude-opus-5
updated_by: claude-opus-5
tags:
  - agent/work
  - initiative/pkm-ai
  - tooling/retrieval
---

# Index Corpora, Embeddings And Staleness

The dev's second question: if PKM-AI has its own vectorization, why does the status query read physical frontmatter at all?

## R1 — Two indexes, two corpora, undocumented asymmetry

`index-docs.ts` writes both caches in one run, from two different walks:

| Cache | Builder | Options | Docs |
| --- | --- | --- | --- |
| `.agents/cache/search-index.json` | `buildIndex`, `frontmatter.mjs:112` | `excludeArchiveRaw: false, excludeTemplates: true` | 1129 |
| `.agents/cache/retrieval-index.json` | `buildRetrievalIndex`, `retrieval.mjs:31` | `excludeArchive: true` | 1074 |

Same command, same moment, 55-doc delta. Those 55 archived docs are reachable by `--status`/`--tag` and **invisible** to `--rank`, `--hybrid`, and `--semantic`.
Nothing in `--help` or any policy states that the ranking modes silently drop the archive.

## R2 — Vector search is the wrong instrument for this question (justification)

Reading frontmatter here was correct, and would remain correct after every fix in this audit.

"Which issues stayed open" is a **predicate + completeness** query: the answer is the full set of 13 or it is wrong. BM25 and embeddings return similarity rankings with no recall guarantee. Answering it semantically would produce a plausible, incomplete list with no signal that anything was missing — strictly worse than grep, because it looks authoritative.

Structured filters over frontmatter are the right channel. The problem is not that the tool reads files; it is that the field it reads is unnormalized (S1) and the cache it reads from can be stale (R5).

## R3 — Embedding coverage is partial and inverted

Live counts against `retrieval-index.json`:

```
embedModel local-transformers   dims 384   docs 1074
docs with vector:                862
docs without vector:             212
docs in bt5-final-stable-audit:   45
of those, with vector:             0
```

Zero of forty-five. `embed-docs.ts` is a separate manual step; `index-docs.ts` only **reuses** existing vectors keyed by `contentHash` (`index-docs.ts:61-68`).
Nothing in the pipeline embeds new or changed docs.

The consequence is inverted priority: **the newest and most actively referenced work is exactly what semantic search cannot see.** `--semantic` either exits `2` ("no embeddings found", `query-docs.ts:66`) or returns results biased entirely toward older material, with no coverage warning.

## R4 — Lifecycle weighting barely discriminates

`lifecycle` distribution across the 1074 retrieval docs:

```
(empty)      935
active       135
archived       2
superseded     1
deferred       1
```

`--rank`, `--hybrid`, and `--semantic` all advertise lifecycle weighting, and `retrieval.mjs:9-10` deliberately gives docs without `lifecycle` a neutral default so the pre-lifecycle corpus is not penalized. That default now applies to 87% of the corpus, so the weighting is close to a no-op.

`policies/docs.md:107-122` documents the full six-state model (ADR 0002) and its retrieval coupling. Adoption stalled at 13%.

## R5 — No staleness guard (critical)

`query-docs.ts:117` reads the cache when it exists and only builds in memory when it does not:

```ts
const entries: DocEntry[] = fs.existsSync(cachePath)
  ? JSON.parse(fs.readFileSync(cachePath, "utf8")).entries
  : buildIndex(root, { excludeArchiveRaw: false, excludeTemplates: true });
```

There is no comparison of `generated_at` against the newest mtime under `.agents/docs`, no age threshold, no warning. Nothing in the repo re-runs `index-docs.ts`: no hook, no watcher, no scheduled task.

At the start of this session the cache was dated 2026-07-21 while the issue-set being queried was created 2026-07-22 and edited through 2026-07-28. The tool returned an empty result set for the first query and gave no indication why. The agent's recovery was manual inspection of the cache file's mtime — a step no policy prescribes and most agents will skip.

### Reproduced live, same session

Roughly thirty minutes after the index was rebuilt, the Google Drive client moved 971 of the 1129 indexed docs out of the repository. `query-docs` continued to answer from the cache, listing paths that no longer existed, with full confidence and no error. The stale-cache failure mode was demonstrated against real data loss while this audit was being written.

A staleness guard would not have prevented the doc loss. It would have surfaced it in seconds instead of by accident.
