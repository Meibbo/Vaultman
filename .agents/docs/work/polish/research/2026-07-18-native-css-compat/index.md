---
title: BT3-010 — Compat snippet fancyfile-explorer-rainbow (research)
type: research
status: complete
parent: "[[docs/work/polish/index|polish]]"
created: 2026-07-18T00:00:00
created_by: claude-fable-5
tags: [agent/research, initiative/polish]
---

# BT3-010 — Native CSS compat: `fancyfile-explorer-rainbow`

Research read-only (Explore agent + verificación): snippet real del vault (`C:\Users\vic_A\My Drive\Start of The Road\.obsidian\snippets\fancyfile-explorer-rainbow.css`, = comunidad "FAS – File Explorer Rainbow"), app.css nativo (web-lab), source del worktree beta.3 y DOM vivo de plugin-dev (obsidian-cli eval, read-only).

## A. Qué exige el snippet (inventario)

- Paletas `--color-rainbow-1..10` en `.theme-light/.theme-dark` (L10-74) + knobs `--rainbow-brightness/saturation` (L5-8) + master `--fas-rainbow-folders` en un `@container style()` (L76-80).
- Coloreado 100% ESTRUCTURAL/posicional: `nth-child(10n+N)` sobre `.nav-folder-children > .nav-folder` y `.nav-files-container > div > .nav-folder` (L81-130); herencia wrapper→title (`--folder-color`, L131-134); aplicación via `--nav-item-color` + hover `color-mix` + filter en `.nav-folder-title` (L135-140).
- Contrato DOM: contenedor `.nav-files-container` → `.nav-folder` ANIDADOS con `.nav-folder-children` y posición de hermanos estable. Solo folders.

## B. Delta contra el DOM de Vaultman

Vaultman files = lista PLANA virtualizada: `.vaultman-tree-virtual-viewport` → spacer → content → `.vaultman-tree-row` hermanos absolutos (viewTree.ts:256-340).
Las filas SÍ llevan clases hoja nativas (`tree-item-self`, `nav-folder-title`/ `nav-file-title`, `data-path` — logicsFiles.ts:88,151,217; confirmado vivo), pero:
- SIN `.nav-files-container` (quitado a propósito, BT4-… BT3-001: padding nativo app.css:14704) · SIN `.nav-folder`/`.nav-folder-children` · SIN anidamiento (depth = `--depth` inline, viewTree.ts:572).
- `nth-child` roto por virtualización (ventana parcial + files/folders intercalados) → **cero reglas del snippet matchean hoy: 100% inerte**.
- Conflicto color: `.vaultman-tree-row { color: var(--text-muted) }` (styles.css:5328) pisa `--nav-item-color`.

## C. Opciones evaluadas

- **(a) Adoptar clases estructurales nativas + anidar DOM**: RECHAZADA — exige des-virtualizar (perf) y re-importa el padding de `.nav-files-container` (la regresión BT3-001). `nth-child` seguiría roto con ventana parcial.
- **(b) Capa alias CSS**: parcial — CSS solo no puede derivar el bucket posicional desde lista plana virtualizada; el plugin debe computar el bucket.
- **(c) ELEGIDA — "Rainbow folders (snippet-compatible)" opt-in files-only sobre (b)**:
  1. Al construir el árbol, cada fila recibe su bucket = índice del ANCESTRO top-level mod 10 → `--folder-color: var(--color-rainbow-N)` inline (junto a `--depth`) — data-derived, inmune a virtualización.
  2. Clase gate en el viewport (patrón `vaultman-tree-nested-guides`, viewTree.ts:102-105).
  3. Regla scoped: `.vaultman-rainbow-folders .vaultman-tree-row.nav-folder-title { color: var(--folder-color) }` (especificidad 0,2,0 > base 5328) + variantes hover/active/selected + `--nav-item-background-hover: color-mix(...)`.
  4. Paleta: consume las globals del snippet si está activo (`--color-rainbow-*`, knobs incluidos) con fallback builtin → el usuario conserva SUS colores.
  5. JAMÁS re-añadir `.nav-files-container`; si algún día se adopta clase de contenedor nativo → `padding: 0` obligatorio.
- **(d) Fidelidad literal del snippet sin modificar**: RECHAZADA (acoplado a DOM anidado no-virtualizado).

## D. Config propuesta + no-cubre

```ts
explorerRainbowFolders: {
  enabled: boolean;            // default false
  scope: 'files';              // tree view del files explorer solamente
  palette: 'snippet' | 'builtin';
  cycle: number;               // default 10 (= snippet)
}
```

NO cubre: selectores propios del snippet ejecutando (semántica nth-child → bucket data-derived; difiere con sorts que intercalan) · bookmarks · coloreado de files (snippet = folders only) · vistas table/grid/cards/flat · árboles rebasados (bucket cae al índice del root visible).

**Estado:** research completo; implementación = issue nuevo cuando el dev apruebe el mecanismo (c) + config shape.
