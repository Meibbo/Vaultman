---
title: Proto v13 → Obsidian plugin — spec de integración
type: spec-index
status: draft
initiative: proto-v13-obsidian-plugin
parent: docs/work/proto-v13-obsidian-plugin/index
created_by: deepseek-v4-opencode
dateCreated: 2026-08-07
tags:
  - spec
  - proto/v13
  - obsidian/plugin
---

# Proto v13 → plugin Obsidian (Desktop/refactor): especificación

Objetivo: portar el prototipo `Vaultman Prototype v13` (React 18, single-file HTML + 13 JSX global-scope) al plugin Obsidian ubicado en `C:\Users\vic_A\Desktop\refactor` (sample oficial TS/esbuild), de modo que el prototipo **funcione dentro del workspace de Obsidian** con paridad visual 1:1.

## Alcance (decisiones del dev, grill 2026-08-07)

1. **Datos**: mock del proto (`VAULT_TAGS`, `VAULT_PROPS`, `VAULT_FILES` en `data.jsx`). Sin lecturas del vault real. (Paridad visual ante todo; datos reales = issue futuro.)
2. **Stack**: **React 18 bundleado en `main.js`** vía esbuild (sin Babel-in-browser, sin CDN). Los 13 JSX global-scope se convierten a **módulos ES por archivo (opción B)**.
3. **Anclaje**: **ItemView en el área central del workspace** (ribbon + command palette para abrirlo). El proto renderiza su propio "desktop"; la leaf es el contenedor.
4. **Persistencia**: el estado del proto (theme, mode/accent, islands, sort, view, settings) se persiste en settings del plugin (`data.json`) y se hidrata al abrir.
5. **Identidad**: plugin `Vaultman` en manifest/package/ribbon (nombre visible), id de plugin `vaultman-prototype` para evitar colisión con el plugin `vaultman` real ya instalable.
6. **Rastro docs**: iniciativa nueva bajo `.agents/docs/work/proto-v13-obsidian-plugin/`.

## Detalle técnico del proto (fuente)

- Archivo: `C:\Users\vic_A\Downloads\Vaultman\Vaultman Prototype v13.html` (título real: "Vaultman v13 — Nautilus Grid").
- Carpeta de componentes: `C:\Users\vic_A\Downloads\Vaultman\proto-v13\`.
- React 18.3.1 UMD + `@babel/standalone` (script `type="text/babel"`, orden de carga: data → icons → control-island → popups → search-island → stack-island → views → explorer → pages → nautilus → sidebar → desktop → app).
- 1 bloque `<style>` único = **~205.400 bytes de CSS** (todo el tema: variables, themes, estructura). No hay CSS separado.
- Mount: `ReactDOM.createRoot(document.getElementById('root')).render(<AppV4 />)` en `app.jsx` (línea 189).
- Uso de DOM global: `document.body.dataset.theme` (app.jsx:124), `document.body.style.setProperty('--color-accent'…)` (app.jsx:128-129), `addEventListener('mousedown')`/`'keydown'` (control-island.jsx:76-80), `document.querySelectorAll(…)` solo local (dentro del contenedor `track`). Estos son los puntos de integración que hay que aislar del DOM global de Obsidian.

Sizes (líneas por componente): data 591 · icons 526 · control-island 783 · popups 349 · **stack-island 1703** · search-island 427 · views 578 · **explorer 1295** · pages 834 · nautilus 335 · sidebar 761 · desktop 253 · app 189.

## Arquitectura del port (opción B — módulos ES)

Los 13 JSX se convierten en módulos ES bajo `src/proto/`, resolviendo las referencias cruzadas que hoy viven en el scope global del HTML:

```
src/
  main.ts            # Plugin lifecycle: ItemView, ribbon, command, settings, persist
  settings.ts        # Settings + defaults + tipado (estado proto persistible)
  proto/
    index.tsx        # re-export tree del proto; exportación pública de <PrototypeApp/>
    App.tsx           # (antes app.jsx) AppV4 + mount helper aislado del DOM global
    data.ts          # VAULT_TAGS/PROPS/FILES + builders (antes data.jsx)
    icons.tsx        # (antes icons.jsx) banco de iconos + resolver de packs
    control-island.tsx
    popups.tsx         # (antes popups.jsx) popovers/menús contextuales
    search-island.tsx
    stack-island.tsx
    views.tsx          # (antes views.jsx) renderers por engine/mode (lineal/grid/matrix/canvas)
    explorer.tsx
    pages.tsx
    nautilus.tsx
    sidebar.tsx
    desktop.tsx
styles.css                # el bloque <style> del HTML movido tal cual (con perfil escala)
```

### Reglas de conversión por módulo

1. Mantener **contenido y orden lógico** 1:1; reescribir solo la sintaxis (JSX globalsin imports → ES module con imports/exports).
2. Cada componente React pasa a exportar su(s) símbolo(s). Los helpers y constantes globales (`vmSplitLeaf`, `vmNewPanelId`, `VAULT_*`, banco de iconos) se exportan del módulo que los define y se importan donde antes se usaban globalmente.
3. `import { useState, ... } from 'react'` donde se use. No usar más `React.` global.
4. Sustituir todo acceso a `document.body` por un contexto aislado: el componente recibe un elemento raíz. En `App`/`Icon`: el `data-theme`/accent se escribe en el **contenedor del view** (via prop) en vez de `document.body`. El `addEventListener` de control-island se re-registra sobre el contenedor / se limpia en el unmount (o `useEffect` cleanup).
5. `document.getElementById('root')` desaparece; `index.ts` expone un `mountView(container: HTMLElement)` que `createRoot(container)` y pinta `<AppV4/>`.
6. Punto de hidratación: `AppV4` acepta un prop inicial opcional (`initialState`) y un callback `onStateChange` (persistencia) — emisaria con los settings.

### esbuild

- Añadir a `src/proto/` como inputs (entry `src/proto/index.ts` secundario o re-export desde main). Con `bundle: true`, esbuild empaqueta `react` y `react-dom` (`react`/`react-dom` como deps reales del package.json, no externals).
- `dev` y `build` scripts sin cambios de interfaz; `npm run dev` watch y `npm run build`.
- React DOM: usar `react-dom` cliente (createRoot) — el entorno Obsidian es DOM completo.

### CSS

- Mover el bloque `<style>` del HTML a `styles.css` del plugin (archivo que Obsidian carga si existe junto a `main.js`).
- **Namespace-escaping**: el CSS usa `:root`, `html,body`, `body[data-theme=…]`, `[data-theme=…]`. Para no pelear con los estilos de Obsidian, todo el CSS realidad se escribe dentro de un scope — el contenedor visible `.vm-view` —, rewrote los selectores raíz: `:root`→`.vm-view{…}`, `html,body`→`.vm-view`, `body[data-theme]`→`.vm-view[data-theme]`. Alternativa pragmática para el primer corte: verificar si los selectores son inofensivos (variables puras en `:root`) y solo aislar los que afectan layout global (`html,body`, `body` background).
- En el corte inicial, validar que los Google Fonts (Inter / JetBrains Mono) no rompan fuera de red: `font-family` con fallback `system-ui`.

### ItemView Obsidian (src/main.ts)

- `class VaultPrototypeView extends ItemView`: `getViewType()='vault-prototype'`, `getDisplayText()='Vaultman Prototype'`, `getIcon()='vault'` (o lucide).
- `onload` del plugin: registrar command `open-vault-prototype` + ribbon icon; `registerView(VIEW_TYPE, …)`.
- `onOpen`: `const root=createRoot(this.contentEl); this.root.render(<PrototypeApp persisted={this.plugin.settings.protoState} />)`; montar el contenedor `.vm-view`.
- `onClose`: guardar estado → `plugin.saveProtoState(...)` (debounced) y `root.unmount()`.
- Settings tab: sección breve "Prototype" con opciones de persistencia (reset state, maybe theme override); el grueso del estado se serializa automáticamente.

## Modelo de persistencia

- `VaultmanSettings { version: 1, protoState: DeepPartial<PrototypeState> }`.
- `onChange` con debounce (~300ms) → `plugin.saveSettings()` (es `saveData` a `data.json`).
- Estado del proto = el objeto `state` de `AppV4` + `mode`/`theme`/`accent`/`customAccent`/`bothOpen`/`controlOpen`. Hidratación = `useState(() => mergeDefaults(defaults, persisted))`.
- Reset manual desde settings (nuevo campo).

## Verificación (gates)

- `npm run build` (esbuild + tsc) pasa sin errores; `npm run dev` limpio en watch.
- `npm run lint` (config existente de la plantilla) sin nuevos warnings.
- La app monta en un ItemView y **abre el mismo layout/comportamiento** que el HTML standalone (oráculo visual, compara contra el HTML en navegador).
- Interacciones clave smoked: FAB control (mode/theme/accent), tabs (stats/filters/tools), islands search/sort/queue, grid Nautilus en view, drawer, switch tabs del sidebar, drag resizer si existe.
- Persistencia real: cierra/reabre Obsidian → estado conservado.
- `dev:errors` Obsidian sin errores de consola del plugin.

## Riesgos y mitigaciones

1. **CSS colisión con Obsidian**: mitigado con prefix-scoping del contenedor `.vm-view`; supervisar el CSS real que toca `body`/`html`.
2. **Problemas de contexto global → props**: es el trabajo manual de "clean", riesgo de faltar referencias cruzadas → lo detecto en build/typecheck + revisión manual de imports entre módulos.
3. **Botón/documento global controles** (`addEventListener` de `document`) puede invadir el app global de Obsidian → siempre se registra sobre el contenedor y con cleanup.
4. **npm scripts/build**: la plantilla usa `npm`; asegurar `react`/`react-dom` se añaden a `dependencies` (no devDependencies) para que esbuild los incluya en el bundle.
5. **Fuentes**: el CSS declara `font-family: 'Inter'` + `'JetBrains Mono'` (Google Fonts); validar que se ven bien sin red y decidir si bundlear la fuente local.

## No-scope (fuera de esta iteración)

- Datos reales del vault (mock siempre por ahora).
- Port a Svelte 5.
- Temas de Obsidian (se usan los del proto exclusivamente).
- Mobile/touch (proto desktop-first); el anuncio mobile es un knob del proto que se conserva como display.
- Instalar/distribuir el plugin.

## Referencias

- Fuente: `Downloads/Vaultman/Vaultman Prototype v13.html` + `proto-v13/`.
- Plantilla: `Desktop/refactor/` (tsconfig, esbuild.config.mjs, AGENTS.md propios).