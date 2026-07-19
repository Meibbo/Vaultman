---
title: "BT5-001..005 process retrospective: elapsed time and automation"
type: retrospective
status: completed
lifecycle: active
parent: "[[docs/work/polish/plans/2026-07-19-bt5-001-005/index|BT5-001..005 implementation plan]]"
created: 2026-07-19T13:38:07
updated: 2026-07-19T13:38:07
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/retrospective, initiative/polish, release/bt5, automation]
---

# BT5-001..005 process retrospective

## Verdict

The 70-minute elapsed time reported by the dev is not explained by "five small issues".
The batch crossed five different seams: settings/render lifecycle, workspace-leaf lifecycle,
IndexedDB/statistics/performance, release automation/editorial content and shared sorting.
BT5-003 alone was a medium persistence-and-performance slice. A safe target is therefore not
ten minutes; it is to remove coordination, discovery and verification orchestration waste while
preserving focal TDD, one clean final gate and explicit runtime evidence.

For a comparable batch, the realistic target after the P0 automation below is **40-50 minutes**
under normal machine load, with **35-50% fewer model/tool tokens**. A 25-35 minute run is plausible
only after reusable runtime scenarios exist and no new root-cause branch appears. Forcing that target
before the harnesses exist would trade away regression detection rather than improve the process.

## Evidence from this run

- The final useful gates took 462.1 seconds: ESLint 121.1 s, TS/Svelte 48.3 s, format
  12.9 s, Stylelint 12.2 s, production build 22.4 s, unit tests 206.4 s, scorecard
  7.0 s and final sync build 31.8 s.
- Before those useful gates, three wrapper attempts were cancelled after approximately 1, 64 and
  304 seconds. The latter two left Vitest descendants running and required PID-level cleanup.
  Therefore at least 369 seconds of wall time were pure verification-orchestration waste.
- Runtime acceptance used four bespoke Obsidian eval/smoke sequences. They produced valuable
  evidence, but the scenarios were assembled and interpreted manually instead of returning one
  stable JSON contract.
- The initial execution contract was not machine-readable. The dev had to correct the worktree
  boundary repeatedly: product code belonged in the already-installed worktree, `sandbox` was the
  alpha/docs stream, and only `plugin-dev` could receive or execute modified artifacts.
- The mandatory route documents are no longer compact: this review observed `status.md` at 779
  lines and `handoff.md` at 1120 lines. Full startup reads consume large context before the task's
  source record is reached.
- Retrieval-first returned no document for combined BT5/process/performance queries even though the
  BT5 records existed. After a full reindex, short queries (`State sort`, `micro-cuelgues`) recovered
  the new issues while longer multi-topic forms still returned zero; matching/backoff is opaque.
- The code graph was available and useful, but generated `main.js` symbols competed with `src/`
  symbols until queries were narrowed. This is avoidable discovery noise.

The timestamps above are direct command evidence. The remaining distribution inside the 70 minutes
cannot be reconstructed exactly from Git commit timestamps, so this record does not invent a
minute-by-minute allocation.

## Where the process lost time and tokens

### 1. No immutable session envelope — highest avoidable cost

The agent began reasoning before one compact contract had locked:

- code worktree and branch/base;
- protected worktrees/paths;
- artifact sync destination;
- only permitted runtime vault;
- issue IDs and acceptance gates;
- actions requiring fresh dev authorization.

Natural-language reminders were insufficient. The correction loop cost time, damaged trust and made
otherwise safe commands risky.

### 2. A heterogeneous batch was treated as one execution unit

The five issues shared a release train but not one implementation seam. Discovery and acceptance were
interleaved, so each new finding reopened the global mental model. The right unit for iteration was:

1. lifecycle/performance: BT5-001..003;
2. release contract: BT5-004;
3. sorting correctness: BT5-005.

They may still land in one branch, but each slice needs its own affected-symbol map, focal tests and
runtime scenario. Only the final clean gate should span all slices.

### 3. `pnpm run verify` is a shell chain, not a resilient gate runner

It does not stream a structured stage summary, enforce a single active run, own the complete Windows
process tree or clean descendants after timeout. Retrying the opaque chain created overlapping Vitest
runners. The eventual individual stages all passed; the lost time came from orchestration, not failures.

### 4. Runtime evidence was high-value but handcrafted

Settings transitions, leaf reactivation, statistics priority/persistence and the bulletin modal are
repeatable product scenarios. Encoding them as one-off eval payloads spends tokens, makes quoting and
timeouts fragile, and encourages accidental omission of `vault=plugin-dev`.

### 5. Retrieval surfaces are too broad and query failure is opaque

The bootloader correctly requires memory recovery, but current route files now contain years of
history instead of compact links. Separately, a zero-result semantic query does not explain whether
the cause is a stale index, strict term matching or ranking cutoff. The agent either reads thousands
of lines or spends extra calls discovering which shorter query happens to work.

## Automation proposal

| Priority | Automation | Contract | Expected gain |
|---|---|---|---|
| P0 | Session envelope + preflight | A tracked task manifest declares worktree, expected branch/base, protected roots, artifact target, allowed vault and issue set. A command fails closed before any write when reality differs. | Prevents the largest correction/rework class; 5-15 min and major trust gain. |
| P0 | Safe Obsidian launcher | All project smokes route through one wrapper that requires `--vault=plugin-dev`. Raw/implicit vault selection fails. Non-default vaults require an explicit named override recorded in the run. | Eliminates wrong-vault risk and repeated command auditing. |
| P0 | Structured gate runner | One lock per worktree; stages stream JSON + log path + duration; timeouts terminate the owned process tree; rerun resumes only failed/incomplete stages; final mode runs every clean gate once. | Recovers the measured 6+ min retry waste and reduces diagnostic tokens. |
| P0 | Named runtime scenarios | `settings-lifecycle`, `leaf-reactivation`, `statistics-pipeline`, `release-bulletin` and `editor-typing` return compact JSON with invariants and cleanup. | Saves 5-10 min per comparable batch and makes evidence reproducible. |
| P1 | Generated compact startup route | Keep full source records, but generate a <=200-line active route and archive/split historical status/handoff sections. | Removes tens of thousands of startup tokens without deleting memory. |
| P1 | Incremental docs indexing + query diagnostics | After an exact local docs commit, index changed Markdown and run an ID query plus a semantic smoke for every new record. A zero-result query reports stale index versus strict-term/ranking failure and offers a relaxed fallback. | Avoids blind query retries and catches stale/YAML-broken indexes immediately. |
| P1 | Graph hygiene + change map | Refresh/detect graph changes at session start; default discovery to `src/` and exclude bundles/generated artifacts. Emit affected symbols/tests per issue. | Reduces broad searches and built-output noise. |
| P1 | Gate matrix generated from issue files | Each issue declares focal tests, runtime scenario and HITL gate; the batch manifest deduplicates shared gates. | Prevents repeated full-suite runs and missing acceptance steps. |
| P2 | Local inner-loop caches | Benchmark ESLint cache, TypeScript incremental state and a conservative Vitest worker cap. Never use cached success as the release gate. | Potential 2-5 min; must be measured on this Windows host. |

Suggested command surface (names are proposals, not current scripts):

```text
pnpm agent:preflight --task .agents/tasks/bt5-001-005.json
pnpm gate:focal --issue BT5-003
pnpm smoke:scenario --case statistics-pipeline --vault plugin-dev
pnpm verify:final --json-summary .tmp/gates/bt5-001-005.json
pnpm docs:close --task task_041 --index-changed --health-changed
```

## Recommended execution flow

1. Freeze the session envelope and show its six fields once to the dev.
2. Run preflight before branch creation or edits; fail if `sandbox` would receive product code.
3. Use graph `detect_changes/search_graph/trace_path` to produce a per-issue symbol/test map.
4. Execute slices by seam. For each: RED focal test → minimal implementation → focal GREEN.
5. Run only the named runtime scenario for that slice, always through the safe launcher.
6. After all slices, run exactly one clean `verify:final`; do not retry an opaque whole chain.
7. Build/sync once, compare artifact hashes, commit product, then commit local-only agent docs.
8. Incrementally index changed docs, run retrieval smoke, append the session log and release claims.

## Adversarial pass

- `verify:changed` or cached gates can miss cross-seam regressions. They are inner-loop tools only;
  the final clean full gate remains mandatory.
- A hard `plugin-dev` allowlist would block intentional stress-vault work. The escape hatch must name
  the target and require fresh dev authorization; it must never fall back to the focused vault.
- Process-tree cleanup can kill unrelated work if ownership is inferred from executable name. The
  runner must track spawned PIDs/job objects, not kill every `node` or `vitest` process.
- Auto-shrinking status/handoff risks the historical data loss already seen in this repository.
  Compaction must be archive-first and generated from linked source records.
- A typing harness can perturb the very latency it measures. Capture A/B runs with identical probe
  overhead and correlate measurements with Vaultman marks rather than relying only on global long tasks.
- Parallel agents would help BT5-004 versus BT5-001..003 only with explicit dev approval and disjoint
  scopes. They are not the first optimization; bad coordination would increase merge and context cost.
- The new 2.5-second addon/Iconic polls are plausible candidates for periodic typing stalls, but changing
  their interval without profiling could merely hide the symptom. BT5-030 requires attribution first.

## What should remain human

- visual/interaction acceptance across Obsidian surfaces;
- editorial approval of release copy/media;
- root-cause judgment when multiple main-thread producers correlate with a stall;
- beta versus stable release choice;
- authorization to test any vault other than `plugin-dev`.

## Minimum investment before the next multi-issue batch

Implement the session envelope/preflight, safe Obsidian launcher and structured gate runner first.
If those three do not exist, limit one execution session to two or three coupled issues. Repeating a
five-issue mixed batch with the current tooling will predictably spend the same time on coordination,
manual smokes and opaque verification retries.
