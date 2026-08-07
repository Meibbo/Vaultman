---
title: "PV13-001 — Prompt autocontenido del agente: toolchain + identidad"
type: agent-prompt
status: ready-for-agent
lifecycle: active
parent: "[[index|Proto v13 implementation plan]]"
issue: "[[../../../issues/pv13-wave-1/001-toolchain-identidad|PV13-001]]"
created_by: deepseek-v4-flash-free
updated_by: deepseek-v4-flash-free
dateCreated: 2026-08-07T00:00:00
dateUpdated: 2026-08-07T00:00:00
tags:
  - agent/prompt
  - initiative/proto-v13-obsidian-plugin
  - proto-v13
  - toolchain
---

# PV13-001 — Prompt autocontenido del agente

> Instrucción de uso del dev: pega a un agente: **"Lee y ejecuta exactamente el archivo:
> `C:\Users\vic_A\Desktop\vaultman\.agents\docs\work\proto-v13-obsidian-plugin\plans\2026-08-07-proto-v13-implementation\next-agent-prompt.md`"**.

Plan aprobado por el dev el 2026-08-07. Eres el primer agente de la wave; ejecuta SOLO el PV13-001 (toolchain). Nada de PV13-002+ en este commit.

## 0. Arranque obligatorio (AGENTS.md del repo)

1. **Identifícate:** agente + modelo + stream `vaultman` (goal/beta=dev) + `task_size: small`.
2. **Registra presencia** en el agent-room (deterministico, sin prompt): `node .agents/tools/pkm-ai/agent-room.ts agent join --run current --agent <tu-id>`; si reporta que no hay run activo, `... run start --agent <id>` y vuelve a unirte. Luego `agent heartbeat`. Si `npx tsx` fallara, usa `node` directamente (fallback validado). Si ambos fallan, anótalo en el session-log y sigue.
3. **Retrieval-first:** si necesitas más contexto del dominio, usa `query-docs.ts <topic>` (no grep del árbol por archivos). Este prompt ya contiene todo el contexto necesario; la retrieval es opcional.
4. **Mailbox:** lee tu correo del agent-room (el dev deja notas fuera de banda ahí). Trátalas como instrucciones.
5. **Memory:** no edites status/handoff/shared sin `scope claim`; tu memoria de trabajo es tu session shard del día.

## 1. Contexto que debes leer (paths absolutos)

Lee TODO esto antes de tocar archivos:

- **Etapas del plan (contexto compartido):** `C:\Users\vic_A\Desktop\vaultman\.agents\docs\work\proto-v13-obsidian-plugin\plans\2026-08-07-proto-v13-implementation\index.md` — incluye el **pase adversarial del 2026-08-07** que ya corrigió el plan.
- **Shard de referencia:** en la misma carpeta del plan — `01-setup-and-shell.md` (Tasks 1 y 3 son el scope de este issue) y `03-isolation-gates.md` (mira por encima; no lo ejecutas).
- **Issue:** `C:\Users\vic_A\Desktop\vaultman\.agents\docs\work\proto-v13-obsidian-plugin\issues\pv13-wave-1\001-toolchain-identidad.md`.
- Sub-skill requerido durante esta ejecución: `executing-plans` o `subagent-driven-development` (tracking por checkbox).

## 2. Scope — EXACTAMENTE esto

**Haces:**
- Instalar `react` + `react-dom@18.3.1` como dependencias de producción en `REFACTOR_DIR` (en adelante `REF`).
- Configurar `esbuild.config.mjs` (loader .jsx/.tsx) y `tsconfig.json` (jsx react-jsx, libs, include tsx) para que el bundle de `src/main.ts` compile.
- Renombrar identidad del plugin a `vaultman-prototype@0.1.0` (package.json, manifest.json, versions.json).

**NO haces:**
- NO tocas `styles.css` (PV13-002 extract+scope), `src/main.ts`/`src/settings.ts` (PV13-003) ni módulos `src/proto/` (PV13-004+).
- NO inicializas git en `REF` (no es repo; verificación = build).
- NO push/merge/tag. Si hay docs del plan que commitees, quedan en `vaultman` (rama AI) SOLO commit local.

## 3. Entorno real (verificado 2026-08-07)

- `REF = C:\Users\vic_A\Desktop\refactor` (scaffold `obsidian-sample-plugin`).
- PM: **npm** (AGENTS.md local del refactor exige npm). Hay `pnpm-lock.yaml` + `.npmrc` del scaffold: NO tocar; tu `npm install` creará `package-lock.json` (esperado, no lo borres).
- `package.json` actual: `name: obsidian-sample-plugin`, `version: 1.0.0`, scripts: `build = "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production"`, `devDependencies`: esbuild 0.25.5, @types/node, @eslint/js, eslint 9, eslint-plugin-obsidianmd, globals, jiti, obsidian (latest), typescript ^5.8.3, typescript-eslint.
- `esbuild.config.mjs`: sample estándar que necesita `loader` + `jsx`.
- `tsconfig.json`: sample con `strict: true` y `noUncheckedIndexedAccess`.
- React NO está instalado todavía. El primer build tras `npm install` debe seguir generando el sample sin errores de tipos (main.ts es JS/TS puro aún).

## 4. Tasks (del shard 01)

1. `npm install react@18.3.1 react-dom@18.3.1` → verifica que `package.json` gana `"dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1" }` (con el caret es esperado) y `package-lock.json` creado.
2. `package.json`: renombra `name: vaultman-prototype`, `version: 0.1.0`, descripción "Vaultman Prototype v13 running inside Obsidian (mock data)." — conserva `main/type/scripts/license/keywords` y TODAS las devDeps.
3. Reescribe `REF\manifest.json` completo:
```json
{
  "id": "vaultman-prototype",
  "name": "Vaultman Prototype",
  "version": "0.1.0",
  "minAppVersion": "1.0.0",
  "description": "Vaultman Prototype v13 — files/views explorer prototype running inside Obsidian.",
  "author": "Meibbo",
  "authorUrl": "https://github.com/Meibbo",
  "isDesktopOnly": false
}
```
4. Reescribe `REF\versions.json`:
```json
{ "0.1.0": "1.0.0" }
```
5. `esbuild.config.mjs`: en el objeto del contexto añade:
```js
loader: { '.jsx': 'jsx', '.tsx': 'tsx' },
jsx: 'automatic',
```
  (junto a entryPoints/bundle/external existentes). `react`/`react-dom` NO se listan en `external` (se bundlean).
6. `tsconfig.json`: añade (sin romper las options existentes):
```json
"jsx": "react-jsx",
"lib": ["ES2021", "DOM", "DOM.Iterable"],
"types": ["node"],
"moduleResolution": "node",
"allowSyntheticDefaultImports": true
```
  y en `include`: `["src/**/*.ts", "src/**/*.tsx"]`.

## 5. Sucesos intermedios

Después de cada paso que cambie el build (instalar deps, editar esbuild/tsconfig), correr `npm run build`. No dejes `REF` en estado inconsistente entre pasos: verifica en cuanto puedas, no al final.

## 6. Gates de salida (todos VERIFICADOS, no asumidos)

- [ ] `npm run build` → exit 0 y `main.js` generado en la raíz de REF.
- [ ] `npm run lint` → sin errores.
- [ ] `npm install` completó y `package-lock.json` existe.
- [ ] `manifest.json` + `versions.json` + sección name/version de package.json coherentes en `0.1.0`.
- [ ] `src/` sin cambios (el sample sigue intacto; solo build config e identity).

## 7. Report / cierre

- Reporta: archivos tocados (con resumen del diff), salida de `npm run build` y `npm run lint`, y la identidad final.
- No cierres el issue: queda `needs-triage` para el dev o el siguiente agente (PV13-002 te sigue).
- Añade una línea al session-log de la iniciativa (fecha+agente+estado) y libera el scope del agent-room al salir.

## Notas de contexto extra (de referencia, no de este scope)

- El bloque `<style>` del proto HTML mide 205.399 chars (PV13-002).
- `window.*` exports en data.jsx en líneas 328–331 y 589–591 (PV13-004).
- Los prototipos del refactor conservan `document.querySelector('.vm-tab-content')` en sidebar/pages y los drags window — todo eso es PV13-011, no ahora.