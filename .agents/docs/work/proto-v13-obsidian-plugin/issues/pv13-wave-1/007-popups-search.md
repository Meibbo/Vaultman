---
title: "PV13-007 — popups.tsx, search-island.tsx"
type: issue
status: done
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/proto-v13-obsidian-plugin/issues/pv13-wave-1/index|PV13 wave 1]]"
dateCreated: 2026-08-07T00:00:00
dateUpdated: 2026-08-08T00:00:00
updated_by: opencode-m2
created_by: deepseek-v4-flash-free
tags: [agent/issue, initiative/proto-v13-obsidian-plugin, modules, popups, search]
---

# PV13-007 — `popups.tsx`, `search-island.tsx`

## What to build

Portar `popups.jsx` (popovers, IconPicker) y `search-island.jsx` (buscador y dispatch de `vm-search-submit`/`vm-queue-replace`) al árbol `src/proto/`.

## Done — ambos módulos portados y gate verde + smoke del dev

`popups.tsx` y `search-island.tsx` creados en `src/proto/`. Build exit 0; lint 0 errores / 20 warnings (categorías aceptadas de paridad). Sync a vault dev ok. Smoke del dev en Obsidian aprobado (2026-08-08): popovers/buscador funcionales.

## Acceptance criteria

- [x] `popups.tsx`: exports `SortPopover`, `ViewPopover`, `QueueIsland`, `FiltersIsland`, `ContextMenu`, `IconPickerIsland` (+ aliases `*V2` para los 5, `SortPopoverV2` etc., que son los que consumidores desktop/sidebar usan); `window.normalizeIconOverride` (278) → `import { normalizeIconOverride } from './icons'`; `window.__vmIconOverrides` (280-287) → `protoState.iconOverrides` (events.ts); los dispatch `window.dispatchEvent(new CustomEvent('vm-icon-override'…))` (282/287) → `protoBus.emit('vm-icon-override', { nodeId, val })`.
- [x] `search-island.tsx`: exports `SearchIsland`, `PATTERN_TOKENS` (hoisted del body del componente a módulo); `window.dispatchEvent(new CustomEvent('vm-search-submit'…))` (186) y `vm-queue-replace` (265/275/284) y `vm-add-columns` (371) → `protoBus.emit`; `React.useState/useRef/useEffect` → named imports `useState/useRef/useEffect/useMemo`; `VAULT_TAGS/VAULT_PROPS/VAULT_FILES` → import desde `./data`; `Icon` → `./icons`. El listener global `window.addEventListener('keydown', h)` Escape (64) se conserva con su cleanup `return () => window.removeEventListener('keydown', h)` (aislamiento final en PV13-011).
- [x] Warnings ESLint: `autoGrow` fija `el.style.height` dinámico (no static) — añadido `'obsidianmd/no-static-styles-assignment': 'off'` al override `src/proto/**` de `eslint.config.mts` (NO se usó `react/prop-types` — regla inexistente sin plugin react, mismo criterio que PV13-004).
- [x] Tras cada módulo: `npm run build` verde. Cierre: build exit 0 + lint exit 0.

## Verification log

- `npm run build` → tsc + esbuild + `scripts/sync-test-build.mjs` → Synced ok.
- `npm run lint` → `✖ 20 problems (0 errors, 20 warnings)`; `--fix` no aplicado (paridad 1:1).
- Smoke dev 2026-08-08: OK (popups/buscador operativos en Obsidian).

## Notes

- `PATTERN_TOKENS` se movió de dentro del componente a scope módulo (hoist) para poder exportarlo — los datos son invariantes por render, sin cambio de comportamiento. Se recuerda que `PATTERN_TOKENS` no tiene typing (paridad).
- No quedan `window.__vmIconOverrides`, `window.normalizeIconOverride` ni `window.dispatchEvent('vm-icon-override')` en popups; sí quedan lecturas de `window.innerWidth/innerHeight` en ContextMenu (layout menu) y el listener Escape de search — documentado para PV13-011.

## Blocked by

- PV13-006 (views/stack disponibles para vmGetSizes).