# Evidence manifest (local-only AI evidence, 2026-10-04)

Copies committed in this handoff: plans (5 files), notepads (4 files), source-inventory (this dir),
tooling snapshot (5 files, hashes match `pool-retirement-report.md`), HANDOFF.md.

## Plans (copies under `plans/`)
- `u130-polish-1003.md` sha256 `50b09dcf5397e523a05710158dee875a5761aa702362db10fb0cea088198f03e`
- `u130-polish-1003-lane-1.md` sha256 `c36dae47a0acd83eaf3393c04ab2d3bbb7955b83425dd9dc33e1ff9ba12d5922`
- `u130-polish-1003-lane-2.md` sha256 `20d725646b5b29f96fbb69660106db08f1bc0e402589cfa11509eedf4f2262fa`
- `u130-polish-1003-dispatch-matrix.md` sha256 `6827f751d8ec392f9fff7651d229e9864c7dc7466f2da8d1447483feac614b89`
- `u130-polish-1003-lane-1-luna-repair.md` sha256 `37ccd558b18cde96e55deb7e93500cf565b47dd4fa9eb3adbff1dc0b8d6ed456`
- Live originals remain at `.omo/plans/` in this worktree.

## Notepads (copies under `notepads/`)
- `environment.md` sha256 `5290d9ee53d50196a31b79429ce1714b0bc1819300887c1dad21dab1ce17c4b6`
- `implementation.md` sha256 `978d1ebd2f2bb50b821de5a29fd283426a88f703e7e57f175b5b08d003ac584c`
- `profiling.md` sha256 `47c1d9923a379dc58a3eed0bee8ef0416aa376e9fae075b18f0597078a72961f`
- `research.md` sha256 `21e168ffab98780fe0df174cf003882d0c02472d03f9617e28c8b4c5c911ea96`
- Live originals remain at `.omo/notepads/u130-polish-1003/`.

## Spec package (NOT copied; referenced by path)
- `~/vaultman/.agents/docs/work/performance/specs/2026-10-03-u130-polish/` files `01-source-validation-matrix.md` through `08-cmenuscene-design.md` (and `08a/08b`). Not duplicated to avoid stale forks; path recorded here.

## Profiling/evidence (NOT bulk-copied; manifest only)
- `.omo/evidence/u130-polish-1003/profiling/`: 50 files (action scripts + raw cpuprofiles).
- `.omo/evidence/u130-polish-1003/implementation/`: 19 files including `menu-reset-report.md`, `lane-2-luna-checkpoint-report.md`, `pool-tool-report.md` (superseded for Ultra/Ling by `pool-retirement-report.md`), before/after JSON + cpuprofiles.
- Raw delegate logs under `~/.cache/pkm-ai/delegates` NOT copied (credential-bearing, huge). Excluded with disclosure; paths available on local m2 on request.
- No vault user data, no `node_modules`, no `.opencode` skills, no metrics dumps staged.

## Tooling snapshot (copies under `tooling/`, all match live + report)
- `lane` `2477b0241e77d7dbb232b9057f3da449c89a2677bec6d4ce20c159cd6933f39a`
- `lane-pools.conf` `1266d9f8c29529195ece3f183175b3fb82810bf63f48fc92264a175658f39eca`
- `oc-task.sh` `ecb9c004a7b1fc7be7d265f6558a4e8a208d7508b325f8645a61f17c03ba03dc`
- `lane-run.sh` `c32b127e8f641869553bd32bfd97f5a9cda555a39e903f23c980f33754e3933b`
- `lane-pool-regression.sh` `76f4d0eb01a2ccdbce23e40ee7f20afcc126c630ffd36a5d8ded3ecc91f78c24`
