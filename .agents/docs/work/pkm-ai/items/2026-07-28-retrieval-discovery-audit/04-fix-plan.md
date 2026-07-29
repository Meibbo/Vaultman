---
title: Ordered remediation plan
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

# Ordered Remediation Plan

Ordering principle: correctness guards before capability. Findings that make the
tool *lie* are fixed before findings that make it *limited*, because every
capability added on top of an unguarded cache multiplies the blast radius of a
wrong answer.

Tests live in `.agents/tools/pkm-ai/test/` and run with `node --test`.

## F1 — Staleness guard (closes R5) · critical

`query-docs` compares the cache's `generated_at` against the newest mtime under
`.agents/docs` and refuses to answer silently from a stale cache.

- Warn on stderr when any doc is newer than `generated_at`, naming the count and
  the newest path.
- `--refresh` rebuilds in place before querying.
- `--strict` exits non-zero instead of warning, for scripted callers.
- Warning goes to stderr so `--json` stdout stays machine-parseable.

**Acceptance:** with a doc touched after the cache is written, a bare query emits
the warning and still returns rows; `--strict` exits `1`; `--refresh` returns
fresh rows with no warning. Regression test covers all three.

## F2 — Status vocabulary normalization (closes S1) · critical

- Add a synonym map: closed = `completed|complete|done|closed|released|passed`;
  open = everything else that is not archived/superseded.
- Add `--open` and `--closed` shorthands built on that map.
- Make `--status` accept a comma list (`--status completed,done`).
- Emit a one-line census warning when a queried folder contains status values
  outside the known map, so unknown vocabulary surfaces instead of vanishing.

Normalizing the *documents* is a separate, larger curation pass. This slice makes
the *query* correct against the corpus as it exists today. Document the mapping
in `policies/docs.md` so the two never drift.

**Acceptance:** `--closed` over `.agents/docs` returns 223 docs (123 + 76 + 21 +
1 + 1 + 1) against the current corpus; `--open` and `--closed` partition the
non-empty-status set with no overlap. Regression test asserts the partition.

## F3 — Dead paths and the discovery rule (closes D1, D2, D4) · high

- Rewrite the four `.mjs` references to `.ts` (`policies/docs.md:101`,
  `policies/tools.md:32`, `vm-backlog-manager/SKILL.md:31-32`,
  `vm-pkm-ai-guide/SKILL.md:27`), plus the `check-doc-health.mjs` mentions at
  `policies/docs.md:32` and `:118`.
- Add the inventory-query rule to `AGENTS.md` step 2 and `policies/docs.md`:
  status/inventory questions go through `query-docs`, never through file reads.
- Add a `--help` line stating that free-text terms match paths (closes S6).
- Consider a health check that greps agent-facing docs for tool paths that do not
  resolve on disk, so D2 cannot recur silently.

**Acceptance:** every tool path cited in `.agents/docs` and `.claude/skills`
resolves to an existing file; the health check fails when one does not.

## F4 — Schema and operators (closes S2, S3, S4) · high

- Index `lifecycle`, `parent`, `created`, `updated_by` in `buildDocEntry`.
- Add `--lifecycle`, `--since <date>`, `--until <date>`, `--not <field>=<value>`.
- Make `--initiative` fall back to the `initiative/<x>` tag when the frontmatter
  key is absent, so the documented filter stops returning `[]` on 95% of docs.
- Add `--parent <wikilink|path>` for issue-set membership.

Rebuilding the index is required after this change; F1's guard makes the
resulting staleness visible, which is why F1 precedes it.

**Acceptance:** `--since 2026-07-23 --open` reproduces the BT5 open set without
post-processing; `--initiative polish` returns the same rows as
`--tag initiative/polish`.

## F5 — Decide the semantic channel (closes R3, R4) · medium

Two honest options; the current state is neither.

1. **Complete it** — chain `embed-docs` into `index-docs` for changed docs only
   (the `contentHash` reuse path already exists), and run the `lifecycle`
   backfill so the weighting means something.
2. **Mark it experimental** — document that `--semantic` covers only embedded
   docs, print coverage (`n/m embedded`) on every semantic query, and stop
   advertising it in `--help` as a peer of `--rank`.

Zero coverage on the newest issue-set is worse than no semantic mode, because it
fails toward stale material rather than toward nothing.

**Acceptance (option 1):** a doc created after the last embed run is retrievable
by `--semantic` without a manual `embed-docs` call. **(Option 2):** every
`--semantic` invocation prints its coverage ratio.

## Out Of Scope

- S5 (`blocked_by` / commit hashes in prose) needs a frontmatter schema decision
  for issue docs, which is a triage-policy change rather than a tooling change.
  Recorded, not scheduled.
- Corpus-wide `status` and `lifecycle` curation. F2 and F5 make the current
  corpus queryable; the cleanup pass is separate work.
