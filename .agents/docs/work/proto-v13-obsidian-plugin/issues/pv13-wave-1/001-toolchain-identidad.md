---
title: "PV13-001 — Toolchain + identidad del plugin (react deps, loader tsx, tsconfig, rename)"
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
tags: [agent/issue, triage/needs-triage, initiative/proto-v13-obsidian-plugin, toolchain, react, esbuild]
---

# PV13-001 — Toolchain + identidad del plugin

## What to build

Habilitar React 18 + JSX/TSX en el scaffold de Obsidian en `C:\Users\vic_A\Desktop\refactor` (REFACTOR_DIR). El repo es `obsidian-sample-plugin` con npm; instalación de react/react-dom como dependencias de producción, namespacing de identidad del plugin (`vaultman-prototype@0.1.0`), y configuración de esbuild + tsconfig para compilar `.tsx`/`.jsx`.

## Acceptance criteria

- [ ] `npm install react@18.3.1 react-dom@18.3.1` → `package.json` gana `dependencies` con `react`/`react-dom`; `package-lock.json` se crea (el `pnpm-lock.yaml` del scaffold se deja intacto; no es fuente de verdad).
- [ ] `package.json` identidad renombrada: `"name": "vaultman-prototype"`, `"version": "0.1.0"`, descripción "Vaultman Prototype v13 running inside Obsidian (mock data)." — scripts/devDependencies intactos.
- [ ] `manifest.json` reescrito: `id: vaultman-prototype`, `version: 0.1.0`, `minAppVersion: 1.0.0`, `author: Meibbo`, `isDesktopOnly: false`.
- [ ] `versions.json` → `{ "0.1.0": "1.0.0" }`.
- [ ] `esbuild.config.mjs` gana `loader: { '.jsx': 'jsx', '.tsx': 'tsx' }` y `jsx: 'automatic'`; `react`/`react-dom` NO en `external` (se bundlean).
- [ ] `tsconfig.json`: `jsx: react-jsx`, `lib: [ES2021, DOM, DOM.Iterable]`, `types: [node]`, `moduleResolution: node`, `allowSyntheticDefaultImports: true`, `include: ["src/**/*.ts", "src/**/*.tsx"]` (opciones existentes se mantienen).
- [ ] `npm run build` → exit 0 con `main.js` generado.

## Blocked by

None - can start immediately.