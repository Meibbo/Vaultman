---
title: "PV13-002 — Extract styles.css + scoping .vm-view (205 KB del proto)"
type: issue
status: needs-triage
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/proto-v13-obsidian-plugin/issues/pv13-wave-1/index|PV13 wave 1]]"
dateCreated: 2026-08-07T00:00:00
dateUpdated: 2026-08-07T00:00:00
created_by: deepseek-v4-flash-free
updated_by: deepseek-v4-flash-free
tags: [agent/issue, triage/needs-triage, initiative/proto-v13-obsidian-plugin, css, obsidian-isolation]
---

# PV13-002 — Extract `styles.css` + scoping `.vm-view`

## What to build

Extraer el bloque `<style>` del HTML del proto a `REFACTOR_DIR/styles.css` (sobrescribe el ~164 B del sample) y reescribir los selectores raíz (`:root`, `html, body`, `body[data-theme=…]`) para vivir bajo `.vm-view` en vez de a nivel de documento, de modo que los estilos no contaminen Obsidian.

## Acceptance criteria

- [ ] Extract con regex singleline `<style>(.*?)</style>` del `Vaultman Prototype v13.html` → `styles.css`; size ≈ 205 KB/205399 chars (si <199 KB, el regex no capturó todo).
- [ ] Reescribir textualmente en `styles.css`:
  1. todas las `:root` → `.vm-view`
  2. `html, body` reset → `.vm-view`
  3. cada `body[data-theme="…"]` → `.vm-view[data-theme="…"]` (light, catppuccin-dark/light, gruvbox-dark/light, dracula, nord)
  4. cualquier `body` suelto restante → `.vm-view` (revisar con `Select-String -Pattern '\bbody\b'`)
- [ ] Append al final: bloque `.vm-view { position:relative; height:100%; overflow:hidden; font-family:'Inter',system-ui,sans-serif; font-size:14px }` + `.vm-view .vm-monitor-frame { z-index: 1 }`.
- [ ] Greps de verificación: `:root` → 0, `html` → 0, `body` suelto → 0 (solo dentro de `data-theme` scoped).
- [ ] `npm run build` → exit 0; `styles.css` queda en raíz de REFACTOR_DIR.

## Blocked by

- PV13-001 (build base disponible para verificar gates)