---
title: Prioritized proposal (draft) — close the adversarial-forcing gap
type: research-shard
status: active
parent: "[[docs/work/pkm-ai/research/2026-07-10-adversarial-harness-research/index|Adversarial harness research]]"
shard_source: ".agents/docs/work/pkm-ai/research/2026-07-10-adversarial-harness-research/03-proposal-prioritized.md"
shard_of: "[[docs/work/pkm-ai/research/2026-07-10-adversarial-harness-research/index|Adversarial harness research]]"
shard_part: 3
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

# Prioritized Proposal (Draft)

Nothing here is applied. Every item is scoped so the dev can accept, reject, or edit
individually. Costs assume one agent session per item, no new external dependencies beyond
what Claude Code already ships.

## Direct answer to "does UserPromptSubmit/Stop allow end-of-response skill routing"

**`Stop`, not `UserPromptSubmit`.** `UserPromptSubmit` fires when the dev submits the *next*
prompt — i.e. the start of a new turn — not at the end of the response that was just given. It
is the right event for "remind Claude of something before it starts" (which is exactly what
the existing context-window hook already does), but the wrong event for "append a suggestion to
what Claude just said." `Stop` fires precisely when Claude finishes responding and can inject
follow-up content (blocking or non-blocking — see M1). The two are complementary, not
interchangeable: keep `UserPromptSubmit` for start-of-turn reinforcement, use `Stop` for
end-of-response routing.

## Cheap — skill/policy text edits (no new infra, hours not days)

### C1 — Port the Adversarial Pass to the other design-adjacent skills

`grill-me`, `brainstorming`, and `writing-plans` each have a "self-review" moment
(brainstorming: Spec Self-Review; writing-plans: Self-Review) that today only checks internal
consistency/placeholders/type-matching. Extend each with the same 5-point structure
grill-with-docs got: attack the agent's own proposal, invent scenarios not raised by the user,
grep-check names against the real codebase, check SOLID + "dev-in-a-week readability," and
state what's NOT covered / what's LOST. `grill-me` has no self-review section at all today and
would need one added, not just extended.
**Open question:** should this be one shared instruction block referenced from all four skills
(avoids drift when the wording is next tuned) or four independent copies (matches how the
skills are vendored today, per shard 01)? A shared block is cheaper to maintain but is a
structural change beyond a pure text edit.

### C2 — Promote the requirement from skill text to policy text

Skill instructions only fire when that specific skill is active. A plain planning conversation
that never invokes `grill-with-docs`/`brainstorming` has zero forcing function (shard 01,
section C). Add a short, explicit rule to `docs.md` (or a new, small
`architecture/policies/critique.md` if the dev prefers a dedicated file — see open question in
shard 01/D pattern): *"Any response that proposes, revises, or locks a design/architecture/plan
decision must include an unprompted adversarial pass before the dev is asked to approve it,
regardless of which skill (if any) is active."* Cite the CoVe finding from shard 02 §7
explicitly in the wording: invented scenarios must be answered **separately**, before revising
the proposal — not rationalized inline while revising.
**Open question:** new dedicated policy file vs. a section inside `docs.md`. A dedicated file
is more discoverable via `Read When` triggers but is one more file in `Runtime Startup`'s
retrieval surface.

### C3 — Fix the stale Stop hook, and only then extend it

The existing `Stop` hook in `.claude/settings.json` references `docs/HANDOFF.md`, which does
not exist (shard 01, section D). Repoint it at `.agents/docs/current/handoff.md`. This is a
pure bugfix, zero new behavior, and should land regardless of what else the dev picks from this
proposal — a stale hook firing on every single turn is actively misleading today.
**Open question:** none — this looks like an uncontroversial fix rather than a decision.

## Medium — hook-based, conditional (a script + testing, part of a day)

### M1 — Deterministic Stop hook: keyword-heuristic skill suggestions

A `"type": "command"` `Stop` hook (a real script, not a bare `echo`) that reads
`last_assistant_message` from stdin JSON — confirmed available on `Stop` without needing to
parse the whole transcript — and applies a cheap keyword/regex heuristic: does the message
contain a design-decision marker ("propongo", "decisión:", a locked interface/contract) without
a nearby counter-argument marker ("riesgo", "qué se pierde", "no cubre")? If triggered, emit
```json
{"hookSpecificOutput": {"hookEventName": "Stop", "additionalContext": "Suggested: grill-with-docs (unresolved design decision without a visible adversarial pass) / receiving-code-review (external feedback pending)"}}
```
This is `additionalContext`, not `decision:"block"` — it adds a note without forcing more work,
so it does not risk the 8-consecutive-block cap. Still worth explicitly checking
`stop_hook_active` defensively in the script, per the official troubleshooting guidance.
**Cost:** one script (~40-60 lines), one hook config block, manual testing across a few real
transcripts to tune the keyword list before trusting it.
**Limitation to flag honestly:** a keyword heuristic will both over-fire (false positives on
words like "propongo" used casually) and under-fire (a sycophantic response rarely contains an
obvious "I agree" keyword — it's usually just an *absence* of pushback, which regex is bad at
detecting). Treat this as a nudge layer, not a judgment layer.

### M2 — Prompt-hook upgrade: real judgment instead of keywords

Same `Stop` event, `"type": "prompt"` instead of `"command"` — Claude Code sends the hook's
input JSON to a small model (Haiku by default, configurable) that returns a judgment, no script
required beyond the config block itself:
```json
{"hooks": {"Stop": [{"hooks": [{"type": "prompt", "prompt": "Given last_assistant_message, did this response contain a design/plan/architecture decision AND run a genuine adversarial pass (invented failure scenarios, named what is lost)? If a decision was made without visible critique, respond {\"ok\": false, \"reason\": \"Suggested skills: grill-with-docs / receiving-code-review — <one line why>\"}. Otherwise {\"ok\": true}."}]}]}}
```
`"ok": false` on a `Stop` hook feeds `reason` back to Claude and it keeps working (the model
picks up the suggestion, not a forced skill invocation). **Caveat, stated plainly:** prompt-type
hooks get no tool access and no confirmed access to the full transcript beyond the standard
input fields (`last_assistant_message` and friends) — good enough for "was this response
missing visible critique," not enough for deeper transcript analysis. That gap is what the
expensive tier (E1) exists to close.
**Cost:** config-only (no script), but adds one small model call per turn — track actual token
cost after a trial week before deciding whether it stays on by default.

## Expensive — pre-lock critic subagent (background model call, ongoing cost)

### E1 — Adapt the `security-guidance` reference architecture to design critique

Mirror the shipped, official pattern exactly (shard 02 §5): a `Stop` hook that, when a turn
touched a design/plan decision, dispatches a **separate** Claude call — fresh context, a
system prompt built from the Adversarial Pass checklist and nothing else, explicitly told it
has no investment in the original proposal and its only job is to find problems — running in
the background so the reply is not delayed. If it finds a real gap, Claude is re-prompted with
the finding and addresses it as a natural follow-up turn. **Not** a hard `decision:"block"` gate
— `security-guidance` deliberately avoids blocking ("one layer of defense in depth"), and the
same restraint applies here: a false-positive block on every design conversation would be worse
than the problem it fixes.
Two implementation paths, genuinely different cost:
- **Fast path:** Claude Code's built-in `"type": "agent"` hook (tool access, up to 50 turns,
  60s default timeout) does most of this natively — no custom Python/Agent-SDK scaffolding
  needed, just a config block and a well-written prompt. Flagged **experimental** by Anthropic
  ("prefer command hooks for production"), so treat as a pilot, not a default-on commitment.
- **Production-grade path:** replicate `security-guidance`'s own approach (a small Python
  script using the Claude Agent SDK, background-invoked from a `Stop` hook) if the dev wants
  something closer to what Anthropic ships rather than the experimental hook type.
**Anti-groupthink option (shard 02, bonus):** if cost allows, route this critic call through a
different model/agent identity than the one that authored the proposal, and record which one in
the resulting doc's `updated_by` — reuses plumbing that already exists (`created_by`/`updated_by`
vocabulary: `claude`, `codex`, `gemini`, `antigravity`, `perplexity`, `dev`).
**Cost:** real, ongoing per-turn model spend on top of the main session (comparable order of
magnitude to `security-guidance`'s own end-of-turn review call); most complex to build, test,
and tune of the three tiers; the only one that would have caught the original 2026-07-10 case
without the dev asking, since it runs whether or not the response used an obviously-flaggable
keyword.

## What this proposal deliberately does NOT include

- No auto-block of the dev's own approval (`decision:"block"` against the *dev's* messages is
  not proposed anywhere — only against Claude's own responses, and only in E1, and even there
  softly).
- No removal or replacement of the existing `UserPromptSubmit` context-window hook — C3/M1/M2
  are additive to `.claude/settings.json`, not a rewrite of it.
- No claim that any tier alone "solves" sycophancy — per shard 02's framing section, the root
  cause is upstream of anything a harness can fix; these are mitigations, not a cure.
