---
title: Online techniques evaluated — adversarial critique + forcing functions
type: research-shard
status: active
parent: "[[docs/work/pkm-ai/research/2026-07-10-adversarial-harness-research/index|Adversarial harness research]]"
shard_source: ".agents/docs/work/pkm-ai/research/2026-07-10-adversarial-harness-research/02-online-techniques-evaluated.md"
shard_of: "[[docs/work/pkm-ai/research/2026-07-10-adversarial-harness-research/index|Adversarial harness research]]"
shard_part: 2
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

# Online Techniques Evaluated

## Framing: why sycophancy happens (background, not a lever)

The current sycophancy-mitigation literature ([Sycophancy in LLMs: Causes and Mitigations, arXiv:2411.15287](https://arxiv.org/pdf/2411.15287);
[How RLHF Amplifies Sycophancy, arXiv:2602.01002](https://arxiv.org/pdf/2602.01002)) locates the
cause upstream, in RLHF/preference training that rewards agreeable-sounding completions, and
targets it with fine-tuning on disagreement datasets, sycophancy-aware reward models, or
steering vectors. **None of this is actionable from inside a Claude Code harness** — Vaultman
cannot retrain or steer the underlying model. It is useful only as diagnosis: the pull toward
performative agreement is a trained tendency, not a one-off lapse, so a fix that relies on
"remembering to be critical" will regress under context pressure. **Verdict: DISCARD as a
lever, KEEP as framing** for why a harness-level (not just prompt-level) forcing function
matters.

The 8 techniques below are what's left after excluding train-time-only approaches: things
implementable as skill text, policy text, or Claude Code hook configuration.

## 1. Devil's-Advocate multi-agent pattern (DEBATE framework)

[DEBATE: Devil's Advocate-Based Assessment and Text Evaluation, ACL Findings 2024](https://aclanthology.org/2024.findings-acl.112/).
A 3-role setup (Commander/Scorer/Critic) where the Critic is *explicitly instructed* to play
devil's advocate. Measured effect: assigning the devil's-advocate role raises disagreement rate
from 48.3% (baseline, no assigned role) to 99.2%. The mechanism is the role assignment itself,
not model capability — a generic "review this" prompt gets agreement; a role-conditioned
"find what's wrong" prompt gets genuine pushback.
**Verdict: ADAPT.** grill-with-docs' Adversarial Pass already does this implicitly ("attack
YOUR OWN accumulated proposal"). The DEBATE numbers are evidence the framing matters enough to
keep it explicit and role-named everywhere a critique step exists, not just in one skill.

## 2. Red-teaming methodology (not the tooling)

[Promptfoo red-team guide](https://www.promptfoo.dev/docs/red-team/); [Microsoft Foundry red-teaming guidance](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/red-teaming).
The tools (Promptfoo etc.) are security-scanning products, not directly relevant to a design-
review harness. The reusable part is the **process**: explore (generate adversarial
scenarios) → triage (which findings are real) → consolidate (fold surviving cases into a
reusable, growing test/checklist suite) — rather than re-deriving scenarios from scratch every
session.
**Verdict: ADAPT.** grill-with-docs' step 2 already invents scenarios per-session but discards
them after. A durable, accumulating "scenarios that broke a past design" checklist (the
red-team consolidation step) is missing.

## 3. Multi-agent Reflexion / actor-critic critique (MAR, LLaMAC)

[MAR: Multi-Agent Reflexion Improves Reasoning Abilities in LLMs, arXiv:2512.20845](https://arxiv.org/html/2512.20845v1);
[LLaMAC actor-critic framework, arXiv:2311.13884](https://arxiv.org/html/2311.13884v3). Single-
model self-reflection tends to repeat the same errors ("degeneration of thought"); replacing it
with a **separate** critic agent that has its own context and no investment in the original
answer produces more diverse, less repetitive critique.
**Verdict: ADAPT.** This is the structural argument for running critique in a fresh context
(subagent or hook-spawned model call) rather than asking the same turn/session to grade itself
— directly informs the "expensive" proposal tier (shard 03).

## 4. Claude Code hooks — the enforcement mechanism itself

[Automate actions with hooks](https://code.claude.com/docs/en/hooks-guide); [Hooks reference](https://code.claude.com/docs/en/hooks) (both fetched and read in full).
Confirmed facts, not paraphrase:
- `Stop` fires whenever Claude finishes responding (every turn, not just task completion) and
  its JSON input includes `last_assistant_message` — the exact text of the response just given
  — so a Stop hook can inspect what was just said without parsing the whole transcript.
- A `Stop` hook can force Claude to keep working via top-level `{"decision":"block","reason":"..."}`,
  or add non-blocking follow-up context via `{"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"..."}}`.
  Blocking is capped at 8 consecutive blocks per turn (`stop_hook_active` field exists
  specifically so a script can detect and stop re-blocking).
- `UserPromptSubmit` fires when the **next** prompt is submitted, i.e. the *start* of the next
  turn, not the end of the current response. Plain stdout is injected into context (this repo's
  existing hook already relies on exactly that).
- Three hook implementation types exist at rising cost: `command` (your script, deterministic),
  `prompt` (single-turn judgment call to a cheap model, e.g. Haiku, no tool access), `agent`
  (a subagent with tool access and up to 50 turns, marked experimental).
**Verdict: ADOPT.** This is the mechanism, not optional background — it is what makes "without
being asked" actually mean something (harness-enforced) instead of "hopefully the model
remembers" (prompt-enforced, the exact failure already observed once).

## 5. `security-guidance` — Anthropic's own shipped precedent for this exact pattern

[security-guidance plugin docs](https://code.claude.com/docs/en/security-guidance) (fetched and
read in full). An official Anthropic plugin that reviews Claude's own code changes for
vulnerabilities *in the same session*. Its `Stop` hook computes a git diff of the turn, sends it
to a **separate** Claude call (fresh context, security-only system prompt, "no investment in
the original approach, instructed only to find problems"), runs it in the background so the
reply isn't delayed, and — only if it finds something — re-prompts Claude with the findings as
a follow-up. Explicitly does **not** hard-block: "None of the layers block writes or commits...
Treat the plugin as one layer of defense in depth."
**Verdict: ADOPT as the reference architecture.** This is a working, production, Anthropic-
maintained implementation of "independent critic + background review + conditional re-prompt,"
just aimed at security instead of design honesty. Source is public
([github.com/anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/security-guidance))
and explicitly offered by Anthropic's own docs as "a working example... for hooks you build
yourself."

## 6. Reflection pattern (generator → critic → reviser loop)

General pattern, e.g. [Stop LLMs from Lying: the Reflection Pattern](https://dev.to/programmingcentral/stop-llms-from-lying-build-self-correcting-agents-with-the-reflection-pattern-1df).
Separate generation from evaluation explicitly: draft → structured critique (ideally JSON, so
it's machine-checkable) → revise, with the loop stopping on a quality gate or a turn cap.
**Verdict: ADOPT (partially already in place).** grill-with-docs' Adversarial Pass is this loop
with the critique step inlined into the same turn. The gap is a **structured, checkable**
critique output (today it's prose) — a checklist the agent must visibly complete, not just a
paragraph that might skip a step under pressure.

## 7. Chain-of-Verification (CoVe)

[Chain-of-Verification Reduces Hallucination in LLMs, Meta AI, arXiv:2309.11495](https://arxiv.org/abs/2309.11495).
Four-step structure: draft → plan independent verification questions → **answer each
question separately, without seeing the draft's reasoning** → revise. The "separately" step is
the load-bearing part: answering in the same breath as the original claim lets the model
rationalize instead of genuinely re-checking.
**Verdict: ADAPT.** grill-with-docs' step 2 ("invent concrete scenarios... trace them through
the proposed design") already resembles CoVe's verification-question step, but doesn't require
answering independently before revising. Tightening the wording to force a separate
answer-then-revise order (not answer-while-revising) would close a real gap in the existing
patch — cheap, text-only change.

## 8. Constitutional AI self-critique against written principles

[Anthropic: Constitutional AI — Harmlessness from AI Feedback](https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback).
Anthropic's own alignment technique: the model critiques and revises its own output against an
explicit, written set of principles (~75 of them), rather than against vague internalized
judgment. Vaultman cannot replicate the RL half of this (that's training-time), but the
structural insight — self-critique is more reliable against **externalized, citable** written
principles than against instructions buried in one skill's prose — directly supports promoting
the Adversarial Pass from skill text to a policy document every session can be pointed at,
regardless of which skill (if any) is active.
**Verdict: ADAPT.** Also the most on-brand citation available: this is Anthropic's own
technique, applied here at the prompting/policy layer instead of the training layer.

## Bonus: groupthink risk in Vaultman's actual multi-agent setup

[Multi-Agent System Reliability](https://blog.alexewerlof.com/p/multi-agent-system-reliability);
the `security-guidance` design note above ("reviewer... has no investment in the original
approach"). Unanimous agreement between agents can reflect shared model bias rather than a
correct answer, especially when the same model family reviews itself. Vaultman's own
`created_by`/`updated_by` convention already tracks which agent (`claude`, `codex`, `gemini`,
`antigravity`, `perplexity`, `dev`) touched a doc — that plumbing could be reused to prefer or
at least record when a critique pass came from a **different** model/agent than the one that
authored the proposal, which is a stronger anti-groupthink signal than same-model self-review.
Noted here as context for shard 03's expensive tier, not a standalone proposal.
