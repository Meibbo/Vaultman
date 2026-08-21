import type VaultmanPlugin from '../main';
import type { MenuCtx } from '../types/typeCMenu';
import { translate } from '../i18n/index';
import { openAddonIconPicker } from '../modals/modalAddonIconPicker';
import {
	clearAddonIconOverride,
	getAddonIconOverride,
	readAddonIconOverrides,
	setAddonIconOverride,
	writeAddonIconOverrides,
} from './logicAddonIcons';
import { ConfirmModal } from '../modals/modalConfirm';
import { FileRenameModal } from '../modals/modalFileRename';
import { cssSnippetPath, setCssSnippetEnabled } from '../utils/obsidianAddons';
import type { SnippetMeta } from '../types/typeTree';
import type { App } from 'obsidian';
import { buildSnippetRenameChange } from './logicSnippetOperations';
import {
	canRevealInSystemExplorer,
	REVEAL_IN_SYSTEM_EXPLORER_ICON,
	revealInSystemExplorer,
	SNIPPET_REVEAL_ACTION_ID,
	systemExplorerRevealLabel,
} from './logicSystemExplorer';

interface InternalApp extends App {
	customCss?: {
		getSnippetPath(name: string): string;
		requestLoadSnippets?(): void;
	};
	vault: App['vault'] & {
		adapter: {
			remove(path: string): Promise<void>;
		};
	};
	openWithDefaultApp?(path: string): void;
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
			const current = getAddonIconOverride(overrides, 'snippet', meta.name);
			if (
				plugin.iconicService?.openSnippetIconPicker(
					meta.name,
					ctx.event,
					current,
					(icon, color) => {
						writeAddonIconOverrides(
							plugin.settings,
							icon
								? setAddonIconOverride(overrides, 'snippet', meta.name, {
										icon,
										...(color ? { color } : {}),
									})
								: clearAddonIconOverride(overrides, 'snippet', meta.name),
						);
						void plugin.saveSettings();
					},
				)
			) return;
			openAddonIconPicker({
				app: plugin.app,
				name: meta.name,
				hasOverride:
					getAddonIconOverride(overrides, 'snippet', meta.name) !== null,
				onPick: async (icon) => {
					writeAddonIconOverrides(
						plugin.settings,
						setAddonIconOverride(overrides, 'snippet', meta.name, { icon }),
					);
					await plugin.saveSettings();
				},
				onReset: async () => {
					writeAddonIconOverrides(
						plugin.settings,
						clearAddonIconOverride(overrides, 'snippet', meta.name),
					);
					await plugin.saveSettings();
				},
			});
		},
	});

	svc.registerAction({
		id: 'snippet.open-default-app',
		nodeTypes: ['snippet'],
		surfaces: ['panel'],
		label: () => translate('snippet.open_default_app'),
		icon: 'lucide-external-link',
		when: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as SnippetMeta | undefined;
			const app = plugin.app as InternalApp;
			return !!meta?.name && !!app.customCss?.getSnippetPath && !!app.openWithDefaultApp;
		},
		run: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as SnippetMeta | undefined;
			if (!meta || !meta.name) return;
			const app = plugin.app as InternalApp;
			const snippetPath = app.customCss?.getSnippetPath(meta.name);
			if (snippetPath && app.openWithDefaultApp) {
				app.openWithDefaultApp(snippetPath);
			}
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
		id: SNIPPET_REVEAL_ACTION_ID,
		nodeTypes: ['snippet'],
		surfaces: ['panel'],
		label: systemExplorerRevealLabel(),
		icon: REVEAL_IN_SYSTEM_EXPLORER_ICON,
		when: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as SnippetMeta | undefined;
			return !!meta?.name && canRevealInSystemExplorer(plugin.app);
		},
		run: (ctx: MenuCtx) => {
			const meta = ctx.node?.meta as SnippetMeta | undefined;
			if (!meta || !meta.name) return;
			revealInSystemExplorer(
				plugin.app,
				cssSnippetPath(plugin.app, meta.name),
			);
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
			const path = cssSnippetPath(plugin.app, meta.name);

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
				(change) => plugin.queueService.addOrRun(change),
				{ buildChange: buildSnippetRenameChange },
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
			const path = cssSnippetPath(plugin.app, meta.name);

			const performDelete = async () => {
				await app.vault.adapter.remove(path);
				app.customCss?.requestLoadSnippets?.();
			};

			// U121-075: this was the wrong way round. `stage` -- the safe mode,
			// bypass OFF -- deleted the file on the spot with no confirmation and
			// no queue, while `bypass` was the one that asked. A snippet lives in
			// the config directory, so `adapter.remove` never reaches the trash.
			if (plugin.queueService.operationMode === 'bypass') {
				new ConfirmModal(plugin.app, {
					title: 'Delete snippet',
					message: `Are you sure you want to delete the snippet "${meta.name}"? This action cannot be undone.`,
					ctaLabel: 'Delete',
					onConfirm: performDelete,
				}).open();
				return;
			}
			plugin.queueService.addOrRun({
				type: 'snippet_delete',
				action: 'delete',
				name: meta.name,
				path,
				details: `Delete snippet "${meta.name}"`,
				files: [],
				customLogic: true,
				logicFunc: () => null,
			});
		},
	});
}
