---
title: 2026-05-20 stress-vault scroll matrix
type: verification-record
status: active
parent: "[[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/index|Explorer variable scroll repair]]"
created: 2026-05-20T20:33:33
updated: 2026-05-20T20:33:33
tags:
  - agent/verification
  - explorer/performance
  - explorer/scroll
  - plugin-dev
created_by: codex
updated_by: codex
---

# 2026-05-20 Stress-Vault Scroll Matrix

## Scope

This record continues the 0-A.S follow-up after runner-level view switching, percentile/histogram reporting, and `--vault=<name>` support. It captures the first explicit large-vault pass against a registered Obsidian stress vault and the recovery steps after the 100k vault exceeded the current CLI/live runtime readiness envelope.

## Harness Correction Before Matrix

The first 50k attempt was invalid because the runner/probe selected the first matching scroll container in the DOM, including inactive Explorer tab surfaces.
That meant some runs measured Properties/root/topology rows instead of the active Files tab.

Code changes made before the valid 50k matrix:

- `scripts/run-explorer-scroll-smoke.mjs`
  - Adds `--surface=current|files`, defaulting to `files`.
  - Switches Explorer to the Files tab before checking or switching the view.
  - Uses active-tab-aware scroll-target presence checks.
- `src/dev/perfProbe.ts`
  - Chooses the active matching scroll container when inactive `.vm-tab-content` nodes remain mounted.
  - Falls back to usable geometry only after excluding inactive tab content.
- Tests:
  - `perfProbeDom.test.ts` covers inactive matching scroll containers and event-loop delay percentiles/histogram.
  - `explorerScrollSmokeScript.test.ts` covers `--vault`, `--surface`, view switching, active target checks, and printed delay histogram fields.

TDD evidence:

- RED:
  - `pnpm vitest run test/component/perfProbeDom.test.ts --testNamePattern "targets the active explorer tab"` failed by selecting `props-row` from the inactive tab.
  - `pnpm vitest run test/unit/scripts/explorerScrollSmokeScript.test.ts` failed on missing `--surface=current|files` and related surface-switching hooks.
- GREEN:
  - `pnpm vitest run test/component/perfProbeDom.test.ts --testNamePattern "targets the active explorer tab"` passed, 1 test / 22 skipped.
  - `pnpm vitest run test/unit/scripts/explorerScrollSmokeScript.test.ts` passed.

## Stress Vault Setup

- Registered vault name: `stress-vault`.
- Registered path:
  `C:\Users\vic_A\Desktop\vaultman\test\vaults\stress-vault`.
- Obsidian registry file touched:
  `C:\Users\vic_A\AppData\Roaming\obsidian\obsidian.json`.
- Registry backup made before adding the stress vault:
  `C:\Users\vic_A\AppData\Roaming\obsidian\obsidian.json.vaultman-stress-backup-20260520192758.json`.
- `vaultman` was enabled in the stress vault and build artifacts were synced to `test/vaults/stress-vault/.obsidian/plugins/vaultman`.
- The generated Markdown corpus lives under ignored path `test/vaults/stress-vault`; local count after the 100k generation:
  `100000` Markdown files.

The existing generator helper was not used because the stress vault already had an `.obsidian` directory. The corpus was generated with inline Node so plugin state was preserved.

## 50k Files Matrix

Command shape:

```powershell
node scripts/run-explorer-scroll-smoke.mjs --vault=stress-vault --surface=files --view=<view> --jumps=50 --visual-delay-ms=0 --no-build --no-overlay
```

All valid 50k runs ended with no captured Obsidian dev errors and zero blank frames. Tree/List/Table measured the active Files surface across the full file population. Grid/Cards only measured the collapsed topology surface because the hierarchy was not expanded.

| View | Surface validity | Result | Sample row range | Blank frames | Blank >100 ms | Blank >250 ms | Max blank | Max viewport gap | Max delay | p95 delay | p99 delay | Delay histogram | LoAF | Long task | Dev errors |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| Tree | full 50k Files | PASS | `idx=37665-37685/50239`, first `Notes/Topic-174/note-037986.md`, last `Notes/Topic-175/note-038005.md` | 0 | 0 | 0 | 0 ms | 0 px | 4070 ms | 351 ms | 4070 ms | `<=16ms:1, <=33ms:0, <=50ms:0, <=100ms:1, >100ms:48` | `51/5988ms` | `60/3865ms` | none |
| List | full 50k Files | PASS | `idx=37672-37682/50239`, first `Notes/Topic-174/note-037993.md`, last `Notes/Topic-175/note-038002.md` | 0 | 0 | 0 | 0 ms | 0 px | 3749 ms | 2018 ms | 3749 ms | `<=16ms:1, <=33ms:27, <=50ms:9, <=100ms:3, >100ms:10` | `14/3988ms` | `18/3663ms` | none |
| Table | full 50k Files | PASS | `idx=37672-37682/50240`, first `Notes/Topic-174/note-037993.md`, last `Notes/Topic-175/note-038002.md` | 0 | 0 | 0 | 0 ms | 31 px | 7500 ms | 90 ms | 7500 ms | `<=16ms:1, <=33ms:5, <=50ms:33, <=100ms:9, >100ms:2` | `12/8855ms` | `4/7381ms` | none |
| Grid | collapsed topology only | PASS | `idx=1-2/4`, last `folder:Projects` | 0 | 0 | 0 | 0 ms | 135 px | 5571 ms | 1857 ms | 5571 ms | `<=16ms:24, <=33ms:21, <=50ms:1, <=100ms:0, >100ms:4` | not recorded | not recorded | none |
| Cards | collapsed topology only | PASS | `idx=1-4/5`, last `folder:Projects` | 0 | 0 | 0 | 0 ms | 42 px | 6057 ms | 5559 ms | 6057 ms | `<=16ms:29, <=33ms:10, <=50ms:0, <=100ms:1, >100ms:10` | not recorded | not recorded | none |

## Grid/Cards Expansion Attempt

Grid/Cards cannot be treated as full 50k row stress from the table above. The runner successfully switched to the Files surface and the Grid view, but the visible rows stayed at the collapsed root/topology level.

An exploratory live click of the Grid `Expand all` button on the 50k vault did not return within approximately 90 seconds. Obsidian was recovered afterward;
`dev:errors` returned no captured errors, and the Grid view still reported only root-level rows. Treat this as a pressure datum and a harness gap, not as a completed Grid/Cards large-row matrix.

## 100k Attempt

The second generation pass added another 50,000 Markdown files, bringing the ignored local corpus to `100000` Markdown files. The live runtime did not become ready enough for an explicit scroll matrix:

- `obsidian vault=stress-vault reload` timed out after about 34 seconds.
- An 8-minute polling loop for `app.vault.getFiles().length` / `app.vault.getMarkdownFiles().length` did not return a ready count.
- `obsidian restart` and later `obsidian version` became unresponsive while the stress vault was marked open.
- After removing the stress vault `open` flag from `obsidian.json`, Obsidian started again and `obsidian vault=plugin-dev eval code="1+1"` returned `=> 2`.
- A fresh bounded 100k viability check `obsidian vault=stress-vault eval code="JSON.stringify({name: app.vault.getName(), files: app.vault.getFiles().length, markdown: app.vault.getMarkdownFiles().length})"` timed out after 5 minutes.
- Recovery required closing Obsidian. Graceful close timed out, so the hung Obsidian processes were force-stopped; the stress vault `open` flag was removed again; `plugin-dev` eval recovered afterward.

Conclusion: the 100k live scroll matrix is blocked by Obsidian CLI/runtime startup/indexing readiness, not by a completed Vaultman scroll failure. The next 100k slice needs an explicit large-vault launch/index readiness harness or a separate cold-start/indexing performance track before scroll-burst results can be trusted.

## Verification After Code Changes

Fresh local gate after the surface/active-target correction:

- `pnpm vitest run test/component/perfProbeDom.test.ts test/unit/dev/perfProbe.test.ts test/unit/scripts/explorerScrollSmokeScript.test.ts` passed, 3 files / 33 tests.
- `pnpm run check` passed with 0 errors / 0 warnings.
- `pnpm run lint` passed with 0 warnings / 0 errors.
- `pnpm run build` passed and synced artifacts to repo root, `dist/build`, `plugin-dev`, and the stress vault.
- `git diff --check` passed with LF-to-CRLF working-copy warnings only.

## Decisions And Next Work

- Do not claim full 50k/100k parity from this pass.
- The valid 50k Files matrix proves no blank-frame regression for Tree/List/Table at large scale, but it also shows sustained event-loop pressure in Tree/List and max-only outliers in Table.
- Grid/Cards need a real expanded-hierarchy large-row harness before their large-vault scroll behavior can be judged.
- 100k needs a separate readiness gate before rerunning scroll bursts; otherwise the CLI timeout measures Obsidian startup/indexing saturation rather than the Explorer renderer.
- Add fine-grained timing marks next around Tree visible-row work, List row projection, and Grid expansion/render readiness. Do not spend those marks on 100k scroll bursts until the vault readiness problem is isolated.
