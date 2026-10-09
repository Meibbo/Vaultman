// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { TFile, TFolder } from 'obsidian';
import { beginNativeExplorerDrag, nativeExplorerDragManager, type NativeExplorerDragManager } from '../../src/logic/logicNativeExplorerDragStart';

function fixture() {
	const event = new MouseEvent('dragstart');
	const dragEvent: DragEvent = Object.assign(event, { dataTransfer: null });
	const file = Object.assign(new TFile(), { path: 'a.md', name: 'a.md' });
	const folder = Object.assign(new TFolder(), { path: 'dir', name: 'dir' });
	const manager: NativeExplorerDragManager = {
		dragFile: vi.fn(() => ({ type: 'file', title: 'a' })),
		dragFolder: vi.fn(() => ({ type: 'folder', title: 'dir' })),
		dragFiles: vi.fn(() => ({ type: 'files', title: '2 items' })),
		onDragStart: vi.fn(), updateSource: vi.fn(),
	};
	return { event: dragEvent, file, folder, manager, sourceElements: [document.createElement('div')], isRenaming: false };
}

describe('native FileExplorer drag lifecycle entry', () => {
	it('starts a file through the native lifecycle without inventing a source identity', () => {
		const input = fixture();
		expect(beginNativeExplorerDrag({ ...input, entries: [{ kind: 'file', file: input.file }] })).toBe(true);
		expect(input.manager.dragFile).toHaveBeenCalledWith(input.event, input.file);
		expect(input.manager.onDragStart).toHaveBeenCalledWith(input.event, { type: 'file', title: 'a' });
		expect(input.manager.updateSource).toHaveBeenCalledWith(input.sourceElements, 'is-being-dragged');
	});
	it('uses the native single-folder descriptor instead of a one-item files drag', () => {
		const input = fixture();
		beginNativeExplorerDrag({ ...input, entries: [{ kind: 'folder', file: input.folder }] });
		expect(input.manager.dragFolder).toHaveBeenCalledWith(input.event, input.folder);
		expect(input.manager.dragFiles).not.toHaveBeenCalled();
		expect(input.manager.onDragStart).toHaveBeenCalledOnce();
	});
	it('keeps mixed file/folder sources in one native drag and highlights every mounted source', () => {
		const input = fixture();
		beginNativeExplorerDrag({ ...input, entries: [{ kind: 'file', file: input.file }, { kind: 'folder', file: input.folder }] });
		expect(input.manager.dragFiles).toHaveBeenCalledWith(input.event, [input.file, input.folder]);
		expect(input.manager.onDragStart).toHaveBeenCalledOnce();
	});
	it('does not initialize a native drag during rename', () => {
		const input = fixture();
		expect(beginNativeExplorerDrag({ ...input, entries: [{ kind: 'file', file: input.file }], isRenaming: true })).toBe(false);
		expect(input.manager.onDragStart).not.toHaveBeenCalled();
	});
	it('rejects incomplete SDK capabilities instead of manually planting draggable', () => {
		expect(nativeExplorerDragManager({ dragFile: () => ({ type: 'file' }) })).toBeNull();
		expect(nativeExplorerDragManager(fixture().manager)).not.toBeNull();
	});
});
