import type VaultmanPlugin from '../main';
import type { MenuCtx } from '../types/typeCMenu';
import { translate } from '../i18n/index';
import { openAddonIconPicker } from '../modals/modalAddonIconPicker';
import { readAddonIconOverrides, getAddonIconOverride, setAddonIconOverride, clearAddonIconOverride, writeAddonIconOverrides } from './logicAddonIcons';
import { ConfirmModal } from '../modals/modalConfirm';
import { FileRenameModal } from '../modals/modalFileRename';
import { setCssSnippetEnabled } from '../utils/obsidianAddons';
import type { SnippetMeta } from '../types/typeTree';
import type { App } from 'obsidian';

interface InternalApp extends App {
	customCss?: {
		getSnippetPath(name: string): string;
		requestLoadSnippets?(): void;
	};
	showInFolder?(path: string): void;
	vault: App['vault'] & {
		adapter: {
			remove(path: string): Promise<void>;
		};
	};
}

export function registerSnippetActions(plugin: VaultmanPlugin): void {
	const svc = plugin.contextMenuService;

	svc.registerAction({
		id: 'snippet.change-icon',
		nodeTypes: ['snippet'],
		surfaces: ['panel'],
		label: () => translate('addon.icon.change'),
		icon: 'lucide-image',
		when: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as SnippetMeta | undefined;
			return !!meta?.name;
		},
		run: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as SnippetMeta | undefined;
			if (!meta || !meta.name) return;
			const overrides = readAddonIconOverrides(plugin.settings);
			openAddonIconPicker({
				app: plugin.app,
				name: meta.name,
				hasOverride: getAddonIconOverride(overrides, 'snippet', meta.name) !== null,
				onPick: async (icon) => {
					writeAddonIconOverrides(plugin.settings, setAddonIconOverride(overrides, 'snippet', meta.name, { icon }));
					await plugin.saveSettings();
				},
				onReset: async () => {
					writeAddonIconOverrides(plugin.settings, clearAddonIconOverride(overrides, 'snippet', meta.name));
					await plugin.saveSettings();
				},
			});
		},
	});

	svc.registerAction({
		id: 'snippet.toggle',
		nodeTypes: ['snippet'],
		surfaces: ['panel'],
		label: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as SnippetMeta | undefined;
			const next = !meta?.enabled;
			return translate(next ? 'addons.enable' : 'addons.disable');
		},
		icon: 'lucide-power',
		when: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as SnippetMeta | undefined;
			return !!meta?.name;
		},
		run: async (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as SnippetMeta | undefined;
			if (!meta || !meta.name) return;
			await setCssSnippetEnabled(plugin.app, meta.name, !meta.enabled);
		},
	});

	svc.registerAction({
		id: 'snippet.see-details',
		nodeTypes: ['snippet'],
		surfaces: ['panel'],
		label: () => 'Reveal in system explorer',
		icon: 'lucide-folder-open',
		when: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as SnippetMeta | undefined;
			return !!meta?.name;
		},
		run: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as SnippetMeta | undefined;
			if (!meta || !meta.name) return;
			const app = plugin.app as InternalApp;
			const path = app.customCss?.getSnippetPath(meta.name);
			if (path && app.showInFolder) {
				app.showInFolder(path);
			}
		},
	});

	svc.registerAction({
		id: 'snippet.rename',
		nodeTypes: ['snippet'],
		surfaces: ['panel'],
		label: (ctx: MenuCtx) => `Rename "${ctx.node?.label ?? ''}"`,
		icon: 'lucide-pencil',
		when: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as SnippetMeta | undefined;
			return !!meta?.name;
		},
		run: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as SnippetMeta | undefined;
			if (!meta || !meta.name) return;
			const app = plugin.app as InternalApp;
			const path = app.customCss?.getSnippetPath(meta.name);
			if (!path) return;

			const fakeFile = {
				name: `${meta.name}.css`,
				basename: meta.name,
				extension: 'css',
				path: path,
			} as unknown as import('obsidian').TFile;

			new FileRenameModal(
				plugin.app,
				plugin.propertyIndex,
				[fakeFile],
				(change) => {
					// Extract the new name from the PendingChange's logicFunc
					const updates = change.logicFunc?.(fakeFile, {}) ?? {};
					const newName = updates['_RENAME_FILE']; // RENAME_FILE
					if (typeof newName === 'string') {
						const newPath = path.replace(`${meta.name}.css`, newName);
						app.vault.adapter
							.rename(path, newPath)
							.then(() => {
								app.customCss?.requestLoadSnippets?.();
							})
							.catch((error: unknown) => {
								console.error('Failed to rename snippet', error);
							});
					}
				}
			).open();
		},
	});

	svc.registerAction({
		id: 'snippet.delete',
		nodeTypes: ['snippet'],
		surfaces: ['panel'],
		label: (ctx: MenuCtx) => `Delete "${ctx.node?.label ?? ''}"`,
		icon: 'lucide-trash-2',
		when: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as SnippetMeta | undefined;
			return !!meta?.name;
		},
		run: async (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as SnippetMeta | undefined;
			if (!meta || !meta.name) return;
			const app = plugin.app as InternalApp;
			const path = app.customCss?.getSnippetPath(meta.name);
			if (!path) return;

			const performDelete = async () => {
				await app.vault.adapter.remove(path);
				app.customCss?.requestLoadSnippets?.();
			};

			if (plugin.queueService.operationMode === 'bypass') {
				new ConfirmModal(plugin.app, {
					title: 'Delete snippet',
					message: `Are you sure you want to delete the snippet "${meta.name}"? This action cannot be undone.`,
					ctaLabel: 'Delete',
					onConfirm: performDelete,
				}).open();
			} else {
				await performDelete();
			}
		},
	});
}
