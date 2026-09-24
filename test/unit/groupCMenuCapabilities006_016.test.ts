import { describe, expect, it, vi } from 'vitest';
import { registerGroupActions } from '../../src/logic/logicGroupContextMenu';
import type { ActionDef, MenuCtx } from '../../src/types/typeCMenu';
import type { TreeNode } from '../../src/types/typeTree';

function node(id: string, label = id, meta: Record<string, unknown> = {}): TreeNode<Record<string, unknown>> {
	return {
		id,
		label,
		depth: 0,
		isGroupHeader: true,
		meta,
	};
}

function getRegisteredActions(): Map<string, ActionDef> {
	const actions = new Map<string, ActionDef>();
	const registerAction = vi.fn((def: ActionDef) => {
		actions.set(def.id, def);
	});
	registerGroupActions({
		contextMenuService: { registerAction },
		app: {
			workspace: {
				getLeaf: vi.fn(() => ({ openFile: vi.fn() })),
			},
		},
	} as never);
	return actions;
}

describe('U130-GGC-006 / U130-GGC-016 — Group CMenu Capabilities Matrix', () => {
	it('registers all required executable SASI actions', () => {
		const actions = getRegisteredActions();
		const expectedIds = [
			'vaultman.group.selected',
			'vaultman.group.degroup-selected',
			'group.materialize-preset',
			'group.make-copy',
			'group.rename',
			'group.open-note',
			'group.update-scope',
			'group.folder.open_tab',
			'group.folder.open_right',
			'group.folder.open_window',
			'group.adjust-range',
			'group.slice-range',
			'group.toggle-expand',
			'group.copy-id',
			'group.icon',
			'group.hide-toggle',
			'group.delete',
		];
		for (const id of expectedIds) {
			expect(actions.has(id), `Missing action ${id}`).toBe(true);
		}
	});

	it('hides Collapse group from panel cmenu without deleting its SASI action', () => {
		const actions = getRegisteredActions();
		const toggleExpand = actions.get('group.toggle-expand')!;
		expect(toggleExpand).toBeDefined();
		// Must NOT be in panel surface (hidden from context menu)
		expect(toggleExpand.surfaces).toEqual([]);
		// But executable via SASI
		const toggleFn = vi.fn();
		const ctx: MenuCtx = {
			nodeType: 'group',
			node: node('group:1'),
			surface: 'panel',
			groupId: 'group:1',
			toggleGroupExpand: toggleFn,
		};
		expect(toggleExpand.when?.(ctx)).toBe(true);
		toggleExpand.run(ctx);
		expect(toggleFn).toHaveBeenCalledWith('group:1');
	});

	describe('Preset group capabilities', () => {
		it('allows Change icon, Copy ID, and Hide for preset groups without changing data', async () => {
			const actions = getRegisteredActions();
			const icon = actions.get('group.icon')!;
			const copyId = actions.get('group.copy-id')!;
			const hide = actions.get('group.hide-toggle')!;
			const del = actions.get('group.delete')!;

			const changeIconFn = vi.fn();
			const hideFn = vi.fn();
			const presetCtx: MenuCtx = {
				nodeType: 'group',
				node: node('preset:words:0_100', '0 – 100 words'),
				surface: 'panel',
				groupId: 'preset:words:0_100',
				groupOwner: 'preset',
				groupHidden: false,
				hideGroup: hideFn,
				changeGroupIcon: changeIconFn,
			};

			// Icon is always allowed
			expect(icon.when?.(presetCtx)).toBe(true);
			expect(icon.disabledReason?.(presetCtx)).toBeNull();
			await icon.run(presetCtx);
			expect(changeIconFn).toHaveBeenCalledTimes(1);

			// Copy ID is allowed
			expect(copyId.when?.(presetCtx)).toBe(true);

			// Hide is allowed
			expect(hide.when?.(presetCtx)).toBe(true);
			hide.run(presetCtx);
			expect(hideFn).toHaveBeenCalledWith('preset:words:0_100', true);

			// Delete is completely HIDDEN for preset
			expect(del.when?.(presetCtx)).toBe(false);
		});

		it('shows adjust-range and slice-range ONLY when range handlers exist (counter/date)', () => {
			const actions = getRegisteredActions();
			const adjust = actions.get('group.adjust-range')!;
			const slice = actions.get('group.slice-range')!;

			const adjustFn = vi.fn();
			const sliceFn = vi.fn();

			// Counter preset with range handlers
			const counterCtx: MenuCtx = {
				nodeType: 'group',
				node: node('preset:counter'),
				surface: 'panel',
				groupId: 'preset:counter',
				groupOwner: 'preset',
				adjustGroupRange: adjustFn,
				sliceGroupRange: sliceFn,
			};
			expect(adjust.when?.(counterCtx)).toBe(true);
			expect(slice.when?.(counterCtx)).toBe(true);

			adjust.run(counterCtx);
			expect(adjustFn).toHaveBeenCalledTimes(1);
			slice.run(counterCtx);
			expect(sliceFn).toHaveBeenCalledTimes(1);

			// Non-counter preset without range handlers -> completely hidden
			const letterCtx: MenuCtx = {
				nodeType: 'group',
				node: node('preset:letter'),
				surface: 'panel',
				groupId: 'preset:letter',
				groupOwner: 'preset',
			};
			expect(adjust.when?.(letterCtx)).toBe(false);
			expect(slice.when?.(letterCtx)).toBe(false);
		});

		it('shows materialize-preset and make-copy only when materialize handler exists', async () => {
			const actions = getRegisteredActions();
			const mat = actions.get('group.materialize-preset')!;
			const copy = actions.get('group.make-copy')!;

			const matFn = vi.fn(async () => ({ status: 'committed' as const, groupId: 'custom:1', affectedUrns: [] }));
			const withMatCtx: MenuCtx = {
				nodeType: 'group',
				node: node('preset:bucket'),
				surface: 'panel',
				groupId: 'preset:bucket',
				groupOwner: 'preset',
				materializePreset: matFn,
			};
			expect(mat.when?.(withMatCtx)).toBe(true);
			expect(copy.when?.(withMatCtx)).toBe(true);

			await mat.run(withMatCtx);
			expect(matFn).toHaveBeenCalledTimes(1);

			await copy.run(withMatCtx);
			expect(matFn).toHaveBeenCalledTimes(2);

			const withoutMatCtx: MenuCtx = {
				nodeType: 'group',
				node: node('preset:bucket'),
				surface: 'panel',
				groupId: 'preset:bucket',
				groupOwner: 'preset',
			};
			expect(mat.when?.(withoutMatCtx)).toBe(false);
			expect(copy.when?.(withoutMatCtx)).toBe(false);
		});

		it('hides rename and open-note for preset groups', () => {
			const actions = getRegisteredActions();
			const rename = actions.get('group.rename')!;
			const openNote = actions.get('group.open-note')!;

			const presetCtx: MenuCtx = {
				nodeType: 'group',
				node: node('preset:1'),
				surface: 'panel',
				groupId: 'preset:1',
				groupOwner: 'preset',
			};
			expect(rename.when?.(presetCtx)).toBe(false);
			expect(openNote.when?.(presetCtx)).toBe(false);
		});
	});

	describe('Custom group capabilities', () => {
		it('allows Change icon, Rename, Make a copy, Hide, and Delete for custom groups', async () => {
			const actions = getRegisteredActions();
			const icon = actions.get('group.icon')!;
			const rename = actions.get('group.rename')!;
			const copy = actions.get('group.make-copy')!;
			const hide = actions.get('group.hide-toggle')!;
			const del = actions.get('group.delete')!;

			const renameFn = vi.fn();
			const copyFn = vi.fn(async () => ({ status: 'committed' as const, groupId: 'custom:copy', affectedUrns: [] }));
			const hideFn = vi.fn();
			const delFn = vi.fn();
			const iconFn = vi.fn();

			const customCtx: MenuCtx = {
				nodeType: 'group',
				node: node('custom:work', 'Work'),
				surface: 'panel',
				groupId: 'custom:work',
				groupOwner: 'custom',
				groupHidden: false,
				changeGroupIcon: iconFn,
				renameGroup: renameFn,
				makeACopy: copyFn,
				hideGroup: hideFn,
				deleteGroup: delFn,
			};

			expect(icon.when?.(customCtx)).toBe(true);
			await icon.run(customCtx);
			expect(iconFn).toHaveBeenCalledTimes(1);

			expect(rename.when?.(customCtx)).toBe(true);
			await rename.run(customCtx);
			expect(renameFn).toHaveBeenCalledWith('custom:work');

			expect(copy.when?.(customCtx)).toBe(true);
			await copy.run(customCtx);
			expect(copyFn).toHaveBeenCalledTimes(1);

			expect(hide.when?.(customCtx)).toBe(true);
			hide.run(customCtx);
			expect(hideFn).toHaveBeenCalledWith('custom:work', true);

			expect(del.when?.(customCtx)).toBe(true);
			del.run(customCtx);
			expect(delFn).toHaveBeenCalledWith('custom:work');
		});

		it('hides adjust-range, slice-range, and materialize-preset on custom groups', () => {
			const actions = getRegisteredActions();
			const adjust = actions.get('group.adjust-range')!;
			const slice = actions.get('group.slice-range')!;
			const mat = actions.get('group.materialize-preset')!;

			const customCtx: MenuCtx = {
				nodeType: 'group',
				node: node('custom:work'),
				surface: 'panel',
				groupId: 'custom:work',
				groupOwner: 'custom',
			};
			expect(adjust.when?.(customCtx)).toBe(false);
			expect(slice.when?.(customCtx)).toBe(false);
			expect(mat.when?.(customCtx)).toBe(false);
		});
	});

	describe('Note group capabilities (Props/Tags Reveal)', () => {
		it('allows Open note, Rename, Hide, and Delete for note groups', async () => {
			const actions = getRegisteredActions();
			const openNote = actions.get('group.open-note')!;
			const rename = actions.get('group.rename')!;
			const del = actions.get('group.delete')!;

			const openNoteFn = vi.fn();
			const renameFn = vi.fn();
			const delFn = vi.fn();

			const noteCtx: MenuCtx = {
				nodeType: 'group',
				node: node('note:Daily', 'Daily'),
				surface: 'panel',
				groupId: 'note:Daily',
				groupOwner: 'note',
				openNodeNote: openNoteFn,
				renameGroup: renameFn,
				deleteGroup: delFn,
			};

			expect(openNote.when?.(noteCtx)).toBe(true);
			await openNote.run(noteCtx);
			expect(openNoteFn).toHaveBeenCalledTimes(1);

			expect(rename.when?.(noteCtx)).toBe(true);
			await rename.run(noteCtx);
			expect(renameFn).toHaveBeenCalledWith('note:Daily');

			expect(del.when?.(noteCtx)).toBe(true);
			del.run(noteCtx);
			expect(delFn).toHaveBeenCalledWith('note:Daily');
		});
	});

	describe('Files node_folder group capabilities', () => {
		it('offers open in tab/right/window when group wraps a folder in Files', async () => {
			const actions = getRegisteredActions();
			const openTab = actions.get('group.folder.open_tab')!;
			const openRight = actions.get('group.folder.open_right')!;
			const openWindow = actions.get('group.folder.open_window')!;

			const mockFolder = { path: 'Projects/Vaultman' } as never;
			const folderGroupCtx: MenuCtx = {
				nodeType: 'group',
				node: node('group:folder', 'Projects/Vaultman', { folder: mockFolder }),
				surface: 'panel',
				groupId: 'group:folder',
				groupOwner: 'preset',
			};

			expect(openTab.when?.(folderGroupCtx)).toBe(true);
			expect(openRight.when?.(folderGroupCtx)).toBe(true);
			expect(openWindow.when?.(folderGroupCtx)).toBe(true);

			// Non-folder group -> hidden
			const plainGroupCtx: MenuCtx = {
				nodeType: 'group',
				node: node('group:plain', 'Plain Group', {}),
				surface: 'panel',
				groupId: 'group:plain',
				groupOwner: 'preset',
			};
			expect(openTab.when?.(plainGroupCtx)).toBe(false);
			expect(openRight.when?.(plainGroupCtx)).toBe(false);
			expect(openWindow.when?.(plainGroupCtx)).toBe(false);
		});
	});
});
