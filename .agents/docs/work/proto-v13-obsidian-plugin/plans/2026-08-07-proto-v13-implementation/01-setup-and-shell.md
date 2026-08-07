# Shard 01 — Setup, CSS, ItemView shell y persistencia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Contexto previo: leer `index.md` de este plan (grafo de exports, orden de carga, convenciones).

---

### Task 1: Bootstrap — deps React y nombres de identidad

**Files:**
- Modify: `REFACTOR_DIR/package.json`
- Modify: `REFACTOR_DIR/manifest.json`
- Modify: `REFACTOR_DIR/versions.json`

- [ ] **Step 1: Instalar react/react-dom como dependencies de producción**

Run (en `REFACTOR_DIR`):
```bash
npm install react@18.3.1 react-dom@18.3.1
```
Expected: `package.json` gana `"dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1" }` y `package-lock.json` se actualiza. `npm install` no falla.

- [ ] **Step 2: Renombrar identidad en package.json**

En `REFACTOR_DIR/package.json`, cambiar:
```json
"name": "vaultman-prototype",
"version": "0.1.0",
"description": "Vaultman Prototype v13 running inside Obsidian (mock data).",
```
(mantener `main`, `type`, `scripts`, `license`, `keywords`; devDependencies y dependencies intactos).

- [ ] **Step 3: Renombrar identidad en manifest.json**

Reescribir `REFACTOR_DIR/manifest.json` completo:
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

- [ ] **Step 4: Sincronizar versions.json**

Reescribir `REFACTOR_DIR/versions.json`:
```json
{
	"0.1.0": "1.0.0"
}
```

- [ ] **Step 5: Commit (docs del plan, en vaultman) — N/A en refactor**

`REFACTOR_DIR` no es repo git: NO commitear. Anotar en session-log de la iniciativa que la identidad quedó `vaultman-prototype@0.1.0`.

---

### Task 2: Extraer el CSS del proto a styles.css con scoping `.vm-view`

**Files:**
- Create: `REFACTOR_DIR/styles.css` (desde `PROTO_HTML`)
- Modify: (ninguno; se valida visualmente luego)

- [ ] **Step 1: Extraer el bloque `<style>`**

Run (PowerShell, en cualquier dir):
```powershell
$html = Get-Content -LiteralPath 'C:\Users\vic_A\Downloads\Vaultman\Vaultman Prototype v13.html' -Raw
$m = [regex]::Match($html, '<style>(.*?)</style>', 'Singleline')
$m.Groups[1].Value | Set-Content -LiteralPath 'C:\Users\vic_A\Desktop\refactor\styles.css' -Encoding UTF8
```
Expected: `styles.css` creado, ~205 KB (verificar con `(Get-Item ...).Length`).

- [ ] **Step 2: Rewrite de selectores raíz (scope `.vm-view`)**

En `REFACTOR_DIR/styles.css`, aplicar sustituciones textuales EXACTAS (en orden):
1. `:root {` → `.vm-view {` (SOLO la primera aparición — la definición de variables; no tocar otras `:root` si las hay: verificar con grep `Select-String ':root'` y reemplazar TODAS las apariciones de `:root` por `.vm-view`).
2. `html, body {` → `.vm-view {` (el bloque de reset del layout: `box-sizing`, `height`, `font`, `overflow`).
3. `body[data-theme="light"] {` → `.vm-view[data-theme="light"] {`
4. `body[data-theme="catppuccin-dark"] {` → `.vm-view[data-theme="catppuccin-dark"] {` (y así para cada `body[data-theme=…]`: catppuccin-light, gruvbox-dark, gruvbox-light, dracula, nord).
5. `body[data-theme="light"] { background: …` → `background:` dentro del mismo selector scoped.
6. Cualquier `body` a secas restante → `.vm-view` (grep `Select-String -Pattern '\bbody\b'` y revisar cada caso: los `body` sueltos eran background de tema — los scoped de arriba ya los cubren; si queda algún `body` global, reemplazarlo).

Verificación textual: grep final `Select-String 'html' styles.css` → 0 resultados; `Select-String ':root' styles.css` → 0 resultados; `Select-String 'body' styles.css` → solo dentro de `data-theme` (que ya están scoped) y de `body`→0.

- [ ] **Step 3: Añadir el contenedor raíz visible**

Append al final de `REFACTOR_DIR/styles.css`:
```css
.vm-view {
	position: relative;
	height: 100%;
	overflow: hidden;
	font-family: 'Inter', system-ui, sans-serif;
	font-size: 14px;
}
.vm-view .vm-monitor-frame { z-index: 1; }
```
(Nota: el proto usa `body { height:100%; overflow:hidden }`; dentro de Obsidian el contenedor es el `contentEl` del ItemView, que ya tiene tamaño; `.vm-view` hereda `height:100%` del parent.)

- [ ] **Step 4: Verificar que el CSS carga**

Run: `npm run build` en `REFACTOR_DIR` → exit 0. (styles.css es estático, Obsidian lo carga si está junto a main.js; build no lo procesa.) Confirmar que `styles.css` quedó en la raíz de `REFACTOR_DIR` (no en src/).

---

### Task 3: esbuild — loader JSX/TSX y entrada React

**Files:**
- Modify: `REFACTOR_DIR/esbuild.config.mjs`
- Modify: `REFACTOR_DIR/tsconfig.json`

- [ ] **Step 1: Configurar esbuild para tsx/jsx**

En `REFACTOR_DIR/esbuild.config.mjs`, en el objeto de contexto, añadir:
```js
	loader: { '.jsx': 'jsx', '.tsx': 'tsx' },
	jsx: 'automatic',
```
(junto a `entryPoints: ['src/main.ts']`, `bundle: true`, `external: [...]` existentes). `react`/`react-dom` NO se listan en `external` → se bundlean.

- [ ] **Step 2: tsconfig — incluir tsx y JSX**

Modificar `REFACTOR_DIR/tsconfig.json`:
```json
	"compilerOptions": {
		"jsx": "react-jsx",
		"lib": ["ES2021", "DOM", "DOM.Iterable"],
		"types": ["node"],
		"moduleResolution": "node",
		"allowSyntheticDefaultImports": true
	},
	"include": ["src/**/*.ts", "src/**/*.tsx"]
```
(Mantener el resto de options existentes; añadir solo lo listado.)

- [ ] **Step 3: Verificar build base**

Run: `npm run build` → tsc pasa (main.ts sample aún sin tocar) y esbuild genera `main.js`. Expected: exit 0. Si tsc da error por `React` no importado (aún no hay código React en src), es que algún archivo tsx existe sin import — no aplica todavía.

---

### Task 4: ItemView shell + registro del plugin

**Files:**
- Rewrite: `REFACTOR_DIR/src/main.ts`
- Modify: `REFACTOR_DIR/src/settings.ts` (expandir)

- [ ] **Step 1: Escribir settings.ts completo**

Reescribir `REFACTOR_DIR/src/settings.ts`:
```ts
import { App, PluginSettingTab, Setting } from 'obsidian';

export const VIEW_TYPE_VAULTMAN = 'vaultman-prototype-view';

export interface VaultmanSettings {
	version: number;
	protoState: Record<string, unknown> | null;
}

export const DEFAULT_SETTINGS: VaultmanSettings = {
	version: 1,
	protoState: null,
};

export class VaultmanSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: {
		settings: VaultmanSettings;
		resetProtoState: () => Promise<void>;
	}) {
		super(app, plugin as unknown as { settings: VaultmanSettings });
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Vaultman Prototype' });

		new Setting(containerEl)
			.setName('Reset prototype state')
			.setDesc('Discards the saved prototype state and restores defaults on next open.')
			.addButton((btn) => btn
				.setButtonText('Reset')
				.onClick(async () => {
					await this.plugin.resetProtoState();
					this.display();
				}));
	}
}
```
> NOTA del plan: `PluginSettingTab` espera `{ settings }`; el wrapper `plugin as unknown as ...` es un shim para que tsc pase; si molesta a eslint, cambiar el constructor a `(app: App, plugin: VaultmanPlugin)` tipando `VaultmanPlugin` con `settings` y `resetProtoState` (export del tipo desde main.ts). Elegir la opción que tsc acepte sin `any`.

- [ ] **Step 2: Escribir main.ts completo**

Reescribir `REFACTOR_DIR/src/main.ts`:
```ts
import { ItemView, Notice, Plugin, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, VaultmanSettings, VaultmanSettingTab, VIEW_TYPE_VAULTMAN } from './settings';

export default class VaultmanPrototypePlugin extends Plugin {
	settings: VaultmanSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_VAULTMAN,
			(leaf: WorkspaceLeaf) => new VaultmanPrototypeView(leaf, this),
		);

		this.addRibbonIcon('vault', 'Open Vaultman Prototype', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open-vaultman-prototype',
			name: 'Open Vaultman Prototype',
			checkCallback: (checking: boolean) => {
				if (checking) return true;
				void this.activateView();
				return true;
			},
		});

		this.addSettingTab(new VaultmanSettingTab(this.app, {
			settings: this.settings,
			resetProtoState: async () => {
				this.settings.protoState = null;
				await this.saveSettings();
			},
		}));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_VAULTMAN);
	}

	async activateView() {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_VAULTMAN)[0];
		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			if (!leaf) {
				new Notice('Could not open Vaultman Prototype (no leaf available).');
				return;
			}
			await leaf.setViewState({ type: VIEW_TYPE_VAULTMAN, active: true });
		}
		workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<VaultmanSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

export class VaultmanPrototypeView extends ItemView {
	private root: import('react-dom/client').Root | null = null;

	constructor(leaf: WorkspaceLeaf, private readonly plugin: VaultmanPrototypePlugin) {
		super(leaf);
	}

	getViewType(): string { return VIEW_TYPE_VAULTMAN; }
	getDisplayText(): string { return 'Vaultman Prototype'; }
	getIcon(): string { return 'vault'; }

	async onOpen() {
		const container = this.contentEl;
		container.addClass('vm-view');

		// TODO(Task 8 del shard 02): montar <PrototypeApp> aquí vía src/proto/index.tsx
		// import { mountPrototype } from './proto';
		// const { unmount } = mountPrototype(container, {
		//   initialState: this.plugin.settings.protoState as ... | undefined,
		//   onStateChange: (s) => { this.plugin.settings.protoState = s; void this.plugin.saveSettings(); },
		// });
		// this.unmount = unmount;
	}

	async onClose() {
		if (this.root) { this.root.unmount(); this.root = null; }
		this.contentEl.empty();
	}
}
```
> NOTA: `getRightLeaf(false)` — si la API de `obsidian` instalada (latest) lo deprecó, usar `workspace.getLeaf(false)` en su lugar; verificar contra `node_modules/obsidian/obsidian.d.ts` en tiempo de implementación y usar lo que compile. El TODO se resuelve en el shard 02 (Task 8); el build debe seguir pasando con el TODO (comentario no rompe tsc).

- [ ] **Step 3: Verificar build**

Run: `npm run build` → tsc + esbuild exit 0. `npm run lint` → sin errores nuevos.

- [ ] **Step 4: Smoke en Obsidian (si está disponible)**

Con Obsidian abierto (vault de pruebas con el plugin en `.obsidian/plugins/vaultman-prototype/`, `main.js`+`manifest.json`+`styles.css` copiados), recargar y ejecutar el command "Open Vaultman Prototype". Expected: se abre un leaf vacío con class `vm-view` (sin contenido aún) y sin errores de consola. Si Obsidian no está disponible en esta sesión, marcar como pendiente manual del dev (política: testing visual delistado para agentes).

---

### Task 5: Persistencia — debounce y contrato de estado

**Files:**
- Modify: `REFACTOR_DIR/src/settings.ts` (tipos de estado del proto)

- [ ] **Step 1: Definir el tipo `ProtoSnapshot`**

Añadir a `REFACTOR_DIR/src/settings.ts` (después de `DEFAULT_SETTINGS`):
```ts
/**
 * Snapshot serializable del estado del prototipo.
 * Estructura espejo del objeto `state` de AppV4 + controles de nivel superior
 * (mode, theme, accent, customAccent, bothOpen, controlOpen).
 * Los valores se tipan de forma laxa (unknown) porque el port del proto es JS→TS;
 * el merge con defaults se hace en src/proto/state.ts (shard 02).
 */
export interface ProtoSnapshot {
	mode: string;
	theme: string;
	accent: string;
	customAccent: string;
	bothOpen: boolean;
	controlOpen: boolean;
	page: string;
	pageOrder: string[];
	filterTab: string;
	toolsTab: string;
	openIsland: string | null;
	topIsland: string | null;
	bottomIsland: string | null;
	focusedIsland: 'top' | 'bottom';
	azOpen: boolean;
	openSettings: boolean;
	drawerOpen: boolean;
	filterStack: unknown;
	queueStack: unknown;
	filterTabOrder: string[];
	sort: unknown;
	view: unknown;
	settings: unknown;
}
```
> NOTA: esta interfaz es la referencia; el `AppV4` original inicializa `state` con defaults literales (app.jsx líneas 22–92). En el shard 02 (Task 6) se extraen esos defaults a `src/proto/state.ts` y se adapta `ProtoSnapshot` para casar con ellos (los campos `unknown` pueden tiparse después si conviene; NO bloquear el port por tipado estricto del estado).

- [ ] **Step 2: Ajustar `VaultmanSettings`**

Cambiar en `settings.ts`:
```ts
export interface VaultmanSettings {
	version: number;
	protoState: ProtoSnapshot | null;
}
```
(importar/declarar `ProtoSnapshot` en el mismo archivo; `DEFAULT_SETTINGS` queda igual.)

- [ ] **Step 3: Verificar build + lint**

Run: `npm run build` && `npm run lint` → ambos exit 0.

- [ ] **Step 4: Actualizar índice de la iniciativa**

En `.agents/docs/work/proto-v13-obsidian-plugin/plans/2026-08-07-proto-v13-implementation/index.md` marcar shard 01 completado cuando las Tasks 1–5 pasen sus gates.
