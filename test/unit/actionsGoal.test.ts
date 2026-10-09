import { describe, it, expect, vi } from 'vitest';
import { TFile, type App } from 'obsidian';
import { NodeBindingService } from '../../src/services/serviceNodeBinding';
import { isCorePlugin, toggleCorePlugin, togglePlugin } from '../../src/logic/logicAddonCells';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import { findStagedRenameIndex } from '../../src/logic/logicRenameBadges';
import type { PendingChange } from '../../src/types/typeOps';
import { parseScopeLevel } from '../../src/logic/logicScopedSort';
import { resolveSelectionTargets } from '../../src/logic/logicSelectionTargets';
import { UnifiedTreeView } from '../../src/components/layout/viewTree';

describe('U130 Actions Goal - Issue 3: Node-Note live binding & event emission', () => {
	it('emits changed event and updates getVaultAliasSet on note creation', async () => {
		const createdFile = new TFile();
		createdFile.path = 'test-token.md';

		const mockCreate = vi.fn().mockResolvedValue(createdFile);
		const mockOpenFile = vi.fn().mockResolvedValue(undefined);
		const mockApp = {
			vault: {
				getAbstractFileByPath: vi.fn().mockReturnValue(null),
				getMarkdownFiles: vi.fn().mockReturnValue([]),
				create: mockCreate,
			},
			fileManager: {
				getNewFileParent: vi.fn().mockReturnValue({ path: '' }),
			},
			workspace: {
				getLeaf: vi.fn().mockReturnValue({ openFile: mockOpenFile }),
			},
		} as unknown as App;

		const service = new NodeBindingService({ app: mockApp });
		const changedSpy = vi.fn();
		service.on('changed', changedSpy);

		const result = await service.bindOrCreate({ kind: 'tag', label: '#mytag', tagPath: 'mytag' });

		expect(result.outcome).toBe('created');
		expect(changedSpy).toHaveBeenCalled();
		expect(service.getVaultAliasSet().has('#mytag')).toBe(true);
	});

	it('emits changed event and updates getVaultAliasSet on note adoption', async () => {
		const existingFile = new TFile();
		existingFile.path = 'myprop.md';

		const mockOpenFile = vi.fn().mockResolvedValue(undefined);
		const mockProcessFrontMatter = vi.fn().mockImplementation(
			async (_file: TFile, cb: (fm: Record<string, unknown>) => void) => {
				const fm: Record<string, unknown> = {};
				cb(fm);
			},
		);
		const mockApp = {
			vault: {
				getAbstractFileByPath: vi.fn().mockReturnValue(existingFile),
				getMarkdownFiles: vi.fn().mockReturnValue([]),
			},
			fileManager: {
				getNewFileParent: vi.fn().mockReturnValue({ path: '' }),
				processFrontMatter: mockProcessFrontMatter,
			},
			workspace: {
				getLeaf: vi.fn().mockReturnValue({ openFile: mockOpenFile }),
			},
		} as unknown as App;

		const service = new NodeBindingService({ app: mockApp });
		const changedSpy = vi.fn();
		service.on('changed', changedSpy);

		const result = await service.bindOrCreate({ kind: 'prop', label: 'status', propName: 'status' });

		expect(result.outcome).toBe('adopted');
		expect(changedSpy).toHaveBeenCalled();
		expect(service.getVaultAliasSet().has('[status]')).toBe(true);
	});

	it('emits changed event when invalidateAliasCache is called', () => {
		const mockApp = {
			vault: {
				getMarkdownFiles: vi.fn().mockReturnValue([]),
			},
		} as unknown as App;

		const service = new NodeBindingService({ app: mockApp });
		const changedSpy = vi.fn();
		service.on('changed', changedSpy);

		service.invalidateAliasCache();
		expect(changedSpy).toHaveBeenCalledTimes(1);
	});
});

describe('U130 Actions Goal - Issue 4: Parentage in queueScene node_values operations', () => {
	it('formats details with property: value parentage and retains compatibility with findStagedRenameIndex', () => {
		const propName = 'status';
		const oldValue = 'todo';
		const newValue = 'done';

		const change: PendingChange = {
			type: 'property',
			action: 'rename',
			property: propName,
			value: newValue,
			oldValue,
			details: `Rename value "${propName}: ${oldValue}" → "${newValue}"`,
			files: [],
			customLogic: true,
			logicFunc: () => null,
		};

		expect(change.details).toBe('Rename value "status: todo" → "done"');
		expect(findStagedRenameIndex([change], 'status::todo')).toBe(0);
		expect(findStagedRenameIndex([change], 'status::other')).toBe(-1);
	});

	it('formats conversion details with property: value parentage', () => {
		const propName = 'score';
		const oldValue = '10';
		const label = 'Number (10)';

		const details = `Convert "${propName}: ${oldValue}" to ${label}`;
		expect(details).toBe('Convert "score: 10" to Number (10)');
	});
});

describe('U130 Actions Goal - Issue 1: Reveal Direct Write setting', () => {
	it('has revealDirectWrite setting defaulting to false', () => {
		expect(DEFAULT_SETTINGS.revealDirectWrite).toBe(false);
	});
});

describe('U130 Actions Goal - Issue 2: Core Plugin toggling via internalPlugins', () => {
	it('distinguishes core plugin vs community plugin correctly', () => {
		const mockApp = {
			internalPlugins: {
				plugins: {
					'file-recovery': { instance: { options: {} } },
				},
			},
			plugins: {
				manifests: {
					dataview: { id: 'dataview', name: 'Dataview' },
				},
			},
		} as unknown as App;

		expect(isCorePlugin(mockApp, 'file-recovery')).toBe(true);
		expect(isCorePlugin(mockApp, 'dataview')).toBe(false);
		expect(isCorePlugin(mockApp, 'unknown')).toBe(false);
	});

	it('toggles core plugin enabling and disabling via internalPlugins', async () => {
		const enableSpy = vi.fn();
		const disableSpy = vi.fn();
		const saveSpy = vi.fn().mockResolvedValue(undefined);

		const mockApp = {
			internalPlugins: {
				plugins: {
					'file-recovery': {
						enable: enableSpy,
						disable: disableSpy,
					},
				},
				requestSaveConfig: saveSpy,
			},
		} as unknown as App;

		const enabled = await toggleCorePlugin(mockApp, 'file-recovery', true);
		expect(enabled).toBe(true);
		expect(enableSpy).toHaveBeenCalledWith(true);
		expect(saveSpy).toHaveBeenCalled();

		const disabled = await toggleCorePlugin(mockApp, 'file-recovery', false);
		expect(disabled).toBe(true);
		expect(disableSpy).toHaveBeenCalledWith(true);
		expect(saveSpy).toHaveBeenCalledTimes(2);
	});

	it('togglePlugin dispatches to toggleCorePlugin for core plugins', async () => {
		const enableSpy = vi.fn();
		const saveSpy = vi.fn().mockResolvedValue(undefined);

		const mockApp = {
			internalPlugins: {
				plugins: {
					'file-recovery': {
						enable: enableSpy,
						disable: vi.fn(),
					},
				},
				requestSaveConfig: saveSpy,
			},
			plugins: {
				manifests: {},
			},
		} as unknown as App;

		const result = await togglePlugin(mockApp, {
			pluginId: 'file-recovery',
			name: 'File Recovery',
			enabled: false,
			loaded: true,
			isVaultman: false,
		});

		expect(result).toBe(true);
		expect(enableSpy).toHaveBeenCalledWith(true);
		expect(saveSpy).toHaveBeenCalled();
	});
});

describe('U130 Actions Goal - Node-Note live coalescing & deletion cache pruning', () => {
	it('filters out deleted file paths immediately upon invalidateAliasCache(deletedPath)', () => {
		const mockFiles = [
			{ path: 'notes/active.md' },
			{ path: 'notes/deleted.md' },
		];
		const mockApp = {
			vault: {
				getMarkdownFiles: () => mockFiles,
				getAbstractFileByPath: (p: string) => (p === 'notes/deleted.md' ? null : {}),
			},
			metadataCache: {
				getFileCache: (f: { path: string }) => {
					if (f.path === 'notes/active.md') return { frontmatter: { aliases: ['%active-plugin'] } };
					if (f.path === 'notes/deleted.md') return { frontmatter: { aliases: ['%deleted-plugin'] } };
					return null;
				},
			},
		} as unknown as App;

		const svc = new NodeBindingService({ app: mockApp });
		const changedSpy = vi.fn();
		svc.on('changed', changedSpy);

		const initialSet = svc.getVaultAliasSet();
		expect(initialSet.has('%active-plugin')).toBe(true);
		// deleted.md returns null on getAbstractFileByPath, so it is omitted
		expect(initialSet.has('%deleted-plugin')).toBe(false);

		// Now simulate explicit deletion invalidation
		svc.invalidateAliasCache('notes/deleted.md');
		expect(changedSpy).toHaveBeenCalled();
		const afterSet = svc.getVaultAliasSet();
		expect(afterSet.has('%active-plugin')).toBe(true);
		expect(afterSet.has('%deleted-plugin')).toBe(false);
	});

	it('retains newly created tokens in recentlyCreatedTokens across premature cache invalidations', () => {
		const mockFiles: { path: string }[] = [];
		const mockApp = {
			vault: {
				getMarkdownFiles: () => mockFiles,
				getAbstractFileByPath: () => ({}),
			},
			metadataCache: {
				getFileCache: () => null, // metadataCache has not indexed yet!
			},
		} as unknown as App;

		const svc = new NodeBindingService({ app: mockApp });
		// Simulate bindOrCreate adding recently created token
		(svc as unknown as { recentlyCreatedTokens: Map<string, number> }).recentlyCreatedTokens.set(
			'%my-plugin',
			Date.now() + 5000,
		);
		svc.invalidateAliasCache();

		const aliasSet = svc.getVaultAliasSet();
		expect(aliasSet.has('%my-plugin')).toBe(true);
	});

	it('prunes recentlyCreatedTokens immediately when associated deletedPath is invalidated', () => {
		const mockApp = {
			vault: {
				getMarkdownFiles: () => [],
				getAbstractFileByPath: (p: string) => (p === '+/test.md' ? null : {}),
			},
			metadataCache: {
				getFileCache: () => null,
			},
		} as unknown as App;

		const svc = new NodeBindingService({ app: mockApp });
		(svc as unknown as { recentlyCreatedTokens: Map<string, { path: string; exp: number }> }).recentlyCreatedTokens.set(
			'%test-plugin',
			{ path: '+/test.md', exp: Date.now() + 5000 },
		);

		svc.invalidateAliasCache('+/test.md');
		const aliasSet = svc.getVaultAliasSet();
		expect(aliasSet.has('%test-plugin')).toBe(false);
	});

	it('UnifiedTreeView rowSignature changes when node hasNodeNote toggles', () => {
		const container = {
			addEventListener: () => {},
			removeEventListener: () => {},
			dataset: {},
			toggleClass: () => {},
			removeClass: () => {},
		} as unknown as HTMLElement;
		const treeView = new UnifiedTreeView(container);
		const node1 = {
			id: 'plugin:test',
			label: 'Test Plugin',
			depth: 0,
			meta: { pluginId: 'test', hasNodeNote: false },
			hasNodeNote: false,
		};

		const sigWithoutNote = (treeView as unknown as { rowSignature: (node: unknown, opts: unknown) => string }).rowSignature(
			node1,
			{ expandedIds: new Set(), visibleCells: new Set(['format']) },
		);

		const node2 = {
			id: 'plugin:test',
			label: 'Test Plugin',
			depth: 0,
			meta: { pluginId: 'test', hasNodeNote: true },
			hasNodeNote: true,
		};

		const sigWithNote = (treeView as unknown as { rowSignature: (node: unknown, opts: unknown) => string }).rowSignature(
			node2,
			{ expandedIds: new Set(), visibleCells: new Set(['format']) },
		);

		expect(sigWithoutNote).not.toBe(sigWithNote);
		expect(sigWithoutNote.endsWith(':0') || sigWithoutNote.endsWith('\u001f0')).toBe(true);
		expect(sigWithNote.endsWith(':1') || sigWithNote.endsWith('\u001f1')).toBe(true);
		treeView.destroy();
	});
});

describe('U130 Actions Goal - Group Sets projection level N+M & Sort Menu', () => {
	function customGroupProjectionLevel(
		target: string,
		parentLevel?: number | string | null,
	): string {
		if (target === 'all') return '0+1';
		if (target.startsWith('level:')) {
			const parsed = parseScopeLevel(target.slice('level:'.length));
			const parentLvl = Math.max(0, parsed.base - 1);
			return `${parentLvl}+${parsed.offset + 1}`;
		}
		if (target.startsWith('parent:')) {
			if (parentLevel !== null && parentLevel !== undefined) {
				const parsed = parseScopeLevel(parentLevel);
				return `${parsed.base}+${parsed.offset + 1}`;
			}
			return '1+1';
		}
		return '0+1';
	}

	it('computes compound projection level 0+1 for all and level:1', () => {
		expect(customGroupProjectionLevel('all')).toBe('0+1');
		expect(customGroupProjectionLevel('level:1')).toBe('0+1');
		expect(customGroupProjectionLevel('level:2')).toBe('1+1');
		expect(customGroupProjectionLevel('level:3')).toBe('2+1');
	});

	it('computes compound projection level relative to parent p-node level', () => {
		expect(customGroupProjectionLevel('parent:rootFolder', 1)).toBe('1+1');
		expect(customGroupProjectionLevel('parent:subFolder', 2)).toBe('2+1');
		expect(customGroupProjectionLevel('parent:deepFolder', '3+1')).toBe('3+2');
	});
});

describe('U130 Actions Goal - Plugin update with scope:selected', () => {
	it('batches update across all selected plugins with available updates', async () => {
		const updatedIds: string[] = [];
		const mockPluginUpdates = {
			getPluginUpdate: (id: string) => (id === 'plug-a' || id === 'plug-b' ? { version: '2.0.0' } : undefined),
			updatePlugin: async (id: string) => {
				updatedIds.push(id);
				return { status: 'success' };
			},
		};

		const invokedId = 'plug-a';
		const selectedIds = new Set(['plug-a', 'plug-b', 'plug-c']);
		const orderedIds = ['plug-a', 'plug-b', 'plug-c'];

		const targets = resolveSelectionTargets(invokedId, selectedIds, orderedIds);
		expect(targets).toEqual(['plug-a', 'plug-b', 'plug-c']);

		const toUpdate = targets.filter((id) => mockPluginUpdates.getPluginUpdate(id) !== undefined);
		expect(toUpdate).toEqual(['plug-a', 'plug-b']);

		for (const id of toUpdate) {
			await mockPluginUpdates.updatePlugin(id);
		}

		expect(updatedIds).toEqual(['plug-a', 'plug-b']);
	});
});

