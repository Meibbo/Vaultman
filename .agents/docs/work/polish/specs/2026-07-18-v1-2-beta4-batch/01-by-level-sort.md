---
title: Shard 01 — By level sort (diseño BT4-009)
type: spec
status: active
parent: "[[docs/work/polish/specs/2026-07-18-v1-2-beta4-batch/index|beta.4 batch spec]]"
created: 2026-07-18T00:00:00
created_by: claude-fable-5
tags:
  - agent/spec
  - initiative/polish
---

# Shard 01 — By level sort (BT4-009)

Evoluciona el "Sort level" de beta.3 (`logicScopedSort.ts`, BT3-002). El dev reporta el scope drill de files "todo mal implementado" y el bug central: **con level "All", togglear un sort ordena todos los levels EXCEPTO L1 root** (incumple "All"; la única vía de ordenar L1 era drill = impráctico). Oráculo de UX del drill = el del floating index (FTC-006), que SÍ funciona.

## Estructura del grupo "By level" (rename desde "Sort level")

Orden literal de opciones:

1. **Nested** (default ON) — MOVIDO desde el menú viewmode/cells al sort.
2. **Folders first** (default ON) — entra al grupo (en beta.3 quedó fuera).
3. **Fixed folders** (default ON) — SOLO visible cuando Folders first está ON.
   Desactivarlo → el sort también afecta a los folders del level escogido.
4. — divider —
5. **Scope: `<parent>`** — drill. Label dinámico: la palabra "drill" se reemplaza por las primeras 6 letras del parent level scoped + `...` si excede 6.
6. **All levels** (default ON) — activar Scope drill lo desactiva (excluyentes).

Aplica a files; props/tags conservan sus scopes (Properties/Values · All/drill) bajo el mismo grupo renombrado y las mismas reglas de exclusión.

## Presentación (D32)

Setting nuevo, default ON: opciones INLINE en el sort menu (sin submenú), donde beta.3 puso "Folders first": `sort_options → divider → by-level (orden de arriba) → divider → by type`. OFF → submenú "By level" con el mismo contenido. Ambas superficies (menú nativo + popupSort) idénticas.

## Drill UX (oráculo = floating index)

1. Click en "Scope": activa pick-mode → **border dashed** en el explorer indica modo activo (evaluar mismo affordance en el sort node del toolbar).
2. UN click simple sobre cualquier nodo de level N elige ese level (sin long-press).
3. Cambiar scope después: re-click en "Scope", o "All levels", o cargar otro view config.
4. Label del scope refleja el parent elegido (6 chars + `...`).

## Sync index-drill ↔ sort-drill (D31)

Setting nuevo (default OFF): activada, el scope drill del floating index define TAMBIÉN el scope del sort (un solo drill gobierna ambos). Cerrar el index → sort vuelve a su default (All levels). Sin la setting, drills independientes.

## Semántica de aplicación

- **All levels**: el sort del scope activo se aplica a TODOS los niveles — incluido L1 root (el bug actual). Test explícito: asc→desc reordena L1.
- **Drill L(N)**: sort aplica al nivel de hijos del parent elegido; el resto conserva el sort de All.
- **Folders first ON + Fixed folders ON**: folders hoisted y NO afectados por el sort del level. **Fixed folders OFF**: folders hoisted pero ordenados por el sort dentro de su grupo. **Folders first OFF**: intercalado real (`file-file-folder-file`) por el comparator (fix BT3-002/D4, verificar que sobrevive).
- **Nested OFF** (flat): by-level colapsa a un solo nivel lógico; drill deshabilitado (sin jerarquía); "path" sort disponible. **Nested ON**: sort "path" se OCULTA (D33).
- Props scope=values: ocultar "sort by sub-elements" (D33).
- Cambiar opciones del grupo NUNCA re-barajea implícitamente otros niveles (invariante BT3-002 se mantiene).

## Matriz de combinaciones (tests obligatorios)

Dimensiones: nested {on,off} × folders-first {on,off} × fixed-folders {on,off|n/a} × scope {all, drill-L1, drill-LN} × dirección {asc,desc} × presentación {inline,submenu} × sync-index {on,off}. Cobertura mínima: cada dimensión variada al menos una vez contra baseline + los 3 casos reportados por el dev (All ordena L1 · drill files funcional · no-reshuffle al cambiar opción). Persistencia: todo el grupo viaja en `SavedViewConfig.sortState` (compat con shape BT3-002; migrar campos nuevos con defaults).

## Renombres asociados

- Settings section "Layouts" (lista de saved configs) → **"View configs"** (D30).
- i18n: keys nuevos `sort.bylevel.*`; retirar los de "Sort level" que queden huérfanos.
