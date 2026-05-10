import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import Toolbar from '../../src/components/layout/Toolbar.svelte';
import { FnRIslandService } from '../../src/services/serviceFnRIsland.svelte';

function baseProps(
	service: FnRIslandService,
	overrides: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		activeTab: 'tags',
		filtersSearch: 'newtag',
		filtersSearchCategory: { tags: 0, props: 0, files: 0, content: 0 },
		onSearchChange: vi.fn(),
		searchHistory: [],
		onSearchHistoryCommit: vi.fn(),
		sortBy: 'name',
		sortDirection: 'asc' as const,
		viewMode: 'tree',
		addMode: false,
		operationScope: 'auto' as const,
		filesShowSelectedOnly: false,
		tagsExplorer: undefined,
		propExplorer: undefined,
		fileList: undefined,
		nodeExpansionSummary: { canToggle: false, hasExpandedParents: false },
		icon: vi.fn(() => ({ update: vi.fn() })),
		addOpCount: 0,
		fnrIslandService: service,
		onCrear: vi.fn(),
		...overrides,
	};
}

describe('Toolbar crear button', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
	});

	it('enables the crear button for the tag explorer and dispatches one queue.add', () => {
		const service = new FnRIslandService();
		const queueAdd = vi.fn();
		app = mount(Toolbar as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps(service, {
				activeTab: 'tags',
				filtersSearch: 'newtag',
				onCrear: queueAdd,
			}),
		});
		flushSync();

		const crear = target.querySelector<HTMLButtonElement>('.vm-filters-crear');
		expect(crear).toBeTruthy();
		expect(crear!.disabled).toBe(false);

		crear!.click();
		flushSync();

		expect(queueAdd).toHaveBeenCalledTimes(1);
		const change = queueAdd.mock.calls[0][0];
		expect(change.type).toBe('tag');
		expect(change.action).toBe('add');
		expect(change.tag).toBe('newtag');
	});

	it('renders the crear button disabled for the content explorer', () => {
		const service = new FnRIslandService();
		const queueAdd = vi.fn();
		app = mount(Toolbar as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps(service, {
				activeTab: 'content',
				filtersSearch: 'whatever',
				onCrear: queueAdd,
			}),
		});
		flushSync();

		const crear = target.querySelector<HTMLButtonElement>('.vm-filters-crear');
		expect(crear).toBeTruthy();
		expect(crear!.disabled).toBe(true);
		expect(crear!.title).toBe('no soportado por este explorer');

		crear!.click();
		flushSync();

		expect(queueAdd).not.toHaveBeenCalled();
	});
});
