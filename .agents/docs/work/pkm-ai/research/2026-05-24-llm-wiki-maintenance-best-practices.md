---
title: LLM Wiki Maintenance Best Practices
type: research
status: active
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-24T23:59:00
updated: 2026-05-25T00:29:54
tags:
  - agent/research
  - initiative/pkm-ai
  - pkm-ai/wiki
  - pkm-ai/rag
created_by: antigravity
updated_by: codex
---

# LLM Wiki Maintenance Best Practices

Research update for maintaining Vaultman PKM-AI as an LLM-readable local
knowledge system: Markdown/Obsidian source records, route indexes, agent
instructions, search tooling, and verification loops.

## Verdict

PKM-AI should use a **compiled wiki + route-index + retrieval** architecture,
not a pure RAG dump and not a giant all-loaded instruction file.

- **Karpathy's LLM Wiki pattern** is the closest public pattern: immutable raw
  sources, an LLM-maintained Markdown wiki, and a schema file such as
  `AGENTS.md` or `CLAUDE.md` that defines workflows.
- **Nate Herk's AI OS pattern** is useful as practitioner guidance: organize
  context, connections, capabilities, and cadence; route reusable procedures
  into skills; keep a hot cache; convert failures into durable docs.
- **Anthropic/OpenAI agent guidance** converges on the same operational rule:
  context is finite; keep always-loaded files compact and specific; retrieve
  high-signal detail just in time; verify work with explicit tests or checks.
- **Modern RAG practice** remains useful below the wiki layer: hybrid search,
  reranking, query rewriting, and graph/global-local retrieval are retrieval
  tools, not substitutes for curated source records.

## Evidence Ledger

| Source | Type | Verified claim | PKM-AI implication |
|---|---|---|---|
| [Karpathy, `llm-wiki.md`, 2026-04-04](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) | Primary idea file | LLM Wiki has raw immutable sources, LLM-generated wiki pages, and a schema file that governs ingest/query/maintenance. It uses `index.md` and `log.md`, and recommends lint passes for contradictions, stale claims, orphan pages, and missing concepts. | Treat `.agents/docs/work/**` as the maintained wiki/source layer; keep route indexes compact; add lint/checklist routines for contradictions, stale links, and orphaned source records. |
| [Nate Herk, AI OS article, 2026-05-04](https://www.linkedin.com/pulse/my-claude-code-os-runs-3myr-business-steal-nate-herkelman-a3vac) | Primary practitioner article | AI OS uses the Four Cs: context, connections, capabilities, cadence. His repo anatomy separates contexts, decisions, references, skills, archives, and secrets. He adds a small hot cache and weekly audit/level-up loops. | Keep PKM-AI folders role-specific; make skills the home for repeatable SOPs; add a short "hot" routing cache only if it remains source-linked and audited. |
| [Anthropic, Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Vendor engineering guidance | Long-horizon agents need compaction, structured note-taking, and sub-agent architectures; large context windows still suffer from context pollution and relevance issues. | Prefer source records plus compact route summaries; use subagents for independent research; preserve high-fidelity notes outside the live context. |
| [Anthropic, Claude Code memory docs](https://docs.anthropic.com/en/docs/claude-code/memory) | Vendor docs | Persistent instruction files are context, not enforcement. Specific, concise, structured instructions work best; target under 200 lines per `CLAUDE.md`; path-scoped rules reduce noise. | Vaultman's 200-line rule is valid as a navigation trigger. Keep `AGENTS.md`, `start.md`, `status.md`, and `handoff.md` as routers, not warehouses. |
| [OpenAI, Introducing Codex](https://openai.com/index/introducing-codex/) and [Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/) | Vendor engineering/docs | Codex uses repo instructions such as `AGENTS.md`, executes in task environments, and depends on context-window management/compaction during agent loops. | `AGENTS.md` should tell agents how to navigate, test, and obey project practice; verification evidence belongs in source records. |
| [AGENTS.md open format](https://agents.md/) | Ecosystem spec | `AGENTS.md` is a predictable Markdown place for build steps, tests, conventions, and security notes; nested files can scope instructions to subprojects. | Keep Vaultman AGENTS bootloader minimal and path-aware; avoid duplicating full policies into every route. |
| [Microsoft, RAG techniques, 2025-02-04](https://www.microsoft.com/en-us/microsoft-cloud/blog/2025/02/04/common-retrieval-augmented-generation-rag-techniques-explained/) | Vendor overview | RAG pipelines commonly combine full-text search, vector search, chunking, hybrid search, query rewriting, and reranking. | PKM-AI search should start with local text search/query-docs, then consider hybrid/rerank only where current lookup fails. |
| [Microsoft Research, DRIFT Search, 2024-10-31](https://www.microsoft.com/en-us/research/blog/introducing-drift-search-combining-global-and-local-search-methods-to-improve-quality-and-efficiency/) | Research/product blog | GraphRAG builds entity/relationship/community summaries; DRIFT combines global community context with local follow-up search for broad+deep queries. | For large initiatives, use overview indexes plus detailed shards; answer broad questions from indexes first, then drill into shards/source files. |
| [LlamaIndex evaluation docs](https://llamaindex.openml.io/python/framework/module_guides/evaluating/) | Framework docs | RAG quality requires response evaluation and retrieval evaluation; retrieval can be measured with MRR, hit-rate, precision, and related metrics. | Add measurable health checks for source retrieval: did query-docs find the right source, and did the answer cite it? |
| [Lost in the Middle, arXiv:2307.03172](https://arxiv.org/abs/2307.03172) | Research | LLM performance is often worse when relevant facts sit in the middle of long contexts. | Do not rely on long concatenated docs. Put decisive route facts at file tops and use indexes to retrieve detail. |
| [Context as a Tool, arXiv:2512.22087](https://arxiv.org/abs/2512.22087) | Research | Long-horizon SWE agents suffer context explosion and semantic drift; structured context workspaces and proactive compression improve stability. | PKM-AI should treat context management as an explicit workflow, not an accidental chat side effect. |
| [Memory for Autonomous LLM Agents, arXiv:2603.07670](https://arxiv.org/abs/2603.07670) | Survey | Agent memory needs a write-manage-read loop; practical concerns include contradiction handling, latency, privacy, and learned forgetting. | Every PKM write path needs source provenance, contradiction handling, and stale/superseded-state policy. |
| [Agent Drift, arXiv:2601.04170](https://arxiv.org/abs/2601.04170) | Early research | Long multi-agent interactions can degrade through semantic, coordination, and behavioral drift; proposed mitigations include memory consolidation and behavioral anchoring. | Use source-linked specs, explicit invariants, and verification gates to anchor future agents. |
| [AGENTS.md effectiveness, arXiv:2602.11988](https://arxiv.org/abs/2602.11988) and [AGENTS.md efficiency, arXiv:2601.20404](https://arxiv.org/abs/2601.20404) | Early research, mixed results | Evidence is mixed: one paper reports context files can reduce task success and raise cost when they add unnecessary requirements; another finds lower median runtime/token output in its sample. | Keep AGENTS content minimal, measure real outcomes, and avoid turning project instructions into a dense policy dump. |

## Corrections To Prior Note

- No reliable source was found for a Google DeepMind paper named "Attention
  Allocation Routing in Massive-Context Windows." Do not cite it.
- No reliable source was found tying Nate Herk to a canonical "intent drift"
  theory. Cite Herk for AI OS/folders/skills/hot-cache/cadence only.
- Do not cite "Karpathy says X" unless the claim is in his public gist, talk,
  or another linked primary source.
- Avoid model-name examples as durable docs. Models and context windows change;
  PKM-AI should document stable workflows and verification requirements.

## Architecture For PKM-AI

| Layer | Vaultman analogue | Purpose | Maintenance rule |
|---|---|---|---|
| Immutable/raw source | External URLs, transcripts, command output, source files, archived old docs | Evidence | Never silently rewrite; preserve URL/path/date. |
| Source record | `docs/work/<initiative>/{research,specs,plans,items}/...` | High-fidelity technical memory | Full detail allowed; shard when navigation suffers. |
| Route index | `AGENTS.md`, `start.md`, `current/status.md`, `current/handoff.md`, initiative `index.md` | Startup and routing | Under 200 lines by routing to source records, not by compressing away facts. |
| Hot cache | Current docs, optional future `hot.md` equivalent | What the next agent needs first | Only compact facts, links, blockers, next action. |
| Retrieval | `rg`, `query-docs.mjs`, future hybrid index/reranker | Find the right source on demand | Evaluate recall against known questions before trusting. |
| Verification | Health scripts, tests, link checks, source ledger review | Detect drift and decay | Every completed doc update needs a concrete check. |

## Operating Norms

1. **Source-first writing.** Every research claim needs a URL/path, date, source
   type, and confidence. Separate primary-source facts from inferred project
   guidance.
2. **Compiled knowledge beats chat history.** Useful answers, decisions, and
   reconciliations should become source records or linked shards, not disappear
   into conversation.
3. **Routers stay small.** Startup files contain only rules, route map, current
   state, blockers, and next action. They link to the full record.
4. **No lossy compaction.** If a source record grows, shard it with an index.
   Do not summarize away API names, function signatures, commands, or rationale.
5. **Contradictions are first-class.** When new evidence conflicts with older
   docs, mark the old claim as superseded and link the newer source.
6. **Skills own repeatable procedure.** If an agent repeats a workflow or makes
   the same mistake twice, update a skill or policy instead of relying on chat.
7. **Retrieval is measured.** Before adding vector/RAG complexity, build a small
   gold set of project questions and check whether current local search finds
   the right source.
8. **Security stays outside memory.** Secrets go to `.env`/local settings, not
   chat or committed docs. External tool credentials need least privilege.
9. **Agent drift is handled by anchors.** Specs define invariants; plans define
   gates; tests/health scripts verify them. Handoffs point to evidence.

## Ingest Workflow

Use this when adding a source, research note, transcript, or external doc:

1. Capture source metadata: URL/path, author/org, published date, accessed date,
   source type, and confidence.
2. Extract only source-backed claims. Mark speculation as `inference`.
3. Reconcile with existing notes: update affected pages, flag contradictions,
   and preserve superseded claims with replacement links.
4. Update index/navigation: initiative index or local manifest only; avoid
   spraying the same summary into many files.
5. Append or update a source ledger section in the research note.
6. Run verification: frontmatter parse, link/path checks, line count, and a
   targeted search query proving the source is discoverable.

## Maintenance Cadence

| Cadence | Action | Evidence |
|---|---|---|
| Per edit | Update `updated`, `updated_by`, links, and source ledger. | Diff plus targeted link/search check. |
| Per completed task | Put verification in the initiative source record; keep current docs as route indexes. | Command/test output or source checklist. |
| Weekly PKM pass | Check orphan research, stale current docs, broken wikilinks, missing parents, and oversized active Markdown. | `check-doc-health.mjs` or equivalent log. |
| Monthly route pass | Review `AGENTS.md`, skills, policies, and indexes for duplicated or stale instructions. | Before/after route map and removed duplication list. |

## Practical Backlog

- Add this research note to [[docs/work/pkm-ai/index|PKM-AI index]].
- Extend doc health checks with: source ledger presence for research notes,
  external-link list, orphan-page report, stale `updated` dates, and route-index
  line count.
- Add a retrieval gold set for `query-docs.mjs`: roadmap phase, branch policy,
  current hardening task, docs sharding policy, and Obsidian CLI vault rule.
- Consider a future `docs/current/hot.md` only if `status.md`/`handoff.md` cannot
  stay compact without losing route clarity.

## Recommendation

Use **LLM Wiki as the durable knowledge architecture** and **RAG as a retrieval
subsystem**. In Vaultman terms: source records and shards are the wiki, current
docs are the hot route cache, skills are executable SOP memory, and search/RAG is
only the lookup layer. The maintenance standard is not "more context"; it is
source-backed context, routed into the smallest file that can safely hold it,
with explicit verification that the next agent can find and trust it.
