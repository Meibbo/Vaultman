---
title: Docs policy
type: policy
status: active
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-06-05T00:00:00
updated_by: claude-opus-4-8
tags:
  - agent/policy
---

# Docs Policy

## Rules

- Line-limit tiers (navigation/sharding triggers, never an instruction to remove
  detail). Enforced by `tools/pkm-ai/check-doc-health.mjs`:
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
  `tools/pkm-ai/query-docs.mjs --glossary <term>`.
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
- **Stale-active curation:** `check-doc-health.mjs --stale-active-days N` (default 30) WARNs when a
  `lifecycle:active` doc is untouched past N days, so a recurring curation pass can demote it to
  `deferred`/`superseded`/`archived`. The pass is curation, not deletion.
- **Retrieval coupling:** rank weights lifecycle (`active` > `deferred` > `superseded`) so queries surface
  live material first (ties PKM-AI ADR 0003 + the retrieval channel, S6).

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
