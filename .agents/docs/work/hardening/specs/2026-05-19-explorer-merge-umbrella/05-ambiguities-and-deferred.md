---
title: Ambiguities and Deferred — pending decisions + future-scope items
type: spec-shard
status: draft
parent: "[[index|umbrella]]"
created: 2026-05-19T00:00:00
updated: 2026-05-19T00:00:00
---

# Ambiguities and Deferred

Decisiones pendientes que NO bloquean esta umbrella ni v1.2.0 / v1.3.0, pero deben resolverse antes de su sub-system específico.

## 1. proto-list mode (TBD)

**Pregunta**: proto-v5 tiene un view mode `list` en ViewIslandV4 (sidebar, stack-island.jsx:825) y en ViewPopover (desktop, popups.jsx:53). Que NO corresponde a nuestro `ViewNodeList` (que mapea a proto `tiles`).

¿Qué es el proto `list`? ¿Un modo más compacto sin icons, solo nombre + meta inline (estilo text-only file list de file managers)? ¿O algo distinto?

**Estado**: el usuario indicó "aún no estoy seguro".

**Cuándo decidir**: durante spec de v1.5.0 (Nautilus rewrites). Si para entonces el usuario confirma que es valuable: agregar como 6to view mode. Si no: stays out-of-scope.

**Si se agrega**: probably como compact-list variant del NodeRow primitive (sin icon, sin multi-meta, solo nombre + 1 meta línea). Low LoC, low risk.

## 2. viewGrid dual-mode (icons full + rich rows-only)

**Pregunta**: usuario dijo "viewGrid sin columnas (rows only) = hidrato viewList + tiles".
Esto sugiere que viewGrid tiene DOS modos visuales internos:
- **Modo icons-full**: grid auto-fill con Adwaita SVG icons (proto Nautilus icons)
- **Modo rows-only**: filas ricas (similar a tiles + extras)

¿Cómo se implementa?
- **Opción A**: una sola view (`ViewNodeGrid`) con prop `layout: 'icons' | 'rows'` toggle interno
- **Opción B**: dos views separados (`ViewNodeGrid` icons + nuevo `ViewNodeGridRows`)
- **Opción C**: ViewNodeGrid solo icons, modo rows-only pasa a ser parte de viewList expandido

**Estado**: pendiente decidir en spec de v1.5.0.

**Default recomendado**: Opción A (toggle interno) — keeps view mode taxonomy a 5, no duplica shells, expone choice como UI option dentro del view.

## 3. dashboard3 redefinition (detalle)

**Pregunta**: el módulo `dashboard3` actualmente idle. Redefinido en esta umbrella como "hidratación del módulo send-tabs-to-Obsidian-tabs" + "control de qué tab muestra qué bars".

Pero: ¿qué exactamente significa "hidratación"? ¿Es:
- Una abstracción encima del existing tab-mount module?
- Una settings UI que controla cómo se montan los tabs?
- Un mecanismo de drag-tabs-out-to-Obsidian-tabs?

**Estado**: pendiente clarificar en spec de v1.6.0 (sub-system 5).

**Posibles scopes**:
- (a) dashboard3 = settings panel donde user configura per-tab qué bars muestra (toolbar/bottom/top)
  + cómo se ordena en main-leaf vs sidebar
- (b) dashboard3 = orchestrator que toma el tab-mount module y agrega controls superiores (drag-tab-out, multi-tab, per-tab bar visibility)
- (c) dashboard3 = un primer-class panel que aparece cuando dashboard-enabled (`width ≥ 800 + main-leaf`) y muestra multi-tab grid layout

**Recomendación**: (a) primero (settings + per-tab bar control). (b) y (c) en sub-systems futuros si demand emerges.

## 4. IndexOverlay (formerly AZIndexOverlay)

**Pregunta**: proto's `AZIndexOverlay` (jump-to-letter overlay) renamed a `IndexOverlay` porque "tendrá más cosas que solo el orden az". ¿Qué otras cosas?

**Estado**: deferred a future, post-v1.6.0.

**Posibles features**:
- Jump-to-letter (existing AZ behavior)
- Jump-to-tag
- Jump-to-folder
- Jump-to-date
- Jump-to-modified-range
- Search-as-you-type filter
- Recent files quick jump

**Cuándo decidir**: cuando se proponga su sub-system. Probably v1.6.0 follow-up o v1.7.0.

## 5. viewOutlineExplorer (77 LoC, out-of-band)

**Estado**: NOT in scope de esta umbrella. Preserve sin cambios.

`viewOutlineExplorer.svelte` (77 LoC) es non-virtualized recursive snippet renderer para `AdoptedNode`. Emite `tree-item*` classes cuando `useNativeDom`. Fuera del `EXPLORER_PLATFORM_VIEW_MODES` (las 5 platform views).

**Por qué deferred**: tiene su propia lógica (recursive snippet vs virtualized), su propio target use case (outline view de adopted nodes), y no participa del refactor god-objects.
Permanece igual.

**Si necesita cambios**: spec separado, futuro.

## 6. ViewMarkmap (deferred, no selectable)

**Estado**: preserve hidden. Map / ViewNodeMap deferred per 0-A locked non-goals.

Per 0-A spec: `EXPLORER_PLATFORM_VIEW_MODES = ['tree','list','table','grid','cards']` — no markmap.

ViewMarkmap.svelte existe pero no es selectable. Esta umbrella respeta esa decisión.

## 7. serviceQueue refactor (1043 LoC god-object)

**Estado**: DEFERRED post-v1.8.0. User dijo "lo vemos en otro momento" durante el brainstorm.

`serviceQueue.svelte.ts` (1043 LoC) es otro god-object. Su refactor NO está en esta umbrella.
Cuando se aborde: probably su propio sub-system con paralelo a Q.D (Queue data-model 2).

Provisional placement: post-v1.8 (después de NN interop). Could merge con sub-system 2 (Queue data-model restructure existing 🟠) si scope overlap.

## 8. Sub-systems 1 + 3 (retained in human)

**Estado**: per roadmap "What NOT to delegate":
- **Sub-system 1 (Unified input)**: cross-cutting muy grande, mejor cuando Phase 0 esté firme
- **Sub-system 3 (in-editor diff)**: UX direction no decidida, depende de visión accept-changes

Esta umbrella respeta su retained-in-human status. A.R cubre el subset row-action (caret + kbd + selection + expand-all + cmenu) que es relevante para v1.2.0 visibility fixes. Pero NO cubre el cross-cutting "input configuration" completo que sub-system 1 representa.

K.B (workspace keyboard + hotkeys/macros provider) en v1.4.0 puede ser interpretado como partial delivery de sub-system 1's scope — confirm con user antes de la spec de K.B.

## 9. proto Desktop mode

**Estado**: NOT applicable a producción. Plugin no tiene desktop-mode/sidebar-mode split — frame único responsive vía `serviceLayout.resolveDashboardEnabled(width≥800 + main-leaf + mode≠thin)`.

Esto significa que muchos componentes proto que viven en `desktop.jsx` (DesktopV2 with ribbon bar, big-picture full-screen, etc.) NO se adoptan directamente. Sus features útiles individuales (ribbon bar mapping a existing tab containers, props side column, etc.) se mapean a sub-systems específicos.

## 10. Cross-plugin direction A (Vaultman renderer ← NN data)

**Estado**: DEFERRED. NN doesn't expose renderer override hooks (per research subagent).

Upstream blocker: NN api-reference.md explícitamente "cannot override the renderer or inject content providers".

**Cuándo retomar**:
- NN expone content-provider hook (open wiki backlog item)
- O Vaultman acepta polling `api.selection.getCurrent()` como data link (mid-quality)

Hasta entonces: solo I.E direction B (Vaultman providers → NN explorer) en v1.8.0.

## 11. Inline `key:: value` properties (Dataview territory)

**Estado**: out of scope. Bases doesn't query inline. Vaultman could differentiate vía custom provider, pero NO en esta umbrella.

Posible futuro: provider `serviceInlinePropertyScanner` que extract `key:: value` desde markdown content y expose como pseudo-frontmatter. Offer to NN/Bases as cross-plugin data source via `vaultman.v1` API.

## 12. Bases formula language hosting

**Estado**: B.P (v2.0.0) hosts Bases formula vía `registerBasesView()`. Vaultman NO builds own formula DSL. Riesgo: Bases formula API changes podrian romper Vaultman.

Mitigation: pin Bases version min compatible en manifest.json. Document que formula evaluation delegated a Bases.

## 13. Migration shim para B.P breaking property IDs

**Pregunta**: cuando v2.0.0 cambia `prop:area → prop.note.area` (breaking), ¿cómo migrate user-saved bases/filters?

**Estado**: spec en B.P (v2.0.0). Posibles enfoques:
- Auto-migration en plugin load: detect legacy `prop:X` strings, rewrite to `prop.note.X`
- Manual migration: settings button + warning
- Hybrid: auto-detect + prompt user antes de modificar

**Recomendación**: hybrid — log detected legacy IDs, prompt user, migrate on confirm. Reversible.
