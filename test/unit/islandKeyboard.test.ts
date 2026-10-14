import { describe, expect, it, vi } from 'vitest';

import {
	focusFirstIslandControl,
	handleIslandKeydown,
	trapIslandTabKey,
	wireIslandButton,
} from '../../src/utils/islandKeyboard';
import { ActiveFiltersIslandComponent } from '../../src/components/layout/islandActiveFilters';
import { QueueIslandComponent } from '../../src/components/layout/islandQueue';
import type { VaultmanPlugin } from '../../src/main';

function focusable() {
	return {
		focus: vi.fn(),
		hasAttribute: () => false,
		getAttribute: () => null,
		getClientRects: () => [{}],
		closest: () => null,
	};
}

function islandWith(activeElement: unknown, elements: unknown[]) {
	return {
		querySelectorAll: () => elements,
		ownerDocument: { activeElement },
		focus: vi.fn(),
	};
}

function tabEvent(shiftKey = false) {
	return {
		key: 'Tab',
		shiftKey,
		preventDefault: vi.fn(),
	} as unknown as KeyboardEvent;
}

function createFakeDom() {
	const document = { activeElement: null as FakeElement | null, defaultView: null };

	interface FakeElement {
		attributes: Map<string, string>;
		classes: Set<string>;
		children: FakeElement[];
		listeners: Map<string, Array<(event: KeyboardEvent) => void>>;
		ownerDocument: typeof document;
		innerText: string;
		setAttribute(name: string, value: string): void;
		getAttribute(name: string): string | null;
		hasAttribute(name: string): boolean;
		addClass(name: string): void;
		removeClass(name: string): void;
		toggleClass(name: string, force?: boolean): void;
		addEventListener(name: string, listener: (event: KeyboardEvent) => void): void;
		createDiv(options?: { cls?: string; attr?: Record<string, string>; text?: string }): FakeElement;
		createSpan(options?: { cls?: string; text?: string }): FakeElement;
		createEl(tag: string, options?: { cls?: string }): FakeElement;
		empty(): void;
		setText(text: string): void;
		querySelectorAll(selector: string): FakeElement[];
		getClientRects(): object[];
		closest(): null;
		focus(): void;
		remove(): void;
	}

	function createElement(
		cls = '',
		attributes: Record<string, string> = {},
	): FakeElement {
		const element: FakeElement = {
			attributes: new Map(Object.entries(attributes)),
			classes: new Set(cls.split(' ').filter(Boolean)),
			children: [],
			listeners: new Map(),
			ownerDocument: document,
			innerText: '',
			setAttribute(name, value) {
				this.attributes.set(name, value);
			},
			getAttribute(name) {
				return this.attributes.get(name) ?? null;
			},
			hasAttribute(name) {
				return this.attributes.has(name);
			},
			addClass(name) {
				this.classes.add(name);
			},
			removeClass(name) {
				this.classes.delete(name);
			},
			toggleClass(name, force) {
				const enabled = force ?? !this.classes.has(name);
				if (enabled) this.classes.add(name);
				else this.classes.delete(name);
			},
			addEventListener(name, listener) {
				const listeners = this.listeners.get(name) ?? [];
				listeners.push(listener);
				this.listeners.set(name, listeners);
			},
			createDiv(options) {
				const child = createElement(options?.cls, options?.attr);
				child.innerText = options?.text ?? '';
				this.children.push(child);
				return child;
			},
			createSpan(options) {
				return this.createDiv({ cls: options?.cls, text: options?.text });
			},
			createEl(_tag, options) {
				return this.createDiv({ cls: options?.cls });
			},
			empty() {
				this.children = [];
			},
			setText(text) {
				this.innerText = text;
			},
			querySelectorAll(selector) {
				const all: FakeElement[] = [];
				const visit = (node: FakeElement) => {
					for (const child of node.children) {
						all.push(child);
						visit(child);
					}
				};
				visit(this);
				if (!selector.includes('[role="button"]')) return [];
				return all.filter(
					(node) =>
						node.getAttribute('role') === 'button' &&
						node.getAttribute('tabindex') !== null &&
						node.getAttribute('tabindex') !== '-1',
				);
			},
			getClientRects() {
				return [{}];
			},
			closest() {
				return null;
			},
			focus() {
				document.activeElement = this;
			},
			remove() {},
		};
		return element;
	}

	return { container: createElement(), document };
}

function islandPlugin(
	queue: unknown[] = [],
	filterRules: unknown[] = [],
): VaultmanPlugin {
	return {
		app: { vault: { getFiles: () => [] } },
		settings: { bulkOperationWarningThreshold: 400 },
		queueService: { queue, clear: vi.fn(), execute: vi.fn() },
		filterService: {
			getFlatRules: () => filterRules,
			filteredVaultFiles: [],
			clearFilters: vi.fn(),
			toggleFilterRule: vi.fn(),
			deleteFilterRule: vi.fn(),
		},
	} as unknown as VaultmanPlugin;
}

function keyboardEvent(key: string, shiftKey = false) {
	return {
		key,
		shiftKey,
		repeat: false,
		preventDefault: vi.fn(),
		stopPropagation: vi.fn(),
	} as unknown as KeyboardEvent;
}

describe('island keyboard focus management', () => {
	it('focuses the first available control when an island opens', () => {
		const first = focusable();
		const root = islandWith(null, [first]);

		focusFirstIslandControl(root as unknown as HTMLElement);

		expect(first.focus).toHaveBeenCalledOnce();
	});

	it('wraps Tab and Shift+Tab at the island boundaries', () => {
		const first = focusable();
		const last = focusable();
		const root = islandWith(first, [first, last]);
		const backwards = tabEvent(true);

		trapIslandTabKey(backwards, root as unknown as HTMLElement);

		expect(backwards.preventDefault).toHaveBeenCalledOnce();
		expect(last.focus).toHaveBeenCalledOnce();

		root.ownerDocument.activeElement = last;
		const forwards = tabEvent();
		trapIslandTabKey(forwards, root as unknown as HTMLElement);

		expect(forwards.preventDefault).toHaveBeenCalledOnce();
		expect(first.focus).toHaveBeenCalledOnce();
	});

	it('closes an island on Escape so the Tab cycle has a keyboard exit', () => {
		const close = vi.fn();
		const escape = keyboardEvent('Escape');

		handleIslandKeydown(escape, null, close);

		expect(escape.preventDefault).toHaveBeenCalledOnce();
		expect(escape.stopPropagation).toHaveBeenCalledOnce();
		expect(close).toHaveBeenCalledOnce();
	});

	it('provides Enter and Space activation for styled div buttons', () => {
		const listeners: Record<string, (event: KeyboardEvent) => void> = {};
		const button = {
			setAttribute: vi.fn(),
			getAttribute: () => '0',
			addEventListener: (type: string, listener: (event: KeyboardEvent) => void) => {
				listeners[type] = listener;
			},
		};
		const activate = vi.fn();
		wireIslandButton(button as unknown as HTMLElement, activate);
		const enter = { key: 'Enter', preventDefault: vi.fn() } as unknown as KeyboardEvent;
		listeners.keydown(enter);
		expect(activate).toHaveBeenCalledOnce();

		const spaceDown = { key: ' ', preventDefault: vi.fn() } as unknown as KeyboardEvent;
		listeners.keydown(spaceDown);
		expect(activate).toHaveBeenCalledOnce();
		listeners.keyup({ key: ' ', preventDefault: vi.fn() } as unknown as KeyboardEvent);
		expect(activate).toHaveBeenCalledTimes(2);
	});

	it.each(['filter', 'queue'] as const)(
		'opens the empty %s island on its first control and keeps Tab cycling inside',
		(kind) => {
			const { container, document } = createFakeDom();
			const plugin = islandPlugin();
			const island =
				kind === 'filter'
					? new ActiveFiltersIslandComponent(
							container as unknown as HTMLElement,
							plugin,
							vi.fn(),
						)
					: new QueueIslandComponent(
							container as unknown as HTMLElement,
							plugin,
							vi.fn(),
							vi.fn(),
						);
			island.mount();

			const root = container.children[0];
			const controls = root.querySelectorAll(
				'[role="button"][tabindex]:not([tabindex="-1"])',
			);
			expect(controls.length).toBeGreaterThan(1);
			expect(document.activeElement).toBe(controls[0]);

			const rootKeydown = root.listeners.get('keydown')?.[0];
			expect(rootKeydown).toBeDefined();
			document.activeElement = controls[0];
			const shiftTab = keyboardEvent('Tab', true);
			rootKeydown?.(shiftTab);
			expect(shiftTab.preventDefault).toHaveBeenCalledOnce();
			expect(document.activeElement).toBe(controls.at(-1));

			document.activeElement = controls.at(-1) ?? null;
			const tab = keyboardEvent('Tab');
			rootKeydown?.(tab);
			expect(tab.preventDefault).toHaveBeenCalledOnce();
			expect(document.activeElement).toBe(controls[0]);
			island.destroy();
		},
	);

	it.each(['filter', 'queue'] as const)(
		'keeps populated %s island controls reachable after opening',
		(kind) => {
			const queuedChanges = [
				{ files: ['note.md'], details: 'Queued update', type: 'file_create' },
			];
			const rules = [
				{
					id: 'rule-1',
					enabled: true,
					rule: 'tag:#example',
					description: 'Example filter',
					label: 'Example',
				},
			];
			const { container, document } = createFakeDom();
			const plugin = islandPlugin(queuedChanges, rules);
			const island =
				kind === 'filter'
					? new ActiveFiltersIslandComponent(
							container as unknown as HTMLElement,
							plugin,
							vi.fn(),
							() => [],
						)
					: new QueueIslandComponent(
							container as unknown as HTMLElement,
							plugin,
							vi.fn(),
							vi.fn(),
						);
			island.mount();

			const root = container.children[0];
			const controls = root.querySelectorAll(
				'[role="button"][tabindex]:not([tabindex="-1"])',
			);
			expect(controls).toHaveLength(kind === 'filter' ? 6 : 4);
			expect(document.activeElement).toBe(controls[0]);
			island.destroy();
		},
	);
});
