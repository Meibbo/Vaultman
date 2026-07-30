---
title: Docs policy
type: policy
status: active
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
dateCreated: 2026-05-04T01:36:20
dateUpdated: 2026-07-30T01:32:59
updated_by: claude-opus-5
tags:
  - agent/policy
---

# Docs Policy

## Rules

- **Canonical-term citations in chat (2026-07-09, dev request):** when an agent uses a
  project-canonical term in a chat/grill answer (PanelHandle, data-plane, ActionNode,
  regime, …), cite the doc that defines it (glossary line / explorer-model shard / ADR /
  type file) so the dev can jump to the definition instead of re-asking. New terms coined
  mid-grill get a glossary (or shard) entry BEFORE further use. Usage examples given by the
  dev in chat are registered the same session in
  [[docs/architecture/usage-workflows|usage-workflows]].
- **Grill pendientes are born with a dossier (2026-07-10, dev request):** when a session
  defers a topic to a future grill/audit, the deferring agent creates (or appends to) a
  source-record dossier carrying the DATA that motivated it — census numbers, dev
  statements, verified findings, candidate options — and links it from the pendientes item.
  A future agent must be able to start the grill from the dossier alone, without the
  original chat.

- Line-limit tiers (navigation/sharding triggers, never an instruction to remove
  detail). Enforced by `tools/pkm-ai/check-doc-health.ts`:
    - **<= 200 lines**: clean.
    - **201-300 (soft range, limit .. limit+100)**: health emits a `line-limit-soft`
      WARN, not a failure. The agent must alert the dev to the oversized shard and let
      the dev decide whether to reduce or shard it. Do not auto-reduce;
      `--repair-line-limits` does not touch this range.
    - **> 300 (hard cap, limit+100)**: health fails; the doc must be split into a new
      shard part. `--repair-line-limits` auto-shards only past this cap.
- Preserve source detail first. Never compress, omit, summarize away, or delete
  technical context just to satisfy line limits.
- `current/status.md` and `current/handoff.md` are route indexes, not the
  canonical place for implementation records, verification logs, or detailed
  handoff history.
- For non-trivial work, decisions, investigation notes, verification logs, or
  handoff detail, create or update the complete source record inside the
  relevant initiative folder (`docs/work/<initiative>/items/`, `specs/`,
  `plans/`, `research/`, or `backlog/`). Put only a compact wikilink, current
  state, next action, and blockers in `current/status.md` or
  `current/handoff.md`.
- If no named initiative fits, create the complete source record under
  `docs/work/draft/` and link it from current docs until it is promoted.
- When current docs approach their limit, first move active detail into the
  relevant initiative source record. Archive only completed or superseded
  historical material, then link the archive. Do not micro-compress current
  files line-by-line just to satisfy the limit.
- Line limits protect navigation. They do not authorize lossy summaries.
- If a user asks for exhaustive capture, write the full detail without requiring
  them to separately say "do not omit detail".
- If sharding would slow down or interrupt capture, a temporary oversized source
  file is allowed. Add or queue a follow-up shard/manifest pass.
- Use timestamps as `YYYY-MM-DDTHH:mm:ss` with no timezone offset.
- Do not fabricate update times. If exact edit time is unavailable, mark the
  timestamp as approximate in the handoff or use a timestamp script.
- Use one `parent` property with a full-path Obsidian wikilink and initiative alias.
- Do not use `parent_path`.
- Include agent tracking in frontmatter:
    - `created_by`: the agent that created the document.
    - `updated_by`: the agent that last edited the document.
    - Allowed agents: `codex`, `claude`, `gemini`, `antigravity`, `perplexity`, `dev`.
    - The value SHOULD include the model after the agent name as
      `<agent>-<model>` (e.g. `claude-opus-4-7`, `codex-gpt-5-1`,
      `gemini-3-pro`) to record which model produced the edit. The bare agent
      name stays valid when the model is unknown.
- Frontmatter must be valid YAML. Quote any value containing `:`, `#`, or a leading `[`,
  `{`, `*`, `&` — an unquoted colon inside `title:` (`title: BT5-096 — Dependency refresh:
  3 high advisories`) reads as a nested mapping and makes the block unparseable.
    - A doc whose frontmatter does not parse is a health failure (`frontmatter-yaml`,
      reported with the file line/column of the YAML error) and is SKIPPED by the index
      build — `index-docs.ts` still indexes every other doc, reports the skip on stderr,
      and exits 0; `check-doc-health.ts` is the gate that fails. `frontmatter-parse` stays
      the catch-all code for errors thrown by the validators themselves.
- Keep indexes compact; shard large docs into folder manifests.
- Shards may be thematic or continuation-based. Do not force a topic boundary
  just to satisfy a line limit. If one topic exceeds the page size, continue it
  in `part-2`, `part-3`, or similarly named shards, then route the next topic to
  a separate shard.
- Keep `current/handoff.md` compact; route long handoff history to the active
  initiative source record while work remains, or to an archive only when that
  history is superseded.
- Do not delete agent working memory when the user asked for archive; move it to
  `docs/archive/<initiative>/...` or record the replacement path.
- When replacing a long active file, preserve the full source record first in
  the relevant initiative or archive location, then create a route summary or
  shard manifest that links to the preserved detail.
- Before replacing `current/status.md`, `current/handoff.md`, specs, plans, or
  policies in a way that removes substantial content, run
  `tools/pkm-ai/archive-active-doc.mjs` and link the archive from the
  replacement with `archive_source` or an explicit archive wikilink/path.
- Compacting or rewriting away detail without an archive source is a health
  failure, even if the active file satisfies line limits.
- A 200-line active route summary is useful only if it lets the agent reconstruct
  the big picture from linked source records and shards.
- Prefer detailed shards over terse summaries whenever the material is a spec,
  plan, design rationale, domain model, regression report, or implementation
  handoff.
- Before answering about an unfamiliar domain term, consult
  `docs/architecture/glossary.md` or
  `tools/pkm-ai/query-docs.ts --glossary <term>`.
- If a term is missing from the glossary, say it is not in the glossary and
  propose adding it or marking it as an external/test term.
- New docs that intentionally introduce glossary candidates should list them in
  `glossary_candidates` until they are accepted or rejected.

## Memory Lifecycle (PKM-AI ADR 0002)

- Every memory entry MAY carry an explicit **`lifecycle:`** frontmatter field — one of `active` ·
  `deferred` · `triaged` · `blocked` · `superseded` · `archived`. This is ADDITIVE: `status:` stays the
  free-form doc-workflow field; `lifecycle:` is the curation state. Absent `lifecycle:` is allowed
  (adoption is incremental), but an invalid value is a health failure (`lifecycle-state`).
- **Working-surface rule:** `current/status.md`, `current/handoff.md`, and the session-log surface ONLY
  `active` items plus compact pointers. `deferred`/`triaged`/`blocked` material lives in its initiative
  source record (+ the agent-room registry), surfaced on query — not inlined into the active surfaces.
- **Supersede / archive:** move `superseded`/`archived` material out via
  `tools/pkm-ai/archive-active-doc.mjs` (archive-first) and link it — never delete (706-file-deletion risk).
- **Stale-active curation:** `check-doc-health.ts --stale-active-days N` (default 30) WARNs when a
  `lifecycle:active` doc is untouched past N days, so a recurring curation pass can demote it to
  `deferred`/`superseded`/`archived`. The pass is curation, not deletion.
- **Retrieval coupling:** rank weights lifecycle (`active` > `deferred` > `superseded`) so queries surface
  live material first (ties PKM-AI ADR 0003 + the retrieval channel, S6).

## Status Vocabulary (query-side normalization, 2026-07-28)

The corpus spells each workflow state several ways — a census on 2026-07-28 found
**31 distinct `status` values**, with "closed" written six ways. `status` stays
free-form; `query-docs.ts` normalizes at query time so exact-match filters stop
lying by omission. Canonical groups (code: `lib/frontmatter.mjs`):

- **closed** — `completed` · `complete` · `done` · `closed` · `released` · `passed`.
- **inactive** — `archived` · `superseded` · `historical`. Matched by neither
  `--open` nor `--closed`.
- **open** — everything else with a value, plus any unrecognized spelling.
  Unrecognized values are counted as open and **reported on stderr**, so
  vocabulary drift surfaces instead of silently dropping docs.

Use `--open` / `--closed` rather than guessing a spelling. When adding a new
`status` value, add it to the matching group in the same commit.

Full analysis and remaining work:
[[docs/work/pkm-ai/items/2026-07-28-retrieval-discovery-audit/index|retrieval and discovery audit]].

## Retrieval Rule (2026-07-28)

Inventory and status questions over `.agents/docs` — "which items are open",
"what changed since X", "list every spec of initiative Y" — are answered by
querying the index, never by reading or grepping files one by one:

```
node .agents/tools/pkm-ai/query-docs.ts --open --tag initiative/polish
node .agents/tools/pkm-ai/query-docs.ts --status needs-triage bt5-final-stable-audit
```

Free-text terms match `id`, `title`, `type`, `status`, `initiative` **and
`path`**, so a folder name filters by location. The index warns on stderr when it
is stale; `--refresh` rebuilds it. If a documented tool path does not exist,
report it instead of silently falling back to grep.

## Read When

- Creating, migrating, refreshing, or reviewing agent docs.

## Do Not Read When

- Editing product code with no docs impact.

## Related Decisions

- Authoring policies from PKM-AI orchestration refresh.

## Repair Triggers

- The hard line cap (limit + 100 = 300) is exceeded. Soft-range overages (201-300) are
  dev-decided alerts, not failures.
- Frontmatter fails YAML parsing.
- Parent links are missing, duplicated, or use `parent_path`.
- Active docs accumulate historical logs.
- Archived source for deleted working memory cannot be found.
- A summary has no source record, shard, or archive link for its lost detail.
- `current/status.md` or `current/handoff.md` contains multi-step work logs,
  phase-by-phase implementation history, or command transcripts without a
  linked initiative source record.
- Active work detail was archived instead of being promoted to the relevant
  initiative record.
- Unknown `glossary_candidates` appear in active docs.
- A `lifecycle:` value is not one of the six ADR 0002 states.
