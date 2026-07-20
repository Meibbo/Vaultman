---
title: "BT5 shard 05: takeover, cierre de 010/019/011 y release 1.2.0-beta.5"
type: verification
status: completed
lifecycle: active
parent: "[[docs/work/polish/plans/2026-07-19-bt5-next-10/index|BT5 next-10 plan]]"
created: 2026-07-20T15:05:00
updated: 2026-07-20T15:05:00
created_by: claude-fable-5
updated_by: claude-fable-5
tags: [agent/verification, initiative/polish, release/bt5]
---

# Shard 05 — takeover, cierre y release beta.5

Sesión del 2026-07-20. `claude-fable-5` pasó de lane secundaria a **owner principal**
por decisión del dev (handoff `msg_mrtfpsti_04qzc4` de `codex-gpt5`, task_048).

## Release publicado

**`1.2.0-beta.5`** → https://github.com/Meibbo/Vaultman/releases/tag/1.2.0-beta.5

- Pre-release marcada; assets `main.js`, `manifest.json`, `styles.css`.
- `dev` = `ebf625d9` = tag; FF-only desde `codex/bt5-next-10`, 18 commits.
- CI verde completa: verify, `security:audit`, `build:plugin`, attest, upload, publish.
- Autorización explícita del dev; boletín aprobado por él antes de tagear
  (`reviewed: true` en `docs/whats-new.md`, política tag-pinned de BT5-004).
- Gates locales previos: `pnpm run verify` verde (119 files / 775 tests, scorecard
  17/17), build sincronizado solo a `plugin-dev`, SHA-256 idénticos.
- **Smoke runtime no ejecutado**: Obsidian estaba cerrado. Cubierto después por el
  test del dev en dispositivo real.

## Validación HITL del dev (2026-07-20, post-beta.5)

> "hice testing yo mismo y en efecto, ya no hay microcuelgues en la escritura y el
> performance está mejor que nunca"

Eso **cierra el gate HITL de BT5-030**, que era el release blocker P0 declarado. El
issue queda completed; el índice se corrigió (decía "deferred, sin fix" cuando ya
existía `149effc6`).

## Commits de producto de esta sesión

| Commit | Issue | Qué cerró |
|---|---|---|
| `f2e4f8c3` | BT5-010 | registro central de cells + orden de hover |
| `fc709d33` | — | realineación de 8 source guards al registry |
| `d0928260` | BT5-019 | registro propio de iconos addon + picker |
| `143ff2e5` | — | imports muertos que rompían `verify` |
| `eb7eb069` | BT5-004 | boletín beta.5 aprobado |
| `ebf625d9` | — | `chore(release): prepare 1.2.0-beta.5` |
| `bf0e455c` | BT5-011 | resolver de orden + proyección de menús |
| `ea498975` | BT5-011 | renderer en orden de activación (opción B) |

Estado final: `verify` verde con **789 tests**, scorecard 17/17.

## Decisiones del dev registradas

1. **BT5-011 = opción B.** Con el setting ON, *cualquier* cell (incluido Label) es
   hermano directo del row y participa del orden. Con el setting OFF el row conserva
   su estructura clásica. El dev aceptó explícitamente que cells puedan quedar fuera
   del frame ("parte normal de una UI del estilo"); la fila recorta en el borde y el
   label conserva `flex: 1` esté donde esté.
2. **BT5-018.** Base = el orden del context menu de **Core Files**. UI esperada:
   como los settings de hover-info (lista con DnD) más capacidad de crear/ajustar
   **submenús y dividers**. El dev revisa y corrige después de verlo implementado.

## Errores propios de esta sesión (registrados a propósito)

1. **Commiteé BT5-010 sin correr la suite completa**, fiándome del focal de 5
   archivos que listaba el handoff. Al correrla aparecieron 9 fallos en 8 archivos,
   todos por guards que fijaban literales que el registry había absorbido. Reparados
   en `fc709d33`, sin borrar ningún guard.
2. **Di por bueno un `verify` que había fallado**: leí el exit code de un `tail`, no
   del gate. El fallo real (TS6133 por dos imports muertos) se corrigió en
   `143ff2e5`. Lección: leer la salida del gate, no el código de salida de la tubería.
3. Un lint de BT5-016 (`node:fs` sin la convención del repo en `cardsViewMode.test.ts`)
   había pasado inadvertido porque el eslint focal de aquel día no incluyó ese archivo.

## Hallazgo técnico reutilizable

`cellsForExplorer()` devuelve el `labelKey` **base** de la definición. El override por
explorer/viewMode solo sale de `cellLabelKey(def, explorer, viewMode)`. Varios guards
fallaban por asumir lo contrario.

## Issues nuevos abiertos por el dev

- [[031-files-icon-change-not-immediate|BT5-031]] — Files no refresca el icono al
  instante. Causa ya localizada en source: solo escucha `onLoaded`, no `onChanged`.
- [[032-competing-node-tooltips|BT5-032]] — dos tooltips compiten por el nodo;
  `viewTree.rowTitle()` reaplica uno genérico hardcoded en cada render y tapa al
  configurable.
