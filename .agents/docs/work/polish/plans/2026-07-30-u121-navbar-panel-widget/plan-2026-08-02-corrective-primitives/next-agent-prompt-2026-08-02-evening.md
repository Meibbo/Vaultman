---
title: U121-003 next-agent prompt after shard 08 tasks 8.1-8.3
type: handoff-prompt
status: ready
parent: "[[index|U121-003 corrective implementation plan]]"
created_by: claude-opus-5-root
updated_by: claude-opus-5-root
dateCreated: 2026-08-02
updated: 2026-08-02
---

# Prompt for the next agent

Supersedes [[next-agent-prompt-2026-08-02-claude]] and [[next-agent-prompt]].
Both remain accurate as history; this file is the current state.

Copy everything below the line into a fresh Vaultman agent task.

---

You are continuing Vaultman U121-003. Execute the root `AGENTS.md` bootloader in
order before touching anything: identify agent/model and stream, join the current
agent room, heartbeat, retrieval-first, read the latest `session-log` entries and
your room mailbox, claim scope before editing shared docs.

## Authorization

The developer approved the specification and authorized product implementation on
2026-08-02 for the whole plan, including the amendment shards. No second approval
is pending. The boundaries still hold: no push, merge to `dev`/`main`, tag,
release or GitHub closure; code and `.agents/` stay separate local commits;
`.agents/` is never pushed.

## Workspace

- **Product worktree: `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\u121-030-033-maintenance`**
- **Branch: `claude/u121-030-033-maintenance`**, HEAD `27ee0170`
- `claude/u121-029-panel-widget` points at the same commit. The 2026-08-02
  evening fast-forward merged the 029 work into 030; 030 is now the integration
  branch and 029 is not ahead of it.
- Agent-doc workspace: `C:\Users\vic_A\Desktop\vaultman` (sandbox branch)
- Smoke vault: `C:\Users\vic_A\Desktop\plugin-dev`. `Start of The Road` still
  holds the older `cac504a9` build and was deliberately left alone.

**You are alone on this branch now.** The parallel worker that was committing
here during the day was stopped by the developer. Its uncommitted work is still
in the 030 worktree and is described below — do not delete it, and do not sweep
it into your commits. Stage explicit paths, never `-a`: that worker's catch-all
stage is how commit `4e9dd0db` ended up carrying someone else's in-flight fix.

## Read before acting

1. Spec: `spec-2026-08-02-corrective-primitives/index.md` plus shards 01–08.
2. Plan: `plan-2026-08-02-corrective-primitives/index.md` plus shards 01–09,
   including the execution record at the end of shard 08.
3. The `session-log` entries dated 2026-08-02 by `claude-opus-5-root`.
4. Web Lab evidence: `C:\Users\vic_A\Desktop\obsidian-web-lab\obsidian\app.css`
   and `app.js`. Read them before changing Core-parity markup. Do not
   reconstruct Core behavior from memory.

## State of the plan

| Shard | State |
| --- | --- |
| 07 `cell_format` Core parity | done |
| 01 controller and provider liveness | done |
| 02 SearchControl, MenuSession, mobile | done |
| 03 selection axon, engine Cells, operation targets | done; `buildOperationTargetSet` got its first caller in shard 08 |
| 04 Cell capabilities, file-count, By badges | done |
| 05 properties, placement settings, touch | done, **except** that `PropertyValueInteractionPort` still has no caller: the inline rename calls `_replaceValueInVault` directly. Task 5.2's port extraction is unfinished |
| 08 value operations, tasks 8.1–8.3 | done — labels, `Add to files`, property type |
| **08 part 2, tasks 8.4–8.6** | **not started — the `Move to prop...` mode** |
| **09 reveal this-file properties, 9.1–9.4** | **not started** |
| **06 integrated gates, exact build, live smoke** | **not started** |

## FIRST TASK — three red guards, now yours

The full unit suite is **1438/1441**. The three failures are guards over the
stopped worker's `VaultmanFrame` refactor, left untouched because that contract
was still being shaped at the time. It is finished now, so re-point them —
re-point, never delete or weaken:

| Suite | Failing guard |
| --- | --- |
| `test/unit/statisticsPageSource.test.ts` | publishes Statistics into the Scene-owned panelWidget host |
| `test/unit/responsiveDensitySource.test.ts` | feeds measured frame width into the Filters provider projection |
| `test/unit/statisticsToolbarAndOpenedToday.test.ts` | publishes the requested provider before Filters reclaims the toolbar |

The contract that moved: `navigateToDataTab` in `VaultmanFrame.svelte` is no
longer `async`. It selects the provider, then publishes through
`sceneController.begin(tab)` — a generation — instead of awaiting a tick. The
guards should assert that sequence, and keep asserting that no `flushSync`
appears.

## Then

1. **Plan shard 08 part 2** — the `Move to prop...` hidden operation mode, tasks
   8.4–8.6. The scalar-collision outcome that `logicAddToFiles` already reports
   is resolved by the conflict policy of task 8.5; wire it there rather than
   answering the same question twice.
2. **Plan shard 09** — `reveal this file`. Note the slot precedence: shard 08
   part 2 builds the toolbar slot and its mutual-exclusion rule, and shard 09
   puts reveal into it and re-points the exclusion test.
3. **Plan shard 06** — integrated gates, exact build sync, live acceptance
   matrix, then the developer's smoke.

## The stopped worker's uncommitted work in the 030 worktree

Eight dirty files, `tsc` clean with them applied, none of them yours:

```text
eslint.config.mts · package.json · pnpm-lock.yaml
scripts/scorecard-regression-check.mjs · src/VaultmanSettings.ts
src/components/layout/viewNodeTable.ts · src/logic/logicInteractionMode.ts
styles.css
```

This is U121-030..033 maintenance work. Ask the developer what to do with it
before committing or discarding any of it.

Separately, that worker had started rewriting the `date` branch of
`convertPropertyValueType` to drop the time component — the divergence spec shard
06 recorded as known and deliberately uncorrected. The developer stopped it
because shard 07 is already implemented. That change was removed from the working
tree and saved as `stopped-worker-date-truncation.patch` beside this file; the
committed behavior (time preserved) is what the suite is green against.

## Method

Follow the plan checkbox by checkbox in shard order. For each behavior: write the
red test, run it, confirm it fails for the stated reason, implement the smallest
contract-compliant change, confirm green, then `pnpm run check`. Run the Svelte
autofixer before and after on every changed `.svelte`. Do not compress several
behaviors into one patch, and do not treat a source guard as proof of geometry or
liveness.

**Run the full unit suite before believing a cross-cutting change.** Today a
one-line popout-safety fix (`setTimeout` → `window.setTimeout`) kept every
focused suite green and broke five tests in another file, because the unit
environment is `node` and has no `window`. Obsidian's `el.win` was the right
accessor. Focused suites do not see this class of breakage.

Prefer a registered action over inventing a second path to the same write —
except when its `when` guard makes it a no-op in the configuration you are in.
The inline checkbox was not routed to `value.checkbox-checked` for exactly that
reason: that action requires `minimalStyle === true`.

## Gates

`pnpm run check` (tsc + svelte-check), `pnpm run lint`, `pnpm run test:unit`
(about 3–7 minutes; do not pipe it through `tail`, the output file ends up
truncated), Stylelint when CSS changes. Before any completion claim run
`pnpm run verify`, sync the exact build, verify the three SHA-256 hashes against
the installed plugin, and record the evidence. U121-003 is not complete until the
developer accepts a live smoke of that exact build.
