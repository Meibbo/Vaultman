---
title: BT5-025 — Sistema nativo de Glyph color para Index y Explorer
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
source_ids:
  - BT4-021-residual
  - BT4-D38
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T10:02:50
updated: 2026-07-19T10:02:50
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5, color]
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

- [ ] La paleta compartida expone únicamente default, faint, accent, custom y rainbow.
- [ ] `faint` resuelve la variable semántica de Obsidian, no un hex copiado.
- [ ] `custom` usa un color picker nativo equivalente al de Accent color, persiste un color
      válido y ofrece fallback seguro ante valores legacy o corruptos.
- [ ] Rainbow usa la paleta pastel de referencia y no depende de que el snippet esté activo.
- [ ] Explorer permite folders, files o both y default no colorea ninguno por override.
- [ ] La UI ya no muestra Rainbow folders; el setting legacy y su código no se eliminan.
- [ ] La migración convierte colores individuales legacy sin perder intención: variables
      conocidas pasan a custom con su valor resuelto/documentado y rainbow se conserva.
- [ ] Floating Index y Explorer consumen un resolver común; no duplican unions, paletas o
      validación de color.
- [ ] Tests cubren defaults, faint, accent, custom, rainbow, scopes y settings legacy.

## Blocked by

None — can start immediately.
