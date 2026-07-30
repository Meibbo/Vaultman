---
title: FTC — Floating TOC v1.2 (issue-set)
type: issue-index
status: active
parent: "[[docs/work/polish/index|polish]]"
created: 2026-07-14T00:00:00
created_by: claude-fable-5
tags:
  - agent/issues
  - initiative/polish
  - release/1.2.0
---

# FTC — Floating TOC (v1.2.0)

Issue-set del spec [[docs/work/polish/specs/2026-07-14-v1-2-floating-toc/index|v1.2 Floating TOC]].
Formato AFK/HITL (patrón PAI): DoD tool-checkable = ejecutable por subagente AFK;
juicio visual/dev = HITL. Slices verticales tracer-bullet, orden serial 001→005.

| Issue | Título | Modo | Estado |
|---|---|---|---|
| [[001-static-rail|FTC-001]] | Rail estático + settings enable + gate tabs | AFK | ✅ codex `8050bb2b` |
| [[002-reveal-seam|FTC-002]] | Jump vía mini-seam `reveal-node` | AFK | ✅ fable `33e8741d` |
| [[003-view-menu-section|FTC-003]] | Toolbar auto-hide (tabs-menu) + index on/off (view-menu) | AFK + HITL copy | ✅ fable `296c8b52`+`d06d48ca` |
| [[004-save-config|FTC-004]] | Persistencia `viewConfigByTab` + sección settings | AFK | ✅ fable `213baaef` |
| [[005-niagara-effects|FTC-005]] | Efectos Niagara (opción off-default) | AFK + HITL perf | ✅ fable `9cf8cf68` (core scrub; sub-efectos diferidos) |
| [[006-deferred-scope|FTC-006]] | Scope: toggle files/folders + drill L2+ | AFK | ✅ fable `5c776f28` (elevado a v1.2) |
| [[007-index-lifecycle|FTC-007]] | Close/back + colapso scoped + Soft scroll real | AFK | ✅ codex `409b15ed` |
| [[008-toolbar-settings|FTC-008]] | Tools menu (máx. 5) + Settings IA/copy | AFK | ✅ codex `d9eb4cf0` |
| [[009-niagara-track|FTC-009]] | Track unificado + slide bidireccional + deferrals | AFK | ✅ codex `58193e14` |

## Corrective batch `1.2.0-beta.1` — dev lock 2026-07-15

La revisión manual del dev sobre `3d86f57c` reabrió el cierre funcional del port Niagara. FTC-007→009 son parte de **beta.1**, no patches 1.1.6 ni backlog post-1.2.
Spec aprobada:
[[docs/work/polish/specs/2026-07-15-v1-2-beta1-floating-toc-fixes/index|beta.1 Floating TOC corrective batch]].

El orden Settings se controla por el orden literal de `new Setting(...)` en `VaultmanSettingsTab.display()`; headings no son páginas ruteadas. En este batch View Config se mueve debajo de Operations Presets.

## Landed (rama `v12/ftc-001`, apilado sobre `dev`=1.1.6; sin FF/push)

- **FTC-001** `8050bb2b` (codex, en el worktree `C:/tmp/vaultman-v12-ftc001`): `logicIndexGroups.ts` puro + `floatingToc.svelte` (rail estático) + accessor `getTopLevelNodes()` en los 3 paneles + setting `floatingTocEnabled` (default off) + gate files/props/tags + `GridView.getDisplayedFiles()`.
  Source-guard `floatingTocSource.test.ts`. Unicode glyph = 1 code point completo.
- **FTC-002** `33e8741d` (fable): `services/routerFloatingToc.ts` (`FloatingTocRouter` WAR-shaped, `invoke('reveal-node',id)`, razones `missing-reveal-port`/`reveal-rejected`) + `revealNode(id)` en los 3 paneles (tree→`scrollToId`; files table/grid→`scrollToPath`) + rail = buttons con `onJump` + wiring del puerto activo por tab en `VaultmanFrame` ($effect). Unit `routerFloatingToc.test.ts` + guards 002. Gates: check 0/0 · lint · build · stylelint · **full unit 68f/304t** · scorecard 17 · autofixer `issues:[]`. `format:check` = 20 `.svelte` ajenos pre-existentes (rojos ya en `8050bb2b`;
  mis 2 `.svelte` limpios).
- **FTC-002 fixes** `ab2465e7`+`ccb26349`: rail sigue el **orden visible** del explorer (no alfabético;
  reacciona a asc/desc), **primer glyph literal** (`_`,`+`,dígitos; sin bucket `#`), wrapper `right:12px` (libra scrollbar). Root-cause del "click no hacía nada" = build no sincronizado a plugin-dev (`build` vs `build:plugin`).
- **FTC-006 (scope) ELEVADO a v1.2** `5c776f28` (decisión dev): **toggle files↔folders** (indexa UN kind a la vez = fin de la confusión de kinds mezclados) + **scope drill** por **long-press** del toggle (gesto WIR→WAR twin: pick-mode captura el `data-id` de la fila cliqueada → indexa los hijos de ese nodo; reset al top) + **gate a sorts de texto** (name/path/ext). Paneles exponen `getIndexNodes(rootId)` /`isIndexableSort`/`expandNodeById`; `indexLevel()` proyecta cualquier nivel. Smoke plugin-dev VERDE:
  toggle flip `+CS`↔`_ACHM…`, drill en `+`→hijos `+912ABC…鈴`, reset→L1, `dev:errors` limpio.
  Gates: check 0/0 · lint · stylelint · full unit 68f/303t · build.
  - **Shape v2**: `FloatingTocPanel` port = twin de `PanelHandle`; el drill-gesture = WIR→WAR; el toggle/ reset = nav-kind view-state local. Port a 2.0 = move.
- **Limitación conocida (candidato patch 1.2.x):** en **props/tags** modos **table/grid** el rail muestra letras pero `revealNode` rechaza (NodeTableView sin scroll-to) = click sin efecto (sin throw). files funciona en los 3 modos; props/tags default=tree funciona.
- **Validación visual:** delistada para agentes hasta nuevo aviso. El dev decide por su cuenta cuándo revisar feel/layout y si distribuye la beta; no es gate del batch.
- **FTC-007 `409b15ed`:** Close literal primero; Back de un nivel; scope reacciona a `collapse-node`/`collapse-all`; `tocSoftScroll` real atraviesa router/panel/vistas.
- **FTC-008 `d9eb4cf0`:** Files opt-in a cinco nodos con Tools nativo; View Config debajo de Operations Presets; orden Settings = secuencia literal de `new Setting(...)`.
- **FTC-009 `58193e14`:** un único track action+index cuando join está on; acciones inertes durante scrub y activables por tap; curva proto exacta; slide firmado reversible;
  bottom centrado; plain uniforme; cinco subefectos diferidos fuera del beta UX.
- **Gate integrado final:** 70 unit files / 345 tests; check 0/0; bundle productivo, ESLint, Stylelint, formato dirigido y diff-check verdes. `format:check` global conserva 18 rojos Svelte preexistentes fuera del diff.

## Reglas comunes

- Base código: branch `dev` (tras FF a `origin/main` = 1.1.6); worktree `C:/tmp/vaultman-v12-ftcNNN`; `pnpm install` primera vez.
- Gates de agente por issue desde el lock dev 2026-07-14/15: RED/GREEN focal · svelte-check 0/0 · autofixer `issues:[]` en `.svelte` tocados · lint/stylelint según alcance · build · full unit al integrar. **Testing visual/UI, smokes Obsidian, `emulateMobile`, screenshots y automatización de device están delistados para agentes hasta nuevo aviso y pertenecen al dev.**
- Two-commit: `feat/fix` código-only (pushable) + `docs:` local-only.
- Naming: componente `FloatingToc`, CSS `.vaultman-floating-toc*`, action id `reveal-node`, lógica pura `logicIndexGroups.ts` — shape-twin del canon goal ([[docs/work/hardening/research/2026-07-14-goal-taxonomy-alignment/index|catálogo]]).
- Adversarial pass antes de cerrar cada spec de slice (policy C2, AGENTS.md).

## Backlog patches 1.2.x (post-release, se convierten en issues al llegar el backlog del dev)

- FTC-006 scope option (`gc_file` / hierarchy_level; reclasificación AD).
- Reparación/diseño futuro de Name Pill, Scrub Glow, Name Cell, Name Reveal y Name Letters; los stored fields permanecen dormidos en beta.1.
- Lo que el dev entregue como backlog v1.2 (se triagea con vm-backlog-manager).

## Betas

La proyección inicial `beta.1=001-004` / `beta.2=005` quedó supersedida por la revisión manual del 2026-07-15. El batch de código `1.2.0-beta.1` FTC-007→009 y sus gates no visuales quedó cerrado en `58193e14`; el dev decide después el veredicto/distribución beta conforme al runbook [[docs/architecture/policies/release|policy release]].
