import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import {
	registerGroupActions,
	resolveGroupCopyId,
	writeGroupCopyIdToClipboard,
} from '../../src/logic/logicGroupContextMenu';
import { translate } from '../../src/i18n/index';
import type { ActionDef, MenuCtx } from '../../src/types/typeCMenu';
import type { TreeNode } from '../../src/types/typeTree';

vi.mock('obsidian', async (importOriginal) => {
	const actual = await importOriginal() as Record<string, unknown>;
	const store: string[] = [];
	(globalThis as unknown as { __copyNotices?: string[] }).__copyNotices = store;
	class MockNotice {
		constructor(message: string) {
			store.push(message);
		}
	}
	return { ...actual, Notice: MockNotice };
});

function notices(): string[] {
	return (globalThis as unknown as { __copyNotices?: string[] }).__copyNotices ?? [];
}

function node(id: string, entityId?: string): TreeNode<null> {
	return { id, label: id, depth: 0, meta: null, ...(entityId ? { entityId } : {}) };
}

function copyAction(): ActionDef {
	const registerAction = vi.fn();
	registerGroupActions({ contextMenuService: { registerAction } } as never);
	const action = registerAction.mock.calls
		.map(([entry]) => entry as ActionDef)
		.find((entry) => entry.id === 'group.copy-id');
	if (!action) throw new Error('group.copy-id was not registered');
	return action;
}

const COPIED = (): string => translate('settings.data_transfer.export.copied');
const FAILED = (): string => translate('group.copy.failed');

describe('U130-GGC-020 — Copy group id usa el ID estable invocado', () => {
	const navDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
	const docDesc = Object.getOwnPropertyDescriptor(globalThis, 'document');

	beforeEach(() => {
		notices().length = 0;
		vi.unstubAllGlobals();
	});

	afterEach(() => {
		if (navDesc) Object.defineProperty(globalThis, 'navigator', navDesc);
		else Reflect.deleteProperty(globalThis as object, 'navigator');
		if (docDesc) Object.defineProperty(globalThis, 'document', docDesc);
		else Reflect.deleteProperty(globalThis as object, 'document');
		notices().length = 0;
	});

	it('prefiere entityId canonico sobre groupId/rowId de ocurrencia', () => {
		const scopedRow = 'vaultman.group.header:vaultman.custom.v1%3Alevel%3A1%3AWork:Work';
		const ctx: MenuCtx = {
			nodeType: 'group',
			node: node(scopedRow, 'Work'),
			surface: 'panel',
			// Snippets/Plugins propagan groupId = rowId (ocurrencia).
			groupId: scopedRow,
		};
		expect(resolveGroupCopyId(ctx)).toBe('Work');
	});

	it('usa groupId cuando no hay entityId, y node.id solo como ultimo recurso', () => {
		expect(
			resolveGroupCopyId({
				nodeType: 'group',
				node: node('vaultman.group.header:x:y'),
				surface: 'panel',
				groupId: 'vaultman.group.preset:A',
			}),
		).toBe('vaultman.group.preset:A');
		expect(
			resolveGroupCopyId({
				nodeType: 'group',
				node: node('Work'),
				surface: 'panel',
			}),
		).toBe('Work');
	});

	it('copia exactamente el ID estable y da feedback de exito sin promesa flotante', async () => {
		const writeText = vi.fn(async (_text: string) => {});
		vi.stubGlobal('navigator', { clipboard: { writeText } });
		const action = copyAction();
		const ctx: MenuCtx = {
			nodeType: 'group',
			node: node('vaultman.group.header:owner:Work', 'Work'),
			surface: 'panel',
			groupId: 'vaultman.group.header:owner:Work',
		};
		const pending = action.run(ctx) as unknown as Promise<unknown>;
		expect(pending instanceof Promise).toBe(true);
		await pending;
		expect(writeText).toHaveBeenCalledTimes(1);
		expect(writeText).toHaveBeenCalledWith('Work');
		expect(notices()).toContain(COPIED());
	});

	it('no copia el ID de otra ocurrencia: cada ctx copia el suyo', async () => {
		const seen: string[] = [];
		vi.stubGlobal('navigator', {
			clipboard: {
				writeText: vi.fn(async (text: string) => {
					seen.push(text);
				}),
			},
		});
		const action = copyAction();
		const a: MenuCtx = {
			nodeType: 'group',
			node: node('vaultman.group.header:o:A', 'A'),
			surface: 'panel',
			groupId: 'row-a',
		};
		const b: MenuCtx = {
			nodeType: 'group',
			node: node('vaultman.group.header:o:B', 'B'),
			surface: 'panel',
			groupId: 'row-b',
		};
		await action.run(a);
		await action.run(b);
		expect(seen).toEqual(['A', 'B']);
	});

	it('rechazo de Clipboard API muestra error y no lanza', async () => {
		vi.stubGlobal('navigator', {
			clipboard: { writeText: vi.fn(async () => { throw new Error('denied'); }) },
		});
		// Sin document: el fallback legacy no puede correr y debe fallar limpio.
		vi.stubGlobal('document', undefined);
		const action = copyAction();
		const ctx: MenuCtx = {
			nodeType: 'group',
			node: node('Work', 'Work'),
			surface: 'panel',
			groupId: 'Work',
		};
		await expect(action.run(ctx)).resolves.toBeUndefined();
		expect(notices()).toContain(FAILED());
		expect(notices()).not.toContain(COPIED());
	});

	it('capability ausente usa fallback legacy sin throw', async () => {
		vi.stubGlobal('navigator', {});
		const execCommand = vi.fn(() => true);
		const appended: unknown[] = [];
		const area = {
			value: '',
			style: {} as Record<string, string>,
			setAttribute: vi.fn(),
			select: vi.fn(),
			setSelectionRange: vi.fn(),
			remove: vi.fn(),
		};
		vi.stubGlobal('document', {
			createElement: vi.fn(() => area),
			body: { appendChild: vi.fn((el: unknown) => { appended.push(el); }) },
			execCommand,
		});
		const ok = await writeGroupCopyIdToClipboard('Work');
		expect(ok).toBe(true);
		expect(execCommand).toHaveBeenCalledWith('copy');
		expect(area.value).toBe('Work');
		expect(appended).toHaveLength(1);

		notices().length = 0;
		const action = copyAction();
		await action.run({
			nodeType: 'group',
			node: node('row', 'Work'),
			surface: 'panel',
			groupId: 'row',
		});
		expect(notices()).toContain(COPIED());
	});

	it('sin clipboard ni document muestra failed sin throw', async () => {
		vi.stubGlobal('navigator', {});
		vi.stubGlobal('document', undefined);
		const action = copyAction();
		await expect(
			action.run({ nodeType: 'group', node: node('Work'), surface: 'panel' }),
		).resolves.toBeUndefined();
		expect(notices()).toContain(FAILED());
	});
});
