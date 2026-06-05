---
title: PKM-AI multi-agent orchestration upgrade (registry + versioning + tooling + gbrain/pi-agent)
type: work-item
status: vision-captured
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-06-04T00:00:00
updated: 2026-06-04T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/pkm-ai
  - agent/memory
  - initiative/pkm-ai
---

# PKM-AI Multi-Agent Orchestration Upgrade

Dev vision (2026-06-04): make PKM-AI support **mega agentic orchestration** across parallel threads,
queryable with **minimal tokens**. The enabler for the "multiple simultaneous grills" the dev wants.

## Context — the parallel-thread reality

3+ live threads across streams (no shared-memory protocol yet):
- **goal stream** ("anchor", dev-confirmed) = architecture-direction grills (this thread, Claude).
- **stable stream** = `main`/1.0.x updates (Codex thread #1).
- **proto stream** = proto-vs-streams shards (Codex thread #2; cf. `2026-05-29-version-streams-vertical-codebase-analysis`).

Contention: shared `status.md`/`handoff.md` overwritten in place → threads steal each other's working
memory + context compaction loses detail. (Confirmed: those files dirty 2026-06-04.)

## Dump origin vs new

- Seeded in dump: **MD-P3** (verify interconnectivity + mind-routing) + **MD-P4** (orchestrate all memory
  types + info discipline). Verbatim: [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/03-intake-verbatim-part-2|part-2]] L92/L94.
- NEW (2026-06-04): the multi-thread **registry + anti-collision** concern below — not in the dump.

## The asks

1. **Thread/agent registry (queryable, min-token).** Any agent can answer, cheaply: which threads exist ·
   which agent/model · which stream/initiative · activity level / participation records · which memory
   regions each touches · how to mutate short-term memory WITHOUT colliding. Extends `session-log` (journal)
   + S-12 (append-only per-session shards) + S-13 (topic-index). New piece = a LIVE "active-threads" index
   (vs the historical journal). This is the core of "extrema eficiencia en gestión de memorias".
   **REFRAME (verified 2026-06-04): the substrate ALREADY EXISTS** — `agent-room.mjs` (37 KB:
   run/agent-heartbeat/task-claim/scope-conflicts/mailbox/status/dashboard) + `.agents/state/`
   (locks/runs/agents/events.jsonl/tasks.json/status.json), lapsed since 2026-05-26. Upgrade = SURFACE +
   route it (AGENTS.md/start.md) + a min-token query, NOT build from scratch. See
   [[docs/work/pkm-ai/items/2026-06-04-gbrain-pi-agent-research|gbrain/pi research]].
2. **pi-agent orchestration model** — learn from how "pi agent" does mega agentic orchestration via
   community `.ts` plugins. Dev uses Claude+Codex on monthly-plan CLIs (NO API budget), so adapt the
   PATTERNS, not the API-dependent tool. (Research dispatched; "pi agent" ambiguous — confirm exact tool.)
3. **PKM-AI versioning system** — version the docs/tooling SYSTEM itself, so upgrades are tracked and an
   agent knows which PKM-AI version/contract it is operating under.
4. **PKM-AI tooling update** — the `.mjs` scripts (`query-docs`, `index-docs`, `check-doc-health`,
   `update-indexes`) + new: registry query + version surface. Make plugins/scripts "más extensos y capaces".
5. **gbrain research + adapt/install** — DONE → [[docs/work/pkm-ai/items/2026-06-04-gbrain-pi-agent-research|research record]].
   gbrain (garrytan/gbrain, MIT) = self-wiring `[[wikilink]]`→typed-edge graph (**zero-LLM, free**) + hybrid
   vector/BM25 retrieval (**vectors need an API key → optional/local** to respect no-API stance). Borrow the
   graph into `traverse-graph.mjs`; vectors later. pi-agent = orchestration model already mirrored by agent-room.

## Sequencing (this gates the multi-grill landscape pass)

Prereqs from the [[docs/work/pkm-ai/items/2026-06-03-mind-routing-and-health-audit|2026-06-03 audit]]:
adopt **S-12** (append-only shards) + **P4 cleanup** (121 health FAILs + 4 conflict files) + **inventory
readjustment** FIRST. THEN build registry + versioning + tooling, informed by gbrain/pi-agent research.
Only then launch simultaneous grills safely.

## Design conclusions (2026-06-04 grill)

- **Root cause = routing/discipline gap, NOT missing tools.** agent-room exists but unused since 2026-05-26
  because AGENTS.md/start.md never MANDATED it → optional → sandbox accumulation. Two missing layers:
  (1) mandatory protocol wiring; (2) memory **LIFECYCLE** (entries lack active/deferred/triaged/superseded
  state + pruning). Better retrieval/tools alone won't fix accumulation — needs curation discipline.
- **Metaphor:** not a "social network / feed" (that IS today's unbounded accumulation) but a **curated ops
  board + institutional memory** (presence + claimed-work + handoff + ranked searchable wiki). Collective
  intelligence needs a librarian (lifecycle + rerank), not just posting.
- **Retrieval channel (vector + BM25 + rerank) = YES** — the min-token "find relevant cheaply" substrate.
  Start FREE: BM25 (query-docs) + zero-LLM wikilink graph (traverse-graph / gbrain); vectors only if
  API/local-embeddings acceptable.
- **`.ts` migration = feasible now, ~zero cost:** Node v24.15 runs `.ts` natively (type-stripping; `node x.ts`,
  no build, no Bun/tsx). Constraint: erasable types only (no enums/namespaces/param-properties). Phased —
  types where they pay (agent-room · manage-tasks · check-doc-health · split-shard first); skip trivial
  scripts. → small ADR.
- **AGENTS.md = the fix's center.** The one file every zero-context agent reads first → encode a MANDATORY,
  numbered **Runtime Startup Sequence** (visible priority hierarchy), pointing to detail docs, staying lean.
  Proposed: identify(agent/stream/task) → `agent-room` join+heartbeat → retrieval-first query (top-k, not
  read-all) → status/handoff as route only → **scope-claim before shared-memory edits / own session-shard
  for own memory (S-12)** → route by mode → exit (session-log append + scope release + leave).
- **Coordination = shared-brain-on-disk, NO master agent** (dev 2026-06-04). agent-room IS the brain:
  `scope claim`=presence · `mailbox`=A↔B talk · `task` status incl. waiting/blocked/question=dependency
  waiting · `events.jsonl`=reactive feed · heartbeat=liveness. "Semi-real-time" = poll at turn boundaries
  (CLI agents ≠ live sockets). Add: task DEPENDENCIES (B waits on A) + poll convention + the MANDATE. Peers,
  not a subagent master.
- **ADR scope + pipeline:** PKM-AI = sub-project → its OWN [[docs/work/pkm-ai/adr/README|work/pkm-ai/adr]]
  (separate from product `architecture/adr`). `.ts` migration = [[docs/work/pkm-ai/adr/0001-scripts-typescript-migration|PKM-AI ADR 0001]]
  (Accepted). Pipeline: NOW = lock decisions as small PKM-AI ADRs (0001 .ts ✓ · runtime-startup +
  mandatory-protocol · memory-lifecycle · coordination) → THEN one PKM-AI **spec** → **plan** → **execute**.
  Progress: ADRs **0001–0006** ✓ · agent-room smoke ✓ · R-EMBED research ✓ · **spec S1–S6** ✓ →
  [[docs/work/pkm-ai/specs/2026-06-04-orchestration-upgrade/index|spec]]. **Phase 2 plan started** →
  [[docs/work/pkm-ai/plans/2026-06-04-orchestration-upgrade/index|plan]] (index + S1 shard ✓; S2–S6 outlined; issues PKM-1..6). **S1+S2 EXECUTED** — S1 `d974af2` (AGENTS.md mandate); S2 `0baad20`…`a778f48` (cross-stream shared room:
git-common-dir state-root + atomic `ensureRun` + stream/worktree tags + `task --depends-on` + `coordination.md`;
cross-worktree 2-agent run verified live; 16 tests green). **S3a EXECUTED** `40405a9`/`8d5aad2` — new
additive `lifecycle:` field + `check-doc-health` lifecycle-state/stale-active checks + ADR 0002 amended
(status→lifecycle field); **S3b prune DEFERRED** (123 health fails; 85 in Codex's hardening + 1 current/ →
coordinated window). Next: S4 (versioning) / S5 (.ts migration) parallel; coordinate the S3b prune.

## Ties

S-12 / S-13 / S-14 · [[docs/work/pkm-ai/items/2026-05-27-agent-memory-routing-upgrade|agent-memory-routing-upgrade]]
· [[docs/sessions/session-log|session-log]] · [[docs/architecture/agent-memory-routing-best-practices|best-practices]]
· operational-watch-list §9/§10 · version-streams (5 streams) · [[docs/sessions/2026-06-04-claude-opus-anchor-checkpoint|2026-06-04 checkpoint]].

## Status

Vision captured; gbrain + pi-agent research DONE ([[docs/work/pkm-ai/items/2026-06-04-gbrain-pi-agent-research|record]]).
**Key finding:** the orchestration/registry substrate is ALREADY BUILT (`agent-room.mjs` + `.agents/state/`,
lapsed) — so the upgrade = (a) re-surface/route agent-room [free, solves Codex-collision NOW], (b) add
gbrain zero-LLM wikilink graph + retrieval, (c) PKM-AI versioning (agent-room `schemaVersion:1` → system-wide),
(d) tooling update. NOT implemented — gated on dev. Candidate sub-initiative (spec + versioning ADR).
