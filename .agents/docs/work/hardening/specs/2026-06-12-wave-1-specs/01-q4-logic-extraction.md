---
title: Wave 1 spec — Q4 logic-extraction (lane A, spine)
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-06-12-wave-1-specs/index|Wave 1 specs]]"
created: 2026-06-12T00:00:00
updated: 2026-06-12T00:00:00
created_by: claude-fable-5
updated_by: claude-fable-5
tags:
  - agent/spec
  - umbrella-v2/wave-1
  - lane/q4
---

# Spec — Q4 logic-extraction

**Lane A · serial · cabeza del spine (gates N.R → V.D → P.D → todo). Worktree `umbrella-v2/wave-1-q4` desde sandbox HEAD.**

## 1. Objetivo

Sacar la lógica pura de los god-providers de sandbox hacia módulos `logic*` verificables, dejando providers delgados que solo orquestan. Es el prerequisito del NodeRow primitive (N.R) y del render-runtime (V.D). Robustez del **Symbiont Explorer** (prioridad alpha) depende de que esta capa quede testeable y sin estado escondido.

## 2. Alcance

1. **Extracción por dominio** (orden = valor para alpha): `logicFiles` → `logicProps` → `logicTags` → `logicBadge` → `logicFnR`. Cada módulo: funciones puras (proyección/sort/group/hierarchy/labels), cero `app`/DOM/Svelte imports, tests focused por función.
2. **Providers reconstruidos** emiten **namespaced IDs** (`note.X`/`file.X`/`formula.X`) — D6: el único breaking permitido es la línea 2.0.0; este es el momento.
3. **Relation kinds del Node contract** tipados (holarchy/adopted/related — umbrella shard 02). Solo el TIPO + su emisión por providers; consumo visual = N.R/V.D.
4. **Cierre del dual snapshot** (ledger 09 §3.2): props/tags/content publican snapshots al data plane igual que files; el fallback recursivo muere. Incluye resolver el reserved-revision gap (EDP-004, ledger cluster 01).
5. **Policy de queue donde la lógica la toca**: las extracciones que crucen mutación respetan D-C-5 (gate primario = identity policy de stable) — pero la reconciliación del queue COMPLETA es lane E futura, no Q4. Q4 solo no-empeora.

## 3. Fuera de alcance

- NodeRow/render (N.R/V.D), reconciliación queue/VFS completa (D-C-7 se implementa en el spec de Operations), content search engine (D-C-1: el seam `SearchEngine` lo define el tracer; Q4 no toca `ContentIndex` — queda archivado tal cual), DnD/native-binding duals (cluster 07; wave posterior), UI nueva.

## 4. Decisiones y evidencia que consume

- D6 (namespaced IDs aquí) · D-C-5 (no-empeorar) · ADR 0011 (sin deep cross-module imports — regla eslint `eslint-rules/` activa para los módulos nuevos).
- Ledger cluster 01 (providers/data plane — tabla completa de funciones por dominio y sus ADOPT/RESHAPE) y cluster 03 (filters/FnR). **Las filas ADOPT-stable del cluster 01 son comportamiento obligatorio**: full-vault Files (C-2), tags Nested/Simple semantics (C-3), sort/hierarchy SDF-003/007/008.
- Pre-reads del implementador: roadmap-dispatch (tier NOW) · explorer-model 01-responsibility-map · ADR 0011 · delta-matrix §009-§013 + ledger cluster 01.

## 5. Criterios de aceptación

1. Cada `logic*` importable sin `obsidian` ni Svelte en su grafo de deps (test de import-boundary o regla eslint verificada).
2. Providers reducidos: ninguna función de proyección/sort/group/hierarchy inline en providers; conteo LOC por provider baja y queda registrado en el PLAN.
3. IDs namespaced en todos los nodos emitidos; tests de snapshot del data plane verifican el formato.
4. Paridad de comportamiento con stable 1.1.1 en los puntos ADOPT-stable: suite focused reproduciendo los smokes `legacy-1.1` aplicables (full-vault count, nested/simple, sort menus) — D-PSS-9.
5. Snapshots publicados por los 4 dominios; cero llamadas al fallback recursivo en el camino activo (grep-gate o test).
6. `pnpm run check` / `lint` / `verify` + smoke `plugin-dev` (reload, explorers abren, `dev:errors` limpio).

## 6. Riesgos

- God-providers con estado compartido no documentado → mitigación: extracción por slices con RED/GREEN focused por slice, commit local por slice verificado.
- Breaking de IDs rompe marks/presets guardados de testers → aceptado (línea alpha, D6); registrar en el ledger si aparece un hotfix 1.1.x que dependa de IDs viejos.
- Serial: ningún otro lane toca providers/data-plane mientras Q4 vive.
