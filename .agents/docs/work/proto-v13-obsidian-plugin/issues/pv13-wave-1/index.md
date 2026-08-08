---
title: "PV13 — Port del Vaultman Prototype v13 a plugin Obsidian (wave 1)"
type: issue-index
status: done
lifecycle: active
parent: "[[docs/work/proto-v13-obsidian-plugin/index|proto-v13-obsidian-plugin]]"
created_by: deepseek-v4-flash-free
updated_by: opencode-m2
tags:
  - agent/issues
  - initiative/proto-v13-obsidian-plugin
  - proto-v13
dateCreated: 2026-08-07T00:00:00
dateUpdated: 2026-08-08T00:00:00
---
# PV13 — Port del Vaultman Prototype v13 a plugin Obsidian (wave 1)

Issue-set derivado del plan `plans/2026-08-07-proto-v13-implementation/` (3 shards, corregido por pase adversarial 2026-08-07) contra las fuentes reales `C:\Users\vic_A\Downloads\Vaultman\proto-v13\` y `C:\Users\vic_A\Desktop\refactor`.

**Fuente del plan:** [[docs/work/proto-v13-obsidian-plugin/plans/2026-08-07-proto-v13-implementation/index|2026-08-07 implementation plan]].

**Regla de oro:** el contenido/estructura de cada componente JSX se copia 1:1; solo cambia la envoltura (imports, exports, acceso a React como módulo, aislamiento DOM). Ninguna reescritura de lógica.

## Approved order

| Issue | Title | Type | Status | Blocked by |
| --- | --- | --- | --- | --- |
| [[001-toolchain-identidad]] | PV13-001 | Toolchain + identidad del plugin (react deps, loader tsx, tsconfig, rename) | done | — |
| [[002-css-extract-scope]] | PV13-002 | Extract `styles.css` + scoping `.vm-view` (205 KB) | done | 001 |
| [[003-itemview-shell-settings]] | PV13-003 | ItemView shell + contrato settings (`ProtoSnapshot`) | done | 001 |
| [[004-data-state-events-foundation]] | PV13-004 | Capa base: `data.ts`, `folder-icons.tsx`, `events.ts`, `theme-context.tsx`, `state.ts` | done | 001, 003 |
| [[005-icons-nautilus]] | PV13-005 | Capa de iconos: `icons.tsx` + `nautilus.tsx` | done | 004 |
| [[006-views-stack-control]] | PV13-006 | `views.tsx`, `stack-island.tsx`, `control-island.tsx` | done | 005 |
| [[007-popups-search]] | PV13-007 | `popups.tsx`, `search-island.tsx` | done | 006 |
| [[008-explorer-pages]] | PV13-008 | `explorer.tsx`, `pages.tsx` | done | 006, 007 |
| [[009-sidebar-desktop]] | PV13-009 | `sidebar.tsx`, `desktop.tsx` | done | 008 |
| [[010-app-mount]] | PV13-010 | `app.tsx` (AppV4) + `index.tsx` mount — primer render end-to-end | done | 009 |
| [[011-global-isolation]] | PV13-011 | Pase de aislamiento global (7 drags, mousedown/keydown→container, tab-content query) | done | 010 |
| [[012-persistence-wiring]] | PV13-012 | Persistencia real (`onStateChange`/`onOpen`, Reset en settings) | done | 010, 011 |
| [[013-final-smoke]] | PV13-013 | Smoke funcional en Obsidian + gates finales | done | 012 |

**Convención:** los slices AFK son grabbables por un agente en orden numérico; cada uno termina con `npm run build` verde. El 013 es validación manual del dev (política: los agentes no hacen visual testing).

## Estado wave (2026-08-08) — CERRADA

- **Todos los issues 001-013 done.** 001-012 portados con build exit 0 (gates de aislamiento y persistencia verificados en 011/012); **013 smoke HITL validado por el dev el 2026-08-08** — render idéntico, FAB control, tabs/islands/drawer, persistencia (debounce 300 ms + reabrir + restaurado) y Reset en settings, sin desviaciones reportadas.
- **Wave cerrada.** Nota de cierre: el port se completó en sesión del 07 (módulos 008-010 escritos en la tarde); los issues 007-010 se documentaron al día siguiente.
- **Deuda no bloqueante (post-cierre):** 5 artefactos de verificación en la raíz de `REF` (`sim.cjs`, `sim.js`, `test.cjs`, `src/data.ts`, `src/state.ts`) rompen el lint global fuera del override `src/proto/**` — no afectan al bundle; limpiar o ignorar en el siguiente pase de toolchain.
