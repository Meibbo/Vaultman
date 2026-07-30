---
title: PSS — modelo en discusión (facetas B + cascada C + pipeline de estilo)
type: visual-map
status: active
parent: "[[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/index|Vaultman 2.0 Synthesis Umbrella]]"
created: 2026-06-10T00:00:00
updated: 2026-06-10T00:00:00
created_by: claude-fable-5
updated_by: claude-fable-5
tags:
  - agent/visual
  - initiative/hardening
  - pss
---

# PSS — Modelo en discusión (grill 2026-06-10, EN CURSO)

Snapshot visual del PSS grill. NO es decisión final: registra el estado de la conversación dev ↔ agente. Fuente de las decisiones cerradas:
[[../01-locked-decisions-grill|shard 01]] (se actualizará al cerrar el grill).

## Sources

- [megadump MD-L3/G1 (PSS=presets+queued batcher; .scene)](../../../../work/draft/2026-06-03-onenote-companion-architecture-megadump/01-triage-classification.md)
- [CR-2 (.scene = layered-YAML; payload pendiente de PSS)](../../../../work/draft/2026-06-03-onenote-companion-architecture-megadump/decisions/CR-2-scene-format.md)
- [glossary — Presets/PSS terms + barebones/native/polish + Workspace-profile](../../../../architecture/glossary.md)
- [whiteboard Node Distribution (xyz/layers persistence)](../02-node-distribution-presentation-model.md)
- [proto v12 shard 04 (viewSnapshot/panelCfg/parentViews)](../../../research/2026-05-29-version-streams-vertical-codebase-analysis/04-proto-design-v12-vertical-read.md)

## Modelo: authoring tipado (B) + resolución en cascada (C)

Decisión del dev (2026-06-10): B con la razón de C — facetas tipadas para autoría y validación; la RESOLUCIÓN entre scopes es una cascada de overrides (el más específico gana), como CSS. "C dentro de B".

```mermaid
flowchart LR
  subgraph authoring["Authoring tipado — B"]
    f_style["style preset<br/>pseudo-snippets + tokens"]
    f_layout["layout preset<br/>bars / dock / tiles"]
    f_load["load preset<br/>LUPA on-off"]
    f_view["view preset<br/>engine/mode/orient/cells"]
    f_ws["workspace preset<br/>panel tree"]
    f_input["input preset<br/>NIB"]
    profile["Profile<br/>composicion nombrada"]
    scenefile[".scene file<br/>layered-YAML, share like .base"]
    f_style --> profile
    f_layout --> profile
    f_load --> profile
    f_view --> profile
    f_ws --> profile
    f_input --> profile
    profile --> scenefile
  end
  subgraph resolution["Resolucion en cascada — C"]
    s_global["Global"] --> s_ws["Workspace / Profile"]
    s_ws --> s_surface["Surface<br/>tab/modal/popup"]
    s_surface --> s_scene["Scene"]
    s_scene --> s_panel["Panel"]
    s_panel --> s_node["Level / Parent / Node<br/>xyz · layers · icon"]
  end
  profile -. "aplica a un scope" .-> s_global
  scenefile -. "se monta en" .-> s_scene
  builtin["built-ins:<br/>barebones · native · polish · custom"] --> profile
```

## Pipeline de estilo (bits-ui headless + pseudo-snippets)

Requisito del dev: componentes/primitives se comportan como bits-ui (mínimo o cero estilo propio); TODO el estilo = pseudo-snippets (CSS exportable a snippets reales del usuario) → se preserva el lenguaje de diseño de Obsidian y se evita que agentes IA generen UI fuera de lenguaje.

```mermaid
flowchart LR
  comp["Componente headless<br/>(bits-ui-like)<br/>identidad: data-vm-*"]
  vocab["Vocabulario de clases<br/>POR PRESET<br/>native: clases Obsidian reales<br/>polish: vm-*"]
  pseudo["Pseudo-snippets CSS<br/>(la faceta style)"]
  export["Export del usuario<br/>snippet .css real"]
  lang["Lenguaje de diseño<br/>Obsidian preservado"]
  comp --> vocab --> pseudo --> export
  pseudo --> lang
  tokens["Tokens --vm-*<br/>puenteados a vars Obsidian<br/>(0-B ya existe)"] --> pseudo
```

## Estrategias de clases (en evaluación — pregunta abierta)

| # | Estrategia | Evidencia | Estado |
| --- | --- | --- | --- |
| 1 | Prefijo propio `vm-` en todo (`vaultman-` legacy en stable) | sandbox actual | statu quo |
| 2 | Clases nativas Obsidian directas | stable 1.1 (bases-*, nav-*; SDF-011) | probada en producción; frágil sin registry |
| 3 | Dual-class por preset (vm-* siempre + vocabulario inyectado) | 0-A native class emission | parcialmente existente |
| 4 | data-attrs identidad (`data-vm-*`, estilo bits-ui) + clases solo de vocabulario | bits-ui data-attrs | propuesta recomendada (4+3) |

## Estado del grill

| Punto | Estado | Registro |
| --- | --- | --- |
| Modelo composición B+C ("C dentro de B") | confirmado dev | pendiente de volcar a shard 01 al cierre |
| bits-ui headless + pseudo-snippets como ley de estilo | confirmado dev | idem |
| shadcn: componentes deseados en versión no-opinionada para UPV | confirmado dev | idem |
| Estrategia de clases (4+3 + índice vs app.css web-lab) | propuesta, sin confirmar | pregunta en curso |
| Matriz faceta × scope | borrador, sin confirmar | pregunta siguiente |
| Payload `.scene` (CR-2) | pendiente | post-matriz |
| Queued batcher semantics | pendiente | post-matriz |
