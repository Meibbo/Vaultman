---
title: Local inventory — skills, policies, and gaps by phase
type: research-shard
status: active
parent: "[[docs/work/pkm-ai/research/2026-07-10-adversarial-harness-research/index|Adversarial harness research]]"
shard_source: ".agents/docs/work/pkm-ai/research/2026-07-10-adversarial-harness-research/01-local-inventory-gaps.md"
shard_of: "[[docs/work/pkm-ai/research/2026-07-10-adversarial-harness-research/index|Adversarial harness research]]"
shard_part: 1
created: 2026-07-10T03:13:31
updated: 2026-07-10T03:13:31
tags:
  - agent/research
  - agent/shard
  - initiative/pkm-ai
  - pkm-ai/adversarial-harness
created_by: claude-sonnet-adversarial-research
updated_by: claude-sonnet-adversarial-research
---

# Local Inventory — Skills, Policies, Gaps By Phase

## A. Skills directly relevant to review/critique/verification (read in full)

| Skill | Purpose (from frontmatter + body read) | What it actually forces |
|---|---|---|
| `grill-with-docs` | Grill a plan against the domain model/docs, update CONTEXT.md/ADRs inline | **Has** the 2026-07-10 Adversarial Pass (mandatory, unprompted, 5 checks) + mandatory skill-suggestion close |
| `grill-me` | Plain relentless interview of a plan/design, no docs cross-check | No adversarial pass, no skill-suggestion close — a strictly older/simpler sibling that did not get the patch |
| `brainstorming` | Explore intent/requirements/design before implementation; hard-gates implementation on user approval | Self-Review = placeholder scan, internal consistency, scope, ambiguity — a **proofreading** pass, not a **devil's-advocate** pass. "Propose 2-3 approaches" happens before a design is picked, not after |
| `writing-plans` | Turn an approved spec into a bite-sized implementation plan | Self-Review = spec coverage, placeholder scan, type consistency — same proofreading character as brainstorming's |
| `receiving-code-review` | How to react to feedback (from the dev or an external reviewer) | Explicitly bans "You're absolutely right!" / "Great point!" and blind implementation; requires verifying feedback against the codebase before acting. This is the one skill that already targets sycophancy directly — but only for the *receiving* side, not for unprompted self-critique |
| `requesting-code-review` | Dispatch a subagent to review a diff before merging | Depends on the generic plugin subagent `superpowers:code-reviewer` (no Vaultman-local subagent exists — confirmed, `.claude/agents/` does not exist). Framed as "mandatory after each task" but enforcement is skill-instruction only: nothing forces the skill itself to be invoked |
| `verification-before-completion` | Ban completion claims without fresh command evidence | Targets a sibling failure mode (claiming done without proof), not design sycophancy. Already strong and unrelated to this gap |
| `finishing-a-development-branch` | Verify tests, then present 4 structured merge/PR/keep/discard options | Operational gate, not an evaluative one — never asks "is this design actually sound" |
| `systematic-debugging`, `diagnose` | Reproduce → isolate → diagnose before proposing a fix | Adversarial toward the *bug*, not toward the agent's *own proposed fix* |
| `vm-regression-resolver` | Git-history-driven regression resolution, 5 phases | Requires human approval before "conceptual adaptation" (Fase 4B) — a real human-in-the-loop gate, but scoped to regression fixes, not general design proposals |

## B. Everything else in `.claude/skills/` (49 folders total, for completeness)

Legend: **V** = local file is a vendored copy of a `superpowers:`-namespaced plugin skill (same
name exists twice in the available-skills list; content read is generic, no Vaultman-specific
material found) · **D** = `disable-model-invocation: true` (not auto-offered, invoked by
literal request only) · **∅** = empty folder, no `SKILL.md` at all.

- **Meta/session:** `vm-start-session` (bootstrap/route), `vm-pkm-ai-guide` (explain PKM-AI),
  `using-superpowers`(V) (how to find skills), `writing-skills`(V)/`write-a-skill` (author new
  skills), `vm-work-visualizer` (Mermaid/Canvas maps of work), `caveman` (terse mode),
  `setup-matt-pocock-skills`(D) (scaffold issue-tracker/triage config).
- **Plan/backlog:** `architecture-research-to-issues`, `comparative-research`, `to-issues`,
  `to-prd`, `triage`, `vm-backlog-manager`, `dispatching-parallel-agents`(V).
- **Implementation:** `executing-plans`(V), `subagent-driven-development`(V),
  `test-driven-development`(V)/`tdd`, `using-git-worktrees`(V), `scss-professional`,
  `svelte-code-writer`, `svelte-core-bestpractices`, `pdf`.
- **Obsidian-format authoring:** `obsidian-bases`, `obsidian-cli`, `obsidian-markdown`,
  `json-canvas`, `journal-workflow`, `vault-workflow`.
- **Domain/reference:** `vm-explorer-virtualization`, `vm-frontend-llms-docs`,
  `vm-vertical-codebase-analysis`, `improve-codebase-architecture`, `zoom-out`(D),
  `defuddle` (URL→markdown for research).
- **Orphaned, not functioning as skills:** `codex-primary-runtime`(∅), `vertical-codebase-analysis`(∅)
  — both empty folders with no `SKILL.md`, so neither appears in the live available-skills list.
  (`vm-vertical-codebase-analysis` is the real, populated skill; the un-prefixed
  `vertical-codebase-analysis` folder is dead weight.)

**~13 of the 49 folders are vendored duplicates of `superpowers:`-namespaced plugin skills**
(brainstorming, writing-plans, receiving/requesting-code-review, verification-before-completion,
systematic-debugging, test-driven-development, executing-plans, subagent-driven-development,
using-git-worktrees, using-superpowers, writing-skills, dispatching-parallel-agents,
finishing-a-development-branch). Content read from several of these (receiving-code-review,
verification-before-completion) is generic "your human partner"-style boilerplate with no
Vaultman-specific edits — meaning they were copied in at some point, not authored locally. If
the upstream `superpowers` plugin ships its own anti-sycophancy patch to any of these, Vaultman
will not inherit it automatically; the local copy would need a manual re-sync. This is a
maintenance-drift risk adjacent to, but distinct from, the core adversarial-forcing gap.

## C. Policies in `.agents/docs/architecture/policies/` (7 files, all read in full)

| Policy | Touches review/critique/verification? | Finding |
|---|---|---|
| `docs.md` | Partially | Two rules added 2026-07-09/07-10 (canonical-term citations, "grill pendientes are born with a dossier") — both about documentation discipline, not about forcing critique of a proposal's substance |
| `coordination.md` | No | Multi-agent presence/scope-claims/messaging protocol (ADR 0003). Governs *who* may touch *what*, not *whether a proposal was pressure-tested* |
| `code.md` | No | Product-code conventions (Obsidian DOM helpers, O(1) lookups) |
| `context.md` | No | What to read at session start, line-limit discipline |
| `git.md` | No | Branch/commit/regression-recovery rules |
| `backlog.md` | No | Draft→initiative→archive routing |
| `tools.md` | No | Tool-preference and metric-recording rules |

**No policy file contains an adversarial-pass, devil's-advocate, or anti-sycophancy
requirement.** The only place this requirement exists anywhere in the repo is inside the body
text of one skill (`grill-with-docs`). A plain conversation, a `brainstorming` session, or a
`writing-plans` session that never explicitly invokes `grill-with-docs` has **zero** forcing
function today — matching exactly the failure the dev caught (compliance depended on the model
choosing to apply the pattern, not on anything the harness enforces).

## D. Hooks and subagents (the enforcement layer)

- `.claude/settings.json` is the **only** hooks file in the repo (no user-level hooks checked,
  no `.claude/settings.local.json` hooks — that file has permissions only). It defines exactly
  two hooks:
  - `Stop`: echoes a static checkpoint reminder — *"Did you update `docs/HANDOFF.md`... Run
    `npm run build`..."*. **`docs/HANDOFF.md` does not exist** (verified) — the real, current
    handoff file is `.agents/docs/current/handoff.md`. This hook is stale, almost certainly
    left over from before the `.agents/docs` restructuring, and fires on every single response
    regardless of relevance.
  - `UserPromptSubmit`: echoes a static reminder about context-window inference rules (matches
    the "Size And Context" section of `AGENTS.md` near-verbatim) — this one is current and
    accurate, just static.
- **No `.claude/agents/` directory exists** — confirmed via filesystem check. `requesting-code-review`'s
  reference to a "code-reviewer subagent" resolves to the generic `superpowers`-plugin
  template, not a Vaultman-authored one.
- Both existing hooks are `"type": "command"` with a bare `echo` — deterministic, but static
  (no branching on conversation content). Neither reads the response text or applies any
  judgment.

## E. Confirmed absence of prior art

`grep -i "adversarial|critique|sycophan|devil|performative"` across the entire
the PKM-AI docs tree (specs, plans, items, adr, research, CHANGELOG) returned **zero
matches**. No ADR, spec, or research note has touched this topic before. The only trace in the
whole repo is the source pendientes line and the grill-with-docs patch itself. This research
folder is the first durable record.
