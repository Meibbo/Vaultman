---
title: BT3-009 — Iconic change-icon en Props/Tags
type: issue
status: pending
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish]
---

# BT3-009 — Iconic change-icon en Props/Tags

**Gap (D18).** El plugin Iconic añade "Change icon" en los cmenus de core All Properties y core Tags; nuestros explorers Props/Tags no lo interceptan ni resuelven esos iconos. Hoy `IconicService` (`serviceIcons.ts:40+`) solo cubre files (`getFileIcon(path,isFolder)`, data.json de iconic + runtime plugin).

**Objetivo.**
1. **Resolución**: extender `IconicService` para iconos de properties y tags (data.json de Iconic guarda esos dominios; verificar shape real + API runtime — el interface local ya insinúa `getFileItem`-twins, `serviceIcons.ts:19-25`). Cadena de precedencia existente (override > Iconic > cadena) se respeta.
2. **Cmenu**: item "Change icon" en nodos de Props/Tags (paridad core), invocando el picker de Iconic vía runtime API si está expuesto; si el picker no es invocable desde fuera, fallback = no mostrar el item (nunca un stub roto). Research interno del issue: inspeccionar API runtime real de Iconic (repo/plugin instalado en plugin-dev), no asumir de memoria.
3. Gate por `iconicEnabled` + presencia del plugin (patrón actual `runtimePlugin()`).

**DoD (AFK):**
- Unit: resolución property/tag icon desde data.json stub (+ precedencia).
- Unit/guard: item cmenu presente solo con Iconic activo y picker disponible.
- Refresh de iconos al cambiar (listener/refresh path existente de IconicService).
- Gates estándar.

**HITL dev:** validación visual con su vault real + Iconic instalado.
