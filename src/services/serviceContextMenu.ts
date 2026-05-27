// src/services/ContextMenuService.ts
import { Component, Menu, TFile, Notice, App, MenuItem } from 'obsidian';
import type { ActionDef, MenuCtx, MenuHideRule } from '../types/typeCMenu';

export interface ContextMenuPluginCtx extends Component {
	app: App;
	settings: {
		contextMenuShowInMoreOptions: boolean;
		contextMenuShowInFileMenu: boolean;
		contextMenuShowInEditorMenu: boolean;
		contextMenuHideRules: MenuHideRule[];
	};
}

export class ContextMenuService extends Component {
	private plugin: ContextMenuPluginCtx;
	private _registry: ActionDef[] = [];

	constructor(plugin: ContextMenuPluginCtx) {
		super();
		this.plugin = plugin;
	}

	onload(): void {
		this.registerEvent(
			this.plugin.app.workspace.on('file-menu', (menu, file, source) => {
				if (!(file instanceof TFile)) return;
				const surface: MenuCtx['surface'] =
					source === 'more-options' ? 'more-options' : 'file-menu';
				const settingKey =
					surface === 'more-options'
						? 'contextMenuShowInMoreOptions'
						: 'contextMenuShowInFileMenu';
				if (!this.plugin.settings[settingKey]) {
					this._applyHideRules(menu, surface);
					return;
				}
				if (file instanceof TFile) {
					this._injectWorkspaceActions(menu, file, surface);
				}
				this._applyHideRules(menu, surface);
			}),
		);

		this.registerEvent(
			this.plugin.app.workspace.on('editor-menu', (menu) => {
				if (!this.plugin.settings.contextMenuShowInEditorMenu) {
					this._applyHideRules(menu, 'editor-menu');
					return;
				}
				const file = this.plugin.app.workspace.getActiveFile();
				if (file) this._injectWorkspaceActions(menu, file, 'editor-menu');
				this._applyHideRules(menu, 'editor-menu');
			}),
		);
	}

	registerAction(def: ActionDef): void {
		if (this._registry.some(a => a.id === def.id)) return;
		this._registry.push(def);
	}

	openPanelMenu(ctx: MenuCtx, event: MouseEvent): void {
		const menu = new Menu();
		const applicable = this._registry.filter(
			(def) =>
				def.nodeTypes.includes(ctx.nodeType) &&
				def.surfaces.includes('panel') &&
				(def.when ? def.when(ctx) : true),
		);

		const submenus = new Map<string, Menu>();
		let currentSection: string | undefined = undefined;

		for (const def of applicable) {
			if (def.section && def.section !== currentSection) {
				menu.addSeparator();
				currentSection = def.section;
			}

			let targetMenu = menu;
			if (def.submenu) {
				const sm = submenus.get(def.submenu);
				if (sm) {
					targetMenu = sm;
				} else {
					const icon = def.submenu === 'Convert' ? 'lucide-arrow-right-left' : 'lucide-chevron-right';
					menu.addItem((i: MenuItem) => {
						i.setTitle(def.submenu!).setIcon(icon);
						// Internal API for submenus in modern Obsidian
						targetMenu = (i as unknown as { setSubmenu: () => Menu }).setSubmenu() || new Menu();
					});
					submenus.set(def.submenu, targetMenu);
				}
			}

			targetMenu.addItem((item) => {
				const label = typeof def.label === 'function' ? def.label(ctx) : def.label;
				item.setTitle(label);
				if (def.icon) item.setIcon(def.icon);
				item.onClick(() => {
					try {
						void def.run(ctx);
					} catch (err) {
						new Notice(`Vaultman: action "${def.id}" failed`);
						console.error(err);
					}
				});
			});
		}
		menu.showAtMouseEvent(event);
	}

	private _injectWorkspaceActions(
		menu: Menu,
		file: TFile,
		surface: 'file-menu' | 'editor-menu' | 'more-options',
	): void {
		const ctx: MenuCtx = {
			nodeType: 'file',
			node: { id: file.path, label: file.name, meta: { file }, icon: '', depth: 0 },
			surface,
			file,
		};

		const applicable = this._registry.filter(
			(def) =>
				def.nodeTypes.includes('file') &&
				def.surfaces.includes(surface) &&
				(def.when ? def.when(ctx) : true),
		);

		if (applicable.length === 0) return;

		menu.addSeparator();

		const submenus = new Map<string, Menu>();
		let currentSection: string | undefined = undefined;

		for (const def of applicable) {
			if (def.section && def.section !== currentSection) {
				menu.addSeparator();
				currentSection = def.section;
			}

			let targetMenu = menu;
			if (def.submenu) {
				const sm = submenus.get(def.submenu);
				if (sm) {
					targetMenu = sm;
				} else {
					const icon = def.submenu === 'Convert' ? 'lucide-arrow-right-left' : 'lucide-chevron-right';
					menu.addItem((i: MenuItem) => {
						i.setTitle(def.submenu!).setIcon(icon);
						targetMenu = (i as unknown as { setSubmenu: () => Menu }).setSubmenu() || new Menu();
					});
					submenus.set(def.submenu, targetMenu);
				}
			}

			targetMenu.addItem((item) => {
				const label = typeof def.label === 'function' ? def.label(ctx) : def.label;
				item.setTitle(label);
				if (def.icon) item.setIcon(def.icon);
				item.onClick(() => {
					try {
						void def.run(ctx);
					} catch (err) {
						new Notice(`Vaultman: action "${def.id}" failed`);
						console.error(err);
					}
				});
			});
		}
	}

	private _applyHideRules(
		menu: Menu,
		surface: 'file-menu' | 'editor-menu' | 'more-options',
	): void {
		const rules = this.plugin.settings.contextMenuHideRules || [];
		const activeRules = rules.filter((r) => r.surface === surface && r.enabled);
		if (activeRules.length === 0) return;

		try {
			// Access internal items array via cast to avoid 'any' lint errors
			const items = (menu as unknown as { items: MenuItem[] }).items;
			if (!items || !Array.isArray(items)) return;

			for (const rule of activeRules) {
				const matchedIdx = items.findIndex((i: MenuItem) => {
					// Access internal title via cast
					const title = String((i as unknown as { title: string }).title || '').toLowerCase();
					return title.includes(rule.titleMatch.toLowerCase());
				});

				if (matchedIdx !== -1) {
					// Use internal items array for splice
					(menu as unknown as { items: MenuItem[] }).items.splice(matchedIdx, 1);
				}
			}
		} catch (e) {
			console.warn('Vaultman: could not apply hide rules to context menu', e);
		}
	}
}
