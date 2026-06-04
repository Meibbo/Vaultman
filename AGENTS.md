# AGENTS.md - Vaultman Agent Bootloader

This branch permits AI workflow files. `main` must contain zero AI files: no `AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`, or generated agent caches.

## Runtime Startup (MANDATORY — every agent, every new thread, in order)

Zero-context agents execute this BEFORE any work. Not advisory. Detail:
`.agents/docs/architecture/policies/coordination.md` + `.agents/docs/work/pkm-ai/adr/`.

0. **Identify** — your agent+model · git stream (goal/proto/canary=sandbox/beta=dev/stable=main) · task_size.
   If `.agents/pkm-ai.version.json` exists, read it; on a MAJOR version mismatch re-read the protocol docs.
1. **Register presence (join-or-create — deterministic; no prompt needed)** — join the workspace's CURRENT
   active run, else start one: `node .agents/tools/pkm-ai/agent-room.mjs agent join --run current --agent <id>`;
   if it reports no active run, `... run start --agent <id>` then join. Then `agent heartbeat`. **One active
   room per workspace — all agents of this project converge on it (5 agents = same room).** (ADR 0003.)
2. **Retrieval-first** — query the index for the top-k relevant docs; do NOT read the whole tree:
   `node .agents/tools/pkm-ai/query-docs.mjs <topic>`. (Lifecycle-ranked once S6 lands; ADR 0002/0006.)
3. **Route docs** — `current/status.md` + `current/handoff.md` are route indexes ONLY; read the latest
   `docs/sessions/session-log.md` entry.
4. **Memory boundary** —
   - editing SHARED memory (status/handoff/architecture/specs) → `agent-room scope claim` FIRST (resolve
     conflicts/leases);
   - your OWN working memory → your session shard `docs/sessions/<date>-<agent>.md` — never overwrite shared
     in place. (ADR 0002/0003.)
5. **Route by mode/intent** (see Session Modes below).
6. **Exit** — append a `session-log` line + `agent-room scope` release + `agent leave`.

Micro-commands (`status:` · `next:` · `qq:` · `question:` · `help:`) may take a read-only fast path but still
register presence (step 1).

## Session Modes

Use the mode named by the user, or infer one:

- `scout`: read-only orientation.
- `research`: verify sources and write knowledge only when asked.
- `teach`: explain the PKM-AI system.
- `implement`: execute a scoped plan.
- `review`: findings first, ordered by risk.
- `update`: update or migrate docs.
- `health`: check doc/system consistency.
- `handoff`: compact current state for the next agent.

## Communication Policy

- **Split Caveman:** Si el modo `caveman` está activo, aplicarlo **únicamente** al chat.
- **Documentación y Código:** Mantener siempre el máximo detalle técnico, fidelidad y contexto en archivos. La compresión de archivos de conocimiento está prohibida para evitar alucinaciones y pérdida de contexto.

Micro commands are read-only and short: `skills:`, `status:`, `next:`, `qq:`, `question:`, `help:`.

## Size And Context

Use `task_size` when supplied:

- `micro`: targeted patch and targeted verification.
- `small`: brief design only if ambiguous.
- `medium` or `large`: use spec/plan workflow before edits.

Context window size is model-dependent: about 200K on the standard tier, but up to
~1M on large-context models (for example Opus 4.7 Max, Gemini CLI, Antigravity). You
cannot see the exact remaining count — you only infer it. Therefore do NOT assume
context is low and unilaterally push to checkpoint or close. When a context checkpoint
seems relevant, ASK the dev: (a) roughly how much window remains, or whether this is a
long or short session; and (b) whether to checkpoint now — clarifying that a checkpoint
WITHOUT closing the chat is valid (it keeps parallel agents' knowledge current), as
distinct from a checkpoint plus handoff to a fresh agent. Act on the dev's answer, not
on an inference.

## Line Limits

- Preserve source detail first. Never compress, omit, summarize away, or delete technical context just to satisfy a line limit.
- The 200-line active Markdown limit is a navigation/sharding trigger, not a hard content cap. If a spec, plan, or record needs more detail, write the
  detail and shard it into a folder with a compact `index.md` manifest.
- Shards do not have to be thematic. If one topic needs 300 lines, split it into
  continuation shards such as `01-topic.md` and `01-topic-part-2.md`, then put
  the next topic in its own shard.
- If sharding would slow down or interrupt a user-requested capture, a temporary
  oversized source file is allowed. Add or queue a follow-up shard/manifest pass
  instead of asking the user to restate that detail must be preserved.
- `.agents/docs/current/status.md` and `.agents/docs/current/handoff.md`
  are navigational indexes, not implementation records. Keep them under 200
  lines by linking to full source records.
- For non-trivial work, decisions, verification logs, or handoff detail, create
  or update the complete record inside the relevant initiative folder
  (`docs/work/<initiative>/items/`, `specs/`, `plans/`, `research/`, or
  `backlog/`) and place only a compact wikilink plus next action in status or
  handoff.
- Archive current-doc material only when it is superseded historical memory.
  Active work detail belongs in the initiative source record, not in a compacted
  status/handoff summary.
- Shard large specs, plans, histories, indexes, and manuals into folders with
  compact `index.md` manifests.

## Branch Policy

- Do not put AI files on `main`.
- AI docs live on branches such as `hardening` or `dev`.
- Do not revert or overwrite changes you did not make.
- Agents may create local commits for completed, verified work when a commit is
  the natural handoff unit.
- Do not push, tag, merge, force-push, rewrite history, or commit unrelated
  user changes unless explicitly asked.
- Before merge/release work, confirm how AI files will be excluded from `main`.

## Project Rules

For product code, follow `.agents/docs/architecture/policies/code.md`.
For Git, docs, backlog, and context rules, use the matching file under
`.agents/docs/architecture/policies/`.
