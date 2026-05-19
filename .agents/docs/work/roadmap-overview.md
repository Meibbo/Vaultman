---
title: Roadmap overview — Vaultman work routes
type: roadmap-index
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-17T00:00:00
updated: 2026-05-18T10:50:00-05:00
tags:
  - agent/roadmap
  - initiative/overview
---

# Roadmap Overview

Single navigation entry point for the Vaultman work routes. Lists every
sub-system in the explorer-ui-vision spine + parallel tracks, marks
documentation status, and tells future agents what is safe to pick up.

This doc is **the roadmap**, not the source of truth. Each item links to
its real spec / plan / backlog entry; this doc never duplicates content.
When an item changes status, update the relevant column here.

## Status legend

- ✅ **Done** — completed and committed.
- 🟢 **In flight** — spec and/or plan exist; implementation in progress.
- 🟡 **Spec'd / Ready** — design captured; another agent can pick up.
- 🟠 **Esqueleto** — backlog entry exists with enough detail to brainstorm.
- 🔴 **Solo idea** — mentioned but no real capture.

## Phase 0 spine (Explorer foundation)

Locked build order: `0-H → 0-B → O → 0-A → N`. Each unlocks consumers
for the next.

| # | Item | Status | Doc |
|---|---|---|---|
| **0-H** | Virtualizer + `list` view mode | ✅ Done | [[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/index\|0-H spec]] |
| **0-B** | `serviceTheme` unification + token layer | 🟢 Mid-flight impl (commits `86d4060…da886c4`) | [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index\|0-B spec]] · [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/index\|0-B plan]] |
| **O** | `frameVaultman.svelte` decomposition | ✅ Done | [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index\|O spec]] · [[docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index\|O plan]] |
| **0-A** | Native-DOM parity + View Feature Contract + view-host extraction | 🟡 Spec drafted 2026-05-18; awaiting writing-plans handoff | [[docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/index\|0-A spec]]; uses [[reference_obsidian_web_lab\|obsidian-web-lab]] as native DOM reference (file-explorer + Bases + Outline tab vocab) |
| **N** | SCSS → UnoCSS migration (~90% target) | 🟠 Esqueleto detallado en backlog | [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index\|backlog §N]] |

## Sub-systems UI / layout (after Phase 0)

Each depends on Phase 0 land (typically 0-B or O) for the preset
consumption point to exist.

| # | Item | Status | Bloqueador | Doc |
|---|---|---|---|---|
| **5** | Settings UI refresh (preset selector) | 🟠 | 0-B impl | [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index\|backlog §5]] |
| **6** | Layout extension (modal-as-tab + status-bar-island) | 🟠 | O + 0-A | [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index\|backlog §6]] |
| **7** | Toolbar contract | 🟠 + research vivo | O | [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index\|backlog §7]] · [[docs/work/polish/research/2026-05-17-toolbar-architecture/index\|Toolbar architecture map]] |
| **8** | Color governance (zebra, rainbow, accent) | 🟠 | Independiente | [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index\|backlog §8]] |
| **9** | Snippet provider UX | 🟠 | Independiente | [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index\|backlog §9]] |
| **10** | Theme Builder UI (preset editor) | 🟠 | 5 + 6 | [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index\|backlog §10]] |
| **11** | Workspaces provider `explorerWorkspaces` | 🟠 | Independiente | [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index\|backlog §11]] |
| **12** | Bits-ui adoption preset | 🟠 | N recomendado antes | [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index\|backlog §12]] |

## Sub-systems cross-cutting / largos

| # | Item | Status | Bloqueador | Doc |
|---|---|---|---|---|
| **1** | Unified input-configuration system | 🔴 → 🟠 | Phase 0 completa; agente dedicado | [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index\|backlog §1]] |
| **2** | Queue data-model restructure | 🟠 | Independiente; ver follow-up "Decouple queue knowledge from ViewNodeList" | [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index\|backlog §2]] |
| **3** | In-editor diff-preview "accept-changes" | 🔴 → 🟠 | 0-A | [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index\|backlog §3]] |
| **4 (I)** | Bases-parity filter logical switching | 🔴 → 🟠 | Independiente | [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index\|backlog §4]] · [[docs/work/hardening/research/2026-05-14-explorer-libraries-and-parity-research/index\|worldview research]] |

## Parallel tracks (NO en explorer-ui-vision)

Trabajo activo independiente del spine de Explorer UI Vision. Un agente
puede tomar cualquiera sin tocar Phase 0.

| Item | Status | Próximo paso documentado |
|---|---|---|
| **OpenSSF OSPS baseline** | 🟡 Plan listo | [[docs/work/hardening/plans/2026-05-16-openssf-osps-baseline/01-scope-docs-workflow-permissions\|01-scope-docs-workflow-permissions]] |
| **Explorer variable scroll repair** | 🟢 Plan en flight | [[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/index\|plan]] — runner-level view switching pendiente |
| **Notebook Navigator scroll forensics** | 🟢 Spec activo | [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/index\|spec]] |
| **Multiview virtualization research** | 🟢 Research activa | [[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index\|research]] — prototipo `virtua` opcional |
| **Test audit** (2026-05-17) | 🟡 Research nueva | [[docs/work/hardening/research/2026-05-17-test-audit/index\|test-audit]] |
| **Codebase architecture cluster** | 🟢 Research en escritura | [[docs/work/research/2026-05-17-codebase-architecture-cluster/index\|architecture cluster]] |
| **TanStack node table** (polish) | 🟡 Spec + plan | [[docs/work/polish/specs/2026-05-07-tanstack-node-table/index\|spec]] |
| **Pretext grid cards** (polish) | ✅ Done | [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/index\|plan]] |
| **Elastic UI Chameleon** (polish) | 🟢 Plan activo | [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/index\|plan]] |

## Dropped

- **M — SCSS hygiene pass.** Sustituido por N (SCSS-to-UnoCSS); la
  hygiene emerge como subproducto de la migración. Sin spec.

## Explorer Merge (brainstorm 2026-05-19)

Umbrella spec que ordena el merge proto-v5 ↔ producción + refactor SOLID de god-objects
(panelExplorer 1329 LoC + 5 views 4377 LoC) + release pipeline. Detalle completo:
[[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella]].

11 sub-systems NUEVOS. **IDs ad-hoc, NO canónicos** — reconciliar con numbering (1-12 / N / O / 0-X)
al spec'ear cada uno.

| ID ad-hoc | Nombre | First release | Status |
|---|---|---|---|
| A.R | Action Routing (caret + kbd + selection + expand-all + cmenu) | v1.1.0 | 🔴 first detail spec target |
| 0-A.S | Adversarial Scroll + tree triple-write fix | v1.1.0 | 🟡 sibling (scroll-repair plan existe) |
| T.G | Test Invariant Gates (spec-anchored + AgentAssay/CUSUM anti-drift) | v1.1.0 | 🔴 not spec'd |
| N.R | NodeRow Primitive (cell = node-element) | v1.2.0 | 🔴 not spec'd |
| V.D | View Decomposition (5 god views → shells) | v1.2.0 | 🔴 not spec'd |
| P.D | Panel Decomposition (panelExplorer → orchestrators) | v1.2.0 | 🔴 not spec'd |
| K.B | Keyboard + Hotkeys/Macros provider | v1.3.0 | 🔴 not spec'd (subset de §1) |
| API | Vaultman public API `vaultman.v1` | v1.3.0 | 🔴 not spec'd |
| I.E | NN engine swap (dirección B) | v1.7.0 | 🔴 not spec'd |
| B.P | Bases Parity (extiende §4-I, BREAKING) | v2.0.0 | 🔴 not spec'd |
| C.D | Cross-provider Cell Data | v2.0.0 | 🔴 not spec'd |
| R.D | Release Discipline (release-please + paths-filter + conventional commits) | x-cutting v1.1.0+ | 🔴 not spec'd |

Release pipeline: `v1.1.0 Explorer Hardening → v1.2.0 Arch cleanup → v1.3.0 Keyboard+API →
v1.4.0 Nautilus rewrites → v1.5.0 Theme Builder+Layout → v1.6.0 UnoCSS+bits-ui →
v1.7.0 NN Interop → v2.0.0 Bases Parity BREAKING`.

View mode merge: viewTree KEEP+sticky-fix · viewList=proto tiles · viewGrid=proto icons (Nautilus) ·
viewTable=Bases parity · viewCards=Bases parity. **proto-v5 NO canónico** (merge, no replace).
Sub-systems pre-existentes con merge layer: §5 (recent themes + dashboard3 redef) · §6 (layout) ·
§8 (color) · §10 (Theme Builder + Adwata icons) · §12 (bits-ui + StackIsland) · §4-I (filter) · §2 (queue).

## Agent dispatch reference

Cuál agente puede arrancar cada item con qué pre-reads. Útil para
delegar en paralelo mientras humanos hacen pulido visual / auditorías.

| Agente | Item | Pre-reads suficientes para arrancar |
|---|---|---|
| **A — Finalizar 0-B** | 0-B impl + Settings UI refresh (§5) | [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index\|0-B spec]] + [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/index\|plan]] |
| **B — Plan + impl O** | O sub-system | [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index\|O spec]] (9 shards) |
| **C — Brainstorm 0-A** | 0-A View Feature Contract | 0-B spec + 0-H spec + post-0-H architecture handoff + `obsidian-web-lab` referencia DOM |
| **D — Brainstorm N** | SCSS-to-UnoCSS migration | backlog §N + audit de `src/styles/` + `uno.config.ts` actual |
| **E — OpenSSF OSPS baseline** | Hardening compliance | [[docs/work/hardening/plans/2026-05-16-openssf-osps-baseline/01-scope-docs-workflow-permissions\|plan-01]] |
| **F — Brainstorm Sub-system 7** | Toolbar contract | backlog §7 + [[docs/work/polish/research/2026-05-17-toolbar-architecture/index\|toolbar architecture map]] (post-O) |
| **G — Brainstorm Sub-system 2** | Queue data-model restructure | backlog §2 + git history "beta.15 node elements" referencia |

## What NOT to delegate (retain in human)

- **Sub-system 1 (Unified input)** — cross-cutting muy grande; mejor cuando Phase 0 esté firme y haya capacidad para dedicar agente full-time multi-día.
- **Sub-system 3 (in-editor diff)** — UX direction no decidida; depende de visión de "accept-changes" no capturada todavía.
- Cambios a la **build-order canónica** (`0-B → O → 0-A → N → 6 → 7 → 12`).
- **Polish visual del runtime** (pulido fino de interacción, espaciado, animación) — naturalmente humano hasta que haya un sub-system formal de design system.

## How to use this doc

- **Iniciando trabajo nuevo:** lee esta tabla → pick el item con status
  🟡/🟠 que NO tiene bloqueador activo → abre su doc enlazado.
- **Retomando trabajo:** chequea status de tu item; si pasó de 🟡 a 🟢,
  abre la plan/impl en curso; si sigue en 🟡 sin avance, considera si
  el bloqueador cambió.
- **Acabando un item:** marca como ✅ en esta tabla y actualiza el
  `updated:` frontmatter. No borres entradas — la historia importa.
- **Capturando idea nueva:** si emerge un sub-system fuera del scope,
  añade entrada en backlog `explorer-ui-vision` (si es del spine) o
  crea su propio backlog folder (si es independiente). Linkea aquí.

## Adjacent docs

- [[docs/work/hardening/index|hardening index]] — todos los specs/plans
  activos.
- [[docs/work/polish/index|polish index]] — UI/UX polish tracks.
- [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index|Explorer UI Vision backlog]] — fuente canónica de items 1-12+N+O.
- [[docs/current/status|current status]] — estado de la sesión activa.
- [[docs/current/handoff|current handoff]] — punto de resumen para
  próximo agente.

## Notes

- Authored 2026-05-17 on `claude/explorer` branch (worktree
  `jovial-wilson-f81c67`). Intent: copy to `sandbox` after the
  `claude/explorer → sandbox` merge (sandbox was 116 commits behind
  at authorship time).
- Status legend uses 5 tiers; ⚠️ status reserved for blocked/at-risk
  items (none currently).
- The list is not exhaustive — small follow-up tasks live in their
  initiative's backlog folder, not here. This doc lists strategic
  sub-systems, not micro-tasks.
