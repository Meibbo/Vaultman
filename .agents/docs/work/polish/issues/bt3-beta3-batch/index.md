---
title: BT3 — v1.2.0-beta.3 batch (issue-set)
type: issue-index
status: active
parent: "[[docs/work/polish/index|polish]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
updated: 2026-07-17T15:03:00-05:00
updated_by: codex-gpt-5
tags:
  - agent/issues
  - initiative/polish
  - release/1.2.0
---

# BT3 — v1.2.0-beta.3 batch

Issue-set del spec
[[docs/work/polish/specs/2026-07-17-v1-2-beta3-batch/index|v1.2 beta.3 batch]]
(decisiones D1-D20). Formato AFK/HITL (patrón PAI/FTC): DoD tool-checkable = AFK;
juicio visual = dev. Base `dev` @ `5e5fa1df` (beta.2); rama `v12/bt3`.

| Issue | Título | Modo | Estado |
|---|---|---|---|
| [[001-files-padding|BT3-001]] | Quitar `nav-files-container` (padding Files) | AFK micro | completed (`03fe92bc`) |
| [[002-sort-level|BT3-002]] | Sort level per-scope + parents-first interleave | AFK | completed (`ee7bc0f2`) |
| [[003-addons-parity|BT3-003]] | Snippets/Plugins scene-precedent parity | AFK | completed (`5414a0f0`) |
| [[004-addon-cells|BT3-004]] | Addon cells: toggle nativo + gear config | AFK | completed (`d98d28e4`) |
| [[005-settings-ia|BT3-005]] | Settings IA: renames, defaults, blur gate | AFK | pending |
| [[006-menus|BT3-006]] | Tabs cmenu + view cmenu + In mode | AFK | pending |
| [[007-rail-lane|BT3-007]] | Rail lane = ancho track | AFK micro | completed (`03fe92bc`) |
| [[008-tab-labels-minimal|BT3-008]] | Tab labels en minimal + responsive searchbox | AFK | completed (`46243479`) |
| [[009-iconic-props-tags|BT3-009]] | Iconic change-icon en Props/Tags | AFK + research interno | completed (`194a7306`) |
| [[010-rainbow-research|BT3-010]] | Research compat snippet rainbow | research only | pending |

Orden serial recomendado: 001 · 007 → 002 → 008 → 003 → 004 → 009 → 005 → 006.
010 paralelo (read-only). 002 y 006 comparten `navbarFilters.svelte` — NO en paralelo.

## Reglas comunes

- Worktree: `C:/tmp/vaultman-release-beta2-final2` (= `dev` limpio) o fresco en
  `C:/tmp/vaultman-v12-bt3NNN`; rama `v12/bt3`. `pnpm install` primera vez.
- Gates por issue: RED/GREEN focal · svelte-check 0/0 · autofixer `issues:[]` en
  `.svelte` tocados · lint/stylelint según alcance · build · full unit al integrar.
  **Testing visual/UI/Obsidian/mobile delistado para agentes** — lo valida el dev.
- Two-commit: `feat/fix` código-only (pushable) + `docs:` local-only (`.agents/`
  jamás en pushes).
- Adversarial pass antes de cerrar cada slice (policy C2, AGENTS.md).
- i18n: todo string nuevo entra en `en.ts` + `es.ts`.
