---
title: Next Actions — first detail spec target + execution handoff
type: spec-shard
status: draft
parent: "[[index|umbrella]]"
created: 2026-05-19T00:00:00
updated: 2026-05-19T00:00:00
---

# Next Actions

Post-umbrella approval: cómo arrancar v1.1.0 + qué docs actualizar + handoff a writing-plans.

## First detail spec target: A.R Action Routing

**Por qué A.R primero**:

1. **Resuelve el dolor inmediato** reportado por el usuario al inicio del brainstorm:
   caret roto + keyboard nav roto + selection inconsistente + expand-all no funciona en
   algunos views + cmenu diverge entre views. A.R unifica todo.
2. **Es prereq de V.D** (View Decomposition). N.R primitive embeds A.R action contract.
3. **Es prereq de B.P** (Bases Parity). Unified cmenu + selection contract necesario para
   Bases vocab.
4. **Es independiente de K.B** en v1.3.0 — A.R row-keyboard contract delega a K.B's row
   context cuando K.B llega.
5. **Scope contained**: 8-12 commits, ~6-10 sessions. Auditeable per PR.
6. **T.G basis puede arrancar paralelo en TDD red-green**: write invariant tests (ARIA tree
   pattern, caret hit-target, selection parity, keyboard parity) primero, A.R los hace verde.

## A.R spec preview (no es el spec final — solo orientation)

A.R detail spec se escribe en sesión siguiente. Path propuesto:
`.agents/docs/work/hardening/specs/2026-05-19-explorer-sub-system-AR-action-routing/`.

**Scope preview**:
- New `src/services/serviceKeyboardNav.ts` (full WAI-ARIA Tree View pattern)
- New `src/services/serviceRowAction.ts` (Melt UI–style builder pattern: `getCaretProps`,
  `getRowProps`, `getKeyboardHandlers`)
- Normalize ViewHost contract (`(id, MouseEvent)` único — drop `(row, SelectModifiers)`
  ViewNodeList variant)
- Fix `viewTree.svelte:974-978` caret leaf placeholder
- Fix WCAG 2.5.8 caret hit-target (≥ 24×24 CSS px) — full row-width clickable area to caret
- Standard 10-item cmenu (Open/Rename/Move/Tag/Prop/Duplicate/Queue/Delete) routed via A.R
- Expand/collapse all enabled for non-tree views via `nodeExpansionCommand` propagation
- Universal cmenu trigger contract via NodeRow primitive (in V.D phase, A.R defines shape)

**Locked non-goals para A.R**:
- No NodeRow primitive build (eso es N.R en v1.2.0; A.R define contract, N.R consumes)
- No View Decomposition (eso es V.D en v1.2.0)
- No viewTree sticky-parents fix (eso es sibling spec en v1.1.0 — `viewTree-sticky-fix-spec`)
- No 0-A.S scroll triple-write fix (sibling paralelo)
- No virtualization changes
- No DnD changes (services untouched per 0-A constraints)

**Verification matrix preview**:
- Diagonal: 5 views × 4 mount-contexts (tabFiles, tabTags, tabProps, tabSnippets) × test
- WAI-ARIA Tree View pattern compliance suite (mandatory keyboard behaviors)
- Caret hit-target snapshot (WCAG 2.5.8)
- Selection contract parity across views
- Keyboard nav parity across views
- Live `plugin-dev` smoke with `obsidian vault=plugin-dev dev:errors` returning "No errors captured"

## Required updates antes de arrancar A.R

### 1. roadmap-overview.md update

Path: `.agents/docs/work/roadmap-overview.md` (10457 bytes, single file currently)

Updates needed:
- Add new rows en la tabla "Sub-systems UI / layout (after Phase 0)" o sección nueva
  "Sub-systems Explorer Merge (post brainstorm 2026-05-19)" para los 11 nuevos:
  N.R, A.R, V.D, P.D, T.G, 0-A.S (already exists sibling track), K.B, API, I.E, B.P, C.D, R.D
- Add column "First release" con v1.1.0 / v1.2.0 / ... / v2.0.0 mapping per sub-system
- Add link a esta umbrella desde "Adjacent docs"
- Update `updated:` frontmatter a 2026-05-19

Status legend para los nuevos: 🟡 spec-drafted (apuntan a esta umbrella) o 🔴 not yet spec'd.

### 2. status.md update

Path: `.agents/docs/current/status.md`

Updates needed:
- Add bullet en "Current Route" linkando esta umbrella como next initiative
- Update "Next Action" para reflejar: A.R first detail spec, then plan, then v1.1.0 execution
- Reference: `[[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella]]`

### 3. handoff.md update

Path: `.agents/docs/current/handoff.md`

Updates needed:
- "Resume Point" mention de la umbrella aprobada
- "Next Action" = escribir A.R detail spec (writing-plans skill handoff)
- Add umbrella a "Primary records" list

## Execution mode handoff

Per superpowers brainstorming skill flow:

```
brainstorming → write spec → spec self-review → user reviews → writing-plans
```

Currently en: spec self-review.

Next: **user reviews esta umbrella** + 6 shards en disk:
- `.agents/docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index.md`
- `.../01-merge-map.md`
- `.../02-sub-system-inventory.md`
- `.../03-dependency-graph.md`
- `.../04-release-pipeline.md`
- `.../05-ambiguities-and-deferred.md`
- `.../06-next-actions.md`

Si user aprueba: transición a `superpowers:writing-plans` skill para detail spec de A.R + su plan.

Si user pide cambios: revisión inline + re-shard si needed.

## Parallel agent dispatch para v1.1.0

Per AGENTS.md "agent dispatch reference" pattern + dispatching-parallel-agents skill:

| Agente | Sub-system | Pre-reads suficientes |
|---|---|---|
| **Agente α — A.R spec author** | A.R Action Routing detail spec | Esta umbrella (todos los shards) + 0-A spec + research outputs en transcript del brainstorm |
| **Agente β — 0-A.S impl** | Existing Adversarial Scroll repair plan | `.agents/docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/index` |
| **Agente γ — T.G basis** | Test Invariant Gates setup | wdio-obsidian-service docs + Vitest browser-mode setup + WAI-ARIA Tree View spec (web.archive.org si necesita) |
| **Agente δ — viewTree sticky fix** | proto sticky-parents reference adoption | `pages.jsx:323-367` + HTML lines 1019-1031 + current `viewTree.svelte:420-441` |

Agentes β, γ, δ pueden arrancar paralelo con α una vez que A.R spec se aprueba.

## Release coordination

Per R.D (Release Discipline) cross-cutting:

- **Pre-v1.1.0**: push `sandbox → origin/sandbox` (180 ahead) AHORA o muy pronto.
  No esperar. Preserva trabajo + permite review en GitHub.
- **During v1.1.0 sprint**: `[Unreleased]` section accumulating en CHANGELOG.md cada commit
- **v1.1.0 release**: tag + manifest + versions + main merge via strip pipeline
- **GitHub Release**: published with copy-paste notes

## Source brainstorm context preservado

Esta umbrella codifica el output del brainstorm 2026-05-19 (transcript de Claude Opus 4.7).

Decisiones clave del usuario durante el brainstorm:
1. Approved umbrella + 4-tier decomposition (later expanded to 6 tiers per merge map)
2. Tree view se KEEP (proto reference para sticky-parents)
3. viewCards = Bases parity, NOT proto
4. viewTable = Bases parity, NOT proto
5. viewGrid = proto Nautilus icons
6. viewList = proto Nautilus tiles
7. Theme system: drop proto themes, add recent + Obsidian native theme provider
8. Mode toggle DROP — serviceLayout responsive ya cubre
9. dashboard3 = hidratación tab-mount module, NO 4-column divide
10. Proto NO es canónico — merge proto + producción
11. Approved pipeline v1.1.0 → v2.0.0 final ordering

Research subagents outputs (en transcript):
- Internal arch audit (LoC + behavior matrix + service inventory + SOLID violations)
- External research (Svelte 5 patterns + Electron testing + TanStack Virtual + WAI-ARIA tree)
- Bases parity + NN interop + web-lab integration (con conflict register)
