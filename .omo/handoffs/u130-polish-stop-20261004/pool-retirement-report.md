# Pool retirement report — Ultra/Ling removal (2026-10-04)

Second of exactly two authorized closing agents. Both Muse13. No subdelegation,
no helper models, no provider calls. First closing agent left running and
untouched; no source worktree touched; no commit made.

## Durable user decision (cited exactly)

- Nemotron 3 Ultra and Ling 3.0 are never options — not as primary, fallback,
  or override — in either provider namespace (`opencode/` or `openrouter/`).
- Previous removed-model policy remains: Lightning, Laguna, MiniMax M3,
  GPT-5.6 routes stay rejected.
- User cap of maximum two live attempts per upstream provider account is final.
- No fallback to another author/model on failure. Explicitly empty fallback
  stays empty; unset fallback means zero extra attempts.
- Prior `pool-tool-report.md` (2026-10-04) approved Ultra/Ling promotion; that
  approval is superseded by this decision and is not authority for keeping them.

## Final live registry (`~/wt/lane-pools.conf`, exactly 3 rows)

```text
muse13|oc|opencode/muse-spark-1.3-contributor-free|
antigravity|agy|gemini-3.8-flash-high|
luna|codex|gpt-6-luna|
```

- Removed rows `openrouter`, `zen`, `openrouter2` (primaries were Ultra/Ling).
  Not replaced, not renumbered; provider capacity unchanged.
- `muse13` fallback emptied (was Ling sante). Zero-fallback behavior retained.
- `antigravity` and `luna` rows byte-identical to prior approved routes.
- Header comment updated: Ultra/Ling retired 2026-10-04, no implicit fallback.

## Changed paths (live tools only)

1. `~/wt/lane-pools.conf` — 6 Ultra/Ling rows → 3 approved rows + retired note.
2. `~/bin/lane` — `reject_model` adds `*nemotron*|*ultra*|*ling*` alongside
   existing `*laguna*|*lightning*|*minimax*|*gpt56luna*`. Runs before
   primary/fallback/override invocation; approved Muse13/Gemini3.8/Codex6-Luna
   unaffected (no forbidden substring).
3. `~/wt/oc-task.sh` — same `reject_model` extension; both implicit default
   fallback chains (`opencode/nemotron-3-ultra-free,openrouter/nvidia/...`)
   replaced with empty default. Explicit `OC_FALLBACK_MODEL=` stays empty;
   unset `OC_FALLBACK_MODEL` also yields zero extra attempts.
4. `~/wt/lane-pool-regression.sh` — mocked suite updated to current policy:
   - Rejection loop extended with both-namespaces Ultra/Ling spellings
     (opencode + openrouter, mixed case), still asserting rc=64 and no
     launcher invocation for primary and fallback positions.
   - Override loop extended with 8 Ultra/Ling assignments (OC/OC_FALLBACK/
     AGY/CODEX), asserting rc=64 with zero git/model CLI calls.
   - Production contract now asserts muse13 empty-fallback row, 3-row count,
     and absence of nemotron/ultra/ling in non-comment rows.
   - All retired-model fixtures replaced: zen alias/cap uses approved
     same-model Muse13 rows; openrouter cap/switch/direct tests use
     `openrouter/mock-cap-*` mock names (valid prefix, never a real model);
     quota-chain test uses `openrouter/mock-fb-a:free,mock-fb-b:free`
     (3 calls: primary + 2 mocks, rc 70); overlay-denial uses mock fallback.
   - Added unset-fallback lock: unset list → exactly 1 model call, rc 70.
   - Unknown-route fail-closed (`unknown/model` → rc 64, 1 call) retained.
5. `~/wt/lane-run.sh` — unchanged (snapshot immutability preserved).

Preserved without modification: provider-account max2, worktree exclusivity,
atomic `flock` admission, status/pools counts, snapshot retention, Codex
exact argv/cwd/prompt/sandbox with exit propagation, agy `PIPESTATUS[1]`,
vault-release trap, canonical ancestor guard.

## Verification evidence (mocked only, no live model probe)

```text
$ bash -n ~/bin/lane ~/wt/lane-run.sh ~/wt/oc-task.sh ~/wt/lane-pool-regression.sh
SYNTAX-OK (exit 0, no output)

$ bash ~/wt/lane-pool-regression.sh
lane-pool-regression: PASS (all model CLIs mocked; no provider calls or worktrees)

$ env -u OC_MODEL -u OC_FALLBACK_MODEL -u AGY_MODEL -u CODEX_MODEL -u RUNNER ~/bin/lane config-check
lane: config válida (rc=0)
```

No `lane pools` live probe, no build, no application/browser/QA command run.
No credential or catalog probe. No worktree created. No Room restart.

## SHA256 (final tool files)

```text
2477b0241e77d7dbb232b9057f3da449c89a2677bec6d4ce20c159cd6933f39a  ~/bin/lane
1266d9f8c29529195ece3f183175b3fb82810bf63f48fc92264a175658f39eca  ~/wt/lane-pools.conf
ecb9c004a7b1fc7be7d265f6558a4e8a208d7508b325f8645a61f17c03ba03dc  ~/wt/oc-task.sh
c32b127e8f641869553bd32bfd97f5a9cda555a39e903f23c980f33754e3933b  ~/wt/lane-run.sh
76f4d0eb01a2ccdbce23e40ee7f20afcc126c630ffd36a5d8ded3ecc91f78c24  ~/wt/lane-pool-regression.sh
```

## Limitations (explicit)

- Direct `pkmai-delegate` invocation bypasses lane admission by design; the
  max2 cap is enforced only through the `lane` wrapper.
- Cross-node provider counting is not enforced; the census is local (live
  tmux pane `@passport` + canonical passports on m2).
- Pre-existing `$TMPDIR/lane-*.sh` snapshots keep old runtime behavior
  intentionally; only new runs use the retired-chain-free launcher.
- `*ling*` substring also matches `lightning` (already retired) — intended
  overlap, no approved route affected.

## Handoff signal

Tooling cleanup is finished and stable. Consolidation agent may snapshot
these five tool paths and commit docs. This report is the sole write by this
agent under `u130-c1-grouping/.omo/handoffs/`; `implementation.md`/`handoff.md`
and source worktrees were not touched. Scope stayed minimal: no refactor
beyond deterministic policy removal.
