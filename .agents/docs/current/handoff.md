---
title: Current handoff
type: agent-handoff
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
archive_source: docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-handoff.md
created: 2026-05-04T01:36:20
updated: 2026-07-21T08:10:00
tags:
  - agent/current
created_by: dec
updated_by: claude-opus-4-8
---

# Current Handoff

Compact handoff after archiving the oversized current handoff:
[[docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-handoff|2026-05-11 handoff archive]].

## NEXT AGENT START HERE — 1.2.0-beta.6 PUBLICADA; resolviendo P2 hacia v1.2.0 (2026-07-21)

**`1.2.0-beta.6` PUBLICADA** por orden explícita del dev:
https://github.com/Meibbo/Vaultman/releases/tag/1.2.0-beta.6 · `origin/dev` = tag =
`fefdde48` (`chore(release): prepare 1.2.0-beta.6`). CI verde entera (verify 904
tests, security:audit, build:plugin, attest, upload, publish). Pre-release.

**Rama de trabajo:** `codex/bt5-next-10`, worktree `C:/tmp/vaultman-release-beta2-final2`
limpio. **HEAD `e0945039`** = 5 commits AFK sobre beta.6 (`fefdde48`), sin push.
`stash@{0}` intacto.

**Orden actual del dev:** resolver **todos los P2 restantes** de forma AFK (uno a uno
+ smoke), destructivos con el modal nativo de Obsidian (no inventar), dejar el
**preflight de v1.2.0 stable SIN publicar** (esperar su visto bueno).

**Cerrado AFK después de beta.6 (batch 2026-07-21, shards 11-12):**
- **BT5-042** (`ff083b91`) — bubbledot: toggle `collapsedFolderBadges` dot↔badges. **BT5-017 conservado.**
- **BT5-034** (`2bdea929`) — island de filtros clampa su max-height al alto del frame.
- **BT5-033 slice-1** (`3353cd88`) — Node icon scope renombrado + movido a Explorer.
- **BT5-040** (`b4b625f7`) — folder totals recursivos (words/props/tasks; fechas fuera).
- **BT5-036 slice content** (`e0945039`) — content nodes: Rename/Delete vía prompts
  nativos de Obsidian, configurable, **smoked**. Verify 141 files / 919 tests.

**⚠ BLOCKER que necesita tu decisión (BT5-036 resto):** snippet-delete y
plugin-uninstall **NO tienen modal de confirmación nativo** en Obsidian
(`uninstallPlugin` no confirma; snippets = config-dir, no TFiles). Pediste "usa el
nativo, no inventes". Opciones en [[docs/work/polish/issues/bt5-next-release/036-node-menu-actions-and-config|BT5-036]]
(recomiendo A: abrir la superficie nativa de settings donde el user ejecuta el destroy).

**Pendientes reales (todo P2, ningún bloqueador de código para v1.2.0):**
- **Código AFK:** BT5-035, BT5-039, BT5-041. **BT5-036 resto = BLOCKED** (arriba).
  **BT5-033-core = GRILL-GATED** (compositions capturan showDock/showToolbar/etc —
  fijar límite composition vs. global antes de codear).
- **HITL del dev:** BT5-018 (revisión UI, código listo `b4f0815a`), BT5-026, BT5-027.
- **Gates HITL de release (v1.2.0):** BT5-002 (matriz visual), BT5-003 (benchmark vault
  grande), BT5-004 (boletín + tag) — validaciones del dev, no código.
- Detalle e índice: [[docs/work/polish/issues/bt5-next-release/index|BT5]].

Shards previos 06–10 en `docs/work/polish/plans/2026-07-19-bt5-next-10/`.

## NEXT AGENT START HERE — BT5 012/013/015/018/031/032 cerrados; quedan correcciones del dev (2026-07-20, tarde)

**`1.2.0-beta.5` sigue siendo la última publicada; no repetir el release.**
`dev` = tag = `ebf625d9`.

**Estado del entorno**
- Producto: `C:/tmp/vaultman-release-beta2-final2`, rama **`codex/bt5-next-10`**,
  HEAD **`102bb0b6`**, worktree limpio. NO crear branch/worktree.
- `stash@{0}` = WIP histórico de BT5-030. **NO TOCAR.**
- Sin push/tag/merge/PR sin orden del dev. Staging siempre por paths explícitos.
- `.agents` = commits locales, jamás push. Obsidian solo con `vault=plugin-dev`.
- Gate: `pnpm run verify` (hoy **843 tests / 128 files**, scorecard 17/17). Leer la
  SALIDA del gate, no el exit code de una tubería con `tail`.
- **codebase-memory-mcp: el parámetro es `project`, NO `project_path`.** Con el
  nombre correcto (`C-tmp-vaultman-release-beta2-final2`) funciona. Un shard
  anterior afirmó que estaba roto: era un error de invocación. Pendiente real: el
  índice sirve líneas desfasadas y `mode='full'` falla; `fast`/`moderate` responden
  ok pero no re-extraen. Necesita reinicio del server MCP y re-index.

**Cerrado en esta tanda (9 commits sobre `ea498975`)**

| Commit | Qué |
|---|---|
| `7c2f5928` | BT5-012 label plano = `file.name` / `file.path` |
| `843da5ab` | BT5-013 Last opened: store, cell, hover, sort |
| `d396c3f0` | BT5-015 icono en el slot del caret (**mal hecho, ver abajo**) |
| `9cd1e3ac` | BT5-031 Files repinta con `iconic.onChanged` |
| `577789c2` | BT5-032 un solo dueño de tooltip por fila |
| `a188d672` | BT5-018 context menu de Files configurable |
| `4a61d419` | fix: el re-render redundante se comía el primer click |
| `eb8ad91d` | fix: tooltip armado antes de que llegue el puntero |
| `102bb0b6` | fix: Last opened se reordena en vivo |

Source record completo:
[[docs/work/polish/plans/2026-07-19-bt5-next-10/06-bt5-012-013-015-018-031-032|shard 06]].

**TU TRABAJO — correcciones pedidas por el dev, en este orden**

1. **BT5-015 está MAL Y HAY QUE REHACERLO.** Lo implementé como "nodo que reserva
   caret pero no puede expandir" (`showCaret && !hasChildren`). La intención real
   del dev es otra: **el icono reclama el espacio del caret solo en los nodos que
   están renderizando el cell Icon**, para que TODOS los `cell_label` queden
   alineados. Los nodos sin icono (sin custom, o con la celda apagada) se
   comportan como hasta ahora. Síntoma que hay que eliminar: con "custom icons
   only", los nodos que sí tienen icono empujan su label a la derecha y rompen la
   alineación con los que no. Revisar el layout/CSS de la fila, no solo el DOM.
2. **BT5-018 — dos correcciones del dev.**
   - La sub-page de Files cmenu debe vivir **dentro** del otro menú de context
     menus que ya existe en la misma sección de settings, no como entrada hermana.
   - El catálogo **no está mostrando todas las opciones**: faltan los nodos/menús
     que aparecen en el cmenu real, incluidos **los interceptados** (los items
     nativos de Core/otros plugins que Vaultman inyecta o filtra) y los **menús
     padre**, que técnicamente son parent nodes y deben poder configurarse igual.
     Hoy `panelActionCatalog()` solo expone el registry propio de Vaultman.
3. **BT5-009 — adelantar** (exclusión de files como filtro por nodo) y **quitar su
   sección de settings**.
4. Después, seguir con los **próximos 5 issues** de la cola BT5.

**Contexto imprescindible antes de tocar código**
- `src/logic/logicCellRegistry.ts` es la fuente única de cells, hover y orden.
- `cellsForExplorer()` da el `labelKey` BASE; el override por explorer sale de
  `cellLabelKey(def, explorer, viewMode)`.
- Los source guards fijan símbolos reales. Si un refactor mueve algo, **re-apunta
  el guard, no lo borres**. En esta tanda se re-apuntaron 11.
- **Guard sensible:** `explorerViewportRefresh.test.ts` protege BT5-030 (los
  micro-cuelgues al escribir, P0 validado por el dev). Prohíbe render en
  `file-open` salvo la excepción explícita del sort `opened`. No lo relajes más.
- **Smoke de runtime nunca ejecutado** en ninguno de los 6 issues ni en los 3
  fixes. Todo está verificado por gates, no por observación en Obsidian.

## Histórico — beta.5 PUBLICADA; los 5 issues de esa tanda (2026-07-20)

**`1.2.0-beta.5` ya está publicada; no repetir el release.**
https://github.com/Meibbo/Vaultman/releases/tag/1.2.0-beta.5 · `dev` = tag = `ebf625d9`.

**Estado del entorno**
- Producto: `C:/tmp/vaultman-release-beta2-final2`, rama **`codex/bt5-next-10`** (HEAD
  `ea498975`), worktree limpio, sincronizada con `dev`. NO crear branch/worktree.
- `stash@{0}` = WIP histórico de BT5-030. **NO TOCAR.**
- Sin push/tag/merge/PR sin orden del dev. Staging siempre por paths explícitos.
- `.agents` = commits locales, jamás push. Obsidian solo con `vault=plugin-dev`.
- Gate final: `pnpm run verify` (hoy **789 tests**, scorecard 17/17). Leer la SALIDA
  del gate, no el exit code de una tubería con `tail`.

**Cerrado en esta tanda:** BT5-010 (`f2e4f8c3`), BT5-019 (`d0928260`), BT5-011
(`bf0e455c` + `ea498975`), más 016/017/020/029/030 de antes. **BT5-030 lo validó el
dev en runtime**: sin micro-cuelgues, gate HITL cerrado.

**TU TRABAJO — los 5 issues, en este orden:**
1. **BT5-012** Path visible en Files plano — cell `path` ya existe en el registry con
   `role: 'label-projection'`; falta la proyección real del label y los guards.
2. **BT5-013** Last opened persistente — servicio nuevo + cell + sort desc.
3. **BT5-015** Icon en el slot del caret.
4. **BT5-018** Context menu de Files configurable. **Decisión del dev ya tomada:**
   base = orden del context menu de **Core Files**; UI = como settings de hover-info
   (lista DnD) **más submenús y dividers**. Él revisa cuando lo vea.
5. **BT5-031 + BT5-032** (nuevos, reportados por el dev tras probar beta.5). Ambos
   traen la causa ya localizada en el issue file; son baratos y de alto valor.

**Contexto imprescindible antes de tocar código**
- Lee [[docs/work/polish/plans/2026-07-19-bt5-next-10/05-beta5-release-and-takeover|shard 05]]:
  decisiones del dev, errores cometidos y el hallazgo de `cellLabelKey`.
- El **registro de cells** (`src/logic/logicCellRegistry.ts`) es ahora la fuente única
  de cells, hover y orden. 012/013/015 se registran ahí, no en mapas por superficie.
- `cellsForExplorer()` da el `labelKey` BASE; el override por explorer sale de
  `cellLabelKey(def, explorer, viewMode)`.
- Los source guards fijan símbolos reales. Si un refactor mueve algo, **re-apunta el
  guard, no lo borres**.

**Coordinación:** `codex-gpt5` cerró su presencia; task_048 es del owner principal.

## NEXT AGENT START HERE — beta.4 PUBLICADA (2026-07-18)

**`1.2.0-beta.4` ya fue publicada; no repetir el release.**

- `dev` + tag `1.2.0-beta.4` + GitHub release = `f22ae806` (`chore(release):
  prepare 1.2.0-beta.4`). Release:
  https://github.com/Meibbo/Vaultman/releases/tag/1.2.0-beta.4.
- Workflow `29671245720` completado verde: verify **101 files / 563 tests**,
  check 0/0, lint, format, stylelint, build, scorecard 17, audit producción,
  attest, upload y publish. Assets: `main.js`, `manifest.json`, `styles.css`.
- Preflight fixes antes del release: `f46bd03b` (timers popout-safe, stubs
  configDir, formato beta.4) + `81419906` (fragments reales beta.4 + release
  notes sin header redundante). Worktree `C:/tmp/vaultman-release-beta2-final2`
  quedó en `dev`, limpio y sincronizado con `origin/dev`.
- Cerrados en beta.4: BT4-001..012, 014..024 (menos 013), 031, 033, y la mitad
  watch de 030 (root cause throttling → vault `raw` event, probado vivo).
- **Siguiente tren autorizado para backlog:**
  [[docs/work/polish/issues/bt5-next-release/index|BT5-001..024]], renumerado por
  prioridad/dependencias. Destino de publicación aún `1.2.0-beta.5` vs `1.2.0`
  stable. BT4 queda histórico; P0 BT5 = 001 hang · 002 leaf vacío · 003 tasks.

## NEXT AGENT START HERE — beta.3 publicada; ejecutar beta.4 BT4 (2026-07-18)

**Estado:** `1.2.0-beta.3` PUBLICADA por orden del dev (aun con regresiones
conocidas): `origin/dev` = `fa48b96a` = tag `1.2.0-beta.3`
(https://github.com/Meibbo/Vaultman/releases/tag/1.2.0-beta.3). Preflight completo
verde; en el camino se corrigió el guard scorecard stale (`fa48b96a`, blur refactor).
El batch correctivo beta.4 está ESPECIFICADO con triage completo del reporte dev
(D21-D37); supersede la sección de abajo (2026-07-17) y su link muerto BT3-011.

**Lee en orden:**
1. [[docs/work/polish/specs/2026-07-18-v1-2-beta4-batch/index|Spec beta.4]]
   (D21-D37 + §UX niagara + Mermaid + adversarial).
2. [[docs/work/polish/specs/2026-07-18-v1-2-beta4-batch/01-by-level-sort|Shard 01 By level sort]] (BT4-009 — ENTERO antes de tocar sort).
3. [[docs/work/polish/issues/bt4-beta4-batch/index|Issue-set BT4-001..013]]
   (+ shards 01-regressions/02-bugs/03-redesign-ia-features).

**Esenciales:** rama `v12/bt4` desde `fa48b96a` en el worktree
`C:/tmp/vaultman-release-beta2-final2`. Regresiones (BT4-001..003) con skill
`vm-regression-resolver` — oráculo beta.2 `5e5fa1df`, rango culpable
`03fe92bc..7ba6a3c9`; anclas ya identificadas: tags hang sospechoso `194a7306`
(iconic `onChanged→_render` en explorerTags L84-87) · rail→lane causa `03fe92bc`
(regla shift eliminada; re-introducir con lane compacto 22/26px) · toolbar
tool-case = bisect en `navbarFilters.svelte`. Orden: 002 → 001 → 003 → 008 →
004/006/007 → 005 → 009 → 011 → 010 → 012 → 013; 001∦009 (navbarFilters). Vaults
de inspección: `start of the road` (beta.2) · `plugin-dev` (beta.3). Gates policy
sin cambio; testing visual delistado; two-commit; sin push/tag sin el dev.

## NEXT AGENT START HERE — beta.3 rechazada; preparar corrective beta.4 (2026-07-17)

**Estado:** el dev reportó que BT3-001→009 generó errores nuevos e implementó
incorrectamente varias solicitudes. La aceptación queda revocada. No asumir que gates
verdes equivalen a corrección funcional ni que BT3-006 es el único origen. Dossier:
[[docs/work/polish/issues/bt3-beta3-batch/011-beta3-regressions-beta4|BT3-011]].

**Candidato exacto:** `C:/tmp/vaultman-release-beta2-final2`, rama limpia `v12/bt3`,
HEAD `7ba6a3c9`; ocho commits sobre `dev` @ `14e87dc7`. Versiones siguen en beta.2;
no existe tag/release beta.3. Sin push/merge/tag/PR.

**Si el dev publica beta.3:** hacerlo sólo como pre-release conocida, desde `dev` tras
FF-only de `v12/bt3`; primero `pnpm release -- 1.2.0-beta.3 --dry-run`, luego
`pnpm release -- 1.2.0-beta.3 --yes` si la revisión es intencionalmente aprobada.

**Claude / beta.4:** pedir primero la lista concreta de errores y desvíos; reproducir y
añadir tests por punto; auditar D1-D20 completo; validar Obsidian, settings upgrade,
clean install y mobile real según aplique; publicar `1.2.0-beta.4` sólo con aceptación
HITL explícita. BT3-010 permanece separado.

## NEXT AGENT START HERE — v1.2.0-beta.1 corrective batch landed (2026-07-15)

**Estado:** FTC-001→009 están implementados en el worktree compartido
`C:/tmp/vaultman-v12-ftc001`, rama `v12/ftc-001`. El corrective batch pedido tras la
revisión manual del dev quedó apilado así:

1. `409b15ed` — FTC-007 Close/Back, collapse scope-aware y Soft Scroll real.
2. `d9eb4cf0` — FTC-008 Files Tools menu de cinco nodos + Settings IA/copy.
3. `58193e14` — FTC-009 track unido action+index, curva proto exacta, slide firmado
   reversible, bottom/plain y cinco subefectos diferidos.

**Lee en orden:**

1. [[docs/work/polish/issues/ftc-floating-toc/index|Issue-set FTC-001..009]].
2. [[docs/work/polish/specs/2026-07-15-v1-2-beta1-floating-toc-fixes/index|Corrective spec]].
3. [[docs/work/polish/plans/2026-07-15-ftc-beta1-fixes/index|Plan ejecutado]].
4. [[docs/architecture/policies/release|Policy release]].

**Gate final:** full unit 70 files / 345 tests; `pnpm run check` 0 errors/0 warnings;
production bundle, ESLint, Stylelint, targeted Svelte format y diff-check verdes. El
`format:check` global conserva 18 rojos Svelte preexistentes fuera del diff. Worktree de
producto limpio. No hubo push, merge, tag, PR ni integración a `dev`.

**Siguiente acción autorizada:** ninguna integración automática. El dev valida
manualmente el resultado cuando quiera y decide distribución/integración; después
entrega o prioriza el backlog restante de v1.2/patches. Testing visual, browser/UI,
Obsidian smoke, screenshots y mobile emulation están **delistados para agentes hasta
nuevo aviso** y no deben reaparecer como gate o pendiente.

**Gotchas:** two-commit (código pushable / docs local-only) · no incluir `.agents` en
pushes · Content no tiene árbol · props/tags table/grid conservan la limitación conocida
del reveal seam · el jump jamás usa DOM query sobre el explorer virtualizado.

## NEXT AGENT START HERE — P.D tracer 1-3 LANDED + gate integrado verde (2026-07-08)

**Current commit:** local `sandbox` = `9a56172` (`docs: restore audit/recovery docs orphaned by sandbox
reset`). `origin/sandbox` = `18465c2` — slice 3 (`0359780`) + docs restore (`9a56172`) están SOLO
locales; **push pendiente de autorización del dev**.

**Qué cerró (tren P.D, tracer N3/MyWorkspace, parity-first, sin cambio visual):**
- Slice 1 `fcf895e` — contracts `typePanelScene` + `logicInteractionPolicy` puro +
  `WorkspaceMediatorService` (stateless) + `createPanelExplorerHandle` + registro gated en
  `pageFilters` (sin mediator en contexto = no-op).
- Slice 2 `18465c2` — `serviceWorkspaceInputRouter` (focus) + mediator/router instanciados en
  `frameVaultman` + `vaultman:open` enfoca vía router con fallback legacy.
- Slice 3 `0359780` — router cubre `select-visible-nodes`/`clear-selection`; puertos
  selection/projection SOLO tab files; único delta visible: 2 comandos palette aditivos
  (`select-visible-active-explorer`, `clear-active-explorer-selection`), gated por disponibilidad.
  Review coordinador: contract-faithful, sin dudas contested → FF single-thread.
- Docs restore `9a56172` — 12 files huérfanos del `reset` 2026-07-06 (reflog `0c29e68..9db3d67`)
  recuperados: audit codebase-intelligence (8), snapshot API de Notebook Navigator en `work/hardening/research/2026-06-15-notebook-navigator-api-lupa-addon/sources/`, P112-025, version-streams 04/05/06.
- **Gate integrado coordinador @ `9a56172`: check 0/0 (1205 files) · unit 178 files / 1303 tests
  0 flakes · build ✓ (synced plugin-dev) · `git diff --check` ✓.** Gates por-worktree previos de codex
  en las entries del session-log 2026-07-06.

**Siguiente P.D (decisión dev):** ensanchar tracer — candidatos de codex: puerto focus/reveal por
node-id en `panelExplorer`, o primer bridge `ActionProvider -> ActionNode`. Si el ensanchamiento toca
contrato panel/scene con dudas contested → **grill corto ANTES** (P.D = 2º dominio pilar).

**Paralelo Codex-able (no bloquea P.D):** `task_019` B3 retiro del enum flat `ExplorerViewMode`
(callers post-Thread-B) · `task_020` deps low residual (`GHSA-73rr-hh4g-fpgx`, `diff` via `mocha`,
major transitive). HITL dev: PAI-003 picker · cards-37s idle re-run · P112 reconcile · `task_016`
embeddings rebuild (codex, in-progress — los sources ya volvieron con el restore).

**Room/entorno:** FF single-thread del coordinador (slices 1-2 los FF/push'eó codex — recordar la
regla). Worktrees `C:/tmp` purgados; quedan: `doc-recovery-embeddings` (branch `dev` @ `34fa414` —
REVISAR con dev), `main-clean` (dirty: `styles.css`), `uv2-q4`/`pai-001` (dirty: `.snap` EOL-noise),
`uv2-pa` (untracked plan dir que DIFIERE del aterrizado — reconciliar antes de borrar).

## NEXT AGENT START HERE — P.D checkpoint after Thread B + Codex lanes landed (2026-07-06)

**Current commit:** `origin/sandbox` = `7107b1a` (`chore(deps): patch Dependabot advisories`).
Do not use the main checkout if it is still behind or dirty; create a fresh worktree from
`origin/sandbox`.

**What just closed.**
- **V.D Geometry + Thread B closed:** table/grid/cards are on the shared render-runtime and
  `ViewHost` dispatches by resolved `(engine,mode)` instead of the flat branch mechanism.
- **PA closed through slice 5:** `PlatformAdapterRegistry` is wired in `main.ts`; adapters are
  native-search, native-binding, file-menu delegation, and Bases multi-select; mobile inventory
  exists under `src/platform/`.
- **Parallel cleanup closed:** glossary canon aligned, legacy shims collapsed, and deps landed last
  after lockfile-safe rebase.
- **Verification summary:** integrated headless gates passed; B2 STRICT gates on all 5 views had
  blank/flicker zero; deps audit has 0 high/0 moderate and 1 low dev residual
  (`GHSA-73rr-hh4g-fpgx`, `diff` via `mocha`, needs major transitive).

**Next spine node:** **P.D panel/scene decomposition** (N3/MyWorkspace tracer). Source plan:
[[docs/work/hardening/plans/2026-07-06-pd-panel-scene-decomposition/index|P.D panel/scene decomposition kickoff]].

**Read first for P.D:**
- [[docs/architecture/explorer-model/03-surfaces-and-interaction|Explorer Model 03 — Surfaces + Interaction]]
- [[docs/architecture/explorer-model/04-panels-axons-mutation-layout|Explorer Model 04 — Panel kinds / axons / mutation / layout]]
- [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/03-dependency-pyramid-and-gates|N0-N4 pyramid]]
- [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/01-locked-decisions-grill|Locked decisions D1-D9 + D-C-8]]

**Implementation stance:** first slice is a tracer, not a UI rewrite. Define typed P.D seams
(`PanelHandle`, `SceneDefinition`, `WorkspaceMediator`, `InteractionPolicy`, `InputRouter` bridge)
and adapt the existing Filters `panelExplorer` through them while preserving visual/behavioral parity.
Defer WSA/free-canvas/tile editing, `panelData`, `panelContent`, scene persistence, and PSS integration.

**Residual decisions/watch items before beta promotion:**
- P112 reconcile against current V.D migration.
- PAI-003 icon picker remains HITL.
- Optional idle-machine rerun for the historical cards 37s outlier; latest B2 integrated cards gate
  was clean (p95/p99/max 32/45/49ms).
- Main branch must remain zero-AI-files.

## NEXT AGENT START HERE — V.D thread A slice 1 DONE → slice 2 Geometry (2026-06-19)

**Dónde:** Spine V.D. El **CANON NOW-tier de view-addressing está LOCKED + aterrizado** (canon ≠ shard de
planeación): **[[docs/architecture/explorer-model/05-view-canon|05 View Addressing Canon]]** + **ADR 0012**
(supersede la taxonomía-view de ADR 0008) + glossary L129-131 + research-inventory. Esenciales del canon:
orientation ≠ h/v (→ eje `direction`); engines **Linear/Geometry/Canvas/Charts** (Table=modo Geometry,
group-box ELIMINADO=composición, Charts 4º placeholder); Linear modes flat/indent/cascade/detail; Geometry
grid/cards/masonry/table; **validity compose-free**; viewScope per_panel/level/parent/node; `regime`
slot|coordinates + regime-flip; Geometry = **Opt-1** (un GeometryView + strategies). **thread B** (re-modelar
`typeViewConfig` al canon + DEFERRED Canvas/Charts/viewScope-filter) = aparte, después.

**Thread A = el perf render-runtime (el lever real). Plan + contrato + respuestas Q1-Q4:**
[[docs/work/hardening/specs/2026-06-17-vd-shared-render-runtime/index|V.D shard]] §Thread A.
- ✅ **Slice 1 (Linear pilot) COMPLETO + FF a sandbox `bd3faf8`.** pure core (`61ff673`) + **shell Svelte 5**
  `serviceSharedVirtualLayout.svelte.ts` (`$state`→`$derived` window vía core **autoritativo** = sin
  `fallbackFixedVirtualRows`; `{@attach}` cabla scroll/ResizeObserver + seam `@tanstack/svelte-virtual`) +
  **viewTree migrado** (botado inline `createVirtualizer`/`fallbackFixedVirtualRows`/`virtualRowsCoverScrollWindow`/
  `intersectingRowIds*`/`scrollTopForAlign`/`TREE_OVERSCAN=10` → `overscan=ceil(viewportH/estimateSize)`; box-select
  vía `idsInRect`; sticky rows OK; 1048→836 líneas). **Decisiones dev:** Q1=**Opt-B** (TanStack en el shell ya →
  slice-2 aditivo, sin reshape; core sombrea su rango fixed = el fix beta.1) · Q2=**controller local** (registro
  `createContext` → slice-2). Verify: svelte-check 0/0 · shell 9/9 · autofixer `issues:[]` · component+unit verde
  (1113) · snapshots DOM byte-idénticos. **Gate STRICT plugin-dev** (tree, 11162 nodos, 100 jumps): blankFrames=0 ·
  flickerFrames=0 · **p99 124ms (era ~1051ms)** · sin dev errors.
- **NEXT = slice 2 (Geometry / variable-height):** en el shell, estrategia variable = `variableVisibleRange`
  (Fenwick `serviceExplorerScrollGeometry`) + `measureElement`-fed cache + lanes(columns); las 4 vistas Geometry
  (grid/cards/masonry/table) adoptan el shell; levantar el **registro `createContext`** caliente per-provider;
  cerrar DoD-D3 paridad stable (tablas/resizers/grid SDF-011/016). **Reconcile:** P112 (codex 2026-06-20, stable
  hotfix `3d42010` en `p112-type-view-loop-fix`) tocó `viewTreeBehavior`/`virtualScrollCssSource` en stable —
  reconciliar con esta migración al promover P112 a sandbox.

**⚠ Gotchas (costaron una pérdida de datos esta sesión — LEER):**
- `.agents/docs` está conjunto con el vault Obsidian "Start of The Road" (My Drive, prefijo `x/Agent Docs`).
  **Cierra Obsidian + pausa Drive ANTES de cualquier move de filesystem sobre `.agents/docs`** (si no, `mv`
  falla/lockea). Un `rm` borró `.agents/docs/work` sin commitear esta sesión; recuperado vía Obsidian File
  Recovery (técnica en memoria `reference_agents_docs_recovery`). **Commitea snapshots de seguridad de
  `.agents/docs`** (dirty-sin-commit = riesgo de rm). Residual perdido: function-union-ledger shards 01-03.
- Worktree pattern: código en `C:/tmp/vaultman-uv2-vd`; docs/shard en sandbox `.agents` (visible en vault). FF a sandbox tras verify.
- Known-ajenos: `eslint .` 7 `no-unnecessary-type-assertion` (explorerProps/Tags/typeViewConfig) · `explorerNotebookNavigatorComparison` (repo externo ausente).
- sandbox @ `bd3faf8` (V.D slice-1 FF sobre `76c6cfb`; `2.0.0-alpha.1`; sin push). Worktree `C:/tmp/vaultman-uv2-vd` rama `umbrella-v2/wave-1-vd` rebasada a sandbox (queda para slice 2).

**N.R CERRADO.** sandbox `d81be5e` → **`cc23ad9`** (fast-forward, sin push). `NodeRow` cell
primitive + `NodeBadgeZone` extraídos del cell inline de `viewTree`, **pilot en tree**, contrato
headless `data-vm-*` (D-PSS-2). Plan + survey del abanico de cells (proto·sandbox·stable):
[[docs/work/hardening/plans/2026-06-15-nr-noderow-cell/index|N.R plan]] (+ shard 01).
Decisiones locked con dev: **A1** (NodeRow = surface + content + `leading` affordance snippet;
la vista conserva el outer row posicionado = turf de V.D) · **B1** (data-vm-* ya) · **Q1** (el
contrato anticipa TODO el abanico — slots `media/contentSnippet/metric/trailing` definidos pero
**sin cablear**; tree cablea solo lo suyo, D7). `metric` slot = prop/word-count por NODO
(word-count = trabajo VIVO de codex en la línea stable 1.1.x; reconciliar al adoptar el Files cell,
paridad D3). **StatCard/Statistics = panel de MyWorkspace, NO un explorer** (fuera de NodeRow, D9).
Verify N.R: svelte-check 0/0 · autofixer `issues:[]` · build ok · test:unit 1092/1092 · viewTree +
tests nuevos verde · snapshot regenerado (solo `data-vm-*` aditivo).

**NEXT = V.D (view shells + shared render-runtime)** — el **lever real de perf** (razón del abandono
de 1.1.0 beta.1), research-listo. ANTES de tocar render lee el skill `vm-explorer-virtualization` +
shard 01 de [[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/index|Frontend Stack Deep Research]]
(TanStack Virtual: failure modes clase-beta.1 + orquestación shared-layout-service) +
[[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index|multiview virtualization]]
(decisión previa: UN shared layout service + blank-frame gate).

**Forma de V.D:** UN `shared-layout-service` que envuelve `@tanstack/svelte-virtual` para todos los
engines (tree/list/table/grid/cards) — geometría Fenwick (ya en `serviceExplorerScrollGeometry.ts`,
O(log n), nunca scans O(n)) · medición pretext (`serviceTextMeasure.ts`, alimenta `estimateSize`) ·
overscan = `ceil(viewportH/estimateSize)` · range-fallback · total-size policy. **Monta `NodeRow`**
(el cell ya unificado por N.R) como único target. Gatea CADA claim de perf con el blank-frame detector
(`src/dev/perfProbe.ts`): `blankFrameCount===0 && blankWindowOver100ms===0 && (!strict || flickerFrameCount===0)`.
**Aplicar decisión del spike tracer:** ViewHost switchea sobre `(engine,mode)` de un `ViewConfig`
RESUELTO (D-C-8), NO crecer el enum flat `ExplorerViewMode`. **DoD parcial (D3):** cerrar paridad
stable de los sistemas tocados (tablas/resizers/grid SDF-011/016; resizers = stable-only delta que
sandbox aún no tiene).

**Patrón de slice probado:** worktree manual en `C:/tmp` (NO `isolation:worktree` → EEXIST por
`.claude/worktrees`) desde sandbox HEAD; `pnpm install` 1ª vez; implementar (coordinador directo, o
subagente con spec inline — los límites de cuenta han cortado subagentes a mitad y el coordinador
recupera inspeccionando el worktree); commit selectivo (`.snap` con cambio de CONTENIDO sí se stagea;
solo-LF→CRLF no) → verify → FF a sandbox → update PLAN/status/handoff/session-log. No push; no
`dev`/`main`; preguntar antes de edit destructivo.

**Ajenos pre-existentes (NO de N.R; sí ensucian `verify`):** el chain `verify` corta en `eslint .` por
**7 errores `@typescript-eslint/no-unnecessary-type-assertion`** en `explorerProps.ts`/`explorerTags.ts`/
`typeViewConfig.ts` (archivos NO tocados; contenido de d81be5e; enmascarados por timeouts previos de
eslint) — dev eligió **opción A = dejarlos** (known-ajeno; auto-fixables con `eslint --fix` cuando alguien
quiera). + `explorerNotebookNavigatorComparison` falla siempre (repo externo `@notebook-navigator`
ausente). Worktree N.R `C:/tmp/vaultman-uv2-nr` (branch `umbrella-v2/wave-1-nr`) queda para cleanup.

---

## NEXT AGENT START HERE — Frontend stack deep-research + N.R/V.D form decision (2026-06-15, tarde)

**Qué pasó.** Al escopear **N.R** (NodeRow primitive), el grill del dev destapó que la decisión "imperative
builder vs Svelte cell" no se podía tomar sin datos del stack real (y 1.1.0 beta.1 se abandonó por
virtualización pésima → no confiar ciego). Se corrió **research profundo**: **6 Explore agents read-only en
paralelo + verificación del coordinador (repo + web)** →
[[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/index|Frontend Stack Deep Research]]
(index con **ledger de verificación** + 6 shards: TanStack Virtual · pretext/render-tag · TanStack Table ·
dnd-kit · bits-ui/daisy/shadcn · UnoCSS/presetWind4/LayerChart). Skill nuevo (reference, **sin retrieval-test
aún**): `vm-explorer-virtualization`. Correcciones fechadas en `tooling-libraries.md` + `research-inventory.md`.
**Sin código tocado; sandbox intacto @ `d81be5e`.**

**Decisión central (D-FE-1).** El stack ya está casado con **Svelte 5 + `@tanstack/svelte-virtual` + pretext**;
`viewTree` renderiza filas como snippet `{@render}`, Grid/Table/Cards imperativos (createEl). ⇒ **N.R = celda
Svelte 5** (el imperative-builder era optimización prematura). **El lever real de perf es V.D = el shared
render-runtime**: orquestar svelte-virtual con UN shared-layout-service (geometría Fenwick ya existe en
`serviceExplorerScrollGeometry.ts`, medición pretext, gate de blank-frames `src/dev/perfProbe.ts`). N.R y V.D
más acopladas de lo que la pirámide decía (la forma de la celda depende de cómo el runtime la monta).

**Correcciones verificadas (vs output crudo de los agentes):** **presetWind4 EXISTE** (`@unocss/preset-wind4`,
UnoCSS 66.1+; estamos en 66.6.8) y **UnoCSS ya está cableado** (presetWind3, no "research pending") · **dnd-kit =
oficial `@dnd-kit/svelte`** (ya en deps 0.4.0; `{@attach x.attach}` + `DragDropProvider`), **supersede el port
HanielU** de R-DND-C · **table-core = solo TYPES**, no el adapter · **render-tag = Polotno html-in-canvas** (=
respuesta a "¿por qué no canvas?": candidato motor **N4**, nunca la celda DOM).

**Decisiones abiertas dev:** D-FE-2 (reconciliar paquete dnd-kit) · D-FE-3 (migrar presetWind3→Wind4, pilot tras
visual diff) · D-FE-4 (TanStack Table: keep types-only vs adoptar `createSvelteTable`) · D-FE-5 (LayerChart =
defer a pilot dashboard). **Flags a re-verificar ANTES de codear** (ledger #9/#11/#12): identidad exacta del
paquete dnd-kit · hipótesis FnR de bits-ui (reproducir) · API extendida de pretext.

**NEXT (elige; spine serial):** **N.R** con D-FE-1 (celda Svelte 5 consumiendo `ExplorerRowInput` +
`NativeClassVocabulary`, headless `data-vm-*`, pilot en una vista) · o **V.D** (ya research-listo: el
shared-layout-service = el perf fix real) · o una migración surgida (presetWind4 / reconciliar dnd-kit).

**Infra:** statusline configurado (`~/.claude/vm-statusline.ps1` + `settings.json`): `[CAVEMAN] dir [branch] |
model | ctx% left` (ctx% asume budget 200k, ajustable). `autoCompactEnabled:false` (dev gestiona contexto).

---

## NEXT AGENT START HERE — CHECKPOINT: Q4 COMPLETO, wave 1 en curso (2026-06-15)

**Dónde estamos.** Vaultman 2.0 Synthesis Umbrella, wave 1 (N0 del spine). **sandbox @
`d81be5e` = `2.0.0-alpha.1`** (canary; `dev`/`main` = `1.1.1` intactos, hotfix-only).
Fases B (function-union ledger 8/8 + síntesis) y C-lite (3 specs + decisiones D-C-1/5/7/8)
CERRADAS. Lo aterrizado en wave 1:
- **Q4 logic-extraction COMPLETO (6/6)** — `logicFiles` · `logicProps` · `logicTags`(+fix
  SDF-008) · `logicBadge` · `logicFnR` · cierre dual-snapshot. Plan + status log por slice:
  [[docs/work/hardening/plans/2026-06-13-q4-logic-extraction/index|Q4 plan]].
- **PlatformAdapter (lane B) slice 1** — `src/platform/` contrato + Fragility Registry +
  native-search. Plan: [[docs/work/hardening/plans/2026-06-13-platform-adapter/index|PA plan]].
- **tracer (lane C)** — `typeViewConfig` (forma normal D-C-8) + `typeSearchEngine` (D-C-1).
  Spike MillerColumns murió en rama; informe:
  [[docs/work/hardening/plans/2026-06-13-tracer-viewconfig/spike-learnings|spike-learnings]].

**Verificación:** cada slice pasó check 0/0 + unit (hasta 1092; 1 fallo SIEMPRE ajeno =
`explorerNotebookNavigatorComparison`, repo externo ausente). Wave-closing smoke de Q4:
build→plugin-dev + reload + `dev:errors` "No errors captured".

**Estado git/entorno (importante):** branch `sandbox`, **sin push** (≈100 commits locales
ahead de `origin/sandbox` — intencional; AGENTS.md: no push sin pedir). Tag de respaldo
`sandbox-pre-umbrella-v2-2026-06-10` (`de4e29b`). Worktrees vivos en `C:/tmp/`:
`vaultman-uv2-q4` (= sandbox `d81be5e`), `-pa` (`b32b335`, base lane B para PA slices 2-5),
`-tracer` (`e5b658b`, spike — solo el durable se aterrizó). `isolation:worktree` del Agent
tool ROTO aquí (EEXIST por `.claude/worktrees`); usar worktrees manuales en `C:/tmp`.
node_modules por worktree (`pnpm install` la 1ª vez). Los `.snap` salen "M" por LF→CRLF —
NO stagear (0 cambios de contenido). Límites de cuenta han cortado subagentes a mitad —
patrón de recuperación: inspeccionar el worktree, el coordinador completa commit/verify.

**NEXT (elige una; spine = serial):** **N.R** NodeRow primitive (Q4 ya lo gatea) · **V.D**
view shells + render-runtime (= el perf fix; consume tracer + **decisión: ViewHost switchea
sobre `(engine,mode)` de un `ViewConfig` resuelto, NO crecer el enum flat `ExplorerViewMode`**)
· **PA slices 2-5** (∥: native-binding consolidation, file-menu, **port `basesMultiSelectOperations`
desde stable `1.1.1`** — está en `e374367`/`dev`, no en sandbox; wire `main.ts` + mobile
inventory). Patrón de slice probado: worktree `C:/tmp` → subagente → inspeccionar/commit selectivo
→ verify → FF a sandbox → actualizar PLAN status log.

**Follow-ups menores (coordinador, no bloquean):** colapsar shims (`logicsFiles`,
`components/containers/explorerProps`, `utilViewLayers`+`utilBadgeBubbling`) + re-point importers;
fix mojibake heredado en `explorerTags.ts` (git lo marca "Bin").

---

## NEXT AGENT START HERE — Wave 1 N0 ATERRIZADO: sandbox = `2.0.0-alpha.1` (2026-06-13)

**Wave 1 (A=Q4 logicFiles slice 1 + B=PlatformAdapter slice 1) ATERRIZADA a sandbox.**
sandbox: `de4e29b` → `306acde` vía fast-forward. **Manifest/package = `2.0.0-alpha.1`**
(primer código de la línea 2.0 en canary; corrige el label `beta`-en-canary del ledger).
Respaldo: tag `sandbox-pre-umbrella-v2-2026-06-10` (`de4e29b`). Sin push.

- **Verify integrado verde**: svelte-check 1169/0/0 · build ✓ · test:unit 987 pass · test:component 551 pass · oxlint ✓. Smoke plugin-dev: reload + `dev:errors` limpio.
- **Lo aterrizado**: A = `src/logic/logicFiles.ts` (puro) + `src/types/typeTreeNode.ts` (app-free) + provider adelgazado + namespaced IDs `file.`/`folder.` + SDF-003 fix + relation kinds; B = `src/platform/` (PlatformAdapter contract + Fragility Registry + native-search adapter + SearchEngine seam). PLANs en `docs/work/hardening/plans/2026-06-13-q4-logic-extraction/` y `.../2026-06-13-platform-adapter/`.

**WAVE 1 N0 COMPLETO (2026-06-14)**: los 3 lanes en sandbox `22979b1` (`2.0.0-alpha.1`).
Lane C aterrizado vía cherry-pick selectivo: `src/types/typeViewConfig.ts` (forma normal
D-C-8 + ViewBinding/resolve/normalize + engine MAP + capability matrix) + `typeSearchEngine.ts`
(seam canónico; `nativeSearchEngineFrom` castea el adapter de B sin cambio — D-C-1 resuelto).
Spike MillerColumns MURIÓ en `wave-1-tracer` (informe en
[[docs/work/hardening/plans/2026-06-13-tracer-viewconfig/spike-learnings|spike-learnings]]).
Verify sandbox: svelte-check 1171/0/0, test:unit 1030 pass EXIT 0. **Decisión pendiente para V.D**
(del spike): que ViewHost switchee sobre `(engine,mode)` de un `ViewConfig` resuelto en vez de
crecer el enum flat `ExplorerViewMode` (alinea con D-C-8).

**Q4 COMPLETO (2026-06-15)** — los 6 slices aterrizados a sandbox `d81be5e` (`2.0.0-alpha.1`):
logicFiles · logicProps · logicTags(+SDF-008) · logicBadge · logicFnR · dual-snapshot close.
Módulos `logic*` puros con boundary tests; providers delgados; D6 namespaced ids; SDF-008
nested/simple corregido; props/tags/content publican snapshots al data plane (fallback recursivo
solo para add-on providers). Wave-closing smoke: build→plugin-dev, `plugin:reload` + `dev:errors`
"No errors captured". **Spine N0 listo para N.R.** Verify por slice: check 0/0 + unit (1092 al
cierre, 1 ajeno notebook-navigator). NOTA: los límites de cuenta cortaron 2 subagentes a mitad
(slices 2, 5) — recuperados por el coordinador (inspeccionar worktree + completar commit/verify;
el código del subagente estaba bien). Worktree `C:/tmp/vaultman-uv2-q4` = sandbox.

**Orden restante**: slice 6 (en vuelo, cierra el dual-snapshot) → **Q4 COMPLETO** (spine N0 listo
para N.R) · PA slices 2-5 (native-binding, file-menu, **port Bases adapter desde stable `1.1.1`**,
wire main.ts + mobile inventory) · luego **V.D** (con la decisión ViewHost-sobre-`ViewConfig`).
**Follow-ups abiertos** (detalle en session-log 2026-06-13/14/15):
1. ✅ **`eslint .` cuelga — RESUELTO (2026-06-14)**: causa = worktree anidado `.worktrees/` no ignorado (eslint recorría ~50k archivos de copias del repo con type-aware linting). Fix: `.worktrees` añadido a ignores en `eslint.config.mts` (+ comentario). `eslint .` ahora 87s limpio; `pnpm run verify` completo pasa. Fix en working tree, sin commit. Detalle: session-log 2026-06-14.
2. shim `src/logic/logicsFiles.ts` → rename a `logicFiles.ts` (toca knip/ADR-009/docs).
3. seam `SearchEngine` (B provisional) → reconciliar cuando lane C defina el tipo canónico (D-C-1).
4. Q4 slices 1-5 ✅ aterrizados; slice 6 en vuelo. Shims a colapsar (follow-up coordinador, fuera de scope de cada slice): `logicsFiles.ts`, `components/containers/explorerProps.ts` (2 líneas), `utils/utilViewLayers`+`utils/utilBadgeBubbling` → re-export de `logicBadge` + re-point `serviceExplorerRowInput`/`explorerProps`. Wart: mojibake heredado en `explorerTags.ts` (git "Bin"). PA slices 2-5 (native-binding consolidation, file-menu, **port `basesMultiSelectOperations` desde stable 1.1.1** — está en `e374367`/`dev`, NO en sandbox; ledger 07 flag resuelto, line-divergence no over-claim, wire main.ts + mobile inventory).
5. worktrees `C:/tmp/vaultman-uv2-q4` (=sandbox tras FF) y `-pa` siguen; cleanup cuando quieras.

**Gotchas del entorno** (para el próximo despacho): `isolation: worktree` del Agent tool falla con `EEXIST` (`.claude/worktrees` preexistente) → worktrees manuales en `C:/tmp` + subagentes con `cd` al worktree. node_modules ausente en worktree fresco → `pnpm install`. Constraint contradictoria a evitar: NO decir "never write .agents" si la task pide escribir un PLAN bajo `.agents/` del worktree — decir "nunca `.agents/` del repo PRINCIPAL; tu PLAN va en `.agents/` de TU worktree".

## NEXT AGENT START HERE — Fase C-lite ESCRITA: D-C-1/5/7 locked + 3 specs wave 1 (2026-06-12)

**Grill Fase C cerrado con el dev** — 3 decisiones registradas como **D-C-1/D-C-5/D-C-7**
en [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/01-locked-decisions-grill|umbrella shard 01]]:
content search alpha = NativeSearchAdapter tras seam `SearchEngine` (ContentIndex
archivado; minisearch H1 decide engine propio) · conflict gate = policy-identity de
stable primario + delete-purge VFS secundario · diff único desde VfsChain (espejo
serviceDiff/serviceDiffSnapshot se elimina). Prioridad alpha del dev: **robustez
MyWorkspace + Symbiont Explorer + node-notes**. Los 3 specs de wave 1 están en
[[docs/work/hardening/specs/2026-06-12-wave-1-specs/index|Wave 1 specs (Fase C-lite)]]
(index + Q4 logic-extraction + PlatformAdapter/Fragility Registry + tracer
ViewConfig/cascade), estado **draft pendiente de review del dev**. Nota: el bump de
metadata es `2.0.0-alpha.1` (D-PSS-7 supersede el `canary.1` del umbrella shard 04).
**Next**: review dev de los specs → tag respaldo `sandbox-pre-umbrella-v2-2026-06-10`
→ lanzar lanes A (Q4) y B (PlatformAdapter) en worktrees `umbrella-v2/wave-1-*`
(PLAN→implementación por lane); C (tracer) cuando haya capacidad. Workaround tooling
documentado en AGENTS.md: si `npx tsx` falla, `node` 24 corre los `.ts` directo.

## NEXT AGENT START HERE — Fase B COMPLETA: ledger 8/8 + síntesis (2026-06-12)

**Fase B del Synthesis Umbrella cerrada.** El cluster 08 fue re-lanzado y escrito
([[docs/work/hardening/research/2026-06-11-function-union-ledger/08-bases-api-diagnostics-mobile-packaging-boot|shard 08]]
— ~80 filas: ServiceAPI/diagnostics SOLO-SANDBOX en bloque; CONTRADICE labels `beta` en
canary; mobile = gap de los 3 streams; nota del coordinador corrige el framing stale del
shard 06 pre-1.1.1 que el subagente arrastró). La síntesis transversal está en
[[docs/work/hardening/research/2026-06-11-function-union-ledger/09-sintesis-transversal|shard 09]]:
tesis por capas (policy=stable · arquitectura=sandbox · vocabulario=proto), inventario de
16 CONTRADICE (C-1..C-16), 5 duales internos de sandbox que gatean N1/N2, gaps SOLO-PROTO,
inputs directos para cada spec de wave 1 (§7) y 7 decisiones abiertas del dev (§8).
**Next: Fase C-lite** — specs de wave 1 (Q4 ∥ PlatformAdapter ∥ tracer ViewConfig+cascade)
consumiendo §7 del shard 09; las decisiones dev C-1/C-5/C-7 gatean el spec Q4 y conviene
resolverlas en grill corto antes o al inicio de esa sesión. Ledger total ~595 filas + 9
verificaciones puntuales pendientes (shard 09 §9, baratas y de alta señal).

## NEXT AGENT START HERE — Vaultman 2.0 Synthesis Umbrella fundada (2026-06-10)

Nueva iniciativa rectora:
[[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/index|Vaultman 2.0 Synthesis Umbrella]]
(index + 4 shards: locked decisions D1-D9 · node-distribution model · pirámide N0-N4 +
gates · wave-1 contracts). Convierte la gramática de proto v12 en Scenes/engines
preset-agnósticos sobre Svelte 5, entregando la unión proto+sandbox+stable como línea
`2.0.0`. Absorbe el spine del roadmap-dispatch (Q4→N.R→V.D→P.D) como primeras waves;
supersede la Explorer Merge Umbrella 2026-05-19 (v5-era). Topología: sandbox sigue
canary; waves en worktree `umbrella-v2/wave-N` aterrizando a sandbox; `dev` (= `main` =
`1.1.1`, publicado 2026-06-09) intacto hasta gates de promoción; stable queda
hotfix-only y es el oráculo de paridad por sistema (function-union ledger, Fase B).
Canon por preset: proto=polish/demo · stable-minimal=native · sandbox=decorations ·
barebones=add-on-explorer (ADR 0011). Dominios dev: **Symbiont Explorer** (riqueza de
explorers) + **MyWorkspace** (control/edición del workspace UI). **PSS grill CERRADO
2026-06-11** — D-PSS-1..10 consolidados en
[[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/01-locked-decisions-grill|shard 01]]
(detalle §1-26 en
[[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/05-pss-grill-notes|shard 05]]):
facetas×cascada, ley de estilo headless 4+3 (`data-vm-*`), 4 clases de storage,
payload `.scene` (CR-2 destrabado), labels `alpha→beta→rc` (enmienda D4), tests de
aceptación (profile `legacy-1.1`, native=paridad Bases, barebones=3 scenes).
**Orden de ejecución restante**: Fase B ledger **7/8 clusters HECHOS 2026-06-11**
([[docs/work/hardening/research/2026-06-11-function-union-ledger/index|function-union ledger]]
— ~515 filas; hallazgo central: stable=policy sin VFS + sandbox=arquitectura sin
policy → la 2.0 une ambas) → **re-lanzar cluster 08** (prompt de reconstrucción en
el index del ledger; el subagente golpeó session limit) → síntesis transversal →
Fase C-lite (specs de wave 1: Q4 ∥ PlatformAdapter ∥ tracer) → Fase D wave 1 →
`2.0.0-alpha.1`.
Tooling: pkm-ai tools son `.ts` — correr con `npx tsx` (AGENTS.md/vm-start-session
corregidos); inventario en
[[docs/work/pkm-ai/items/2026-06-10-agent-tooling-working-memory|agent tooling working-memory]]
(gap: is-phone sin doc). Opens umbrella: research TanStack virtualizer/Svelte (con
sección working-memory) · índice de primitives Obsidian · icon packs como assets.
No commitear el dirty `.agents` preexistente; tag `sandbox-pre-umbrella-v2-2026-06-10`
se crea al arrancar wave 1, no antes.

## NEXT AGENT START HERE — SDF-016 resizable table + Files grid complete (2026-06-07)

Stable `1.1.0` Data/Files parity
[[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
remains in progress in product worktree `hotfix/1.0.2-css-scorecard`. This subcut completed the newly
requested table/grid work: Files exposes selectable `Tree`, `Table`, and `Grid`; `Table` maps to the
existing Bases-style Files table renderer; `Grid` maps to a dedicated row-virtualized `FilesGridView`;
Files/generic node table headers now have working `.bases-table-header-resizer` handles with clamped
in-memory widths. Evidence: RED/GREEN focused guards, official Svelte MCP autofixer `issues: []` on
`navbarFilters.svelte`, `pnpm run check`, full unit `37` files / `130` tests, full `pnpm run verify`
including `eslint .`, stylelint, production build plugin, and scorecard `17`; build synced to
`plugin-dev`; after restarting a stuck CLI bridge, reload/open passed and DOM smoke confirmed Files Grid
`22` virtualized cards with `draggable=true`, `data-path`, scrollability, no stale table root, plus Files
Table `25` virtual rows and a resizer changing width `300px -> 360px`; final `dev:errors` clean. Next
SDF-016 work: Content parity against Core Search and indexed/batched filter evaluation for rapid-click FPS.

## NEXT AGENT START HERE — SDF-016 follow-up wave complete (2026-06-07)

Stable `1.1.0` Data/Files parity
[[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
remains in progress in product worktree `hotfix/1.0.2-css-scorecard`. This wave completed the
recommended first follow-up after cuts 1-3: `all` filter groups now narrow candidate files and cache
metadata per evaluation; minimal Data header now uses Core-like `nav-header > nav-buttons-container >
clickable-icon.nav-action-button`; dock-off Tabs menu includes `Statistics`; node panel context menus
show `Clean selection` when active filters exist; and DnD payloads use same-surface active filters as a
temporary multi-selection model. Evidence: focused RED/GREEN, focused unit `5` files / `15` tests,
`pnpm run check`, full unit `36` files / `125` tests, scorecard `17`, format check, stylelint, targeted
ESLint over touched files, build synced to `plugin-dev`, reload/open, DOM smoke, and final `dev:errors`
clean. Caveat: full `pnpm run lint` / `eslint .` timed out without diagnostics. Perf pikes improved from
up to `490.2ms` to roughly `70-113ms` per apply, but rapid Props clicks still dropped to about `12fps`;
next subcut should use property/tag indexes or batching. Newly requested SDF-016 work still pending:
resizable table columns and a fully working Files grid view.

## NEXT AGENT START HERE — SDF-016 cuts 1-3 complete (2026-06-07)

Stable `1.1.0` Data/Files parity
[[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
remains in progress in product worktree `hotfix/1.0.2-css-scorecard`. This cut completed the requested
cuts 1-3: dock defaults off and moves Filters/Queue into the Data Tabs menu; quick double-click clears
Filters/Queue lists; Queue warning indicators surface bulk-risk operations; minimal View menu hides DnD
and Cards; Files/Tags/Props rows now emit Vaultman DnD payloads; and a defensive Core Bases
multi-select adapter injects Vaultman batch operations for add property, rename, move, and delete.
Evidence: Svelte MCP autofixer no issues on `navbarPillFab.svelte`, focused unit `4` files / `15`
tests, full `pnpm run verify` passed (`35` unit files / `119` tests; scorecard `17` checks), build
synced to `plugin-dev`, `plugin:reload` passed, runtime DOM smoke confirmed dock off, Tabs menu
`Files/Props/Tags/Content/Active filters/Queue`, visible explorer rows `draggable="true"`, and final
`dev:errors` clean. Remaining SDF-016 work is still Content parity and Files grid parity.

## NEXT AGENT START HERE — SDF-016d row reuse/signature cut complete (2026-06-06)

Stable `1.1.0` Data/Files parity
[[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
is still in progress in product worktree `hotfix/1.0.2-css-scorecard`. This cut changed
`UnifiedTreeView`, `GridView`, and `NodeTableView` so virtual-window renders keep `rowEls` maps,
remove only stale rows, reuse row shell elements, and skip child DOM rebuilds when
`rowSignature` is unchanged. Evidence: focused RED/GREEN source guards, virtualization gate `5` files /
`13` tests, `pnpm run check`, lint, format check, stylelint, and build passed; build synced to
`plugin-dev`; reload through JS `disablePlugin/enablePlugin` passed; sync DOM smoke confirmed
`data-render-signature` on `66/66` visible rows; final `dev:errors` clean; full unit `33` files / `111`
tests and scorecard `17` checks passed. Note: post-signature numeric perf is not freshly captured
because CLI timer/RAF promises stopped resolving after reload, although synchronous evals worked. Before
the signature pass, row-shell reuse measured Files Tree windows mostly `9-16ms` with one `23.2ms` spike
and Files Table mostly `9-16ms` with one `25.2ms` spike; Props Table still had a `63.4ms` spike. Next
perf slice should use a more reliable harness/HUD-visible workflow and then tackle remaining
`node.table.window` row child cost or event delegation.

## NEXT AGENT START HERE — SDF-016c scroll lifecycle cut complete (2026-06-06)

Stable `1.1.0` Data/Files parity
[[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
is still in progress in product worktree `hotfix/1.0.2-css-scorecard`. This cut fixed the severe
Files Table -> Tree lifecycle regression and added perf instrumentation for table windows. Key product
points: `GridView.destroy()` now cancels scheduled renders, removes the scroll listener, removes
`vaultman-files-table-root`, empties the container, and clears stale refs; `FilesExplorerPanel` destroys
the table view during remount/unload; `viewGrid.ts` and `viewNodeTable.ts` coalesce scroll window
renders with RAF scheduling and emit `files.table.window` / `node.table.window` entries. Evidence:
focused RED/GREEN guards passed, virtualization gate `5` files / `8` tests passed, `pnpm run check`,
lint, format check, stylelint, and `pnpm run build` passed; build synced to `plugin-dev`; DOM smoke
confirmed expanded Files Tree `scrollHeight=301887` and computed spacer `301887px` with no stale table
root; Files Table `scrollHeight=333570` with about `25` DOM rows; final `dev:errors` clean. Residual
risk: scroll jank remains measurable, especially expanded Tree (`tree.window` around `17-27ms`,
sampler `fps=16`, `7` long tasks / `1164ms`). Next slice should target render-row cost/reuse and add
Vaultman node DnD. Core Files DOM exposes `draggable="true"` plus `data-path` on file/folder rows;
visible Core Tag pane rows did not expose `draggable` in the CLI DOM snapshot, so Tags/Props DnD
should be implemented as deliberate Vaultman payload behavior, not a blind Files clone.

## NEXT AGENT START HERE — SDF-016b Props/Tags table slice complete (2026-06-06)

Stable `1.1.0` Data/Files parity
[[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
is still in progress in product worktree `hotfix/1.0.2-css-scorecard`, but the Props/Tags generic table
slice is complete. `logicNodeTableLayout.ts` defines stable Bases-style node table offsets;
`viewNodeTable.ts` renders generic explorer rows with `bases-thead`, `bases-table-container`,
`bases-table`, `bases-tbody`, `bases-tr`, and `bases-td`; and `explorerProps.ts` / `explorerTags.ts`
now accept `table` as a real view mode while preserving row click, context-menu, filter, count, icon,
type, and visible-cell behavior. `logicExplorerViewModes.ts` exposes Props/Tags `Tree`, `Grid`, and
`Table` as selectable; DnD/Cards remain disabled; Content still has no view modes. A routing/mount
regression found during smoke was fixed in `pageFilters.svelte`: externally activated Data tabs now
mount when reached from Statistics cards without adding a new Svelte effect. Evidence: focused gate
`4` unit files / `16` tests; Svelte MCP autofixer reported no issues on the touched component; `pnpm run
check`, stylelint, and targeted Prettier passed; `pnpm run build` synced to `plugin-dev`; reload/open
passed; runtime smoke routed from Statistics to Properties and Tags, selected `Table`, and confirmed
`.vaultman-node-table-root` rows/headers in the active pane; final `dev:errors` and captured console
were clean; full `pnpm run verify` passed (`30` unit files / `100` tests; scorecard `17` checks).
Remaining SDF-016 work: Content explorer table/list parity against Core Search semantics and Files grid
only after file-grid interaction defects are fixed.

## NEXT AGENT START HERE — SDF-016a stats routing + view contract complete (2026-06-06)

Stable `1.1.0` Data/Files parity
[[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
is in progress, not complete. This cut completed the safe navigation slice and view-mode contract:
`logicStatisticsNavigation.ts` maps Statistics cards to Data tabs; `pageStatistics.svelte` makes the
stat cards and Word Count row clickable; `VaultmanFrame` routes to Data/Files, Props, Tags, or Content
while closing queue/filter islands and preserving current filters/search. `logicExplorerViewModes.ts`
centralizes availability: Files has selectable Tree/Table with Grid/DnD/Cards disabled; Props/Tags
have selectable Tree/Grid with Table/DnD/Cards disabled; Content exposes no view modes yet. Evidence:
Svelte autofixer clean on touched components, `pnpm run verify` passed (`29` unit files / `96` tests;
scorecard `17` checks), build synced to `plugin-dev`, reload/open passed, Statistics click smoke passed
for Folders/Files/Properties/Values/Tags/Word Count, View menu smoke passed for Files/Props/Tags, Files
Table rendered scrollable with offsets `0/300/411`, and `dev:errors` plus console error capture were
clean. Remaining SDF-016 work: generic table views for Props/Tags/Content and real Files grid after
file-grid interaction defects are fixed. SDF-010 also remains active.

## NEXT AGENT START HERE — SDF-011 Bases-parity table complete (2026-06-06)

Stable `1.1.0` Data/Files parity
[[docs/work/hardening/issues/stable-1-1-data-files-parity/011-bases-parity-table-view-layout|SDF-011]]
is complete in product worktree `hotfix/1.0.2-css-scorecard`. Core Bases research on
`_vaultman_table_parity_reference.base` showed the native table uses `.bases-td` cells positioned by
inline `inset-inline-start` and `width`, not CSS grid tracks. Vaultman Files table now uses
`src/logic/logicTableLayout.ts` to project stable column offsets and `viewGrid.ts` applies those
offsets to every header/body cell; table CSS is scoped under `.vaultman-files-table-root`.
Runtime DOM evidence in `plugin-dev`: default columns align at offsets `0/300/411`, total width
`612px`, horizontal scroll syncs the header with `translateX(-250px)`, `.base` files retain their
extension while `.md` rows show basename, and near-bottom scroll rendered final-vault rows without
duplicating the first rows. Verification: focused layout/source/virtualization tests passed,
`pnpm run verify` passed (`27` unit files / `87` tests; scorecard `17` checks), build synced to
`plugin-dev`, reload/open passed, `dev:errors` returned `No errors captured`, and console error
capture returned `No console messages captured`. Note: `dev:screenshot` failed with CLI TypeError, so
the issue record uses DOM rect/scroll evidence instead. Next active issues: SDF-010 and SDF-016.

## NEXT AGENT START HERE — SDF-007/SDF-008 nested/flat hierarchy complete (2026-06-06)

Stable `1.1.0` Data/Files parity
[[docs/work/hardening/issues/stable-1-1-data-files-parity/007-nested-flat-hierarchy-mode-all-explorers|SDF-007]]
and
[[docs/work/hardening/issues/stable-1-1-data-files-parity/008-correct-tags-nested-simple-grouping|SDF-008]]
are complete in product worktree `hotfix/1.0.2-css-scorecard`. `src/logic/logicExplorerHierarchy.ts`
centralizes pure tree cloning, root grouping, and flat path-label projection. Files, Props, and Tags
now expose `Nested` in both minimal/native View menus and the popup View controls, with `Nested` on by
default. Files flat mode renders path-style rows with original ids and suppresses hidden folder
toggles; Props flat mode renders `prop/value` rows with original property/value ids; Tags flat mode
uses the same projection. Tags grouping now uses root-level semantics: `Nested tags` shows only
level-1 roots with children and preserves descendants, while `Simple tags` shows only childless
level-1 roots. Evidence: focused RED/GREEN helper/source tests, `pnpm run verify` passed (`25` unit
files / `82` tests; scorecard `17` checks), `pnpm run build` synced to `plugin-dev`, reload/open
passed, Files and Props flat DOM smokes passed, Tags nested/simple DOM smokes passed, final reload
showed default `Nested` checked, and final `dev:errors` returned `No errors captured`. Next active
issues: SDF-010, SDF-011, and SDF-016.

## NEXT AGENT START HERE — SDF-003/SDF-004/SDF-005 complete (2026-06-06)

Stable `1.1.0` Data/Files parity
[[docs/work/hardening/issues/stable-1-1-data-files-parity/003-repair-files-explorer-sort-execution|SDF-003]],
[[docs/work/hardening/issues/stable-1-1-data-files-parity/004-split-date-sort-created-modified-cache|SDF-004]],
and
[[docs/work/hardening/issues/stable-1-1-data-files-parity/005-statistics-shared-cache-scoped-projections|SDF-005]]
are complete in product worktree `hotfix/1.0.2-css-scorecard`. Main code points:
`src/logic/logicSort.ts` centralizes sort normalization/comparators and maps legacy `date` to
`mtime`; `FilesLogic.buildFileTree()` now keeps folders first without re-sorting file siblings, so
Files tree respects caller-provided sort order; `navbarFilters.svelte` and `popupSort.svelte` expose
`Modified time` / `Created time` and no longer expose ambiguous `Date`; `StatisticsCacheService`
persists `ctime` with per-file cache records and exposes `getFileTimes()`; Props/Tags date-derived
sorts now build one-pass timestamp indexes instead of nested scans; `logicStatisticsScope.ts` makes
Statistics scope projection testable and `pageStatistics.svelte` uses `workspace.getActiveFile()` for
selected-file scope. Evidence: RED/GREEN focused tests (`6` files / `22` tests), Svelte autofixer no
issues on touched components, `pnpm run verify` passed (`24` unit files / `79` tests; scorecard `17`
checks), build synced to `plugin-dev`, reload/open passed, DOM smoke confirmed Files Sort menu
`Name/Count/Extension/Modified time/Created time/Path` with no `Date`, Props smoke clicked both
date-derived sorts, Statistics smoke confirmed filtered markdown count equals markdown count
(`11068`), selected scope points to the active editor file, and `getFileTimes()` ctime/mtime match file
stat. Final `dev:errors`: `No errors captured`. Performance note: Props `Modified time` first smoke
rendered in about `909 ms`, Created in about `241 ms`; not a freeze, but keep Modified on the watch
list if user-visible jank remains. Next active issues: SDF-007, SDF-008, SDF-010, SDF-011, and
SDF-016.

## NEXT AGENT START HERE — SDF-006/SDF-009 complete (2026-06-06)

Stable `1.1.0` Data/Files parity
[[docs/work/hardening/issues/stable-1-1-data-files-parity/006-zero-result-filters-warning-indicator|SDF-006]]
and
[[docs/work/hardening/issues/stable-1-1-data-files-parity/009-content-active-tab-header-label|SDF-009]]
are complete in product worktree `hotfix/1.0.2-css-scorecard`. `VaultmanFrame` now passes
`filteredCount` as `filterResultCount` into `navbarPillFab`; `logicFabIndicator` resolves queue/filter
indicators as `none`, `count`, or `warning`; active filters with zero results render a neutral
warning badge and accessible zero-result label instead of a numeric count. `navbarFilters` now renders
the minimal Tabs button as icon span + text span only when `activeSectionTab === 'content'`, so the
Content header no longer looks blank while Props/Tags keep icon-only behavior. Runtime note:
`lucide-warning` did not render in Obsidian, so the implementation uses the valid warning icon
`lucide-alert-triangle`. Evidence: RED/GREEN focused tests, Svelte autofixer had no issues on touched
components except existing suggestions, `pnpm run verify` passed (`21` unit files / `72` tests;
scorecard `17` checks), build synced to `plugin-dev`, reload/open passed, runtime smoke confirmed
warning SVG + zero-result aria + filter cleanup and Content label + `Tabs: Content` aria, final
`dev:errors` returned `No errors captured`. Next recommended wave: SDF-003/SDF-004/SDF-005 together
because Files sort, split date sort, and Statistics cache share data/index/cache concerns.

## NEXT AGENT START HERE — SDF-015 queue guard complete (2026-06-06)

Stable `1.1.0` Data/Files parity
[[docs/work/hardening/issues/stable-1-1-data-files-parity/015-queue-duplicate-contradictory-operation-guards|SDF-015]]
is complete in product worktree `hotfix/1.0.2-css-scorecard`. The stable queue remains the existing
`PendingChange[]` service, but `OperationQueueService.add`, `addBatch`, and bypass `addOrRun` now
share a semantic gate. Exact duplicates are skipped, same-operation partial target overlap merges
missing files into the existing queued op, property/tag/file contradictions on overlapping files are
blocked, action presets pass through the same policy, and bypass does not execute an immediate
operation that conflicts with pending staged work. Sandbox research found that `origin/sandbox` uses a
larger VFS/transaction queue (`serviceQueue.svelte.ts`) with node-bound delete-conflict purge; this
wave intentionally ported the stable-compatible policy, not the full architecture. Evidence:
new RED/GREEN `operationQueueConflictPolicy.test.ts`, focused queue/template tests passed, `pnpm run
verify` passed (`19` unit files / `66` tests; scorecard `17` checks), build synced to `plugin-dev`,
reload/open passed, runtime smoke confirmed duplicate skip, target merge, contradiction block, bypass
`processFrontMatter` calls `0`, queue cleanup, and final `dev:errors` returned `No errors captured`.

## NEXT AGENT START HERE — Dock tooltip/active-state fix complete + SDF-016 added (2026-06-06)

Stable `1.1.0` Data/Files parity dock follow-up is complete in product worktree
`hotfix/1.0.2-css-scorecard`. `navbarPillFab.svelte` no longer emits native `title` attributes on
dock FABs, preventing duplicate tooltip surfaces when Obsidian also uses `aria-label`. `VaultmanFrame`
passes `queueIslandOpen` / `filtersIslandOpen` into `BottomNav`, and the dock FABs now get
`is-active` while their matching islands are open. Minimal dock CSS now gives page buttons a squarer
`var(--radius-s)` hover/active shape and keeps dock FAB hover/active states round. Added
[[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
for future all-explorer table view parity, Files grid view, and Statistics-card routing into Data
tabs. Evidence: Svelte autofixer on `navbarPillFab.svelte` and `VaultmanFrame.svelte` reported no
issues; focused source guard `navbarPillFabSource.test.ts` passed; `pnpm run verify` passed
(`18` unit files / `59` tests; scorecard `17` checks); build synced to `plugin-dev`; reload passed;
DOM smoke confirmed no dock FAB `title`, page button radius `4px`, dock FAB radius `50%`, queue and
filters FABs becoming `is-active` while islands are open, and final `dev:errors` returned
`No errors captured`.

## NEXT AGENT START HERE — SDF-014 Data tab switching complete (2026-06-06)

Stable `1.1.0` Data/Files parity
[[docs/work/hardening/issues/stable-1-1-data-files-parity/014-data-tab-switch-performance-and-offset-regression|SDF-014]]
is complete in product worktree `hotfix/1.0.2-css-scorecard`. `pageFilters.svelte` now keeps visited
Data tab panes mounted, removed the keyed in-flow `fade` transition, and passes Props/Tags their own
per-tab search values. Files/Props/Tags explorer setters now return early when view mode, visible
cells, sort state, or search state are unchanged, stopping repeated header effects from forcing
redundant renders. Runtime smoke after the final fix reported `maxPaneCount=4`,
`maxActivePaneCount=1`, `maxTopDelta=0`, only `2` tree render actions, and sampler samples
`46/56/57/60/60 fps`; native workspace-tab reference in the same `plugin-dev` session reported
`56/60 fps`, `0` long tasks, and `maxTopDelta=0`. Evidence: Svelte autofixer on
`pageFilters.svelte`, focused source-guard tests (`2` files / `6` tests), `pnpm run verify` passed
(`17` unit files / `56` tests; scorecard `17` checks), final build synced to `plugin-dev`, reload
passed, and fresh `dev:errors` returned `No errors captured`.

## NEXT AGENT START HERE — New SDF-013/SDF-014/SDF-015 follow-ups added (2026-06-06)

Three new Stable `1.1.0` Data/Files parity issues were added to
[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]:
[[docs/work/hardening/issues/stable-1-1-data-files-parity/013-empty-folder-caret-and-extension-icons|SDF-013]]
for empty-folder caret affordance plus extension-aware file icons;
[[docs/work/hardening/issues/stable-1-1-data-files-parity/014-data-tab-switch-performance-and-offset-regression|SDF-014]]
for sampler-backed Data tab switch FPS and vertical-offset regression diagnosis; and
[[docs/work/hardening/issues/stable-1-1-data-files-parity/015-queue-duplicate-contradictory-operation-guards|SDF-015]]
for duplicate/contradictory queue-operation guards researched against sandbox. SDF-014 is now
completed; SDF-015 must still start with runtime/sandbox research before coding.

## NEXT AGENT START HERE — SDF-012 Data Files tab menu cut complete (2026-06-06)

Stable `1.1.0` Data/Files parity issue
[[docs/work/hardening/issues/stable-1-1-data-files-parity/012-data-files-tab-menu-and-filter-fab-clear|SDF-012]]
is done in product worktree `hotfix/1.0.2-css-scorecard`. Files is no longer a bottom-dock page;
the dock is Data + Statistics and old `ops` page-order settings normalize through
`src/logic/logicNavigation.ts`. Files is now the first Data header Tabs menu option and still uses
the existing `FilesExplorerPanel` via `FilesTab`. The active-filters FAB supports double-click clear,
filters header padding is `8px`, and Statistics scope pills use `--scope-color` values from the stats
grid palette. Evidence: focused RED/GREEN navigation/default tests, `pnpm run verify` passed, final
build synced to `plugin-dev`, plugin reload passed, fresh `dev:errors` returned `No errors captured`,
DOM smokes confirmed dock labels `Data`/`Statistics`, Tabs order `Files/Props/Tags/Content`, Files
visible inside Data, double-click active-filter clear, and Statistics scope pill color variables.

## NEXT AGENT START HERE — Stable Data/Files parity follow-up issue set (2026-06-06)

The next release-facing work is now tracked as
[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]].
SDF-001 and SDF-002 are completed and verified in product worktree `hotfix/1.0.2-css-scorecard`.
Next recommended wave: SDF-006 and SDF-009 for remaining small visible UX fixes, then SDF-003 before
SDF-004/SDF-005. SDF-010 still requires Core Search research with `obsidian-cli` and
`obsidian-web-lab`; SDF-011 still requires Bases table screenshot/DOM research. Latest verification
for SDF-001/SDF-002: `pnpm run verify` passed, build synced to `plugin-dev`, plugin reload passed,
fresh `dev:errors` returned `No errors captured`, Files DOM showed `.base`/`.png`
`.vaultman-tree-type.nav-file-tag` with `.md` hidden, and Files/Props expansion changed headers to
`Collapse all` before collapsing them again.

## NEXT AGENT START HERE — Stable Data/Files parity extension/search/filter pass (2026-06-06)

Continue from
[[docs/work/hardening/plans/2026-06-05-stable-1-1-0-data-files-parity/index|Stable 1.1.0 Data/Files parity plan]],
Task 6L. Latest cut: Files extension display moved from ad-hoc badges into the same row cell model as
Props node types (`TreeNode.typeText` rendered by `.vaultman-tree-type`), so `.md`, `.base`, `.png`,
and other extensions appear as the node type/ext cell when enabled. Props `property names` search now
returns only property nodes; value/level-2 rows are reserved for `all property text`. The
expand/collapse header button derives its label from the active explorer's real expanded-node state,
so one or more expanded rows shows `Collapse all`. Files active filters/search no longer pass the full
vault folder list into the tree projection, preventing unrelated empty folders from rendering under
constraints; sparse filtered results auto-expand level-1 folders when fewer than four top-level folders
are visible, while a manual collapse stays collapsed until the result signature changes. Content search
preview lifted the old ten-file visual cap to a high DOM-safety cap and keeps `matchedFiles`
uncapped. Evidence: focused unit tests passed, `pnpm run verify` passed, final build synced to
`plugin-dev`, `plugin:reload` passed, `dev:errors` returned `No errors captured`, and CLI DOM smokes
covered filtered Files rows/extensions, manual collapse persistence, Props `banner` property-name mode,
and Content `journal` preview without the old `and N more files` normal cap. Test filters were cleared
from `plugin-dev` after smokes.

Prior Task 6K context:
Task 6K. Latest cut: minimal filters header centering now matches the native File Explorer header
because Vaultman uses Obsidian's plural `.nav-buttons-container` behavior without overriding it to
`flex-start`; CLI measured the active Vaultman header as `justify-content:center`. Explorer search
state is now per surface (`props`, `tags`, `files`), so Props/Tags search text stays on Data and does
not create accidental Files `file_name contains ...` filters. Props search calls the existing
`PropsLogic.expansionIdsForSearchMatches()` on search changes, so level-2/value matches such as
`journal` expand their parents while parent-only matches still do not force irrelevant children.
Content search no longer opens the core Search pane when none exists, avoiding focus/leaf steal; with
core Search enabled and present, CLI smoke kept the active leaf and focus on Vaultman while typing.
Settings now renders `Filter templates` and a separate `Action presets` section for saved staged
operations. Evidence: `pnpm run verify` passed; final build synced to `plugin-dev`; `plugin:reload`,
`dev:errors`, header DOM/CSS, Props `journal` DOM, Files search-bleed DOM, Content focus DOM, and
Settings DOM smokes passed.

Prior Task 6I/6J context:
Task 6I. Completed this cut: proto design v12's tabs-as-chip idea was reshaped into a minimal
Data-header `Tabs` button that opens an Obsidian `Menu` with Props/Tags/Content; the visual tabbar is
hidden only in minimal style, and Content keeps the Tabs button so the user cannot get trapped there.
Header order on Data explorer tabs is `Tabs -> View mode -> Sort -> Search -> Auto-reveal when Files
surface exists -> Expand/Collapse`; page Files keeps `View -> Sort -> Search -> Auto-reveal ->
Expand/Collapse` because it has no Data tabs. Props now uses `lucide-archive`; `main.ts` was verified
already using `lucide-vault`, with no `lucide-cupcake` remaining in `src`. Minimal dock active icons
now use Obsidian sidebar active contrast (`workspace-tab-header tappable is-active`, hover background,
tab active color, no accent halo). Files tree extension badges now show any extension when the `ext`
cell is enabled, including `.md` and `.base`.

Evidence: `pnpm run verify` passed; `pnpm run build` synced to `plugin-dev`. The Obsidian CLI bridge
initially timed out; stale `Obsidian.com` processes were cleared and Obsidian was restarted via
`Obsidian.exe obsidian://open?vault=plugin-dev`. After that, `plugin:reload` passed and
`dev:errors` returned `No errors captured`. CLI DOM smoke confirmed no minimal Data tabbar, Tabs menu
items `Props/Tags/Content`, Content state still exposing only `Tabs: Content`, active dock style
matching the active Obsidian sidebar tab (`rgba(255,255,255,0.067)`, `rgb(179,179,179)`, no shadow),
Files tree badges including `.base`, `.md`, and `.png`, and `.base` Files search showing base files
with `.base` badges. Residual: Files table switch still produced one earlier `868 ms` long-task
sample, and Props expand-all still has model/projection cost.

Task 6J follow-up: the minimal filters header now also carries Obsidian's real
`nav-buttons-container` class while each action remains `clickable-icon nav-action-button`.
CLI DOM measured the header as 26px high with `gap: 2px`, and each button as 30x26 with an 18x18
centered icon. A Files scroll regression was reproduced: the virtual viewport had scrollable content
but computed `overflow-y: hidden` because an old scoped Svelte rule
`.vaultman-files-tab-content.svelte-1iho35x { overflow: hidden; }` could persist after reload. The
product source removed that scoped overflow and `styles.css` now has a higher-specificity override
only for `.vaultman-files-tab-content.vaultman-tree-virtual-viewport` inside Vaultman leaves. Fresh
smoke after reload showed `overflowY: auto`, `scrollTop` moving `0 -> 1057`, and `canScroll: true`.
`pnpm run verify` passed again after the follow-up.

## NEXT AGENT START HERE — Feature grill checkpoint closed (2026-05-29)

Read [[docs/current/2026-05-29-checkpoint|2026-05-29 checkpoint]] first. It links the dev-facing pending-question item and Mermaid map; S-26 is locked, next grill = S-27 panelData.

## NEXT AGENT START HERE — Architecture + Style + Version-streams grill closed (2026-05-27)

Three-day grill (2026-05-25→27) closed the architecture foundation, mapped proto design, and
defined the version-stream flow. Health-clean (decision-ledger soft-WARN at 204 lines — shard or leave).

**Read via these hubs (each links its full-detail records):**
- [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/index|Architecture Foundation Discovery]]
  → decision-ledger + **[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-changelog|decision-changelog]]**
  (read this first — what changed + why) + research-streams + roadmap-reslot +
  **[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/roadmap-dispatch|roadmap-dispatch]]**
  (live action order; NOTE gaps: Style/Theme + Kbd/API/NN not yet slotted).
- [[docs/architecture/explorer-model/index|explorer-model]] → 4 shards (responsibility-map · render-data ·
  surfaces-interaction · panels-axons-mutation-layout) + [[docs/architecture/adr/README|ADRs 0001–0008 all Accepted]] + glossary.
- [[docs/work/hardening/research/2026-05-26-style-source-reconciliation/index|style-source-reconciliation]]
  (+ proto-v6-sidebar-map; islands = Scenes; FiltersIsland→logicProps/Tags, FnR→logicFnR*).
- [[docs/work/hardening/research/2026-05-27-version-streams-distillation/index|version-streams]]
  (5 streams; main=stable/dev=beta/sandbox=canary; flow discipline; pre-release labels OPEN).
- [[docs/work/pkm-ai/items/2026-05-27-agent-memory-routing-upgrade|pkm-ai memory-routing item]] (cross-session memory gap).

**Next**: (1) hand [[docs/work/publish/index|publish]] to a dedicated agent (stable = v1.0.0-continuation
reconcile + branch/channel mechanics + tag labels + the mis-release fix); (2) **proto design integration
grill** (own session; proto v7 ships 2026-05-28; classify ADOPT/RESHAPE/MAP/ADD/FIX/DROP/DEFER/SUPERSEDE;
map snapshots, do not chase); (3) complete the unified roadmap (fold Style/Theme + Kbd/API/NN into
roadmap-dispatch); (4) then NOW-tier SPEC→PLAN→Issues — logic-extraction (proto FiltersIsland → logicProps/Tags,
FnR island → logicFnR*), PlatformAdapter. Gated on dev greenlight.

**2026-05-28 — full wave checkpoint** (post-2026-05-27 architecture + Bases hybrid + storage recon + DnD
design + identity + tooling). All detail sharded into
[[docs/current/2026-05-28-checkpoint|2026-05-28 checkpoint]]: wave summary, the 8 new architecture
surfaces (`zoom-out-map` · `dev-glossary` · `operational-watch-list` · `research-inventory` ·
`pending-decisions` · `tooling-libraries` · `vaultman-identity` + ADR 0009 / 0001–0009), the dev-blocked
decisions S-1..S-11, the open research backlog, and the **copy-pasteable starter prompt** for the next
chat (feature-request evaluation + publish/commit/branch/release discipline). Fresh agents read:
AGENTS.md → start.md → status.md → handoff.md → 2026-05-28-checkpoint.md.

**Opens / parking-lot / deferred** (full consolidated review:
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/open-inventory|open-inventory]]):
preset taxonomy ·
serviceUnload/load-preset = USER-FACING granularity (NOT publish) · serviceMark god-object ·
LayoutBuilder/Workspace-profiles · style row 7 (selection color) · ActionNode refinements · islands
large-surface · branch 3 deferred (minisearch H1 + Bases interop order). Proto design path:
`C:\Users\vic_A\Downloads\vaultman`. Researches done: roadmap-methodology + branch-workflow (folded into their docs).

## Superseded — V.D Tree render projection + sibling specs (2026-05-25)

Folded into the 2026-05-27 architecture work above (render-runtime / projection = ADR 0008; media /
icon caches = roadmap-dispatch lane C). Source records still valid:
[[docs/work/hardening/research/2026-05-25-vd-tree-list-nn-pipeline-discovery/index|V.D pipeline discovery]] ·
[[docs/work/hardening/specs/2026-05-25-vd-tree-render-projection/index|V.D Tree Render Projection]] ·
[[docs/work/hardening/specs/2026-05-25-explorer-node-media-cache/index|node media cache]] ·
[[docs/work/hardening/specs/2026-05-25-explorer-node-video-provider-media-cache/index|video provider cache]] ·
[[docs/work/hardening/specs/2026-05-25-explorer-icon-pack-cache/index|icon pack cache]].

The exact handoff + status text removed in the 2026-05-27 checkpoint (the prior 2026-05-26 + 2026-05-25
sections) is preserved verbatim:
[[docs/archive/pkm-ai/active-docs/2026-05-27T000000-handoff-status-superseded-sections|2026-05-27 superseded sections archive]].

## Previous Handoff — A.R complete / 0-A.S scroll follow-up (2026-05-20)

**Release/main reconciliation is complete.** Full source record:
[[docs/work/hardening/plans/2026-05-20-release-1-1-0-catch-up|Release 1.1.0 catch-up]].

**Facts to carry forward**:
- `origin/main` = `7886d58abc596bd21f98776ddf9804be7c3a2889`.
- Release tag `1.1.0` = `8d5c4fd61a6e1840cb74e8523ca46312f20936ec`.
- GitHub Release: `https://github.com/Meibbo/Vaultman/releases/tag/1.1.0`.
- Release assets published: `main.js`, `manifest.json`, `styles.css`, `SHA256SUMS`, `sbom.cdx.json`.
- `release-please` is installed on `main` with bare tags (`include-v-in-tag: false`) and
  `manifest.json` / `versions.json` extra-files.
- `release.yml` triggers on bare `X.Y.Z` tags and publishes release assets, SBOM, checksums, and
  attestations.
- `ci.yml` includes `sandbox` triggers and an AI-file guard for PRs to `main`.
- `main` must remain zero-AI-files: no `AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`, `.codex/`.

**Verification**:
- Clean candidate `pnpm run verify`: exit 0.
- Clean candidate `pnpm run security:audit`: exit 0 for high+ threshold.
- PR #20, PR #21, and PR #22 completed the release infra, release PR, and Scorecard fix sequence.
- Main after PR #22 passed CI, CodeQL, and OpenSSF Scorecard.
- Dependabot security alerts on default branch were fixed or auto-dismissed after main replacement.

**Current release numbering**:
- `1.1.0` = completed catch-up release only.
- Umbrella feature pipeline starts at `v1.2.0`.
- Explorer Hardening = `v1.2.0`.
- Architecture cleanup = `v1.3.0`.
- Keyboard + Public API = `v1.4.0`.
- Nautilus rewrites = `v1.5.0`.
- Theme Builder + Layout = `v1.6.0`.
- Design system migration = `v1.7.0`.
- NN Interop = `v1.8.0`.
- Bases Parity remains `v2.0.0`.

**Next action**:
1. A.R spec + implementation plan are imported to `sandbox`.
2. Gate-0 and Tasks 1-9 are complete, through Task 9 verification matrix + live smoke.
3. Current active follow-up is 0-A.S scroll harness: view switching,
   percentile/histogram reporting, `--vault=<name>`, and active Files-surface
   targeting are done. 50k Tree/List/Table Files matrix passed with zero
   blanks; Grid/Cards are collapsed-topology only, and 100k is blocked by
   Obsidian CLI/runtime readiness.

**Optional cleanup**:
- Remote branches `main-clean-1.1.0` and `release/1.1.0-infra` are merged/stale branches created
  for the release work. Delete only when the user wants branch cleanup.

## Resume Point

- Worktree: `C:\Users\vic_A\Desktop\vaultman`
- Branch: `sandbox`.
- **Latest (2026-05-20)**: 0-A.S stress-vault scroll matrix progressed in the
  variable scroll repair record:
  [[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/2026-05-20-stress-vault-matrix|0-A.S stress-vault scroll matrix]].
  Harness fix: runner now defaults to `--surface=files`, and perf probe ignores
  inactive matching tab containers. Fresh local gate passed: targeted Vitest
  3 files / 33 tests; `pnpm run check`; `pnpm run lint`; `pnpm run build`;
  `git diff --check` with LF-to-CRLF warnings only. 50k Tree/List/Table Files
  matrix passed with zero blank frames and no Obsidian dev errors; Grid/Cards
  still need expanded-row coverage. 100k corpus exists locally, but basic
  `stress-vault` eval timed out after 5 minutes and earlier reload/index
  polling also timed out.
- Previous (2026-05-20): A.R Task 9 complete and verified locally.
  Task 9 source record:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/05-verification|Task 9 verification matrix + live smoke]].
  Added keyboard-nav parity and structural-attribute anti-drift tests across
  Tree/List/Table/Grid/Cards; `pnpm run verify` passed with lint/check/build,
  unit 148 files / 953 tests, and component 114 files / 543 tests. Live
  `plugin-dev` explicit-switch scroll smokes passed for Tree/List/Table/Grid/Cards
  with zero blank frames and final `dev:errors` returned `No errors captured.`
- Previous (2026-05-20): A.R Task 8 complete and verified locally.
  Task 8 source record:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/04-expand-and-cmenu|Task 8 cmenu trigger + standard set]].
  Trigger/standard-set gate: 2 files / 11 tests; expanded provider cmenu gate:
  7 files / 79 tests; `pnpm run check` and `pnpm run lint` passed with
  0 errors / 0 warnings.
- Previous (2026-05-20): A.R Task 7 complete and verified locally.
  Task 7 source record:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/04-expand-and-cmenu|Task 7 expand/collapse-all data-gated]].
  Focused expand-all gate: 1 file / 2 tests; panel/grid regression gate:
  3 files / 67 tests; `pnpm run check` and `pnpm run lint` passed with
  0 errors / 0 warnings.
- Previous (2026-05-20): A.R Task 6d complete and verified locally.
  Task 6d source record:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/03-view-adoption-task-6d-cards|Task 6d ViewNodeCards adoption]].
  Action-adoption gate: 1 file / 4 tests; expanded cards/panel gate:
  9 files / 70 tests; `pnpm run check` and `pnpm run lint` passed with
  0 errors / 0 warnings.
- Previous (2026-05-20): A.R Task 6c complete and verified locally.
  Task 6c source record:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/03-view-adoption-task-6c-grid|Task 6c ViewNodeGrid adoption]].
  Focused grid/delegation gate: 4 files / 33 tests; expanded grid/panel gate:
  9 files / 84 tests; `pnpm run check` and `pnpm run lint` passed with
  0 errors / 0 warnings.
- Previous (2026-05-20): A.R Task 6b complete and verified locally.
  Task 6b source record:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/03-view-adoption-task-6b-table|Task 6b ViewNodeTable adoption]].
  Focused table gate: 8 files / 25 tests; panel/delegation gate: 2 files / 50 tests;
  `pnpm run check` and `pnpm run lint` passed with 0 errors / 0 warnings.
- Previous (2026-05-20): A.R Task 6a complete and verified locally.
  Task 6a source record:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/03-view-adoption-task-6a-tree|Task 6a viewTree adoption]].
  Focused gate: 3 files / 24 tests; `pnpm run check` and `pnpm run lint` passed with 0 errors / 0 warnings.
- Previous (2026-05-20): A.R Tasks 1-5 complete and verified locally.
  Task 5 source record:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/02-seam-normalization|Task 5 seam normalization]].
  Focused gate: 9 files / 112 tests; `pnpm run check` and `pnpm run lint` passed with 0 errors / 0 warnings.
- Previous (2026-05-20): 0-A C12/C13 closeout complete and verified locally; A.R Gate-0 is closed/unblocked.
  Evidence:
  [[docs/work/hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/baseline-log|0-A baseline log]].
  Release 1.1.0 catch-up complete, umbrella pipeline renumerado, and
  A.R spec/plan imported from `claude/pensive-khorana-ed62bd`.
  [[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella]]
  (index + 6 shards). Pipeline `v1.2.0→v2.0.0`; next: A.R implementation.
- Latest request handled: Explorer Phase 0 sub-system O
  (`frameVaultman.svelte` decomposition) implemented inline across six serial
  commits on `sandbox`.
- Explorer platform pass Tasks 1-20 are complete.
- Post-review repair is implemented but not yet committed: Notebook Navigator
  comparison bridge, 50K projection optimization, and Markmap hidden from the
  selectable view menu.
- Primary records:
  - [[docs/work/hardening/plans/2026-05-20-release-1-1-0-catch-up|Release 1.1.0 catch-up]]
  - [[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella]]
  - [[docs/work/hardening/specs/2026-05-20-explorer-AR-action-routing/index|A.R Action Routing spec]]
  - [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/index|A.R implementation plan]]
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
  - [[docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/index|Explorer Sub-system 0-A spec]]
  - [[docs/work/hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/index|Explorer Sub-system 0-A executed implementation plan]]
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

## Historical Records

Detailed commits and verification live in the source records linked above, especially the Explorer
View Platform pass, Explorer platform performance repair, 0-B plan, O plan, and variable scroll
repair. Current handoff keeps only the active route and the latest release facts.

## Preserve

- Obsidian CLI calls must use an explicit `vault=<name>` command option. Normal
  live smokes default to `plugin-dev`; the 50k/100k matrix should use the new
  runner `--vault=<registered-stress-vault>` option instead of relying on the
  focused vault.
- Do not use generic Obsidian commands that fall back to the active vault.
- The registered `stress-vault` is intentionally not marked open in
  `%APPDATA%\obsidian\obsidian.json` after the 100k readiness hang. Backup made
  before registration:
  `C:\Users\vic_A\AppData\Roaming\obsidian\obsidian.json.vaultman-stress-backup-20260520192758.json`.
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
- The 0-A C12/C13 closeout handoff commit is scoped to
  `scripts/run-explorer-scroll-smoke.mjs`, `src/dev/perfProbe.ts`,
  perf probe/script/performance tests, restored `PopupIslandChild.svelte`, and
  linked hardening/current docs.

## Next Action

- **PRIMARY (post A.R Task 9 2026-05-20)**: continue 0-A.S from
  [[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/2026-05-20-stress-vault-matrix|0-A.S stress-vault scroll matrix]]
  by adding fine-grained timing marks around Tree visible-row work, List row
  projection, and Grid expansion/render readiness.
- Phase 0 spine `0-H → 0-B → O → 0-A` and A.R are closed.
- If continuing Explorer scroll work, start from the variable scroll repair
  record. The blank fallback bug is repaired for the live selectable modes and
  Table/Grid active-scroll measurement is now deferred. Runner-level view
  switching, percentile/histogram delay reporting, `--vault` selection, and
  active Files-surface targeting are done. Next target: marks for the valid 50k
  pressure points plus a separate 100k launch/index readiness gate before
  retrying scroll bursts.
- Live scroll smoke harness implemented and verified:
  `pnpm smoke:scroll -- --view=tree --jumps=100`.
  Stress command: `pnpm smoke:scroll:stress -- --view=tree`.
  Both route through `scripts/run-explorer-scroll-smoke.mjs`; default vault is
  `plugin-dev`, and `--vault=<name>` overrides it for stress-vault runs.
- Latest live tree result: `blankFrames=0`, `blank>100ms=0`,
  `blank>250ms=0`, `maxBlank=0ms`, `maxDelay=108ms`, and no Obsidian dev
  errors.
- If resuming OpenSSF hardening, start from:
  `.agents/docs/work/hardening/plans/2026-05-16-openssf-osps-baseline/01-scope-docs-workflow-permissions.md`.
- If continuing the codebase architecture cluster, proceed with coverage
  reconciliation: compare tracked source/config/test/doc paths against phases
  01-09, mark generated-artifact exclusions, and produce a final coverage
  matrix.
