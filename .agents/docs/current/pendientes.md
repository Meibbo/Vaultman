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
- [ ] **cards-37s**: re-run del gate en máquina idle — el B2 integrado ya salió limpio
      (p95/p99/max 32/45/49ms); decidir si se cierra el watch-item. [[docs/current/handoff|handoff]]
- [ ] **P112 reconcile** al promover a sandbox: hotfixes stable tocaron
      `viewTreeBehavior`/`virtualScrollCssSource` que V.D slice 1 migró. Session-log 2026-06-21/23.
- [ ] **Juicio comandos palette de P.D slice 3** (`select-visible-active-explorer`,
      `clear-active-explorer-selection`): ¿quedan expuestos o se ocultan hasta N3 maduro?
- [ ] **Worktree `C:/tmp/vaultman-doc-recovery-embeddings`** (branch `dev` @ `34fa414`):
      identificar qué es y si se conserva — el coordinador no lo tocó.
- [ ] **Worktrees dirty conservados**: `main-clean` (`styles.css` REAL) · `uv2-pa` (untracked
      `plans/2026-06-13-platform-adapter/` que DIFIERE del aterrizado — reconciliar antes de
      borrar) · `uv2-q4` / `pai-001` (solo `.snap` EOL-noise, descartables a ojo).
- [ ] **Dependabot en `main`**: 12 vulns (3 high / 4 moderate / 5 low) en la default branch —
      triage pendiente desde 2026-07-02 (sandbox ya quedó 0 high/moderate; `main` = línea stable).
      https://github.com/Meibbo/Vaultman/security/dependabot
- [ ] **PR #38 release-please** (`chore(main): release 1.2.0`, abierto tras 1.1.6): cerrar o
      conservar para el próximo corte. Session-log 2026-06-23.
- [ ] **Branch remota `p112-type-view-loop-fix`**: borrable cuando convenga. Session-log 2026-06-23.
- [ ] **Re-baseline D4** (docs/ledger citan stable `1.1.1`; la línea va en `1.1.6`) —
      despriorizado por dev 2026-07-02; decidir cuándo. [[docs/current/norte|norte]]
- [ ] **Chatarra `C:/tmp` no-worktree**: `vaultman-gitignore-head/`, `vaultman-gitignore-worktrees/`,
      `vaultman-pa-unit*.log`, `vaultman-screenshot.png` — restos de sesiones viejas, no verificados.

## 2. Codex — listas en el room (sin tokens hasta 2026-07-10)

- [ ] **task_019 — B3**: retirar el enum flat `ExplorerViewMode` de los callers; ViewHost ya
      despacha por `(engine,mode)` resuelto (D-C-8). Aislada, no bloquea P.D.
- [ ] **task_020 — deps low residual**: `GHSA-73rr-hh4g-fpgx` (`diff` vía `mocha`, exige major
      transitive). [[docs/current/handoff|handoff]]
- [ ] **task_016 — embeddings rebuild** (in-progress de codex): sources restaurados en `9a56172`;
      `query-docs.ts` falla por dep local faltante `@xenova/transformers`. Session-log 2026-07-06.
- [ ] **Reconciliar tasks stale 001-005** del room (todo/in-progress pero el trabajo aterrizó);
      el status setter exige token del owner (codex).

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

- [ ] **D-FE-2**: reconciliar paquete dnd-kit (identidad exacta `@dnd-kit/svelte` vs port).
- [ ] **D-FE-3**: migración UnoCSS presetWind3 → Wind4 (pilot tras visual diff).
- [ ] **D-FE-4**: TanStack Table — seguir types-only vs adoptar `createSvelteTable`.
- [ ] **D-FE-5**: LayerChart — defer hasta pilot dashboard.
      Fuente D-FE-*: [[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/index|Frontend Stack Deep Research]]
- [ ] **Flags ledger frontend #9/#11/#12** re-verificar antes de codear en esas zonas:
      identidad dnd-kit · hipótesis FnR de bits-ui (reproducir) · API extendida de pretext.
- [ ] **Ledger shard 09 §9**: 9 verificaciones puntuales baratas de alta señal.
      [[docs/work/hardening/research/2026-06-11-function-union-ledger/09-sintesis-transversal|síntesis transversal]]
- [ ] **Opens de la umbrella**: research TanStack virtualizer/Svelte (sección working-memory) ·
      índice de primitives Obsidian · icon packs como assets.
      [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/index|umbrella]]
- [ ] **Canon STALE por sincronizar**: glossary / explorer-model / view-model de `typeViewConfig`
      arrastran huecos vs canon locked (05-view-canon + ADR 0012) — barrido de sincronización.
- [ ] **Duales internos sandbox DO_NOT_PROMOTE_AS_IS** (queue/VFS · diff espejo · 4 caminos DnD):
      gatean N1/N2 antes de cualquier beta. [[docs/current/norte|norte]]
- [ ] **Canvas/Charts engines (N4)** y **viewScope-filter/composición (N3)**: deferred del canon.
- [ ] **PAI-005 icon packs**: DEFER N4.
- [ ] **Masonry**: la vista no existe (excluida de V.D) — decidir si 2.0.0 la trae.

## 5. Infra / pkm-ai / higiene docs

- [ ] **S3b doc-health prune** (~123 fails) — necesita ventana coordinada (mayoría en zona codex).
- [ ] **Untrack `.agents/state`** (`git rm -r --cached` + gitignore) — el room vive untracked
      en `.git/vaultman-room` desde S2.
- [ ] **session-log.md**: convención rota — el header dice "newest at TOP" pero desde julio las
      entries se apéndean al FONDO; >1000 líneas. Normalizar (enmendar header o re-ordenar) y
      considerar shard.
- [ ] **Riesgo reset/reflog**: 3er evento de pérdida de docs fue un `reset` a origin que huérfano
      commits docs locales (recuperado en `9a56172`). Regla coordinador: antes de mover `sandbox`,
      revisar `git reflog` + `merge-base --is-ancestor` del tip previo.
- [ ] **Mirror tree `.agents/docs/hardening/`** (residuo recovery) + conflict-copies de Drive:
      guard en .gitignore ya existe; borrar el mirror = decisión dev con Obsidian cerrado + Drive
      pausado.
- [ ] **Mojibake `explorerTags.ts`** (git lo marca "Bin") — wart heredado.
- [ ] **status.md / handoff.md >200 líneas**: son route indexes; compactar/archivar secciones
      viejas al archive (patrón 2026-05-11).
