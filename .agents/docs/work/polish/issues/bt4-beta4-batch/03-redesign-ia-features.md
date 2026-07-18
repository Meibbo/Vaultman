---
title: BT4 shard 03 — Redesign / IA / features (009-013)
type: issue
status: pending
parent: "[[docs/work/polish/issues/bt4-beta4-batch/index|BT4 index]]"
created: 2026-07-18T00:00:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish]
---

# BT4 shard 03 — Redesign / IA / features

## BT4-009 — By level sort (D29-D33)

Diseño completo:
[[docs/work/polish/specs/2026-07-18-v1-2-beta4-batch/01-by-level-sort|shard 01 del
spec]] — leer ENTERO. Resumen: grupo "By level" (Nested → Folders first →
Fixed folders → divider → Scope:`<6chars>` → All levels), inline por defecto (D32),
drill con UX del floating index (border dashed + click simple), fix "All no ordena
L1", sync opcional index-drill↔sort-drill (D31), options contextuales (D33),
rename settings "Layouts"→"View configs" (D30). Base: `logicScopedSort.ts` de
beta.3 evoluciona (no rewrite desde cero salvo que el diff lo justifique).
**DoD:** matriz de combinaciones del shard como tests; los 3 reproduces del dev
verdes; persistencia SavedViewConfig compat; ambas superficies (nativo + popup);
gates estándar. **No paralelo con BT4-001** (navbarFilters).

## BT4-010 — Settings IA (D34 + D30)

- "show dock" DEBAJO de "style-preset" (orden literal en `display()`).
- Sección "context menus" → sub-page al FINAL de Layout Settings.
- Sub-page nueva "Explorer" bajo Layout Settings: add-on state cell · colored badge
  · cancel badge interaction (`badgeCancelClickMode`) · explorer search highlights.
- Rename sección de layouts guardados → "View configs" (si BT4-009 no lo cubrió ya).
**DoD:** source-guards de orden/estructura (patrón `settingsIaSource.test.ts`);
i18n en+es; gates estándar.

## BT4-011 — Iconic addons + iconos emitidos por plugins (D35)

1. **Auditar** lo que `194a7306` entregó en props/tags (dev reporta "change icon"
   aún ausente): verificar contra vault real qué falta (¿solo resolución sin item de
   menú? ¿gate roto?) y completar la paridad con core All Properties/Tags.
2. Extender "change icon" a snippets y plugins explorers.
3. Plugins EMITEN iconos propios (p. ej. ribbon icon registrado, como `lucide-vault`
   de Vaultman en main.ts): fetch de ese icono como default del nodo plugin
   (precedencia: override usuario/Iconic > icono emitido > fallback genérico).
   Fuente runtime a verificar en implementación (ribbon registry / manifest), no
   asumir de memoria.
**DoD:** units de resolución con stubs (precedencia completa) + guards de cmenu por
tab; gates estándar. Cuidado con BT4-002: cualquier listener nuevo de Iconic pasa
por el gate anti-loop.

## BT4-012 — Remaining inline tasks (D36)

Cell + sort option + hover_info field con el conteo de tasks inline SIN marcar
(`- [ ]`) por archivo. Fuente: cache de estadísticas existente
(`serviceStatisticsCache`, patrón words/characters) — extender el record con
`remainingTasks`; parse barato por regex en el mismo pass. Cell files opcional
(default OFF), sort "Remaining tasks", hover field toggleable.
**DoD:** units de parse (casos: `- [ ]`, `- [x]`, anidadas, code blocks EXCLUIDOS
si el cache ya distingue; si no, documentar limitación) + cache round-trip + cell/
sort/hover cableados; gates estándar.

## BT4-013 — Files node-cmenu configurable (D37)

El cmenu de nodos files está desorganizado. Sub-page nueva en Layout Settings
(patrón hover-info) que lista las opciones del cmenu files con: show/hide por
opción, ORDEN por drag-and-drop y dividers agregables. Persistencia por id
estable (merge por id contra el catálogo de acciones — opciones futuras aparecen
al final, nunca rompen el guardado). Render del cmenu respeta la config.
**DoD:** unit de merge/orden/persistencia + guard del render respetando config;
DnD con util existente si aplica; gates estándar. **HITL dev:** orden default
sugerido.
