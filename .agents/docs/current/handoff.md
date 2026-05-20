---
title: Current handoff
type: agent-handoff
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
archive_source: "docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-handoff.md"
created: 2026-05-04T01:36:20
updated: 2026-05-18T10:50:00-05:00
tags:
  - agent/current
created_by: dec
updated_by: codex
---

# Current Handoff

Compact handoff after archiving the oversized current handoff:
[[docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-handoff|2026-05-11 handoff archive]].

## ⏩ NEXT AGENT START HERE — Release & Main Reconciliation (2026-05-19 sesión 2)

**Estado**: Explorer Merge Umbrella spec escrito + commiteado + pusheado (commits `4cea075`,
`c0c3a95` en `sandbox`; origin/sandbox en sync). Ver
[[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella]].

**Decisiones release (locked by user 2026-05-19)**:
- **D1 = tags bare (SIN prefijo `v`)** — Obsidian community exige tag == manifest.json version.
  `.github/workflows/release.yml:6` dispara en `v*` → DEBE cambiar a bare.
- **D2 = release-driven-from-main** (release-please en main; main recibe contenido sanitizado de sandbox).
- **D3 = renumber**: primer release = **1.1.0 catch-up** (todo desde 1.0.0). El pipeline del umbrella
  shifta +0.1.0 → Explorer Hardening = **1.2.0**, …, Bases Parity = **2.0.0** (sigue major).
  ⚠️ El umbrella NO está renumerado aún — pendiente.

**Main = sandbox − AI (absoluto; directiva user: "nada de main sobrevive, sandbox es la verdad absoluta")**:
- Clean candidate construido: branch `main-clean-1.1.0` (HEAD `69723fe`), worktree
  `C:/tmp/vaultman-main-clean`. = árbol de sandbox − AI files (`.agents/.codex/CLAUDE.md/AGENTS.md`),
  gitignore-enforced. 634 files vs origin/main.
- ⚠️ LEARNING: NO reconciliar vía `git checkout sandbox -- .` desde base origin/main — es UNIÓN +
  arrastra ~36 dead stragglers main-only (sidebarOps_old, VaultmanSettings, i18n viejo…). Esos
  causaron 14 lint errors fantasma. Correcto = branch DESDE sandbox, strip AI. Sandbox es lint-clean.
- Verify del clean candidate (`69723fe`): **lint PASS** (los 14 errors eran 100% stragglers main-only,
  CONFIRMADO — submission blocker resuelto), check PASS, build PASS, security PASS,
  **928/928 tests pass**. ÚNICO fallo: 1 test FILE no importa —
  `test/unit/performance/explorerNotebookNavigatorComparison.test.ts` (error module-runner
  import/transform, NO assertion). Misma clase flaky/timing que el equipo ya aceptó antes
  (viewTableStress, pageFiltersRenameHandoff, vmDialogPortal). **Re-correr ese file aislado para
  confirmar flake** → candidate green-enough para el paso de main.

**P1 (release infra) status**:
- (g) ✅ T.G shard expandido (anti-drift: 3-tier + AgentAssay/CUSUM + flag de ci.yml sin sandbox).
- (e) ⏸️ release-please bootstrap — pending. Integrar con `release.yml` EXISTENTE (maduro: SLSA attest +
  SBOM + checksums). release-please crea release-PR + bare tag → release.yml builds. Config:
  `release-type: node`, `extra-files:[manifest.json,versions.json]`, tag `${version}`.
- (f) ⏸️ paths-filter guard — pending. `dorny/paths-filter` job que falla PRs a main tocando
  `.agents/**`/`CLAUDE.md`/`AGENTS.md`/`.claude/**`. Además: ci.yml dispara `[main,hardening,*]` —
  sandbox NO incluido → agregar sandbox.

**Next actions (en orden)**:
1. Confirmar verify del clean candidate `main-clean-1.1.0` VERDE (lint+check+build+unit+component) + audit.
2. Replace/PR `main-clean-1.1.0` → `main` (ALTO STAKES — branch público submitido; aprobación user para push).
   Desbloquea la submission Obsidian (trae CI + security + código lint-clean).
3. P1(f) paths-filter guard + agregar sandbox a ci.yml.
4. P1(e) release-please bootstrap → cortar release **1.1.0 catch-up**.
5. Renumerar pipeline del umbrella (catch-up shift): Explorer Hardening → v1.2.0, etc.
6. LUEGO sub-systems del umbrella: primer detail spec = **A.R (Action Routing)** → writing-plans → impl.

**Cleanup si se abandona el candidate**: `git worktree remove C:/tmp/vaultman-main-clean --force;
git branch -D main-clean-1.1.0`.

**Flags pendientes**: GitHub Dependabot 7 vulns (2 high) en default branch. Task-list de sesión stale
(9 tareas obsoletas) — ignorar.

## Resume Point

- Worktree: `C:\Users\vic_A\Desktop\vaultman`
- Branch: `sandbox`.
- **Latest (2026-05-19)**: Explorer Merge brainstorm — approved umbrella spec at
  [[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella]]
  (index + 6 shards). Pipeline v1.1.0→v2.0.0 approved. Next: write A.R (Action Routing) detail spec.
- Latest request handled: Explorer Phase 0 sub-system O
  (`frameVaultman.svelte` decomposition) implemented inline across six serial
  commits on `sandbox`.
- Explorer platform pass Tasks 1-20 are complete.
- Post-review repair is implemented but not yet committed: Notebook Navigator
  comparison bridge, 50K projection optimization, and Markmap hidden from the
  selectable view menu.
- Primary records:
  - [[docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass spec]]
  - [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass implementation plan]]
  - [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/perf-baseline|Explorer View Platform perf baseline]]
  - [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/07-performance-comparison-repair|Explorer platform performance comparison repair]]
  - [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/index|Notebook Navigator scroll forensics]]
  - [[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index|Multiview virtualization research]]
  - [[docs/work/hardening/plans/2026-05-16-explorer-scroll-smoke-harness/index|Explorer scroll smoke harness implementation plan]]
  - [[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/index|Explorer variable scroll repair]]
  - [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index|Explorer 0-B serviceTheme token-layer spec]]
  - [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/index|Explorer 0-B executed implementation plan]]
  - [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|Explorer Sub-system O spec]]
  - [[docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|Explorer Sub-system O executed implementation plan]]
- Preserve any unrelated dirty files if they appear later. At the time of this
  handoff, `git status --short --branch` showed only the active variable scroll
  repair files and docs.
- Toolbar architecture research captured at
  [[docs/work/polish/research/2026-05-17-toolbar-architecture/index|Toolbar architecture and primitive ordering map]];
  it explains why the current toolbar is Filters-page-specific and how to move
  toward tab-agnostic primitive ordering through a model resolver plus adapters.
- Codebase architecture cluster phases 01-09 are captured at
  [[docs/work/research/2026-05-17-codebase-architecture-cluster/index|Codebase architecture cluster]].
  Latest completed layer:
  [[docs/work/research/2026-05-17-codebase-architecture-cluster/09-residual-src-support-layer|Residual src support layer]].

## Completed Explorer Commits

- `1c3f821` `test(O): baseline DOM snapshots for frameVaultman`
- `5ec5f66` `feat(O): extract FrameNavigationService`
- `6f52570` `feat(O): extract FramePopupsState`
- `e904d8f` `feat(O): extract FrameNavbarShell`
- `7d06fe2` `feat(O): extract FrameDashboardShell`
- C5 local commit records the final cleanup + T3/T4 integration test.
- `883cb0a` `test: add explorer synthetic dataset harness`
- `c813daf` `test: add explorer platform perf scenarios`
- `1372853` `test: characterize explorer platform scale gates`
- `75d0af8` `feat: add explorer projection contract`
- `7f6dcb8` `feat: add explorer view feature contract`
- `b83c47c` `feat: add explorer node media field toggle`
- `abe6766` `feat: add explorer scroll geometry coordinator`
- `89861aa` `feat: batch explorer decoration layers`
- `40505ac` `feat: wire explorer media descriptors without hidden render cost`
- `a79f905` `fix: restore tree visual contract`
- `6aa23aa` `refactor: migrate tree rows to explorer projection`
- `f1ba4ac` `refactor: route tree reveal through scroll coordinator`
- `25c9d6b` `refactor: align panel tree list projection adapters`
- `8056ef5` `refactor: add platform contracts to table grid cards`
- `4f609af` `test: verify explorer platform focused gates`
- `c457d01` `test: record live explorer platform perf probe`
- `9df9e50` is present in branch history but is unrelated theme-plan work.

## Final Verification

- Explorer Sub-system O final verification:
  - `frameVaultman.svelte`: 335 LOC.
  - `pnpm check`: 0 errors / 0 warnings.
  - O component matrix: 10 files / 60 tests passed.
  - `test/component/frameVaultmanIntents.test.ts`: 7 tests passed.
  - Stale-symbol grep for moved frame intents returned zero matches.
  - `pnpm verify` was invoked once. It passed lint, check, build, and unit
    tests, then failed in the component full-suite on timing-sensitive
    non-O files. Targeted reruns of all three failed files passed, and the user
    explicitly authorized accepting that evidence as the final-gate exception:
    `viewTableStress.test.ts`, `pageFiltersRenameHandoff.test.ts`,
    `vmDialogPortal.test.ts`.
  - Live `plugin-dev` final smoke ended with
    `obsidian vault=plugin-dev dev:errors`: `No errors captured.`
- Explorer 0-B final verification:
  - `pnpm verify`: passed on 2026-05-17.
    Unit: 140 files / 882 tests. Component: 73 files / 398 tests. Lint:
    11 pre-existing warnings, 0 errors.
  - Required legacy-symbol searches returned zero matches:
    `applyVaultmanTheme`, `vm-glass-blur`, body-scoped `vm-theme`,
    `normalizeLayoutTheme` / `LAYOUT_THEME_OPTIONS` / `LayoutTheme`, and
    `updateGlassBlur`.
  - Targeted theme tests passed: unit 4 files / 61 tests; component 3 files /
    23 tests.
  - Build CSS contains `.vm-theme-native` and `.vm-theme-vaultman`, each with
    six `--vm-*` token properties.
  - Live `plugin-dev` smoke was partial: `plugin:reload` and `vaultman:open`
    succeeded, default DOM query did not find `.vm-root` in `activeDocument`,
    preset-switch evals returned empty objects, initial `dev:errors` returned
    `No errors captured`, and later DOM/eval inspection commands timed out.
- `pnpm check`: passed, 0 errors / 0 warnings.
- `pnpm run build`: passed, synced build artifacts to `plugin-dev`.
- `pnpm verify`: passed.
  - Unit: 135 files / 821 tests.
  - Component: 69 files / 372 tests.
  - Lint: 8 warnings in pre-existing unrelated files, 0 errors.
- `git diff --check`: passed.
- `obsidian vault=plugin-dev eval code="app.vault.getName()"`: `plugin-dev`.
- `obsidian vault=plugin-dev plugin:reload id=vaultman`: reloaded.
- `window.__vaultmanPerfProbe.run(...)`: all 8 Task 19 scenarios executed.
- `obsidian vault=plugin-dev dev:errors`: `No errors captured.`

## Post-Review Repair Verification

- Notebook Navigator original focused tests passed with Node 24.15.0:
  4 files / 19 tests.
- New bridge `test/unit/performance/explorerNotebookNavigatorComparison.test.ts`
  passed and enforces Vaultman 50K projection faster than the comparable
  Notebook Navigator list builder.
- Logged bridge medians:
  - Notebook Navigator list: `61.1534 ms`.
  - Vaultman projection: `26.9575 ms`.
  - Notebook Navigator lookups: `0.7050 ms`.
  - Vaultman lookups: `0.1517 ms`.
- Markmap menu regression reproduced red in `overlayViewMenu.test.ts`, then
  fixed by deriving selectable modes from `EXPLORER_PLATFORM_VIEW_MODES`.
- `pnpm verify`: passed.
  - Unit: 136 files / 824 tests.
  - Component: 69 files / 372 tests.
  - Lint: 8 pre-existing warnings, 0 errors.
- Live `plugin-dev` smoke after reload:
  - `obsidian vault=plugin-dev command id=vaultman:open-view-menu`: executed.
  - DOM labels: `["Tree","List","Table","Grid","Cards"]`.
  - `hasMarkmap=false`.
  - `obsidian vault=plugin-dev dev:errors`: `No errors captured.`

## Variable Scroll Repair Verification

- Shared variable geometry now uses prefix/Fenwick indexing.
- Table, Grid, and Cards no longer use all-row or row-0 fallback scans when
  TanStack returns no virtual rows.
- Focused tests passed:
  - `serviceExplorerScrollGeometry.test.ts`: 1 file / 7 tests.
  - `viewNodeVariableScrollFallback.test.ts`: 1 file / 2 tests.
  - `viewNodeDynamicGeometry.test.ts`: 1 file / 3 tests.
  - `viewNodeTableHeightmap.test.ts`: 1 file / 3 tests.
  - `viewNodeCards.test.ts`: 1 file / 6 tests.
  - `pnpm check`: 0 errors / 0 warnings.
  - `git diff --check`: passed with LF-to-CRLF warnings only.
- Live `plugin-dev` burst smoke passed for Tree/List/Table/Grid/Cards with
  zero blank frames, zero windows over 100 ms / 250 ms, `maxBlank=0ms`, and
  `No errors captured.`
- Residual latency spikes remain: Tree 108 ms, List 258 ms, Table 1312 ms,
  Grid 600 ms, Cards 24 ms.
- Follow-up scroll-idle jank pass added Table/Grid guardrails and defers
  variable row measurement plus virtualizer resizing until 96 ms after active
  scroll.
- Fresh zero-delay live smokes after the idle pass passed with no blanks and no
  dev errors:
  - Table: 100 jumps, maxDelay 29 ms.
  - Grid: 100 jumps, maxDelay 58 ms.
  - List: 100 jumps, maxDelay 37 ms.

## Preserve

- Obsidian CLI calls must use explicit `vault=plugin-dev` command options.
- Do not use generic Obsidian commands that fall back to the active vault.
- Keep Map/ViewNodeMap deferred and not selectable.
- Keep media/image disabled by default in every view.
- Keep `main` free of AI workflow files.

## Dirty Worktree Notes

- Before Sub-system O started in this session, unrelated untracked files were
  already present and preserved: `.agents/brain/`, `eslint-rules/`,
  `img/vaultman-screenshot.png`, and `scripts/esbuild.config.mjs`.
- After the 0-B commits, unrelated dirty files still existed and were preserved:
  toolbar/polish agent docs and metrics, `src/main.ts` ribbon icon work,
  `src/types/typeFrame.ts`, and `src/types/typeTabLeaf.ts`.
- Current dirt is scoped to the active variable scroll repair:
  `serviceExplorerScrollGeometry`, Table/Grid/Cards adapters, scroll-idle
  jank guardrails, focused tests, and the linked hardening docs. No unrelated
  dirty files were visible in the final status check.

## Next Action

- **PRIMARY (post brainstorm 2026-05-19)**: write A.R (Action Routing) detail spec — first child
  of [[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella]].
  v1.1.0 bundle = A.R + 0-A close (C12+C13) + 0-A.S + T.G basis + viewTree sticky fix. Pipeline is
  a HUMAN checklist — no agent auto-progression.
- Phase 0 next action after O: begin 0-A View Feature Contract / native DOM
  contract, using O's `FrameNavigationService`, `FrameNavbarShell`, and
  `FrameDashboardShell` as the frame-level integration points.
- If continuing Explorer scroll work, start from the variable scroll repair
  record. The blank fallback bug is repaired for the live selectable modes and
  Table/Grid active-scroll measurement is now deferred. Next target:
  runner-level view switching, percentile/histogram delay reporting, Grid peak
  follow-up if the 58 ms max persists, and an explicit 50k/100k matrix.
- Live scroll smoke harness implemented and verified:
  `pnpm smoke:scroll -- --view=tree --jumps=100`.
  Stress command: `pnpm smoke:scroll:stress -- --view=tree`.
  Both route through `scripts/run-explorer-scroll-smoke.mjs` and hard-code
  `vault=plugin-dev`.
- Latest live tree result: `blankFrames=0`, `blank>100ms=0`,
  `blank>250ms=0`, `maxBlank=0ms`, `maxDelay=108ms`, and no Obsidian dev
  errors.
- If resuming OpenSSF hardening, start from:
  `.agents/docs/work/hardening/plans/2026-05-16-openssf-osps-baseline/01-scope-docs-workflow-permissions.md`.
- If continuing the codebase architecture cluster, proceed with coverage
  reconciliation: compare tracked source/config/test/doc paths against phases
  01-09, mark generated-artifact exclusions, and produce a final coverage
  matrix.
