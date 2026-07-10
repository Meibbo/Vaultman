---
title: Dossier — structural refactor + naming (semilla para grill/auditoría)
type: research
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-07-10T00:00:00
updated: 2026-07-10T00:00:00
created_by: claude-fable-5
updated_by: claude-fable-5
tags:
  - agent/research
  - initiative/hardening
  - refactor-mandate
---

# Dossier — Structural Refactor + Naming (semilla)

> **Policy que estrena este doc (dev, grill NIB 2026-07-10):** todo pendiente de grill/auditoría
> nace CON dossier — los datos de la conversación que lo originó viajan aquí, no se pierden en
> el chat. El agente que tome el grill futuro LEE ESTO PRIMERO.

## Censo src/ (2026-07-10, verificado)

14 carpetas layer-first. `services/` **78 files** (God-folder) · `components/` 90 · `types/` 28 ·
`logic/` 15 · `index/` 14 · `platform/` 8 · `providers/` 7 · `utils/` 7 · `registry/` 2 ·
api/badges/config/dev 1 c/u. `src/index/` = espejo **1:1 por dominio** con `providers/`
(indexFiles↔explorerFiles, etc.) + `i18n/` DENTRO de index/ (misplacement). Un dominio (files)
cruza 4-5 carpetas: providers+index+logic+services+components.

## Declaraciones dev (2026-07-10, vinculantes para el grill)

- **`providers/explorer*` = la mayor deuda técnica**: god-objects innecesarios COMO CONJUNTO
  tras la abstracción/jerarquización de paneles (WSA — cuyo propósito esencial era evitar estos
  god-objects y habilitar customización del user). NO desechar sin extraer valor primero.
- **Refactor-mandate**: el stream goal habilita refactor profundo de secciones verticales
  enteras; refactorizar es práctica normal/frecuente — nunca sale perfecto a la primera.
- **Disciplina de refactor sin backlog**: legibilidad/peso/perf como valor autónomo; abierta la
  forma (rutina vs post-wave vs a-petición con `improve-codebase-architecture`).
- Formato de sesión: no todo es grill-preguntas→acciones; a veces corresponde estructuración
  de producto directa.

## Naming (estado verificado + decisión pendiente)

- Convención dominante REAL: **capa-primero** (`logicFiles`, `serviceQueue`, `typeViewConfig`,
  `pageFilters`, `indexFiles`) — coherente; `FilesLogic` invertido = 0 hits en sandbox.
- Rotos: prefijo **`explorer*`** en providers/ (falsa capa, remanente pre-jerarquía);
  `ExplorerProvider` (contrato no es "de explorers": lo consumen queue/actions/scenes);
  `getTree()` cruza data-shape con view-plane → **`getNodes()` LIBRE (verificado), aceptado dev**.
- Dev evaluó invertir a identidad-primero (filesLogic/filesProvider) por búsqueda-por-dominio
  ("flow inverso"). Dato técnico: fuzzy/substring search encuentra "files" en AMBAS
  convenciones — el orden afecta sort alfabético y agrupamiento visual, no el encontrar.
- Candidatos concretos: contrato → archivo `typeProvider.ts` + interface `ProviderContract` o
  `NodeProvider` (interfaces TS van PascalCase); providers concretos `explorerFiles`→
  `providerFiles` (capa-primero) o `filesProvider` (identidad-primero) — decisión de convención
  gatea esto.
- Anti-drift: la REGLA se decide ya; aplicación por-zona-tocada con catálogo (big-bang repo-wide
  = riesgo de conflicts con lanes vivas; ver research rename-debt en pendientes).

## Links

[[docs/current/pendientes|pendientes]] (ítems: auditoría estructural · rename-debt research ·
deuda de nombres slice-0) · [[docs/architecture/usage-workflows|usage-workflows]] W-003 ·
glossary entradas 2026-07-09/10 (panelWidget, Overlay, InputRouter, WorkspaceActionRouter) ·
shard 04 notas NIB · censo original y contexto completo: session-log 2026-07-09/10.
