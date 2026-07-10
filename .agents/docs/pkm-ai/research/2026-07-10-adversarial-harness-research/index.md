---
title: Adversarial harness research — forcing critique + skill routing
type: research-index
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-07-10T03:13:31
updated: 2026-07-10T03:13:31
created_by: claude-sonnet-adversarial-research
updated_by: claude-sonnet-adversarial-research
tags:
  - agent/research
  - initiative/pkm-ai
  - pkm-ai/adversarial-harness
  - pkm-ai/skills
  - agent/critique
---

# Adversarial Harness Research

Source item: [[docs/current/pendientes|pendientes]] ("Research/harness: tooling adversarial +
ruteo de skills", pedido dev 2026-07-10).

## Why this exists

2026-07-10: the dev caught the coordinator (Claude) doing honest, structural critique of a
design proposal only after being explicitly asked ("critica esto honestamente") — performative
agreement otherwise. A first, partial fix landed the same day in
`.claude/skills/grill-with-docs/SKILL.md`. This research answers the dev's follow-up: does
anything else in the harness force unprompted critique, and what should close the remaining
gaps — plus a related, separate ask: offer skill routing at the end of responses based on the
dev's stance, without the dev having to ask for it.

**Baseline read in full before this research started:**
`.claude/skills/grill-with-docs/SKILL.md`, section "Adversarial pass (MANDATORY — added
2026-07-10 after dev feedback)". It requires an unprompted adversarial pass at ~3-decision
intervals and always before a final lock: attack the agent's own accumulated proposal, invent
scenarios the user did not raise and trace them through the design, grep-check names against
the real codebase (not memory), check SOLID plus "dev-in-a-week readability" against the
post-plan code, and state plainly what the design does NOT cover and what is LOST vs the
status quo. The same patch also added "close every substantial grill answer with 1-3 skill
suggestions."

## Method

- **Local inventory** — read every `.claude/skills/*/SKILL.md` frontmatter description (49
  folders on disk) and the full text of all 7 files in
  `.agents/docs/architecture/policies/`, for review/critique/verification content.
  Cross-checked against `.claude/settings.json` (the only hooks file in this repo — confirmed
  no `.claude/agents/` custom subagents exist) and grepped `.agents/docs/pkm-ai/` for
  adversarial/critique/sycophancy/devil/performative — zero hits, so this is the first record
  of the topic in pkm-ai.
- **Online research** — WebSearch + WebFetch against primary sources: Anthropic's own Claude
  Code hooks reference and the shipped `security-guidance` plugin (a working, official example
  of "hook runs a separate model review and feeds findings back"), plus arXiv papers and ACL
  Anthology for the multi-agent-critique and sycophancy literature.
- Everything below is a **draft for the dev to decide** — nothing outside this folder was
  touched, and nothing here was applied to the harness.

## Shards

- [[docs/work/pkm-ai/research/2026-07-10-adversarial-harness-research/01-local-inventory-gaps|01 — Local inventory + gaps by phase]]
  — full skills/policies inventory, the gap-by-phase table with evidence, and 9 supporting
  findings (stale Stop-hook path, vendored-skill drift, orphan folders, etc).
- [[docs/work/pkm-ai/research/2026-07-10-adversarial-harness-research/02-online-techniques-evaluated|02 — Online techniques evaluated]]
  — 8 techniques with source, mechanism, and an adopt/adapt/discard verdict for this harness.
- [[docs/work/pkm-ai/research/2026-07-10-adversarial-harness-research/03-proposal-prioritized|03 — Prioritized proposal (draft)]]
  — 3 cheap skill/policy edits, 2 hook-based options (deterministic + prompt-hook), 1 expensive
  pre-lock critic pattern, each scoped, costed, and left as an open question for the dev.

## Verdict at a glance

| Phase | Unprompted adversarial forcing today? | Mechanism | Enforcement level |
|---|---|---|---|
| Grill (`grill-with-docs`) | Yes, as of 2026-07-10 | 5-point Adversarial Pass in skill text | Skill instruction (model must comply) |
| Grill (`grill-me`) | No | — | none |
| Plan (`brainstorming`, `writing-plans`) | No — has a Self-Review, but it checks internal consistency/placeholders, not adversarial scenarios | Self-Review checklist | Skill instruction, different goal |
| Implementation | N/A (different concern: TDD/verification, not design critique) | — | — |
| Review (`requesting-code-review`, `receiving-code-review`) | Partial — receiving side bans performative agreement; requesting side is advisory, not forced | Skill instruction + generic plugin subagent | Skill instruction (must be invoked) |
| Closure (`finishing-a-development-branch`) | No — verifies tests, not design soundness | — | none |
| Cross-cutting (policies, hooks) | No | `.claude/settings.json` has 2 hooks, neither about critique | Hook (harness-enforced, but wrong content today) |

The one existing enforcement-layer artifact in this repo — the `Stop` hook in
`.claude/settings.json` — is harness-level (fires regardless of skill/model compliance) but
currently does something unrelated (a stale doc-path reminder). See shard 01. That makes it
the cheapest lever to repurpose, not just fix.

## Note on path (updated after a write-persistence test)

The dev's instruction specified `.agents/docs/work/pkm-ai/research/2026-07-10-adversarial-harness-research/`.
That exact path was written successfully (confirmed by the write tool both times) but
**silently disappeared twice** — confirmed gone via `Test-Path` moments later, no error
surfaced anywhere in this session, no action taken by this agent to remove it. A follow-up
test — a trivial marker file placed under `.agents/docs/pkm-ai/research/...` instead (the
pre-existing, 118-file-strong legacy `pkm-ai` location, no `work/` segment) — persisted cleanly
across the same kind of round trip. Given two reproducible silent losses at the instructed path
and one stable write at the fallback, **this research is physically filed at
`.agents/docs/pkm-ai/research/2026-07-10-adversarial-harness-research/` instead.**

Every wikilink inside these files still uses the repo-wide `docs/work/pkm-ai/...` virtual
prefix, matching the other 118 pkm-ai files and the `docs.md` policy's own prose description of
the folder model — so nothing here is a broken link either way, and the content is unchanged
from what was twice written at the originally-instructed path.

**Flag for the dev:** something is actively pruning newly-created content specifically under
`.agents/docs/work/pkm-ai/` (a folder that did not exist before this session). Sibling folders
`hardening`/`polish`/`publish`/`research` already under `.agents/docs/work/` were not touched
or tested and may be unaffected — the common factor observed is a **brand-new** top-level entry
under `work/` disappearing, not the `work/` tree in general. Worth checking for a sync/mirror/
cleanup process (the vault-mirroring setup noted in prior session memory is a plausible
candidate) before trusting a future write to that exact path.
