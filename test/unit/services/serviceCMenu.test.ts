import { describe, it, expect, vi } from 'vitest';
import { Menu } from 'obsidian';
import { ContextMenuService, type ContextMenuPluginCtx } from '../../../src/services/serviceCMenu';
import { explorerFiles } from '../../../src/providers/explorerFiles';
import type { VaultmanPlugin } from '../../../src/main';
import type { ActionDef } from '../../../src/types/typeCtxMenu';
import { mockApp, mockTFile, Component } from '../../helpers/obsidian-mocks';

function makeCtx(): ContextMenuPluginCtx {
	const ctx = new Component() as unknown as ContextMenuPluginCtx;
	(ctx as unknown as { app: ReturnType<typeof mockApp> }).app = mockApp();
	(ctx as unknown as { settings: ContextMenuPluginCtx['settings'] }).settings = {
		contextMenuShowInMoreOptions: true,
		contextMenuShowInFileMenu: true,
		contextMenuShowInEditorMenu: true,
		contextMenuHideRules: [],
	};
	return ctx;
}

const fileAction: ActionDef = {
	id: 'test.action',
	label: 'Test action',
	nodeTypes: ['file'],
	surfaces: ['panel', 'file-menu', 'more-options'],
	run: () => {},
};

function makeFilesPlugin(): VaultmanPlugin {
	const file = mockTFile('Notes/A.md');
	const app = mockApp({ files: [file] });
	const openLinkText = vi.fn();
	(
		app.workspace as typeof app.workspace & {
			openLinkText: (linktext: string, sourcePath: string, newLeaf?: boolean) => void;
		}
	).openLinkText = openLinkText;
	return {
		app,
		contextMenuService: { registerAction: vi.fn(), openPanelMenu: vi.fn() },
		propertyIndex: { fileCount: 1 },
		operationsIndex: { nodes: [], subscribe: vi.fn(() => vi.fn()) },
		activeFiltersIndex: { nodes: [], subscribe: vi.fn(() => vi.fn()) },
		filterService: {
			filteredFiles: [file],
			selectedFiles: [],
			setSelectedFiles: vi.fn(),
		},
		queueService: { add: vi.fn() },
		settings: { explorerOperationScope: 'filtered' },
	} as unknown as VaultmanPlugin;
}

function registeredActions(plugin: VaultmanPlugin): ActionDef[] {
	return (plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>).mock.calls.map(
		([action]) => action,
	);
}

describe('ContextMenuService.registerAction', () => {
	it('records the action on first registration', () => {
		const svc = new ContextMenuService(makeCtx());
		svc.registerAction(fileAction);
		expect((svc as unknown as { _registry: ActionDef[] })._registry.length).toBe(1);
	});

	it('is idempotent on duplicate id', () => {
		const svc = new ContextMenuService(makeCtx());
		svc.registerAction(fileAction);
		svc.registerAction(fileAction);
		expect((svc as unknown as { _registry: ActionDef[] })._registry.length).toBe(1);
	});
});

describe('ContextMenuService applicable filtering', () => {
	it('only includes actions whose nodeTypes match the ctx', () => {
		const svc = new ContextMenuService(makeCtx());
		const fileSpy = vi.fn();
		const tagSpy = vi.fn();
		svc.registerAction({ ...fileAction, run: fileSpy });
		svc.registerAction({
			id: 'tag.x',
			label: 'Tag x',
			nodeTypes: ['tag'],
			surfaces: ['panel'],
			run: tagSpy,
		});

		const applicable = (svc as unknown as { _registry: ActionDef[] })._registry.filter(
			(d) => d.nodeTypes.includes('file') && d.surfaces.includes('panel'),
		);
		expect(applicable.map((d) => d.id)).toEqual(['test.action']);
	});

	it('respects the `when` predicate', () => {
		const svc = new ContextMenuService(makeCtx());
		svc.registerAction({
			...fileAction,
			id: 'guarded',
			when: (ctx) => ctx.file?.path.endsWith('.txt') ?? false,
		});
		const file = mockTFile('a.md');
		const ctxObj = {
			nodeType: 'file' as const,
			node: { id: 'x', label: 'x', meta: { file }, icon: '', depth: 0 },
			surface: 'panel' as const,
			file,
		};
		const applicable = (svc as unknown as { _registry: ActionDef[] })._registry.filter(
			(d) =>
				d.nodeTypes.includes('file') && d.surfaces.includes('panel') && (!d.when || d.when(ctxObj)),
		);
		expect(applicable.map((d) => d.id)).toEqual([]);
	});
});

describe('ContextMenuService file-menu delegation seam', () => {
	it('injects applicable actions through delegateFileMenu', () => {
		const svc = new ContextMenuService(makeCtx());
		const run = vi.fn();
		svc.registerAction({ ...fileAction, run });
		const file = mockTFile('Notes/A.md');
		const menu = new Menu();

		svc.delegateFileMenu(menu, file, 'file-menu');
		const action = menu.items.find((item) => item.title === 'Test action');
		action?.onClick?.();

		expect(menu.items.map((item) => item.title)).toContain('Test action');
		expect(run).toHaveBeenCalledWith(
			expect.objectContaining({
				nodeType: 'file',
				surface: 'file-menu',
				file,
			}),
		);
	});

	it('maps the native more-options source onto the more-options surface', () => {
		const svc = new ContextMenuService(makeCtx());
		const run = vi.fn();
		svc.registerAction({ ...fileAction, run });
		const file = mockTFile('Notes/A.md');
		const menu = new Menu();

		svc.delegateFileMenu(menu, file, 'more-options');
		menu.items.find((item) => item.title === 'Test action')?.onClick?.();

		expect(run).toHaveBeenCalledWith(
			expect.objectContaining({
				surface: 'more-options',
				file,
			}),
		);
	});
});

describe('ContextMenuService provider standard actions', () => {
	it('file explorer registers the standard panel action set', () => {
		const plugin = makeFilesPlugin();
		new explorerFiles(plugin);

		const ids = registeredActions(plugin).map((action) => action.id);

		expect(ids).toEqual(
			expect.arrayContaining([
				'file.open',
				'file.rename',
				'file.move',
				'file.set',
				'file.delete',
				'folder.filter',
			]),
		);
	});

	it('file.open routes through the same workspace open behavior as file activation', () => {
		const plugin = makeFilesPlugin();
		const [file] = plugin.app.vault.getMarkdownFiles();
		new explorerFiles(plugin);
		const action = registeredActions(plugin).find((candidate) => candidate.id === 'file.open');

		action?.run({
			nodeType: 'file',
			node: {
				id: file.path,
				label: file.basename,
				depth: 0,
				icon: 'lucide-file',
				meta: { file, isFolder: false, folderPath: 'Notes' },
			},
			surface: 'panel',
			file,
		});

		expect(
			(
				plugin.app.workspace as typeof plugin.app.workspace & {
					openLinkText: ReturnType<typeof vi.fn>;
				}
			).openLinkText,
		).toHaveBeenCalledWith(file.path, '', false);
	});
});
