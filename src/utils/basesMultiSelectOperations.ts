import { Menu, setIcon, TFile } from 'obsidian';
import type { VaultmanPlugin } from '../main';
import { FileMoveModal } from '../modals/modalFileMove';
import { FileRenameModal } from '../modals/modalFileRename';
import { PropertyManagerModal } from '../modals/modalPropertyManager';
import { DELETE_FILE } from '../types/typeOps';

const BASES_ROOT_SELECTOR =
	'.workspace-leaf-content[data-type="base"], .bases-view, .bases-embed, .bases-table-container';
const BASES_SELECTED_ROW_SELECTOR =
	'.bases-tr.is-selected, .bases-tr.mod-selected, .bases-tr[aria-selected="true"], .bases-tr[data-is-selected="true"]';

export function attachBasesMultiSelectOperations(plugin: VaultmanPlugin): () => void {
	const onContextMenu = (event: MouseEvent): void => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		const root = target.closest(BASES_ROOT_SELECTOR);
		if (!(root instanceof HTMLElement)) return;

		const files = collectBasesSelectedFiles(plugin, root, target);
		if (files.length < 2) return;

		window.setTimeout(() => {
			if (injectIntoOpenNativeMenu(plugin, files)) return;
			openFallbackBasesOperationsMenu(plugin, files, event);
		}, 0);
	};

	activeDocument.addEventListener('contextmenu', onContextMenu, true);
	return () => activeDocument.removeEventListener('contextmenu', onContextMenu, true);
}

function collectBasesSelectedFiles(
	plugin: VaultmanPlugin,
	root: HTMLElement,
	target: HTMLElement,
): TFile[] {
	const rows = Array.from(
		root.querySelectorAll<HTMLElement>(BASES_SELECTED_ROW_SELECTOR),
	);
	const clickedRow = target.closest<HTMLElement>('.bases-tr');
	if (clickedRow && !rows.includes(clickedRow)) rows.push(clickedRow);

	const files = new Map<string, TFile>();
	for (const row of rows) {
		const path = pathFromBasesRow(row);
		if (!path) continue;
		const file = plugin.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) files.set(file.path, file);
	}
	return Array.from(files.values());
}

function pathFromBasesRow(row: HTMLElement): string {
	const dataPath =
		row.dataset.path ??
		row.dataset.filePath ??
		row.dataset.href ??
		row.getAttribute('data-path') ??
		row.getAttribute('data-href');
	if (dataPath) return dataPath;
	const linked = row.querySelector<HTMLElement>('[data-href], .internal-link');
	return (
		linked?.dataset.href ??
		linked?.getAttribute('data-href') ??
		linked?.getAttribute('href') ??
		''
	);
}

function injectIntoOpenNativeMenu(
	plugin: VaultmanPlugin,
	files: TFile[],
): boolean {
	const menus = Array.from(activeDocument.body.querySelectorAll<HTMLElement>('.menu'));
	const menu = menus[menus.length - 1];
	if (!menu || menu.hasClass('vaultman-bases-menu-enhanced')) return false;
	menu.addClass('vaultman-bases-menu-enhanced');
	menu.createDiv({ cls: 'menu-separator' });
	appendDomMenuItem(menu, 'Vaultman: add property', 'lucide-plus', () =>
		openPropertyOperation(plugin, files),
	);
	appendDomMenuItem(menu, 'Vaultman: rename files', 'lucide-pencil', () =>
		openRenameOperation(plugin, files),
	);
	appendDomMenuItem(menu, 'Vaultman: move files', 'lucide-folder-input', () =>
		openMoveOperation(plugin, files),
	);
	appendDomMenuItem(menu, 'Vaultman: delete files', 'lucide-trash-2', () =>
		queueDeleteOperation(plugin, files),
	);
	return true;
}

function appendDomMenuItem(
	menu: HTMLElement,
	title: string,
	icon: string,
	onClick: () => void,
): void {
	const item = menu.createDiv({ cls: 'menu-item tappable' });
	const iconEl = item.createDiv({ cls: 'menu-item-icon' });
	setIcon(iconEl, icon);
	item.createDiv({ cls: 'menu-item-title', text: title });
	item.addEventListener('click', () => {
		onClick();
		menu.remove();
	});
}

function openFallbackBasesOperationsMenu(
	plugin: VaultmanPlugin,
	files: TFile[],
	event: MouseEvent,
): void {
	const menu = new Menu();
	menu.addItem((item) =>
		item
			.setTitle('Vaultman: add property')
			.setIcon('lucide-plus')
			.onClick(() => openPropertyOperation(plugin, files)),
	);
	menu.addItem((item) =>
		item
			.setTitle('Vaultman: rename files')
			.setIcon('lucide-pencil')
			.onClick(() => openRenameOperation(plugin, files)),
	);
	menu.addItem((item) =>
		item
			.setTitle('Vaultman: move files')
			.setIcon('lucide-folder-input')
			.onClick(() => openMoveOperation(plugin, files)),
	);
	menu.addItem((item) =>
		item
			.setTitle('Vaultman: delete files')
			.setIcon('lucide-trash-2')
			.onClick(() => queueDeleteOperation(plugin, files)),
	);
	menu.showAtMouseEvent(event);
}

function openPropertyOperation(plugin: VaultmanPlugin, files: TFile[]): void {
	new PropertyManagerModal(
		plugin.app,
		plugin.propertyIndex,
		files,
		(change) => plugin.queueService.addOrRun(change),
	).open();
}

function openRenameOperation(plugin: VaultmanPlugin, files: TFile[]): void {
	new FileRenameModal(
		plugin.app,
		plugin.propertyIndex,
		files,
		(change) => plugin.queueService.addOrRun(change),
	).open();
}

function openMoveOperation(plugin: VaultmanPlugin, files: TFile[]): void {
	new FileMoveModal(plugin.app, files, (change) =>
		plugin.queueService.addOrRun(change),
	).open();
}

function queueDeleteOperation(plugin: VaultmanPlugin, files: TFile[]): void {
	plugin.queueService.addOrRun({
		type: 'file_delete',
		action: 'delete',
		details: `Delete ${files.length} files`,
		files,
		customLogic: true,
		logicFunc: () => ({ [DELETE_FILE]: true }),
	});
}
