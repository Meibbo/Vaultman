---
title: P.D shard 03 — mini-grill shape ActionNode (tabla comparativa + Q-SH)
type: plan-shard
status: active
parent: "[[docs/work/hardening/plans/2026-07-06-pd-panel-scene-decomposition/index|P.D panel/scene decomposition kickoff]]"
created: 2026-07-10T03:10:00
created_by: claude-fable-5
tags:
  - agent/plan
  - spine/P.D
  - nib
---

# Mini-grill — shape canónica de ActionNode (D-NIB-7)

Tabla comparativa contra las shapes hermanas REALES del repo (leídas 2026-07-10), y las
preguntas Q-SH para el dev. La shape mínima de slice 1 es TreeNode-aligned + `requiredPorts`;
esto decide la canónica.

## Tabla — shapes hermanas

| Shape | Campos (reales) | Qué enseña para ActionNode |
|---|---|---|
| `TreeNode<TMeta>` ([typeTreeNode.ts](src/types/typeTreeNode.ts)) | `id · label · labelPrefix? · icon? · count? · badges? · children? · depth · meta:TMeta · cls? · highlights? · showCaret? · relation?` | El molde: genérico por `TMeta`, jerarquía nativa (`children` = submenús/cascada GRATIS), render por engines ya resuelto |
| `PendingChange` ([typeOps.ts:102](src/types/typeOps.ts)) | unión `PropertyChange\|ContentChange\|FileChange\|TemplateChange\|TagChange` (campos típicos: `type · action · details · files · customLogic`) | Las OPERACIONES son unión discriminada por dominio — el ActionNode command-kind EMITE estas, no las reemplaza |
| `NodeBadge` (typeTreeNode) | `…onClick?:()=>void · quickAction? · queueIndex?` | Precedente de "callback vivo en la shape" — y su LÍMITE: no serializable, no shareable |
| `IconNode` (glossary, sin código) | selector emoji/lucide/distro/iconic | NodeKind chico ya aceptado conceptualmente sin contrato propio |
| `InputBindingNode` (glossary, DEFERRED) | maps input→command per device | Consumidor futuro: referenciará ActionNodes POR ID |
| `.vmscene` action refs (CR-2 demo) | `{ role: action, action: open-url }` · `{ kind: action-cell, action: vm.refetch }` | El archivo DATA referencia acciones por **string id** — jamás funciones |

## Q-SH (una a la vez con el dev)

- **Q-SH-1 — ¿`ActionNode = TreeNode<ActionMeta>` o interfaz paralela?** REC:
  `TreeNode<ActionMeta>` — ADR 0005 exige "mismo engine"; con el molde ganamos render, cells,
  cascada (`children`), badges y selección sin código nuevo; `ActionProvider` queda un provider
  100% normal.
- **Q-SH-2 — ¿`effect: 'nav' | 'command'` explícito en `ActionMeta`?** REC: sí (D-NIB del
  grill: no inferir del handler).
- **Q-SH-3 — ¿handler como función en meta o `actionId` → registry?** REC: **registry**
  (SASI-light): `ActionMeta.actionId + args?`; el callable vive en el registro. Razón dura:
  CR-2 — `.vmscene` es DATA serializable/shareable y referencia acciones por id; una función
  en la shape (patrón NodeBadge.onClick) mataría share-like-`.base` y los macros declarativos.
- **Q-SH-4 — context-scoped actions**: ¿`getActionsFor(target)` como método opcional del
  ActionProvider o extensión de `ProviderContract` global?** REC: opcional del ActionProvider
  (no ensuciar el contrato global; los providers de DOMINIO ya declaran sus acciones por nodo
  vía este camino cuando llegue el cmenu data-driven — casos: file-menu de terceros
  interceptado por `fileMenuDelegationAdapter`, like-cell de W-001).
- **Q-SH-5 — `requiredPorts?: ('selection'|'projection'|'expansion'|'reveal')[]`** para que el
  `invoke()` genérico del WorkspaceActionRouter preserve unhandled-reasons tipadas. REC: sí,
  unión extensible.
- **Q-SH-6 — macros/composición**: opción anotada SIN lock — `MacroNode = ActionNode cuyos
  children son action-refs (ids) ejecutados en secuencia` (favorece Q-SH-3 registry). DEFER a
  su propio momento; la shape solo debe no cerrarle la puerta (children ya existe vía molde).

## Estado

Creado 2026-07-10 (dev pidió arrancar). Pendiente: respuestas dev Q-SH-1..5 → lock → la shape
canónica entra a slice 1 (o slice 1.1 si slice 1 ya corrió con la mínima).
