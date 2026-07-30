---
title: Ledger cluster 08 — Bases interop, ServiceAPI, diagnostics, mobile, packaging/release, boot/settings
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-06-11-function-union-ledger/index|Function-Union Ledger]]"
created: 2026-06-12T00:00:00
updated: 2026-06-12T00:00:00
created_by: claude-fable-5
updated_by: claude-fable-5
produced_by: explore-subagent (re-lanzado 2026-06-12), integrado y normalizado por coordinador
tags:
  - agent/research
  - ledger
  - process/release
---

# Cluster 08 — Bases interop · ServiceAPI · diagnostics · mobile · packaging/release · boot/settings

**Nota del coordinador (importante — leer antes de usar las tablas):**

1. **Framing stale corregido.** El subagente apoyó varias filas y hallazgos en el shard 06 (promotion/reconciliation spec), que fue escrito ANTES de la publicación de `1.1.1` (2026-06-09, `main`=`dev`=`33d9d23`). Todo lo que el subagente reportó como "blocker de release pendiente" (metadata 1.0.2→1.1.0, hotfix worktree dirty, Tasks 7-10 sin verificar) es HISTÓRICO y está resuelto: `1.1.1` salió con sus assets completos. Esas filas siguen siendo válidas como evidencia de QUÉ funciones existen en stable; sus notas de "pendiente" no aplican ya como bloqueo.
2. **Decisión normalizada.** El subagente usó tokens fuera de leyenda (`KEEP-*`, `TRANSLATE`, `STABILIZE-BEFORE-PROMOTION`); el coordinador los mapeó a la leyenda del ledger: `KEEP-sandbox`→ADOPT-sandbox · `KEEP-stable*`→ADOPT-stable · `KEEP-both`→ADOPT del stream con forma más rica (anotado) · `TRANSLATE`→MAP · `STABILIZE`→RESHAPE/DEFER con nota. Clasificaciones compuestas (`SOLO-X + SOLO-Y`) se normalizaron a OVERLAP.
3. **Evidencia más fuerte:** filas con `git show 1.1.1:` directo (manifest, main.ts, typeSettings.ts, ls-tree de services) superan al delta-matrix (escrito contra 1.0.1) y al shard 06 (escrito contra el hotfix pre-release).

**Hallazgo central:** stable 1.1.1 quedó como un núcleo de 6-7 servicios con settings ricos pero sin API programática ni diagnósticos de producto; sandbox tiene TODO el plano ServiceAPI/diagnostics/Bases-interop en solitario (SOLO-SANDBOX masivo en las tablas 005-006) — consistente con el hallazgo del cluster 04: stable=policy sin arquitectura, sandbox=arquitectura sin policy. El gap transversal nuevo de este cluster es **mobile**: los tres streams declaran `isDesktopOnly:false` y ninguno tiene evidencia de prueba móvil real (gap is-phone documentado en working-memory).

## Tabla 1 — Boot / plugin lifecycle

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| `onload()` core init order | ✓ (grafo simple 6-7 servicios) | ~ (DAG completo ~24 servicios) | — | OVERLAP | ADOPT-sandbox | Logic·boot graph | native | N0 | Stable: PropertyIndex, Filter, Queue, Icons, PropertyType, ContextMenu + StatisticsCache (1.1.1). Sandbox: grafo completo + perf probe + leaf detach + migración settings. Preservar la testabilidad del orden simple de stable como contrato |
| Settings load & schema | ✓ | ✓ | — | COMPARTIDA | ADOPT-sandbox | Logic·settings schema | native | N0 | 1.1.1 `DEFAULT_SETTINGS` en typeSettings.ts incluye performanceHudEnabled, bypassOperations, bulkOperationWarningThreshold |
| Theme hydration en boot | ✓ (updateGlassBlur) | ✓ (ThemeService presets+tokens) | ✓ (theme/accent en root state) | COMPARTIDA | ADOPT-sandbox | Style·ThemeService | native | N1 | sandbox direccional; converge con PSS (D-PSS-3) |
| Perf probe install global | ✓ (`createPerfProbe()` en 1.1.1 main.ts) | ✓ (más métricas) | — | COMPARTIDA | ADOPT-sandbox | Operations·perf probe | flag | N1 | 1.1.1 ya lo instala; sandbox añade event-loop delay, blank frames, scroll bursts |
| Index init (Files/Tags/Props/…) | ~ (solo PropertyIndexService) | ✓ (9-10 índices) | — | OVERLAP | ADOPT-sandbox | Node·indexes | native | N1 | Sandbox: Files/Tags/Props/Content/Operations/ActiveFilters/Snippets/Plugins/Templates/BasesImportTargets |
| Vault event registration | ✓ (metadata `resolved`) | ✓ (+ modify/create/delete/rename) | — | COMPARTIDA | ADOPT-sandbox | Logic·boot graph | native | N1 | — |
| Detached leaves restore post layout-ready | — | ✓ (LeafDetachService, independentLeaves persistidos) | ~ (panel tree) | OVERLAP | ADOPT-sandbox | Navigation·LeafDetachService | polish | N2 | compat móvil sin validar (ver Tabla 7) |
| Service lifecycle cleanup | ✓ (addChild) | ✓ (unload explícito por servicio) | — | COMPARTIDA | ADOPT-stable | Operations·boot graph | native | N2 | forma stable (addChild) = garantía Obsidian; sandbox debe converger a ella |
| Registro de view types | ~ (un VAULTMAN_FRAME_TYPE) | ✓ (8 tabs detachables) | — | OVERLAP | ADOPT-sandbox | Navigation·ViewHost | polish | N2 | explorer-files/tags/props/values, content, outline, page-tools, queue |

## Tabla 2 — Settings / persistencia

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Schema definition | ✓ (~20+ campos) | ✓ (70+ campos, shard 03) | — | COMPARTIDA | ADOPT-stable (base) + RESHAPE | Logic·settings schema | native | N0 | en 2.0 el schema converge al modelo PSS (facetas×scopes, D-PSS-2) — RESHAPE estructural |
| Settings UI tab | ✓ (VaultmanSettingsTab) | ✓ (SettingsUI.svelte, grande) | ~ (ControlIsland mockup) | COMPARTIDA | ADOPT-sandbox | Surface·SettingsUI | native | N1 | — |
| Language selection / i18n | ✓ (`auto`/`en`/`es`) | ✓ | — | COMPARTIDA | ADOPT-stable | Logic·i18n | native | N0 | — |
| Glass blur setting (0-100 → 0-20px) | ✓ | ✓ | — | COMPARTIDA | ADOPT-stable | Style·ThemeService | native | N1 | — |
| Filter templates persistence | ✓ (filterTemplates[]) | ✓ | ~ (filter stack en diseño) | COMPARTIDA | RESHAPE | Logic·PSS (storage class Presets) | native | N1 | D-PSS-6: pasa a clase de storage Presets |
| Migración / versioning de settings | ~ (marker puntual filtersTabLabelsMigrated; sin campo version) | ✓ | — | OVERLAP | RESHAPE | Logic·settings migration | native | N2 | 2.0 necesita migración formal versionada (vm-scene: 1 como modelo) |
| Bases settings group (7 campos) | ✓ (basesLastUsedPath, basesOpenMode, basesOpsPanelSide, basesExplorerSide, basesAutoAttach, basesInjectCheckboxes, basesShowColumnSeparators) | ✓ (más amplio) | — | COMPARTIDA | ADOPT-stable (base) | Logic·BasesInterop settings | native | N1 | — |
| Page order persistence | ✓ (pageOrder[]) | ✓ (FrameNavigationService) | ✓ (pageOrder en root state) | COMPARTIDA | ADOPT-sandbox | Logic·navigation settings | native | N1 | — |
| Open mode (sidebar/main/both) | ✓ | ✓ | ✓ (mode en app.jsx) | COMPARTIDA | ADOPT-sandbox | Logic·layout settings | native | N1 | — |
| Reactive settings reads (settingsRevision + $derived) | ✓ (1.1.1 lo trae para HUD/bypass) | ✓ | — | COMPARTIDA | ADOPT-stable | Logic·settings reactivity | native | N1 | patrón: $derived lee marker sin usar valor → reactividad sin reload |
| Context menu settings (3 toggles) | ✓ (file-menu/editor-menu/more-options) | ✓ | ~ | COMPARTIDA | ADOPT-stable | Navigation·ContextMenuService | native | N1 | — |
| Queue bypass setting (bypassOperations) | ✓ (default false = staged-by-default) | ✓ | — | COMPARTIDA | ADOPT-stable | Operations·queue policy | native | N1 | política central D-PSS-7: queue protege vault |
| Performance HUD setting (default off) | ✓ (performanceHudEnabled) | ✓ | — | COMPARTIDA | ADOPT-stable | Operations·diagnostics | flag | N2 | — |

## Tabla 3 — Módulos hoy (ADR 0011: module-contract / LUPA / SASI)

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Arquitectura service-oriented | ~ (6-7 servicios, acoplados) | ✓ (~72 servicios, desacoplados) | — | OVERLAP | ADOPT-sandbox | Logic·module contracts | native | N0 | ADR 0011 apunta al grafo sandbox; stable no tiene contrato de módulo |
| Provider adapters (`ExplorerProvider<T>`, 8 providers) | — | ✓ (files/props/tags/content/plugins/snippets/outline/bases) | — | SOLO-SANDBOX | ADOPT-sandbox | Node·provider contract | native | N1 | LUPA: el contrato provider ES la costura de extracción |
| Data-plane snapshot store | — | ✓ (ExplorerDataPlaneService, revisiones) | — | SOLO-SANDBOX | ADOPT-sandbox | Node·data plane | native | N2 | desacopla renderer de provider refresh |
| Service contracts tipados (typeContracts.ts) | ~ (interfaces mínimas) | ✓ (contratos formales) | — | OVERLAP | ADOPT-sandbox | Logic·module contracts | native | N1 | — |
| Index interfaces (.nodes/.revisions/.subscribe/.refresh) | ~ (PropertyIndexService) | ✓ (uniforme por índice) | — | OVERLAP | ADOPT-sandbox | Logic·indexes | native | N1 | — |
| DnD service layer (DnDService/SvelteAdapter/AliasAware) | — | ✓ | ~ (demo panel/cell) | SOLO-SANDBOX | ADOPT-sandbox | Logic·DnD module | polish | N2 | ver cluster 07 para detalle DnD |
| FnR service island | — | ✓ (FnRIslandService + template + propSet) | ~ (search-island.jsx) | SOLO-SANDBOX | ADOPT-sandbox | Logic·FnR module | polish | N2 | ver cluster 03 |
| SASI (interfaz scoped active source) | — (inf) | ~ (acciones provider-level; sin contrato SASI formal) | — | SOLO-SANDBOX | RESHAPE | Logic·SASI seam | flag | N2 | ADR 0011 lo postula; ningún stream lo tiene formalizado |
| Module boundary tests | — | ~ (snapshot/projection tests; sin contratos formales) (sin evidencia) | — | SOLO-SANDBOX | DEFER | Operations·verification | flag | N3 | — |

## Tabla 4 — Bases interop IN/OUT

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Detección/uso de archivos `.base` | ✓ (settings de path/modo; `.base` visible en Files 1.1.1) | ✓ (open + read) | — | COMPARTIDA | ADOPT-sandbox | Logic·BasesInterop | native | N0 | SDF-016 dejó `.base` discovery en Files de stable |
| Bases settings UI | ✓ (7 toggles) | ✓ (SettingsUI los expone) | — | COMPARTIDA | ADOPT-stable (base) | Surface·SettingsUI | native | N1 | — |
| Parse YAML de `.base` (import preview) | — | ✓ (serviceBasesInterop.ts: bloques YAML, field mappings, previewBasesImport, BasesImportTargetsIndex) | ~ | SOLO-SANDBOX | ADOPT-sandbox | Logic·BasesInteropAdapter | flag | N2 | ⚠️ cluster 07 flageó discrepancia doc↔código en el adapter multi-select de Core Bases — verificado: 1.1.1 NO expone import preview; el preview es solo-sandbox |
| Conversión de filtros (Bases global → reglas FilterService) | — | ✓ | ~ (inspiración visual) | SOLO-SANDBOX | ADOPT-sandbox | Logic·BasesInteropAdapter | flag | N2 | matriz de cobertura de expresiones Bases = pendiente (sin evidencia) |
| `.base` en Files explorer (extensión visible) | ✓ (filteredVaultFiles incluye `.base`) | ✓ | — | COMPARTIDA | ADOPT-stable | Node·logicFiles | native | N1 | — |
| Render parity multi-select Bases | — | ✓ (property-as-select en grid) | ✓ (celdas de tabla Bases) | OVERLAP | RESHAPE | View·cell renderers | polish | N2 | ADR 0009 cubre el read path híbrido; canon visual = proto |
| Reporte de errores/expresiones no soportadas | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | Surface·BasesInterop UX | native | N2 | crítico para confianza del usuario; estabilizar antes de promover |
| Híbrido ADR 0009 (read-only vs mutable split) | — (sin evidencia) | ~ (import = solo lado read) | — | SOLO-SANDBOX | RESHAPE | Logic·BasesInteropAdapter | flag | N3 | el lado mutable del híbrido no existe en ningún stream |

## Tabla 5 — ServiceAPI

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| `read()` (queue + filter state + index health) | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | Logic·ServiceAPI | flag | N1 | — |
| `plan()` (preview de mutación encolada sin ejecutar) | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | Logic·ServiceAPI | flag | N2 | lazo SASI/MD-F2: read→plan→enqueue |
| `enqueue()` (staging con bloqueo destructivo) | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | Operations·ServiceAPI→queue | flag | N2 | — |
| Detección de riesgo (flags de acción destructiva) | — | ✓ (delete/rename/property delete/content replace) | — | SOLO-SANDBOX | RESHAPE | Operations·risk policy | native | N2 | la policy de stable (cluster 04) debe gobernar estos flags |
| Confirmation gates | — | ✓ (sin contrato de versionado público) | — | SOLO-SANDBOX | RESHAPE | Operations·risk policy | native | N2 | decidir interno vs público antes de exponer; hoy experimental |
| Index health reporting (counts/revisiones) | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | Logic·ServiceAPI | flag | N1 | — |
| Rollback limits (undo depth por tipo de op) | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | Operations·undo/snapshot | native | N2 | conecta con D-PSS-7: config se protege con undo/snapshot |
| Scope summary (selected/filtered/all counts) | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | Logic·ServiceAPI | flag | N1 | — |

## Tabla 6 — Diagnostics / PerfMeter / HUD / ops log

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| PerfMeter (timing de comandos/acciones UI) | ~ (createPerfProbe marca fases boot) | ✓ (wrap start/end por comando) | — | OVERLAP | ADOPT-sandbox | Operations·PerfMeter | flag | N1 | — |
| Perf probe global (`__vaultmanPerfProbe`) | ✓ (instalado en main.ts 1.1.1) | ✓ (métricas más amplias) | — | COMPARTIDA | ADOPT-sandbox | Operations·perf probe | flag | N1 | smoke harness depende de él |
| OpsLogService (buffer circular de operaciones) | — | ✓ (+ pageToolsOpsLog) | — | SOLO-SANDBOX | ADOPT-sandbox | Operations·ops log | flag | N2 | telemetría de producto solo-sandbox |
| Performance HUD (body portal, default-off) | ✓ (performanceHud.svelte + performanceMonitor.ts en 1.1.1) | ✓ | — | COMPARTIDA | ADOPT-stable | Surface·diagnostics HUD | flag | N2 | montaje Svelte body-portal; gated por setting reactivo |
| Smoke scripts (smoke:scroll, smoke:scroll:stress) | — (en repo sandbox, no en plugin) | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | Process·verification | n/a | N2 | product-adjacent, no runtime |
| SBOM generation (sbom:release) | ✓ (asset publicado en release 1.1.x) | ✓ (script) | — | COMPARTIDA | ADOPT-stable | Process·release | n/a | N1 | sbom.cdx.json es asset de release desde 1.1.0 |
| Dead-export / dependency audits (knip, depcheck) | — | ✓ | — | SOLO-SANDBOX | DEFER | Process·build checks | n/a | N3 | build-time, no runtime |
| Config-export debug | — | ~ (sin función explícita encontrada) (sin evidencia) | — | SOLO-SANDBOX | DEFER | Operations·diagnostics | flag | N3 | pedido del dev en PSS grill (§ adiciones); hoy no existe formal |

## Tabla 7 — Mobile / platform gates

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| `isDesktopOnly: false` en manifest | ✓ | ✓ | ✓ (shell móvil diseñado) | COMPARTIDA | RESHAPE | Process·platform gate | native | N0 | **los tres lo declaran, ninguno lo prueba** — gate explícito requerido antes de 2.0; si no pasa, flip a true o subset de features |
| Detección is-phone | — | ~ (sin evidencia directa; UI desktop-heavy) | — | SOLO-SANDBOX | RESHAPE | Logic·PlatformAdapter | native | N2 | gap documentado en working-memory (sin doc de testing is-phone) |
| Shell móvil (sidebar como shell principal) | — | ~ (layout FrameNavigationService) | ✓ (SidebarV4; modos sidebar/desktop/both) | OVERLAP | MAP | Surface·layout shell | polish | N2 | canon de diseño = proto; sin validación Obsidian mobile |
| Touch/swipe handling | ~ | ~ (DnD mouse/keyboard, no touch) | ~ (visual) | OVERLAP | RESHAPE | Logic·InputRouter | native | N2 | NIB debe abstraer touch como input class |
| Navbar móvil | ✓ (navbar móvil `d99a493` en 1.1.1) | ✓ (navbar responsive) | ✓ (pill, dual FAB, drawer) | COMPARTIDA | ADOPT-stable + MAP proto | Surface·navbar | polish | N2 | 1.1.1 trae el fix móvil real más reciente |
| Detached leaves en móvil | — | ~ (compat Obsidian-mobile sin validar) | — | SOLO-SANDBOX | DEFER | Navigation·LeafDetachService | flag | N3 | validar antes de promover |

## Tabla 8 — Packaging / release

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Release metadata (manifest/package/versions.json) | ✓ (1.1.1 coherente, publicado 2026-06-09) | ~ (`1.1.0-beta.1` en branch canary) | — | CONTRADICE | RESHAPE | Process·release metadata | n/a | N0 | el label `beta` del sandbox contradice su rol canary — D4: canary es stream, no label; la línea 2.0 usa `2.0.0-alpha.N` |
| release-please config (bare tags, extra-files) | ✓ (instalado en main; include-v-in-tag false) | ✓ | — | COMPARTIDA | ADOPT-stable | Process·release infra | n/a | N1 | — |
| Build artifacts (main.js/styles.css/manifest) | ✓ | ✓ | — | COMPARTIDA | ADOPT-stable | Process·build | n/a | N0 | — |
| SHA256SUMS como asset | ✓ (publicado desde 1.1.0) | ✓ (script) | — | COMPARTIDA | ADOPT-stable | Process·release assets | n/a | N1 | — |
| SBOM como asset (sbom.cdx.json) | ✓ | ✓ | — | COMPARTIDA | ADOPT-stable | Process·release assets | n/a | N1 | — |
| Attestations en release workflow | ✓ (release.yml publica attestations) | ✓ | — | COMPARTIDA | ADOPT-stable | Process·release infra | n/a | N1 | — |
| Guard de AI files en main (CI) | ✓ (ci.yml PR guard) | ✓ | — | COMPARTIDA | ADOPT-stable | Process·branch policy | n/a | N0 | main = cero AI files |
| Labels de pre-release `alpha→beta→rc` | ~ (1.1.x = solo stable/hotfix) | ~ (label beta mal aplicado) | — | OVERLAP | RESHAPE | Process·release labels | n/a | N0 | D4 enmendado (PSS grill): orden alfabético semver; canary nunca es label |
| Changelog/release notes | ✓ (release-please) | ~ | — | COMPARTIDA | ADOPT-stable | Process·release notes | n/a | N1 | — |
| Build reproducible (artefacto trazable a commit) | ✓ (release 1.1.x desde candidato limpio) | ✓ | — | COMPARTIDA | ADOPT-stable | Process·build | n/a | N1 | — |
| Registro en Obsidian community | ✓ | ✓ | — | COMPARTIDA | ADOPT-stable | Process·distribution | n/a | N0 | metadata de proceso, no código |

## Tabla 9 — Verification system

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| `pnpm run verify` (lint→check→build→unit→component→scorecard) | ✓ (gate de cada cut SDF) | ✓ | — | COMPARTIDA | ADOPT-stable | Process·verify chain | n/a | N0 | scorecard 17 checks en la línea 1.1.x |
| Svelte MCP autofixer en cadena | ✓ (usado por cut en SDF-016) | ✓ | — | COMPARTIDA | ADOPT-stable | Process·verify chain | n/a | N0 | — |
| TypeScript strict | ✓ | ✓ (noUnusedLocals/Parameters) | — | COMPARTIDA | ADOPT-sandbox | Process·build checks | n/a | N0 | — |
| Unit/component test gates (vitest) | ✓ | ✓ | — | COMPARTIDA | ADOPT-stable | Process·test gates | n/a | N1 | detalle de suites fuera de alcance del ledger |
| Smoke scroll perf (tree/table virtualization) | ✓ (smokes DOM de SDF-016) | ✓ (harness runner + perf probe) | — | COMPARTIDA | ADOPT-sandbox | Process·smokes | n/a | N1 | harness runner (`--vault`, percentiles) es solo-sandbox |
| Smokes de release (casing Birthday, `.base` discovery, HUD toggle, queue stage-by-default, native Search sin CLI) | ✓ (ejecutados en la línea 1.1.x) | ✓ | — | COMPARTIDA | ADOPT-stable | Process·release smokes | n/a | N1 | el catálogo de smokes 1.1.x es el test de aceptación `legacy-1.1` (D-PSS-9) |
| `dev:errors` + `plugin:reload` (Obsidian CLI) | ✓ | ✓ | — | COMPARTIDA | ADOPT-stable | Process·runtime gates | n/a | N0 | vault explícito `plugin-dev` siempre |
| Build/sync a `plugin-dev` | ✓ | ✓ | — | COMPARTIDA | ADOPT-stable | Process·dev loop | n/a | N0 | — |

## Hallazgos centrales

1. **ServiceAPI y diagnostics de producto son SOLO-SANDBOX en bloque** (8 filas Tabla 5 + ops log): stable 1.1.1 no expone nada programático. La 2.0 adopta el plano sandbox pero con la policy de riesgo de stable gobernando flags/confirmaciones (mismo patrón del cluster 04:
   stable=policy, sandbox=arquitectura).
2. **Stable 1.1.1 es más rico de lo que el delta-matrix decía también aquí**: perf probe global, performance HUD completo (default-off), settings reactivos (settingsRevision), StatisticsCache con IndexedDB, navbar móvil, `.base` en Files — todo ya en el tag 1.1.1.
   El delta-matrix (contra 1.0.1) subestima sistemáticamente a stable; verificar siempre con `git show 1.1.1:`.
3. **CONTRADICE de labels**: sandbox lleva `1.1.0-beta.1` siendo canary — contradice D4 enmendado (canary = stream, nunca label). Se resuelve al arrancar la línea `2.0.0-alpha.N`; no requiere fix en la 1.1.x.
4. **Mobile es el gap transversal de los tres streams**: `isDesktopOnly:false` declarado por todos, probado por ninguno; is-phone sin doc ni código; detached leaves y hover-only interactions sin validación móvil. La 2.0 necesita un platform gate explícito (encaja en el open PlatformAdapter de wave 1).
5. **Bases interop queda asimétrico**: stable tiene settings + `.base` discovery; sandbox tiene el único path real de import (parse YAML, conversión de filtros, preview) — pero sin matriz de cobertura de expresiones y solo el lado read del híbrido ADR 0009. El lado mutable no existe en ningún stream.
6. **El catálogo de smokes de la línea 1.1.x ES el test de aceptación `legacy-1.1`** (D-PSS-9): casing, `.base` discovery, HUD toggle, queue stage-by-default, native Search.
   La Tabla 9 funciona como inventario inicial de ese profile.

## Cobertura honesta

- **Bien evidenciado**: boot lifecycle (shard 03 + `git show 1.1.1:src/main.ts`), settings schema (typeSettings.ts 1.1.1 directo), diagnostics/HUD (código 1.1.1), release/packaging (session-log 2026-06-09 + release facts de 1.1.0/1.1.1), Bases settings.
- **Parcial**: SASI/module contracts (postulado ADR 0011, no formalizado en ningún stream);
  híbrido ADR 0009 lado mutable (no existe); matriz de expresiones Bases (sin evidencia);
  is-phone/touch (sin código encontrado); minimal searchbox y config-export (sin función explícita).
- **No accedido**: suites de test completas (fuera de alcance por regla del ledger);
  feasibility runtime del proto (es diseño React, no producto); schema IndexedDB completo de StatisticsCache; loop de polling del native Search adapter.
- **Corrección del coordinador**: las afirmaciones del subagente basadas en el shard 06 sobre "hotfix dirty/metadata blocker/Tasks 7-10 pendientes" se reclasificaron como históricas (pre-1.1.1); no son bloqueos vigentes.

## Shards leídos

delta-matrix 05 (§boot/§settings + secciones post-1651: Bases/API/diagnostics/mobile/ packaging/SCSS/i18n/deps) · shard 03 canary (boot DAG, settings, ServiceAPI) · shard 04 proto-v12 · shard 06 promotion spec (§02/§06/§11-12 — con corrección de staleness) · session-log 2026-06-09 · umbrella shard 01 (D2/D4/D8, D-PSS-3/6/7/9) · ADR 0009/0011 · working-memory tooling · código: `git show 1.1.1:` (manifest, main.ts, typeSettings.ts, ls-tree services) + `src/` actual + `.github/workflows/`.
