---
title: Ledger síntesis transversal — qué une la 2.0 y qué debe decidir el dev
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-06-11-function-union-ledger/index|Function-Union Ledger]]"
created: 2026-06-12T00:00:00
updated: 2026-06-12T00:00:00
created_by: claude-fable-5
updated_by: claude-fable-5
tags:
  - agent/research
  - ledger
  - synthesis
---

# Síntesis transversal del Function-Union Ledger (clusters 01-08, ~595 filas)

Cierre de Fase B. Este shard NO repite filas: consolida los patrones que cruzan clusters,
el inventario CONTRADICE completo, los duales internos de sandbox que gatean N1/N2, y las
decisiones que Fase C-lite (specs de wave 1) debe consumir o escalar al dev.

## 1. Tesis central (confirmada en 8/8 clusters)

**Stable 1.1.1 = policy + comportamiento correcto sin arquitectura. Sandbox = arquitectura
sin policy. Proto v12 = vocabulario/canon visual sin runtime. La 2.0 une los tres por capa:**

| Capa | Fuente canónica | Evidencia transversal |
|---|---|---|
| Policy / seguridad / comportamiento usuario | **stable 1.1.1** | conflict policy nombrada (04) · full-vault Files + search-as-rule (01/03) · tags nested/simple corregido (01) · tab-switch perf fix (05) · queue stage-by-default + bypass setting (08) · smokes 1.1.x = test `legacy-1.1` (08) |
| Arquitectura / contratos / servicios | **sandbox** | providers + data plane + índices (01) · view contract + TanStack (02) · FilterService rune + FnR island (03) · VFS/transaction chains (04) · detach + tabRegistry (05) · ServiceAPI + diagnostics (08) |
| Vocabulario / diseño / canon polish | **proto v12** | engines + scoped views (02) · islands/Scenes (03/05) · ContextMenuV2 action set (07) · resolver de iconos (06) · shell móvil (08) |

**Regla de evidencia (aplicar siempre):** el delta-matrix se escribió contra 1.0.1 y
**subestima sistemáticamente a stable 1.1.1** — los clusters 01/02/03/04/07/08 corrigieron
celdas SOLO-SANDBOX que en realidad son COMPARTIDA/ADOPT-stable. Ante cualquier celda
dudosa: `git show 1.1.1:<path>` manda sobre cualquier doc de research.

## 2. Inventario CONTRADICE consolidado (16 conflictos, por cluster de origen)

Conflictos REALES entre streams que la 2.0 debe resolver explícitamente; ninguno se
resuelve en silencio. Orden ≈ urgencia para wave 1.

| # | Conflicto | Streams | Cluster | Resolución propuesta / estado |
|---|---|---|---|---|
| C-1 | Content search engine: `NativeSearchAdapter` (Core Search DOM) vs `ContentIndex` propio | stable vs sandbox | 01/03 | DEFER con decisión dev: source of truth, o nativo-as-fast-path sobre ContentIndex |
| C-2 | Files source: full-vault (`.base`, no-md) vs `getMarkdownFiles` only | stable vs sandbox | 01 | ADOPT-stable (contrato §06.06) |
| C-3 | Tags Nested/Simple: roots-con-hijos / roots-sin-hijos vs grouping viejo | stable vs sandbox | 01 | ADOPT-stable (SDF-008 corrigió la semántica) |
| C-4 | Tag rename/delete: `processFrontMatter` directo (bypassa queue) vs `serviceTagQueue` | stable vs sandbox | 01 | ADOPT-sandbox (queue-safety gana; debilidad conocida de stable) |
| C-5 | Modelos de conflicto de queue: identity de `PendingChange` vs node-bound delete-purge | stable vs sandbox | 04 | unir: policy stable sobre arquitectura sandbox; decidir el plano del gate |
| C-6 | `addBatch` sync vs async (firma incompatible) | stable vs sandbox | 04 | breaking permitido solo en 2.0.0 (D6) |
| C-7 | `simulateChanges`: replay de closures sobre fm vs sobre transacciones/VFS | stable vs sandbox | 04 | decidir input canónico del diff en el spec de queue |
| C-8 | Virtualización: utils custom DOM-imperativo vs TanStack+table-core | stable vs sandbox | 01/02 | ADOPT-sandbox baseline; gated por research TanStack/Svelte (open umbrella) |
| C-9 | Vocabulario clases: `.vaultman-*` vs `vm-*`+`data-vm-*` vs `data-node-id` | los 3 | 03/06 | RESUELTO por D-PSS (4+3): native=clases reales · polish=`vm-*` · identidad=`data-vm-*`; `legacy-1.1` porta `.vaultman-*` como pseudo-snippets |
| C-10 | MIME DnD: `application/x-vaultman-node` vs `application/vnd.vaultman.node+json` | stable vs sandbox | 07 | unificar contrato DataTransfer al reconciliar DnD |
| C-11 | "Manual DnD": camino imperativo único vs toggle sobre DndService | stable vs sandbox | 07 | resolver dentro de la consolidación DnD (ver §3) |
| C-12 | `orientation`: `horizontal\|vertical` (glossary) vs valores ricos (v12 = modes) | proto vs glossary | 02 | MAP en Fase C: valores v12 → modes/sub-modes |
| C-13 | Tab-switch perf: panes persistentes + setters idempotentes vs remount pressure | stable vs sandbox | 05 | el render-runtime destino HEREDA el fix de stable (SDF-014) |
| C-14 | Surface-action routing: `{id}` pelado vs contrato `{island,sceneId,surfaceId,anchorRect}` | proto vs su propio research | 05 | WorkspaceMediator define el contrato completo |
| C-15 | Labels: `1.1.0-beta.1` en branch canary | sandbox vs D4 | 08 | se resuelve al arrancar `2.0.0-alpha.N`; no tocar la 1.1.x |
| C-16 | Mark kinds: `ViewMarkKind` (estado de vista) vs PSS §21 (dato de nodo) — mismo nombre | sandbox vs PSS grill | 06 | reconciliar en el spec de marks (Q-PSS-9) antes de tocar serviceMark |

## 3. Duales internos de sandbox (gates N1/N2 — reconciliar ANTES de promover)

No son conflictos entre streams: son caminos paralelos DENTRO de sandbox que el propio
ledger marca DO_NOT_PROMOTE_AS_IS.

1. **Mutable transactions vs `VfsChain` inmutable** + dos diffs espejo
   (`serviceDiff`/`serviceDiffSnapshot`) — N1 gate, cluster 04. Prerequisito de cualquier
   promoción de queue.
2. **Snapshot opt-in dual**: solo files publica snapshots; props/tags/content en fallback
   recursivo — cluster 01 (riesgo §010).
3. **Cuatro caminos DnD**: core · alias-aware · dnd-kit · manual — cluster 07. Dato clave:
   stable logra equivalencia funcional con UN camino + 3 utils puros
   (dragPayload/dragFrontmatter/dragEditorDrop) → candidato a simplificar la
   reconciliación hacia un solo camino.
4. **Dos caminos de native binding**: NativeSurfaceBindingService vs click interceptor
   viejo — cluster 07.
5. **Naming de engines sin reconciliar**: glossary Linear/Geometry/Table/Canvas vs v12
   lineal/grid/matrix/canvas vs view-modes planos de sandbox — cluster 02; `matrix` (v12)
   no existe en glossary (chart/form huérfanos → ¿Table transpose o engine nuevo? DEFER N4).

## 4. Gaps SOLO-PROTO (diseño puro — riesgo de implementación alto)

- **Resolver de iconos / packs / picker / overrides** (06): ningún stream lo tiene;
  sandbox solo Iconic bridge + DecorationManager. Todo el subsistema = RESHAPE desde cero.
- **Cuarteto evento→binding→ActionNode→Operation (NIB)** (07): diseño del grill; ningún
  stream lo implementa.
- **Window globals + DOM-query como modelo del proto** (02): `__vmSelMode` etc. + hit-test
  `[data-node-id]` incompatibles con runtime virtualizado — RESHAPE obligatorio en
  cualquier adopción de UI proto.
- **Scoped views**: la UI del proto promete más de lo que sus renderers implementan (solo
  TreeRows resuelve overrides) — el runtime necesita capability matrix explícita (02).

## 5. Bloques SOLO-SANDBOX (adopción directa con policy de stable encima)

- ServiceAPI completo (read/plan/enqueue/risk/rollback/scope) — cluster 08, 8 filas.
- Diagnostics de producto (PerfMeter por comando, OpsLogService, harness runner) — 08.
- Bases interop lado read (parse YAML, conversión filtros, preview) — 08; pendiente matriz
  de cobertura de expresiones; lado mutable del híbrido ADR 0009 no existe en nadie.
- Data plane / providers / índices / view contract — 01/02.
- Detach de leaves + tabRegistry (8 tabs) — 05; compat móvil sin validar.

## 6. Gap transversal: mobile

Los 3 streams declaran `isDesktopOnly:false`; ninguno lo prueba (05/07/08). is-phone sin
código ni doc; hover-only/detach sin validación móvil; único avance real = navbar móvil de
stable (`d99a493`). **Encaja como criterio de aceptación del spec PlatformAdapter de
wave 1**: o el gate pasa, o `isDesktopOnly:true`, o subset de features por plataforma.

## 7. Implicaciones directas para Fase C-lite (specs de wave 1: Q4 ∥ PlatformAdapter ∥ tracer)

- **Spec Q4 (queue)** consume: hallazgo central 04 (policy stable + arquitectura sandbox),
  C-5/C-6/C-7, dual mutable/VFS (§3.1), frontera D-PSS-5 (queue protege vault; config =
  undo/snapshot), bypass/addOrRun de stable como política por defecto.
- **Spec PlatformAdapter** consume: §6 mobile gate completo, is-phone gap, touch como input
  class del NIB (07), detach-en-móvil DEFER, ADR 0004.
- **Spec tracer (ViewConfig + cascade)** consume: view contract sandbox (02), C-12
  orientation MAP, capability matrix de scoped views (§4), C-13 (heredar fix SDF-014),
  facetas×cascada del PSS (D-PSS-2), naming de engines (resolver en el spec, no antes).
- **Transversal a los 3 specs**: estrategia de clases 4+3 (C-9 resuelto), test de
  aceptación `legacy-1.1` = catálogo de smokes 1.1.x (08, Tabla 9), labels `2.0.0-alpha.N`
  (C-15).

## 8. Decisiones abiertas que requieren al dev (no resolubles por agentes)

> **UPDATE 2026-06-12**: C-1, C-5 y C-7 RESUELTAS por el dev — registradas como
> **D-C-1/D-C-5/D-C-7** en el
> [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/01-locked-decisions-grill|shard 01 de la umbrella]].
> Resumen: native search + seam SearchEngine (ContentIndex archivado, minisearch H1
> decide engine propio) · policy-identity primario + delete-purge VFS secundario ·
> diff único desde VfsChain. Quedan abiertas 4-7 (no gatean wave 1). Prioridad alpha
> declarada: robustez MyWorkspace + Symbiont Explorer + node-notes.

1. ~~Content search source of truth (C-1)~~ → D-C-1.
2. ~~Input canónico del diff (C-7) y plano del conflict gate (C-5)~~ → D-C-7 / D-C-5.
3. Render runtime: confirmar TanStack tras el research del open umbrella (C-8).
4. Engine naming final + destino de `matrix`/chart/form (§3.5).
5. Reconciliación mark kinds (C-16) — gatea el spec de marks/serviceMark.
6. ServiceAPI: ¿público versionado o interno experimental en 2.0.0-alpha?
7. Resultado del mobile gate (§6): gate real, `isDesktopOnly:true`, o subset.

## 9. Verificaciones puntuales pendientes (baratas, alta señal)

- ⚠️ **Adapter Core Bases multi-select**: SDF-016 lo declara landed; cluster 07 no lo
  halló en `1.1.1:` ni en sandbox. Verificación dirigida (nombre/archivo distinto,
  post-tag, o doc sobre-declaró).
- `indexActiveFilters.ts` no hallado por grep en sandbox (03) — ¿renombre?
- `serviceMark.ts` no existe como servicio (06) — el "god-object" del parking-lot puede
  ser legacy; confirmar antes del spec de marks.
- Drift `unocss-preset-theme`: 0-B spec lo prescribe, `uno.config.ts` no lo incluye (06).
- `getAbstractFileByPath` unsafe-argument en `1.1.1:explorerFiles.ts:784/856` — coincide
  con el backlog scorecard 2026-06-09 (fix en la línea 1.1.x, no en 2.0).

## Estado

Fase B COMPLETA (8/8 clusters + síntesis). Next: **Fase C-lite** — specs de wave 1
(Q4 ∥ PlatformAdapter ∥ tracer ViewConfig+cascade) consumiendo §7, gateadas por las
decisiones dev de §8 que cada spec necesite; las que no gatean wave 1 (4/5/6) pueden
resolverse durante la wave.
