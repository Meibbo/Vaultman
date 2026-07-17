---
title: BT3-009 — Iconic change-icon en Props/Tags
type: issue
status: completed
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
updated: 2026-07-17T15:03:00-05:00
updated_by: codex-gpt-5
tags: [agent/issue, initiative/polish]
---

# BT3-009 — Iconic change-icon en Props/Tags

**Gap (D18).** El plugin Iconic añade "Change icon" en los cmenus de core All
Properties y core Tags; nuestros explorers Props/Tags no lo interceptan ni resuelven
esos iconos. Hoy `IconicService` (`serviceIcons.ts:40+`) solo cubre files
(`getFileIcon(path,isFolder)`, data.json de iconic + runtime plugin).

**Objetivo.**
1. **Resolución**: extender `IconicService` para iconos de properties y tags (data.json
   de Iconic guarda esos dominios; verificar shape real + API runtime — el interface
   local ya insinúa `getFileItem`-twins, `serviceIcons.ts:19-25`). Cadena de
   precedencia existente (override > Iconic > cadena) se respeta.
2. **Cmenu**: item "Change icon" en nodos de Props/Tags (paridad core), invocando el
   picker de Iconic vía runtime API si está expuesto; si el picker no es invocable
   desde fuera, fallback = no mostrar el item (nunca un stub roto). Research interno
   del issue: inspeccionar API runtime real de Iconic (repo/plugin instalado en
   plugin-dev), no asumir de memoria.
3. Gate por `iconicEnabled` + presencia del plugin (patrón actual `runtimePlugin()`).

**DoD (AFK):**
- Unit: resolución property/tag icon desde data.json stub (+ precedencia).
- Unit/guard: item cmenu presente solo con Iconic activo y picker disponible.
- Refresh de iconos al cambiar (listener/refresh path existente de IconicService).
- Gates estándar.

**HITL dev:** validación visual con su vault real + Iconic instalado.

## Implementación cerrada — 2026-07-17

Commit de código pushable: `194a7306 feat(iconic): integrate property and tag icons`.

### Contrato runtime verificado

- Instalación examinada: Iconic `1.1.9` en
  `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/iconic`.
- `data.json` confirma los mapas `propertyIcons` y `tagIcons`.
- El runtime real expone `getPropertyItem`, `getTagItem`, `savePropertyIcon`,
  `saveTagIcon` y `refreshManagers`.
- El picker real se implementa como `openSingle` en una clase estática privada del
  módulo minificado y no está publicado en la instancia del plugin. Conforme al
  fallback aprobado, la acción se oculta en Iconic `1.1.9`; no se simula ni se abre un
  modal de Vaultman.

### Cambio

- `IconicService` resuelve primero el item live de property/tag y cae al mapa
  persistido cuando la API runtime no existe, devuelve vacío o lanza.
- El adapter admite una capacidad futura/alternativa `openIconPicker` solo si getter,
  saver y picker son funciones callables. `iconicEnabled=false` desactiva resolución y
  apertura.
- La selección actualiza el item y cache live, delega persistencia a Iconic, llama
  `refreshManagers('property'|'tag')` y notifica listeners aislados.
- Props y Tags registran `Change icon` en inglés/español y se suscriben con disposer al
  refresh. Los value-nodes de Props no reciben la acción.

### Verificación y C2

- RED: 5 fallos esperados por precedencia, contrato picker, acciones y refresh.
- GREEN focal final: 3 archivos, 15 tests.
- `pnpm run check`: 0 errores / 0 warnings.
- ESLint, build y `git diff --check`: verdes.
- Full unit: 96 archivos, 508 tests.
- Autofixer y Stylelint: N/A; el slice no toca `.svelte` ni CSS.
- Adversarial automatizado: getters privados que lanzan conservan persisted fallback;
  clave `#tag`; ausencia de picker nunca anuncia acción; disabled gate; listener que
  lanza no corta los demás; disposer evita refresh de panel descargado; retorno async
  del saver no genera rechazo no manejado.
- No cubre un picker no expuesto por Iconic ni cambios externos espontáneos sin evento
  público. Validación visual/Obsidian permanece HITL del dev, según batch.
