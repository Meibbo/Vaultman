---
title: FTC-001 — Rail estático + settings enable + gate tabs
type: issue
status: open
parent: "[[docs/work/polish/issues/ftc-floating-toc/index|FTC index]]"
created: 2026-07-14T00:00:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish, floating-toc]
---

# FTC-001 — Rail estático (AFK)

## Goal

Rail vertical flotante dentro del frame del sidebar mostrando las primeras letras (glyph letter-mode) de los nodos L1 del tab explorer activo. SIN click/jump todavía.

## Scope

- `src/logic/logicIndexGroups.ts` (puro): deriva grupos desde `{id,label}[]` L1 — primera letra del **label** en mayúscula; no-alfanumérico → bucket `#`; orden localeCompare numérico; **render solo si >1 grupo** (contrato proto).
- Accessor `getTopLevelNodes(): {id,label}[]` en `explorerFiles`/`explorerProps`/ `explorerTags` (el array raíz de `_render`, hoy local — anchors shard §datos).
- `src/components/layout/FloatingToc.svelte`: montado en `.vaultman-pages-viewport` (patrón bottom-nav/island: wrapper `pointer-events:none`, botones `auto`, absolute, z-index ~12, right-edge, top bajo navbar / bottom sobre dock).
- Setting `floatingTocEnabled` (default `false`) + sección settings "Floating TOC" (heading tras Action presets) con ese toggle.
- Gate: solo tabs files/props/tags (content sin árbol); reactivo a cambio de tab y a re-render del panel (letters re-derivadas).
- CSS `.vaultman-floating-toc*` + reglas mobile bajo el selector `.is-phone .workspace-drawer …[data-type="vaultman-frame"]`.

## DoD (tool-checkable)

- [ ] Unit: `logicIndexGroups` (buckets, orden, `#`, umbral >1 grupo, labels unicode).
- [ ] Unit/component: accessor devuelve L1 exacto del último render por tab.
- [ ] Smoke plugin-dev: toggle ON → rail visible en files con letras correctas; cambio a props/tags recalcula; content lo oculta; toggle OFF lo desmonta.
- [ ] Clicks en la franja vacía siguen llegando al explorer (pointer-events).
- [ ] `emulateMobile` smoke: rail visible sin overflow del drawer.
- [ ] Gates comunes del index.

## No hacer

Jump (FTC-002) · items de view-menu (FTC-003) · efectos (FTC-005) · scope option.
