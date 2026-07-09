---
title: Pendientes consolidados — dev/HITL · Codex · researches · infra
type: agent-current
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-07-09T00:25:00
created_by: claude-fable-5
updated: 2026-07-09T00:25:00
updated_by: claude-fable-5
tags:
  - agent/current
  - navigation
---

# Pendientes consolidados (2026-07-09)

> UNA lista para el dev: todo lo abierto, categorizado, con su fuente. Índice navegacional —
> el detalle vive en el source record enlazado. Mantenimiento: cualquier agente que cierre o
> abra un ítem lo refleja aquí (marcar `✅ + fecha`, no borrar hasta el siguiente barrido).

## 1. HITL — requieren juicio/mano del dev

- [ ] **PAI-003 icon picker** — juicio visual en plugin-dev.
      [[docs/work/hardening/issues/proto-absorption-icons/index|PAI index]]
- [x] **cards-37s** ✅ CERRADO por dev 2026-07-09: el gate B2 integrado limpio (32/45/49ms) es
      el dato válido; el outlier 37s fue carga de máquina.
- [ ] **P112 reconcile** al promover a sandbox: hotfixes stable tocaron
      `viewTreeBehavior`/`virtualScrollCssSource` que V.D slice 1 migró. Session-log 2026-06-21/23.
- [x] **Juicio comandos palette de P.D slice 3** ✅ DECIDIDO por dev 2026-07-09: quedan
      VISIBLES (aditivos, gated; sirven de smoke real del seam).
- [ ] **Worktree `C:/tmp/vaultman-doc-recovery-embeddings`** (branch `dev` @ `34fa414`):
      identificar qué es y si se conserva — el coordinador no lo tocó.
- [x] **Worktrees dirty conservados** ✅ 2026-07-09: los 3 "dirty" eran EOL-only (incluido
      `styles.css` de main-clean) — descartados y worktrees removidos; draft de uv2-pa archivado
      en `archive/pkm-ai/2026-07-09-pa-plan-worktree-draft`; `doc-recovery-embeddings` removido
      tras verificar contenido cubierto, branch `dev` local RESCATADA (estaba movida a commits del
      audit → marker `audit/dev-line-2026-07-06`, `dev` reset a `origin/dev`).
- [ ] **Dependabot en `main`** — triage 2026-07-09 (agente, verificado): `main:package.json` NO
      tiene bloque `dependencies` → las 12 alertas son devDeps/test-tooling POR CONSTRUCCIÓN,
      nada toca el bundle distribuido; ningún hotfix stable urgente. Ancladas: vite 8.0.12
      GHSA-fx2h-pf6j-xcff high (frozen por patch-package e2e, esperar) · undici 7.27.0
      GHSA-vxpw-j846-p89q high + GHSA-p88m-4jfj-68fv mod (**bump barato a 7.28.0 vía override**) ·
      `diff` low conocida. Resto (1 high/3 mod/4 low) exige `gh api dependabot/alerts` real —
      correrlo el dev o instalar gh en PATH de agentes.
      https://github.com/Meibbo/Vaultman/security/dependabot
- [x] **PR #38 + branch `p112-type-view-loop-fix`** — dev decidió 2026-07-09: cerrar PR y
      borrar branch (ejecución registrada abajo en esta línea al completarse).
- [ ] **Repro runtime bits-ui FnR** (flag #11): reproducir el breakage portal/trapFocus en
      plugin-dev antes de codear fix; portal-scoping ya presente, `trapFocus` sin tocar.
- [ ] **Re-baseline D4** (docs/ledger citan stable `1.1.1`; la línea va en `1.1.6`) —
      despriorizado por dev 2026-07-02; decidir cuándo. [[docs/current/norte|norte]]
- [ ] **Borrado manual `C:/tmp`**: quedan 5 dirs de RESTOS sin registro git (integrate-logs,
      main-clean, pai-001, uv2-pa, uv2-q4 — solo node_modules; el harness bloquea rm del agente).
      Archivos sueltos ya borrados 2026-07-09.

## 2. Codex — listas en el room (sin tokens hasta 2026-07-10)

- [ ] **task_019 — B3**: retirar el enum flat `ExplorerViewMode` de los callers; ViewHost ya
      despacha por `(engine,mode)` resuelto (D-C-8). Aislada, no bloquea P.D.
- [ ] **task_020 — deps low residual**: `GHSA-73rr-hh4g-fpgx` (`diff` vía `mocha`, exige major
      transitive). [[docs/current/handoff|handoff]]
- [x] **task_016 — embeddings rebuild** ✅ 2026-07-09 EJECUTADA (lane B5): 1261 docs BM25 +
      1214 embebidos MiniLM; `--rank` y `--semantic` smoke-verificados. Codex solo cierra la
      task en el room (token suyo).
- [ ] **Reconciliar tasks stale 001-005** del room (todo/in-progress pero el trabajo aterrizó);
      el status setter exige token del owner (codex).
- [ ] **Anotar veredictos en research shards** (docs micro): shard 09 §9 — 2 claims REFUTADOS
      (`indexActiveFilters.ts` SÍ existe/activo; `unocss-preset-theme` SÍ cableado en
      `uno.config.ts`), 2 confirmados, 1 moot por refactor (evidencia: session-log 2026-07-09) ·
      frontend research index: tabla stack-inventory desactualizada (`@dnd-kit/svelte` real 0.5.0,
      pretext 0.0.8) · `tooling-libraries.md` L42 "Table engine spec" contradice canon (Table =
      modo Geometry).

## 3. Spine P.D — siguiente

- [x] **task_021 — slice 4 node reveal** ✅ 2026-07-09: subagente claude-sonnet, aterrizada
      `c72381b` (FF coordinador tras review PASS). Cadena `InputRouter.revealNode →
      PanelHandle.revealNode → panelExplorer` completa pero INERTE (sin consumidor).
- [ ] **Consumidor real de `reveal-node`** (comando, atajo o drop): juicio dev — hoy la cadena
      no tiene entry-point user-facing (decisión deliberada de la slice).
- [ ] **Deep reveal** (auto-expand ancestros colapsados + cross-tab): fuera de scope de slice 4
      (tocaría runtime); decidir si es slice P.D propia o se resuelve ampliando
      `PanelExpansionPort` primero.
- [ ] **Bridge `ActionProvider -> ActionNode`** (primer paso NIB): candidato siguiente —
      **grill corto ANTES** (probable contrato contested; P.D = 2º dominio pilar).
- [ ] **`panelData` / `panelContent`**: definir shape typed only (non-goal declarado del kickoff).
- [ ] **Scene persistence + integración PSS** (deferred del kickoff).
- [ ] **WSA / free-canvas / tile editing / Live Redesign** (deferred, N3+).
      Plan: [[docs/work/hardening/plans/2026-07-06-pd-panel-scene-decomposition/index|P.D kickoff]]

## 4. Researches / decisiones abiertas

- [x] **D-FE-2** ✅ 2026-07-09 verificado: `@dnd-kit/svelte` 0.5.0 ES el paquete oficial
      (monorepo clauderic), ya instalado; HanielU sin deprecación formal pero sin razón de uso.
      Falta solo el "cerrado" formal del dev.
- [ ] **D-FE-3**: migración UnoCSS presetWind3 → Wind4 (pilot tras visual diff).
- [ ] **D-FE-4**: TanStack Table — seguir types-only vs adoptar `createSvelteTable`.
- [ ] **D-FE-5**: LayerChart — defer hasta pilot dashboard.
      Fuente D-FE-*: [[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/index|Frontend Stack Deep Research]]
- [x] **Flags ledger frontend #9/#11/#12** ✅ 2026-07-09 re-verificados: #9 dnd-kit CONFIRMADO
      oficial · #12 pretext API extendida CONFIRMADA real (0.0.8, `prepareWithSegments`/
      `rich-inline` etc., no usada hoy) · #11 bits-ui FnR = **REQUIERE-REPRO-RUNTIME** (queda como
      HITL abajo): portal-scoping a `activeDocument` YA implementado; `trapFocus` nunca seteado —
      el fix hipotético no está aplicado; reproducir breakage antes de codear.
- [x] **Ledger shard 09 §9** ✅ 2026-07-09: 5 verificaciones ejecutadas — 2 REFUTADAS ·
      2 CONFIRMADAS · 1 no-determinable (refactor). Veredictos en session-log 2026-07-09;
      anotación en el shard = ítem Codex arriba.
      [[docs/work/hardening/research/2026-06-11-function-union-ledger/09-sintesis-transversal|síntesis transversal]]
- [ ] **Opens de la umbrella**: research TanStack virtualizer/Svelte (sección working-memory) ·
      índice de primitives Obsidian · icon packs como assets.
      [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/index|umbrella]]
- [x] **Canon STALE por sincronizar** ✅ 2026-07-09 (parcial-core): explorer-model 01/02/index +
      comentario `typeViewConfig` corregidos con notas fechadas (commit `8bc1785`); glossary/
      dev-glossary verificados ya-alineados. Restan (ítem Codex arriba): `tooling-libraries.md`
      L42 + 3 conflict-copies `(conflict 2026-05-26...)` de explorer-model — borrar/fusionar =
      decisión dev (van con el ítem mirror-tree de Drive).
- [ ] **Duales internos sandbox DO_NOT_PROMOTE_AS_IS** (queue/VFS · diff espejo · 4 caminos DnD):
      gatean N1/N2 antes de cualquier beta. [[docs/current/norte|norte]]
- [ ] **Canvas/Charts engines (N4)** y **viewScope-filter/composición (N3)**: deferred del canon.
- [ ] **PAI-005 icon packs**: DEFER N4.
- [ ] **Masonry**: la vista no existe (excluida de V.D) — decidir si 2.0.0 la trae.

## 5. Infra / pkm-ai / higiene docs

- [ ] **S3b doc-health prune** (~123 fails) — necesita ventana coordinada (mayoría en zona codex).
- [x] **Untrack `.agents/state`** ✅ 2026-07-09 (`8bc1785`).
- [x] **session-log.md convención** ✅ 2026-07-09: header enmendado (append al fondo documentado).
      Queda opcional: shard del archivo (>1000 líneas) — Codex/futuro.
- [ ] **Riesgo reset/reflog**: 3er evento de pérdida de docs fue un `reset` a origin que huérfano
      commits docs locales (recuperado en `9a56172`). Regla coordinador: antes de mover `sandbox`,
      revisar `git reflog` + `merge-base --is-ancestor` del tip previo.
- [ ] **Mirror tree `.agents/docs/hardening/`** (residuo recovery) + conflict-copies de Drive:
      guard en .gitignore ya existe; borrar el mirror = decisión dev con Obsidian cerrado + Drive
      pausado.
- [x] **Mojibake** ✅ 2026-07-09 (`ad64c5f`): los hits reales estaban en `pageFilters.svelte`
      (3 TODOs) + `explorerProps.ts` (string user-facing de rename con "→" corrupto) — reparados,
      check 0/0. `explorerTags.ts` ya no presenta mojibake (grep limpio).
- [ ] **status.md / handoff.md >200 líneas**: son route indexes; compactar/archivar secciones
      viejas al archive (patrón 2026-05-11).
