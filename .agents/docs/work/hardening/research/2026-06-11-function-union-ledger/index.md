---
title: Function-Union Ledger — proto-v12 × sandbox × stable-1.1.1 (Fase B)
type: research-index
status: active
parent: "[[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/index|Vaultman 2.0 Synthesis Umbrella]]"
created: 2026-06-11T00:00:00
updated: 2026-06-11T00:00:00
created_by: claude-fable-5
updated_by: claude-fable-5
tags:
  - agent/research
  - initiative/hardening
  - version-streams
  - ledger
---

# Function-Union Ledger (Fase B de la Synthesis Umbrella)

Matriz a nivel FUNCIÓN de los tres streams — la "suma de funciones que comparten + las que diferencian" pedida por el dev. Insumo directo de Fase C (specs) y del DoD de cada wave (D3: paridad stable por sistema). Producida con subagentes read-only (Explore) por cluster; integrada y escrita por el agente coordinador.

## Baseline por stream

- **stable** = `1.1.1` (`origin/main`/`origin/dev` = `33d9d23`): línea hotfix + SDF-001..016 + microcuts 2026-06-09 (scrollbar virtual, DnD Files, navbar móvil `d99a493`). Fuentes: shard 06 §06.01-06.19 (inventario hotfix), issues SDF, session-log 2026-06-06..09, shard 02 (base histórica 1.0.1), `git show 1.1.1:`
  para verificación puntual.
- **sandbox** = workspace actual (canary; 271 archivos / ~43k LOC). Fuente: shard 03 (deep redo) + `src/` actual.
- **proto v12** = canon preset polish/demo. Fuente: shard 04 (vertical read completo);
  raw proto solo para verificación puntual.

## Columnas y leyendas

`| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |`

- Celdas de stream: `✓ (forma breve)` · `~ (parcial)` · `—`.
- **Clasificación**: COMPARTIDA · SOLO-STABLE · SOLO-SANDBOX · SOLO-PROTO · OVERLAP (la misma función con formas distintas) · CONTRADICE (formas incompatibles — mostrar el conflicto, no resolverlo en silencio).
- **Decisión**: ADOPT (tomar de un stream, indicar cuál) · RESHAPE (rediseñar para runtime) · MAP (traducir vocabulario/diseño) · DROP · DEFER.
- **Destino**: dimensión del modelo 8-dim (Surface/View/Node/Logic/Navigation/ Style/Process/Operations) + owner destino (p.ej. `logicFiles`, `ViewHost`, `PSS`, `WSA`, `NIB`, `queue/VFS`).
- **Preset** (D8): native · polish · barebones · flag · n/a — qué rung exhibe la función.
- **Nivel**: N0-N4 (pirámide, shard 03 de la umbrella).
- Marcar inferencias con `(inf)` y huecos con `(sin evidencia)`.

## Shards (clusters)

| # | Cluster | Estado |
|---|---|---|
| 01 | [[01-providers-data-domains\|Providers · data plane · dominios · índices · node contract]] | ✅ escrito (≈70 filas) |
| 02 | [[02-views-renderers-taxonomy\|Views · renderers · taxonomía · scoped views · virtualización/perf]] | ✅ escrito (71 filas) |
| 03 | [[03-filters-search-fnr-islands\|Filters · search/FnR · toolbar · islands/scenes core]] | ✅ escrito (≈78 filas) |
| 04 | [[04-queue-operations-diff-scope\|Queue · operations · diff · scope · batcher]] | ✅ escrito (≈105 filas; hallazgo: stable=policy sin VFS, sandbox=arquitectura sin policy) |
| 05 | [[05-layout-surfaces-workspace\|Layout · surfaces · workspace/tiles · detached · navegación]] | ✅ escrito (≈55 filas; mode-toggle DROP; tab-switch perf CONTRADICE) |
| 06 | [[06-theme-style-icons-decorations\|Theme · style · iconos · decorations · presets]] | ✅ escrito (78 filas; serviceMark NO existe como servicio; resolver iconos = gap proto-only) |
| 07 | [[07-bindings-marks-cmenu-dnd-nib\|Bindings nativos · node-notes/marks · cmenu · DnD · NIB]] | ✅ escrito (64 filas; stable 1.1.1 DnD/cmenu mucho más rico que el delta-matrix; MIME CONTRADICE; ⚠️ discrepancia adapter Core Bases doc↔código) |
| 08 | [[08-bases-api-diagnostics-mobile-packaging-boot\|Bases interop · ServiceAPI · diagnostics · mobile · packaging/release · boot/settings]] | ✅ escrito (~80 filas; ServiceAPI/diagnostics SOLO-SANDBOX en bloque; CONTRADICE labels `beta` en canary; mobile = gap de los 3 streams; nota del coordinador corrige framing stale del shard 06 pre-1.1.1) |
| 09 | [[09-sintesis-transversal\|Síntesis transversal — tesis por capas · 16 CONTRADICE · duales sandbox · inputs Fase C-lite · decisiones dev]] | ✅ escrito (cierre de Fase B) |

## Reglas

- Read-only para subagentes; el coordinador escribe.
- Stable 1.1.1 = oráculo de comportamiento (D3); cada hotfix/minor futuro de la línea 1.1.x se registra aquí al ocurrir (D4).
- Columnas preset/decorations/contradicciones obligatorias (D8).
- No inventar funciones; cobertura honesta por cluster al pie de cada shard.

## Estado

- 2026-06-11: index creado; batch 1 (clusters 01-04) despachado.
- 2026-06-12: cluster 08 re-lanzado y escrito — **ledger 8/8 COMPLETO (~595 filas)**.
  Sigue: [[09-sintesis-transversal|síntesis transversal]] → Fase C-lite (specs wave 1).
