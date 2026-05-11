import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ContentTab from '../../src/components/pages/tabContent.svelte';
import type {
	ActiveFilterEntry,
	ContentMatch,
	INodeIndex,
	QueueChange,
} from '../../src/types/typeContracts';
import type { VaultmanPlugin } from '../../src/main';
import { mockApp, mockTFile, type TFile } from '../helpers/obsidian-mocks';

class MutableIndex<TNode extends { id: string }> implements INodeIndex<TNode> {
	private current: TNode[] = [];
	private subs = new Set<() => void>();
	private currentRevision = 0;

	get nodes(): readonly TNode[] {
		return this.current;
	}

	get flatIds(): readonly string[] {
		return this.current.map((node) => node.id);
	}

	get revision(): number {
		return this.currentRevision;
	}

	async refresh(): Promise<void> {
		this.emit(this.current);
	}

	subscribe(cb: () => void): () => void {
		this.subs.add(cb);
		return () => this.subs.delete(cb);
	}

	byId(id: string): TNode | undefined {
		return this.current.find((node) => node.id === id);
	}

	getSearchBuffer(id: string): string {
		return this.byId(id)?.id.toLowerCase() ?? '';
	}

	emit(nodes: TNode[]): void {
		this.current = nodes;
		this.currentRevision += 1;
		for (const cb of this.subs) cb();
	}
}

function buildPlugin(): VaultmanPlugin {
	const file = mockTFile('note.md') as TFile;
	const contentIndex = new MutableIndex<ContentMatch>();
	return {
		app: mockApp({ files: [file] }),
		contentIndex: Object.assign(contentIndex, { setQuery: vi.fn() }),
		filterService: {
			filteredFiles: [file],
			selectedFiles: [],
		},
		queueService: {
			add: vi.fn(),
			remove: vi.fn(),
		},
		operationsIndex: new MutableIndex<QueueChange>(),
		activeFiltersIndex: new MutableIndex<ActiveFilterEntry>(),
		viewService: {
			clearSelection: vi.fn(),
			select: vi.fn(),
			setFocused: vi.fn(),
		},
		propertyIndex: { fileCount: 1 },
		contextMenuService: { openPanelMenu: vi.fn() },
	} as unknown as VaultmanPlugin;
}

describe('ContentTab single-input collapse', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe(): void {}
				disconnect(): void {}
			},
		);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.unstubAllGlobals();
	});

	it('renders exactly one .vm-content-fnr-input', () => {
		const plugin = buildPlugin();
		app = mount(ContentTab as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin, query: '' },
		});
		flushSync();

		const inputs = target.querySelectorAll('input.vm-content-fnr-input');
		expect(inputs.length).toBe(1);
	});

	it('exposes a single mode pill that toggles search ↔ replace without producing duplicate inputs', () => {
		const plugin = buildPlugin();
		app = mount(ContentTab as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin, query: '' },
		});
		flushSync();

		const pill = target.querySelector<HTMLButtonElement>('.vm-content-fnr-modepill');
		expect(pill).toBeTruthy();
		expect(pill!.dataset.mode).toBe('search');

		// Initial state: input is bound to the search query
		let input = target.querySelector<HTMLInputElement>('input.vm-content-fnr-input');
		expect(input).toBeTruthy();
		expect(input!.getAttribute('aria-label')).toBe('Find in content…');

		pill!.click();
		flushSync();

		// After toggling, still only one input
		const inputsAfter = target.querySelectorAll('input.vm-content-fnr-input');
		expect(inputsAfter.length).toBe(1);

		// And it now binds the replacement value
		input = target.querySelector<HTMLInputElement>('input.vm-content-fnr-input');
		expect(input!.getAttribute('aria-label')).toBe('Replace with…');
		expect(target.querySelector<HTMLButtonElement>('.vm-content-fnr-modepill')!.dataset.mode).toBe(
			'replace',
		);
	});
});
