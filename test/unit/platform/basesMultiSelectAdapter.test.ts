// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Menu, type App, type Plugin, type TFile } from 'obsidian';
import { mockApp, mockTFile } from '../../helpers/obsidian-mocks';
import { PlatformAdapterRegistry } from '../../../src/platform/fragilityRegistry';
import {
	BASES_NATIVE_MENU_ENHANCED_CLASS,
	BASES_ROOT_SELECTOR,
	BASES_SELECTED_ROW_SELECTOR,
	BasesMultiSelectAdapter,
	collectBasesSelectedFiles,
	pathFromBasesRow,
} from '../../../src/platform/adapters/basesMultiSelectAdapter';
import type {
	FragilityRecord,
	PlatformAdapter,
	PlatformAdapterContext,
} from '../../../src/platform/platformAdapter';
import type { PendingChange } from '../../../src/types/typeOps';
import { DELETE_FILE } from '../../../src/types/typeOps';
import type { PropertyIndexService } from '../../../src/index/utilPropIndex';

function propertyIndex(): PropertyIndexService {
	return {
		getPropertyNames: () => [],
		getPropertyValues: () => [],
	} as unknown as PropertyIndexService;
}

function makeCtx(
	app: App,
	plugin: Plugin = {} as Plugin,
	doc: Document = document,
): PlatformAdapterContext {
	return { app, plugin, doc };
}

function adapterDeps(overrides: Partial<ConstructorParameters<typeof BasesMultiSelectAdapter>[0]> = {}) {
	const enqueued: PendingChange[] = [];
	const scheduled: Array<() => void> = [];
	const menus: Menu[] = [];
	const adapter = new BasesMultiSelectAdapter({
		propertyIndex: propertyIndex(),
		enqueue: (change) => {
			enqueued.push(change);
		},
		defer: (callback) => {
			scheduled.push(callback);
			return callback;
		},
		cancelDefer: vi.fn(),
		menuFactory: () => {
			const menu = new Menu();
			menus.push(menu);
			return menu;
		},
		...overrides,
	});
	return { adapter, enqueued, scheduled, menus };
}

function basesRoot(): HTMLElement {
	const root = document.createElement('div');
	root.className = 'bases-view';
	document.body.appendChild(root);
	return root;
}

function row(path: string, selected = true): HTMLElement {
	const el = document.createElement('div');
	el.className = selected ? 'bases-tr is-selected' : 'bases-tr';
	el.dataset.path = path;
	return el;
}

function contextmenu(target: HTMLElement): void {
	target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
}

function fragility(id: string): FragilityRecord {
	return {
		id,
		title: id,
		summary: id,
		privateSymbols: [],
		selectorSources: [],
		obsidianAssumptions: [],
		fallback: 'none',
		mobile: { supported: 'unknown', notes: '' },
	};
}

beforeEach(() => {
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

describe('BasesMultiSelectAdapter — Bases DOM scraping', () => {
	it('collects selected Bases rows plus the clicked row, resolves TFiles, and dedupes paths', () => {
		const one = mockTFile('one.md') as unknown as TFile;
		const two = mockTFile('two.md') as unknown as TFile;
		const app = mockApp({ files: [one as never, two as never] }) as unknown as App;
		const root = basesRoot();
		const selectedOne = row('one.md');
		const selectedDuplicate = row('one.md');
		const clickedUnselected = row('two.md', false);
		const missing = row('missing.md');
		root.append(selectedOne, selectedDuplicate, clickedUnselected, missing);

		expect(pathFromBasesRow(selectedOne)).toBe('one.md');
		expect(collectBasesSelectedFiles(app, root, clickedUnselected)).toEqual([one, two]);
	});
});

describe('BasesMultiSelectAdapter — probe + registry isolation', () => {
	it('probe-fail disables the adapter through the registry and leaves the document clean', async () => {
		const { adapter, scheduled, menus } = adapterDeps();
		const registry = new PlatformAdapterRegistry().add(adapter);
		const status = await registry.activate(makeCtx({} as App));

		contextmenu(document.body);
		await registry.deactivate();

		expect(status).toEqual([
			{
				id: 'bases-multi-select',
				enabled: false,
				reason: 'app.vault.getAbstractFileByPath is not available',
			},
		]);
		expect(scheduled).toHaveLength(0);
		expect(menus).toHaveLength(0);
		expect(document.querySelector(`.${BASES_NATIVE_MENU_ENHANCED_CLASS}`)).toBeNull();
	});

	it('registry isolates another adapter that throws while Bases multi-select still loads', async () => {
		const one = mockTFile('one.md') as unknown as TFile;
		const two = mockTFile('two.md') as unknown as TFile;
		const app = mockApp({ files: [one as never, two as never] }) as unknown as App;
		const { adapter, scheduled } = adapterDeps();
		const throwing: PlatformAdapter = {
			id: 'throwing',
			fragility: fragility('throwing'),
			probe: () => ({ ok: true }),
			apply: () => {
				throw new Error('apply-boom');
			},
			revert: vi.fn(),
		};
		const registry = new PlatformAdapterRegistry().add(throwing).add(adapter);

		const status = await registry.activate(makeCtx(app));
		const root = basesRoot();
		root.append(row('one.md'), row('two.md'));
		const nativeMenu = document.createElement('div');
		nativeMenu.className = 'menu';
		document.body.appendChild(nativeMenu);
		contextmenu(root.querySelector<HTMLElement>('.bases-tr')!);
		scheduled.forEach((callback) => callback());

		expect(status[0]).toMatchObject({ id: 'throwing', enabled: false });
		expect(status[1]).toMatchObject({ id: 'bases-multi-select', enabled: true });
		expect(nativeMenu.classList.contains(BASES_NATIVE_MENU_ENHANCED_CLASS)).toBe(true);
	});
});

describe('BasesMultiSelectAdapter — native menu, fallback, and revert', () => {
	it('injects native Bases operations, queues delete, and revert removes injected DOM residue', () => {
		const one = mockTFile('one.md') as unknown as TFile;
		const two = mockTFile('two.md') as unknown as TFile;
		const app = mockApp({ files: [one as never, two as never] }) as unknown as App;
		const { adapter, enqueued, scheduled } = adapterDeps();
		const root = basesRoot();
		root.append(row('one.md'), row('two.md'));
		const nativeMenu = document.createElement('div');
		nativeMenu.className = 'menu';
		document.body.appendChild(nativeMenu);

		adapter.apply(makeCtx(app));
		contextmenu(root.querySelector<HTMLElement>('.bases-tr')!);
		expect(scheduled).toHaveLength(1);
		scheduled[0]();

		const items = nativeMenu.querySelectorAll('.vm-bases-menu-item');
		expect(items).toHaveLength(4);
		expect(nativeMenu.textContent).toContain('Vaultman: add property');
		expect(nativeMenu.textContent).toContain('Vaultman: rename files');
		expect(nativeMenu.textContent).toContain('Vaultman: move files');
		expect(nativeMenu.textContent).toContain('Vaultman: delete files');

		items[3].dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(enqueued).toHaveLength(1);
		expect(enqueued[0]).toMatchObject({
			type: 'file_delete',
			action: 'delete',
			files: [one, two],
			customLogic: true,
		});
		expect(enqueued[0].logicFunc(one, {})).toEqual({ [DELETE_FILE]: true });

		adapter.revert();
		adapter.revert();
		expect(nativeMenu.classList.contains(BASES_NATIVE_MENU_ENHANCED_CLASS)).toBe(false);
		expect(nativeMenu.querySelector('.vm-bases-menu-item')).toBeNull();
		expect(nativeMenu.querySelector('.vm-bases-menu-separator')).toBeNull();
	});

	it('opens the injected fallback Menu when no native menu is present', () => {
		const one = mockTFile('one.md') as unknown as TFile;
		const two = mockTFile('two.md') as unknown as TFile;
		const app = mockApp({ files: [one as never, two as never] }) as unknown as App;
		const { adapter, enqueued, scheduled, menus } = adapterDeps();
		const root = basesRoot();
		root.append(row('one.md'), row('two.md'));

		adapter.apply(makeCtx(app));
		contextmenu(root.querySelector<HTMLElement>('.bases-tr')!);
		scheduled[0]();

		expect(menus).toHaveLength(1);
		expect(menus[0].items.map((item) => item.title)).toEqual([
			'Vaultman: add property',
			'Vaultman: rename files',
			'Vaultman: move files',
			'Vaultman: delete files',
		]);
		menus[0].items[3].onClick?.();
		expect(enqueued).toHaveLength(1);
		expect(enqueued[0].files).toEqual([one, two]);
	});

	it('revert removes listeners and cancels pending native-menu injection', () => {
		const one = mockTFile('one.md') as unknown as TFile;
		const two = mockTFile('two.md') as unknown as TFile;
		const app = mockApp({ files: [one as never, two as never] }) as unknown as App;
		const cancelDefer = vi.fn();
		const { adapter, scheduled, menus } = adapterDeps({ cancelDefer });
		const root = basesRoot();
		root.append(row('one.md'), row('two.md'));

		adapter.apply(makeCtx(app));
		contextmenu(root.querySelector<HTMLElement>('.bases-tr')!);
		adapter.revert();
		scheduled[0]();
		contextmenu(root.querySelector<HTMLElement>('.bases-tr')!);

		expect(cancelDefer).toHaveBeenCalledOnce();
		expect(scheduled).toHaveLength(1);
		expect(menus).toHaveLength(0);
	});
});

describe('BasesMultiSelectAdapter — fragility record', () => {
	it('declares Bases selectors, native menu selectors, assumptions, and mobile behavior', () => {
		const { adapter } = adapterDeps();

		expect(adapter.id).toBe(adapter.fragility.id);
		expect(adapter.id).toBe('bases-multi-select');
		expect(adapter.fragility.selectorSources).toEqual(
			expect.arrayContaining([BASES_ROOT_SELECTOR, BASES_SELECTED_ROW_SELECTOR, '.menu']),
		);
		expect(adapter.fragility.privateSymbols).toEqual(
			expect.arrayContaining([
				'Obsidian Bases selected-row DOM',
				'Obsidian native Menu DOM',
			]),
		);
		expect(adapter.fragility.obsidianAssumptions.join(' ')).toContain('data-path');
		expect(adapter.fragility.mobile.supported).toBe('degraded');
		expect(adapter.fragility.mobile.notes).toContain('contextmenu');
	});
});
