---
title: Plan — Thread B (B2) + parallel Codex lanes (handoff 2026-07-05)
type: plan
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-07-05T00:00:00
created_by: claude-fable-5
tags:
  - agent/plan
  - umbrella-v2/wave-1
  - spine/V.D
  - orchestration/parallel
---

# Plan — Thread B (B2) + parallel Codex lanes

Handoff for autonomous Codex execution while the coordinator session winds down. Sandbox
HEAD at write = `290a123`. Every lane below touches a **disjoint file domain** → runs in
parallel without collision. FF to sandbox stays **single-threaded** (one integrator).

## State (what's landed on sandbox)

- ✅ Geometry adoption COMPLETE (table+grid+cards on shared runtime; STRICT gates passed).
- ✅ Thread B **B1** — `typeViewConfig` engine/mode canon aligned to ADR 0012 (`87b4732`).
- ✅ PA slices 1-4 — 3 real adapters (`nativeSearch`, `nativeBinding`, `fileMenuDelegation`,
  `basesMultiSelect`) in `src/platform/adapters/`. **NOT wired into `main.ts` yet** (= PA-5).
- ⏸ deps lane deferred (branch `chore/dependabot-vulns` @ `2e6b7b9`, lockfile conflict).

## Coordination rules (READ FIRST)

- Each lane = its own worktree from sandbox HEAD (`git worktree add C:/tmp/vaultman-<lane> -b <branch> sandbox`).
- Follow `AGENTS.md` startup (agent join/heartbeat + task claim + scope claim on your files).
- Verify HEADLESS (check 0/0 · focused tests · `test:unit --maxWorkers=3` · build). Known-ignore:
  `explorerNotebookNavigatorComparison`; flaky-under-load `explorerPlatformSynthetic`/`stress`/
  `serviceExplorerScrollGeometry` (re-run in isolation to confirm). **Do NOT run plugin-dev smokes**
  (Obsidian = shared; the coordinator runs V.D STRICT gates).
- **Do NOT FF to sandbox yourself** — commit in your worktree, write a session-log entry, mailbox the
  coordinator. Single-threaded FF avoids ref races + lets the coordinator run the STRICT gate for B2.
- Never touch `.worktrees/`/`.claude/worktrees/`. Don't stage EOL-only `.snap`.

## Lane map (disjoint domains — parallel-safe)

| Lane | Branch | Files (WRITES) | Needs | Parallel? |
|---|---|---|---|---|
| **B2** ViewHost switch | `umbrella-v2/vd-threadb-b2` | `ViewHost.svelte` + new `src/logic/logicViewAddressing.ts` | coordinator STRICT gate at FF | ✅ |
| **PA-5** wire adapters | `umbrella-v2/pa-slice5` | `src/main.ts` + new `src/platform/platformProfile.ts` + inventory doc | — | ✅ |
| **glossary** canon align | `chore/glossary-canon` | `docs/architecture/glossary.md` + `dev-glossary.md` (L129-130 / L82) | — | ✅ (docs) |
| **shim** collapse | `chore/shim-collapse` | `logicsFiles.ts`→`logicFiles.ts` + `utilViewLayers`/`utilBadgeBubbling` + importers | — | ⚠️ SOLO (re-points importers → runs when B2/PA-5 quiet) |
| **deps** re-integrate | `chore/dependabot-vulns` (exists) | `package.json`/`pnpm-lock.yaml` | — | ⚠️ lands LAST (lockfile) |

## B2 spec — ViewHost switches on resolved `(engine,mode)` (D-C-8)

**Goal:** ViewHost renders off a resolved `(engine,mode)` pair instead of the flat
`{#if renderedViewMode === 'tree'}` string switch. The flat `ExplorerViewMode`
(`'tree'|'list'|'table'|'grid'|'cards'`) stays as the EXTERNAL interface (24 caller files
untouched); ViewHost translates it internally. This is the tracer that stops the flat enum
growing when new views (masonry/miller/charts) arrive — they become new `(engine,mode)` pairs,
not new enum members.

**Design (tracer — same result, different internal form; parity is the DoD):**
1. **Pure bridge** `src/logic/logicViewAddressing.ts` (framework-agnostic, TDD):
   `viewModeToConfig(mode: ExplorerViewMode): {engine: ViewEngine, mode: ViewMode}` mapping the
   render-plane flat enum → the addressing-plane canon (from `typeViewConfig`, B1-aligned):
   - `tree`  → `{engine:'Linear', mode:'indent'}`
   - `list`  → `{engine:'Linear', mode:'flat'}`
   - `table` → `{engine:'Geometry', mode:'table'}`
   - `grid`  → `{engine:'Geometry', mode:'grid'}`
   - `cards` → `{engine:'Geometry', mode:'cards'}`
   Plus the inverse `configToViewMode` for active-state reflection (only the 5 wired pairs resolve;
   unwired pairs like `masonry`/`miller`/`chart` return `null` = "no flat-enum equivalent yet").
2. **ViewHost.svelte** computes `const addr = $derived(viewModeToConfig(renderedViewMode))` and
   switches on `addr.engine` then `addr.mode`:
   - `{#if addr.engine === 'Linear' && addr.mode === 'indent'}` → `<ViewTree/>`
   - `... 'Linear' && 'flat'` → `<ViewNodeList/>`
   - `... 'Geometry' && 'table'` → `<ViewNodeTable/>`
   - `... 'Geometry' && 'grid'` → `<ViewNodeGrid/>` (keep the GridNavigationToolbar folder-mode block)
   - `... 'Geometry' && 'cards'` → `<ViewNodeCards/>`
   The per-view prop wiring is UNCHANGED — only the branch CONDITION changes from a flat string to
   the resolved pair. Do NOT alter what each view receives.
3. **Parity is the DoD:** every existing ViewHost/panel test + snapshot must stay byte-identical
   (the rendered output does not change; only the dispatch mechanism does). Retarget a test ONLY if
   it pins the literal `renderedViewMode === 'x'` mechanism; prefer asserting the rendered view.

**Out of scope (B3+):** retiring the flat enum from the 24 callers; the richer axes
(orientation-semantics/direction/child_global_direction/viewScope-4 — B1 deferred them). Do NOT
grow those here.

**Verify:** focused ViewHost + panel-snapshot suites (byte-identical) · check 0/0 · unit
`--maxWorkers=3` · build. Then mailbox the coordinator — the coordinator runs the STRICT
blank-frame gate on all 5 views (build synced → Obsidian restart → `--no-build --no-reload`) before FF.

## PA-5 spec — wire adapters + mobile inventory (PA plan §5)

Read `docs/work/hardening/plans/2026-06-13-platform-adapter/index.md` §3 slice 5 + §4. Build the
`PlatformAdapterRegistry` in `main.ts`: `add()` the 4 adapters at boot, `activate(ctx)` after services
exist, `addChild(registry)` so `deactivate()` ties to unload. Add `src/platform/platformProfile.ts`
(`is-phone`/`isMobile` util) + a mobile-inventory doc (per-adapter `mobile.supported` + notes; feeds
the dev's `isDesktopOnly` decision). Fence: `src/main.ts` + `src/platform/` only; do NOT touch views.

## glossary spec — align stale canon to 05-view-canon

`glossary.md` L129-130 + `dev-glossary.md` L82 still say `Linear/Geometry/Table/Canvas`. Update to
the LOCKED canon (`Linear/Geometry/Canvas/Charts`; Table=Geometry mode; modes per
[[docs/architecture/explorer-model/05-view-canon|05-view-canon]]). Docs-only; point both at 05-view-canon.

## Ordering / what to do

1. **Parallel now:** B2 · PA-5 · glossary (3 Codex, disjoint).
2. **After B2 + PA-5 land:** shim collapse (SOLO), then deps re-integrate (lockfile, last).
3. **HITL (dev, not Codex):** PAI-003 icon picker (first visible proto UI) · cards 37s watch-item
   (re-run STRICT `--view=cards` on an idle machine) · P112 reconcile (stable hotfix vs V.D migration).
4. **Coordinator (fresh session) integrates:** FF each lane in order, run B2's STRICT gate, PA-5 smoke.
