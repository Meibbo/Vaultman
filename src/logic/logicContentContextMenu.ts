import type { TFile } from 'obsidian';

import type VaultmanPlugin from '../main';
import type { MenuCtx } from '../types/typeCMenu';
import type { TreeNode } from '../types/typeTree';
import { translate } from '../i18n/index';
import { FileRenameModal } from '../modals/modalFileRename';

/**
 * BT5-036: Content search nodes are real files, so their panel menu offers
 * Rename and Delete. Rename uses Vaultman's rich, queued file operation;
 * deletion keeps Obsidian's native confirmation so it respects the core
 * "Confirm file deletion" setting. Registering them here (once, at plugin
 * load) makes them configurable from the Content section of Layout
 * Configuration → context menus, exactly like the other kinds.
 */
interface NativeFileManager {
	promptForFileDeletion?(file: TFile): void;
	promptForDeletion?(file: TFile): void;
}

export type FileRenameOperationOpener = (
	plugin: VaultmanPlugin,
	files: TFile[],
) => void;

export function openFileRenameOperation(
	plugin: VaultmanPlugin,
	files: TFile[],
): void {
	new FileRenameModal(
		plugin.app,
		plugin.propertyIndex,
		files,
		(change) => plugin.queueService.addOrRun(change),
	).open();
}

/** A minimal content node, so actions can read the file off the menu ctx. */
export function contentMenuNode(file: TFile): TreeNode<{ file: TFile }> {
	return { id: file.path, label: file.basename, depth: 0, meta: { file } };
}

export function registerContentActions(
	plugin: VaultmanPlugin,
	openRename: FileRenameOperationOpener = openFileRenameOperation,
): void {
	const svc = plugin.contextMenuService;
	const fm = plugin.app.fileManager as unknown as NativeFileManager;

	svc.registerAction({
		id: 'content.change-icon',
		nodeTypes: ['content'],
		surfaces: ['panel'],
		label: () => translate('iconic.change_icon'),
		icon: 'lucide-image-plus',
		section: 'Icon',
		when: (ctx: MenuCtx) =>
			!!ctx.file && plugin.iconicService?.canChangeFileIcon() === true,
		run: (ctx: MenuCtx) => {
			if (ctx.file) {
				plugin.iconicService?.openFileIconPicker(ctx.file.path, ctx.event);
			}
		},
	});

	svc.registerAction({
		id: 'content.rename',
		nodeTypes: ['content'],
		surfaces: ['panel'],
		label: (ctx: MenuCtx) => `Rename "${ctx.node.label}"`,
		icon: 'lucide-pencil',
		when: (ctx: MenuCtx) => !!ctx.file,
		run: (ctx: MenuCtx) => {
			if (ctx.file) openRename(plugin, [ctx.file]);
		},
	});

	svc.registerAction({
		id: 'content.delete',
		nodeTypes: ['content'],
		surfaces: ['panel'],
		label: (ctx: MenuCtx) => `Delete "${ctx.node.label}"`,
		icon: 'lucide-trash-2',
		when: (ctx: MenuCtx) => !!ctx.file,
		run: (ctx: MenuCtx) => {
			if (!ctx.file) return;
			// Native confirm modal (respects "Confirm file deletion").
			(fm.promptForFileDeletion ?? fm.promptForDeletion)?.(ctx.file);
		},
	});
}
