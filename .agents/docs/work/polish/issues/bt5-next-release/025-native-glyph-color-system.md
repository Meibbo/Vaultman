---
title: BT5-025 — Sistema nativo de Glyph color para Index y Explorer
type: issue
status: completed
lifecycle: active
priority: P2
execution: AFK
source_ids:
  - BT4-021-residual
  - BT4-D38
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T10:02:50
updated: 2026-07-20T22:10:00
created_by: codex-gpt-5
updated_by: claude-opus-4-8
tags: [agent/issue, initiative/polish, release/bt5, color]
---

# BT5-025 — Sistema nativo de Glyph color para Index y Explorer

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Completa
BT4-021 y reemplaza la interfaz temporal de rainbow folders de D38.

## What to build

Unificar la selección de color de glyphs en una paleta semántica reutilizable:
`default | faint | accent | custom | rainbow`. Eliminar del selector las variables
individuales red/orange/yellow/green/cyan/blue/purple/pink. `custom` muestra el mismo tipo
de color picker que Obsidian usa en Appearance → Accent color y persiste el valor elegido;
`rainbow` usa las tonalidades pastel del snippet que originó los folders rainbow.

Floating Index conserva su selector y gana `faint`+`custom`. Layout Settings → Explorer
gana el mismo selector, más scope `folders | files | both`; `default` no fuerza color y
mantiene el feature opt-in. La UI deja de exponer el toggle `explorerRainbowFolders`, pero
su setting, migración y adapter permanecen en código como función diferida para futura
paridad de snippets/add-ons con los explorers nativos.

## Acceptance criteria

- [x] La paleta compartida expone únicamente default, faint, accent, custom y rainbow.
- [x] `faint` resuelve la variable semántica de Obsidian, no un hex copiado.
- [x] `custom` usa un color picker nativo equivalente al de Accent color, persiste un color
      válido y ofrece fallback seguro ante valores legacy o corruptos.
- [x] Rainbow usa la paleta pastel de referencia y no depende de que el snippet esté activo.
- [x] Explorer permite folders, files o both y default no colorea ninguno por override.
- [x] La UI ya no muestra Rainbow folders; el setting legacy y su código no se eliminan.
- [x] La migración convierte colores individuales legacy sin perder intención: variables
      conocidas pasan a custom con su valor resuelto/documentado y rainbow se conserva.
- [x] Floating Index y Explorer consumen un resolver común; no duplican unions, paletas o
      validación de color.
- [x] Tests cubren defaults, faint, accent, custom, rainbow, scopes y settings legacy.

## Blocked by

None — can start immediately.

## Outcome 2026-07-20 (noche)

**Commits `1b3031b2` + `beb545e3`.** Gate verde (final 896 tests), scorecard 17/17.
Test focal `test/unit/glyphColor.test.ts`. Paleta compartida
`default | faint | accent | custom | rainbow` en `logicGlyphColor`; Floating Index
y Explorer consumen el mismo resolver; Explorer gana scope folders/files/both;
vars individuales fuera de la UI; migración legacy→custom; toggle Rainbow folders
retirado de la UI conservando setting/adapter. La aplicación al explorer pinta el
iconColor por scope pero un color Iconic explícito gana. Detalle:
[[docs/work/polish/plans/2026-07-19-bt5-next-10/09-renames-sortmenu-compositions-glyph|shard 09]].

Pendiente: smoke de runtime. BT5-026 (override por nodo/cell) sigue bloqueado por
BT5-018 (pending-hitl) pero ya no por 025.
