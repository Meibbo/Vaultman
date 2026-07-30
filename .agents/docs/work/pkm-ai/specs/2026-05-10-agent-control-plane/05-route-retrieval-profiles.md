---
title: Agent control plane - route and retrieval profiles
type: spec-shard
status: draft
parent: "[[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/index|Agent Control Plane]]"
created: 2026-05-10T05:13:29
updated: 2026-05-10T09:06:09
created_by: codex
updated_by: codex
tags:
  - agent/spec
  - initiative/pkm-ai
  - agent/workflow
---

# Route And Retrieval Profiles

## Purpose

These profiles define how Vaultman agents choose sources before answering, editing, or verifying. They separate route selection from retrieval mechanics:
the route profile decides what kind of work this is, while the retrieval profile decides which tools and source strictness apply.

## Route Profiles

| Intent | First source | Second source | Web allowed | Write target |
| --- | --- | --- | --- | --- |
| micro command | `AGENTS.md`, `start.md`, current status/handoff summary | Direct target file or command output | No, unless the command asks for a current external fact | None |
| docs update | Docs policy plus target initiative index/source record | Related specs, plans, archive, and health output | No, unless updating research that depends on external facts | Active initiative `docs/work/<initiative>/{items,specs,plans,research,backlog}/...` |
| code review | Changed files and matching architecture/policy docs | Focused tests, source consumers, and recent handoff residuals | No, unless dependency/framework behavior is disputed or version-sensitive | Review response, or source record if residuals/backlog items are created |
| implementation | Active plan slice and relevant policy | Product source/tests found by `rg`/`rg --files` and local architecture docs | Only for unstable APIs, package behavior, or official framework docs | Product code plus the owning initiative plan/result record |
| bug/performance diagnosis | Reproduction path, failing check, active backlog/research record | Recent regression records, metrics, perf probes, and source/test graph | Only for current library/toolchain behavior or external runtime facts | Diagnosis research/backlog record, then scoped code/docs if fixing |
| architecture research | Initiative spec, architecture docs, and glossary | Code graph, ADRs, related research records, and package docs | Yes when the design depends on current ecosystem behavior | Research/spec shard under the owning initiative |
| tool/environment friction | Tools policy and command output | Current handoff, metrics, and related script tests | Yes for tool version issues, official CLI docs, or platform-specific behavior | Tools policy hypothesis, metrics, backlog, or initiative research record |
| online/library fact check | Official docs, primary repository, release notes, or standards source | Local package lock/config and code usage | Yes; required when freshness or source authority matters | Research/source record when the fact influences future work |

## Retrieval Profiles

| Profile | Use when | Tools | Source strictness | Failure mode |
| --- | --- | --- | --- | --- |
| `local-code` | Need implementation details, call sites, tests, or ownership boundaries. | `rg`, `rg --files`, `code-index.mjs`, focused file reads, code/test commands. | Local source is authoritative; AST index output is evidence-bearing for parsed imports/exports/dependents and parsed Svelte script props/events; regex tools are orientation unless backed by file reads. | If code search is ambiguous, record the unresolved path gap before changing shared behavior. |
| `local-docs` | Need route, status, plan, policy, glossary, or source-record context. | `query-docs.mjs`, `index-docs.mjs`, direct Markdown reads, glossary gate. | Current route docs point to truth; initiative source records preserve detail. | If query misses a known record, fall back to `rg` and note index staleness. |
| `archive-audit` | Need superseded history, deleted context, or regression provenance. | `rg` under `.agents/docs/archive`, archive links, git history when needed. | Archives are historical evidence, not current routing truth. | If archive contradicts active docs, preserve both and record the conflict in the active source record. |
| `online-primary` | Need current official API, framework, library, legal, financial, or standards facts. | Official docs, primary repos, release notes, standards bodies, restricted web search. | Primary/current sources required; secondary summaries are supporting only. | If primary sources disagree or are absent, state the uncertainty and do not hard-code behavior from memory. |
| `online-clean-page` | User provides a URL or a noisy page must be extracted for reading. | Defuddle-style extraction, browser/web open only when extraction fails or visual context matters. | The supplied page is the target source; extracted text must preserve claims without nav clutter. | If extraction drops critical content, inspect the page directly and record the gap. |
| `current-unstable` | Fact may have changed recently: versions, schedules, prices, rules, active maintainers, APIs. | Web search plus official/current sources; local package files for installed versions. | Fresh source verification is required before making claims. | If freshness cannot be verified, mark the claim as unverified and avoid irreversible edits. |
| `connector-backed` | Need repository, PR, issue, email/calendar, or app-owned data exposed by a connector. | Installed connector tools, then CLI or web fallback only when connector coverage is insufficient. | Connector data is authoritative for that app context; cite IDs/paths. | If connector access is missing, state the blocker and use local context only for non-mutating work. |
| `skill-backed` | A domain skill exists for the work pattern or file type. | Relevant skill instructions plus local tools named by the skill. | Skill workflow controls process; source files still control factual content. | If skill instructions conflict with user/project rules, follow user/project rules and note the exception. |

## Tool Choice Rules

- Use `rg` or `rg --files` first for local text and file discovery; fall back to PowerShell search only when `rg` is unavailable or fails.
- Use `query-docs.mjs` when frontmatter, document type, status, initiative, tag, parent link, or glossary routing matters.
- Use official docs or primary repositories for unstable framework, API, package, or platform facts before coding against them.
- Use Defuddle-style extraction for user-provided URLs or noisy web pages when the goal is to read content rather than inspect visual layout.
- Use web search for current external facts only when local sources cannot answer, freshness matters, or the user explicitly asks to look it up.
- Use `code-index.mjs` when import/export/dependent evidence or Svelte component script props/events matter; treat regex-only PKM-AI code tools as heuristic orientation unless their output is confirmed by direct source reads or deeper structured analysis.
- Record source gaps, stale indexes, unavailable connectors, and unverified current facts in the relevant source record, not only in chat.
