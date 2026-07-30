---
title: Schema, vocabulary and missing operators
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

# Schema, Vocabulary And Missing Operators

What the query layer cannot express, and where it answers wrongly without saying so.

## S1 — 31 distinct `status` values, exact-match filtering (critical)

Live distribution over 1129 indexed docs:

```
active 377 · draft 299 · completed 123 · done 76 · complete 21 · (empty) 121
needs-triage 24 · pending 22 · approved-draft 11 · in-progress 7 · approved 7
open 6 · deferred 5 · accepted 4 · historical 4 · todo 3 · archived 2
ready 2 · ready-for-review 2 · triaged 2 · closed 1 · released 1 · passed 1
partial 1 · handed-off 1 · pending-hitl 1 · resolved-pending-adr 1 · verify 1
reference 1 · draft-living 1 · vision-captured 1
```

"Closed" is spelled six ways: `completed` (123), `done` (76), `complete` (21), `closed` (1), `released` (1), `passed` (1). "Open" is spelled at least ten.

`filterEntries` compares with strict inequality (`frontmatter.mjs:144`):

```js
} else if ((entry[key] ?? "") !== value) {
  return false;
}
```

No synonym map, no case folding, no negation. So `--status completed` silently omits 100 closed docs, and reports success.

**The BT5 answer was correct by luck.** That folder happens to use a consistent vocabulary (`completed` / `needs-triage` / `in-progress` / `deferred`). Ask the same question about `work/hardening` and the same command lies by omission with no error, no warning, and no way for the agent to notice.

This is the highest-value fix in the audit: it converts a tool that is *sometimes* right into one that is *checkably* right.

## S2 — The indexed schema drops the fields that matter

`buildDocEntry` (`frontmatter.mjs:95-106`) captures exactly eight fields:

```
path · title · type · status · initiative · id · tags · updated
```

Not captured:

- **`lifecycle`** — the canonical curation state per ADR 0002, validated by `check-doc-health.ts:88-89`, weighted by the ranking modes, and absent from the filter index. Two parallel state fields exist and only one is queryable.
- **`parent`** — so issue-set membership cannot be queried. "All children of the BT5 index" requires either a path convention or `traverse-graph.ts`.
- **`created`**, **`updated_by`** — no provenance or age-of-creation filtering.

## S3 — `initiative` is populated on 4.5% of docs

```
entries with initiative set: 51 of 1129
```

`--initiative pkm-ai` is the second filter listed in `--help`. Against this corpus it returns almost nothing, because issue docs carry the initiative as a **tag** (`initiative/polish`) rather than a frontmatter key. The working call is `--tag initiative/polish`; the documented one is a trap that returns `[]` and looks like "no results" rather than "wrong field".

## S4 — No negation, disjunction, or range

`filterEntries` supports only conjunctive exact matches plus a free-text substring/token pass. Unexpressible:

- `status != completed` — i.e. the literal question "what is still open".
- `status in (completed, done, complete)` — needed until S1 is fixed.
- `updated > 2026-07-23` — i.e. the literal question "after the last stable release". The `updated` field **is** indexed; no operator consumes it.

The triggering question needed two operators the tool does not have. It was answered by post-processing `--json` through an ad-hoc Node one-liner.

## S5 — Blocking and provenance live in prose

`blocked_by` and shipped-commit hashes for the BT5 set exist only as Markdown table columns in [[docs/work/polish/issues/bt5-final-stable-audit/index|the issue-set index]] (lines 26-45 and 52-62). They are not frontmatter, so no query can answer "which open issues are unblocked right now" — the single most useful scheduling question for an AFK agent.

## S6 — Path filtering works, and is undocumented

Recorded as a correction to this audit's own first draft, which claimed no path filter existed. That claim was wrong.

`filterEntries` includes `entry.path` in the free-text haystack (`frontmatter.mjs:149-154`) and tokenizes on non-alphanumerics, so a folder name passed as a search term filters by path. Verified:

```
node .agents/tools/pkm-ai/query-docs.ts --status needs-triage bt5-final-stable-audit
→ 11 rows, all under .agents/docs/work/polish/issues/bt5-final-stable-audit/
```

The capability exists; the documentation reads `[search terms]` and never says those terms match paths. Cheapest possible fix in the audit: one `--help` line.
