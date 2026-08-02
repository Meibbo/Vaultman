import { describe, expect, it } from 'vitest';
import type { App } from 'obsidian';

import { renderPropertyValue } from '../../src/utils/renderPropertyValue';

/**
 * The unit environment is `node`, so there is no DOM and no Obsidian element
 * extensions. This is the same approach `viewTreeBehavior.test.ts` takes: a
 * recording element that implements only the surface the renderer touches, so
 * the assertions are about structure and classes rather than about a browser.
 */
interface CreateOptions {
	cls?: string;
	text?: string;
	href?: string;
	type?: string;
	attr?: Record<string, string | number | boolean>;
}

class StubEl {
	readonly children: StubEl[] = [];
	readonly attributes = new Map<string, string>();
	readonly listeners = new Map<string, Array<(event: unknown) => void>>();
	textContent = '';
	value = '';
	href = '';
	checked = false;
	readOnly = false;
	tabIndex = 0;
	contentEditable: string | undefined;

	constructor(
		readonly tagName: string,
		public cls = '',
	) {}

	private create(tagName: string, options: CreateOptions = {}): StubEl {
		const el = new StubEl(tagName, options.cls ?? '');
		if (options.text !== undefined) el.textContent = options.text;
		if (options.href !== undefined) el.href = options.href;
		if (options.type !== undefined) el.attributes.set('type', options.type);
		for (const [name, value] of Object.entries(options.attr ?? {})) {
			el.attributes.set(name, String(value));
		}
		this.children.push(el);
		return el;
	}

	createEl(tagName: string, options: CreateOptions = {}): StubEl {
		return this.create(tagName, options);
	}

	createDiv(options: CreateOptions = {}): StubEl {
		return this.create('div', options);
	}

	createSpan(options: CreateOptions = {}): StubEl {
		return this.create('span', options);
	}

	setAttribute(name: string, value: string): void {
		this.attributes.set(name, value);
	}

	addEventListener(type: string, handler: (event: unknown) => void): void {
		const existing = this.listeners.get(type) ?? [];
		existing.push(handler);
		this.listeners.set(type, existing);
	}

	classes(): string[] {
		return this.cls.split(/\s+/).filter(Boolean);
	}

	/** Depth-first search for the first descendant carrying `className`. */
	find(className: string): StubEl | null {
		for (const child of this.children) {
			if (child.classes().includes(className)) return child;
			const nested = child.find(className);
			if (nested) return nested;
		}
		return null;
	}

	findAll(className: string): StubEl[] {
		const found: StubEl[] = [];
		for (const child of this.children) {
			if (child.classes().includes(className)) found.push(child);
			found.push(...child.findAll(className));
		}
		return found;
	}
}

const app = {
	workspace: { openLinkText: () => undefined },
} as unknown as App;

function render(
	raw: string,
	type: string,
	onRemoveValue?: () => void,
): StubEl {
	const container = new StubEl('span');
	renderPropertyValue(
		container as unknown as HTMLElement,
		raw,
		type,
		app,
		onRemoveValue,
	);
	return container;
}

function click(el: StubEl): void {
	const event = { preventDefault: () => undefined, stopPropagation: () => undefined };
	for (const handler of el.listeners.get('click') ?? []) handler(event);
}

const PILL_TYPES = ['tags', 'aliases', 'multitext'] as const;

describe('U121-003 shard 07 — cell_format Core render map', () => {
	it('renders a checkbox with the Core metadata checkbox class', () => {
		const root = render('true', 'checkbox');
		const checkbox = root.find('metadata-input-checkbox');
		expect(checkbox?.tagName).toBe('input');
		expect(checkbox?.attributes.get('type')).toBe('checkbox');
		expect(checkbox?.checked).toBe(true);
	});

	it('renders a date input plus the Core daily note shortcut', () => {
		const root = render('2026-08-01', 'date');
		const input = root.find('mod-date');
		expect(input?.tagName).toBe('input');
		expect(input?.classes()).toEqual(
			expect.arrayContaining(['metadata-input', 'metadata-input-text', 'mod-date']),
		);
		expect(root.find('clickable-icon')).not.toBeNull();
	});

	it('renders a datetime input', () => {
		const root = render('2026-08-01T10:30', 'datetime');
		const input = root.find('mod-datetime');
		expect(input?.tagName).toBe('input');
		expect(input?.attributes.get('type')).toBe('datetime-local');
	});

	it.each(PILL_TYPES)('renders %s as one Core multi-select pill', (type) => {
		const root = render('cocina', type);
		const container = root.find('multi-select-container');
		expect(container).not.toBeNull();

		const pills = root.findAll('multi-select-pill');
		expect(pills).toHaveLength(1);
		expect(pills[0].attributes.get('tabIndex')).toBe('0');

		const content = root.find('multi-select-pill-content');
		expect(content?.textContent).toBe('cocina');
	});

	it('never re-splits a value into several pills', () => {
		// One value node is one value. `logicProps` already expands arrays into
		// separate nodes, so a comma here is part of the value, not a separator.
		const root = render('cocina, sala', 'multitext');
		expect(root.findAll('multi-select-pill')).toHaveLength(1);
		expect(root.find('multi-select-pill-content')?.textContent).toBe(
			'cocina, sala',
		);
	});

	it('renders a number with the Core number input class', () => {
		const root = render('42', 'number');
		const input = root.find('metadata-input-number');
		expect(input?.tagName).toBe('input');
		expect(input?.classes()).toEqual(
			expect.arrayContaining(['metadata-input', 'metadata-input-number']),
		);
		expect(input?.value).toBe('42');
	});

	it('renders text with the Core longtext div, not a bare span', () => {
		const root = render('una nota larga', 'text');
		const longtext = root.find('metadata-input-longtext');
		expect(longtext?.tagName).toBe('div');
		expect(longtext?.textContent).toBe('una nota larga');
		// Core makes this contenteditable; the read projection must not.
		expect(longtext?.contentEditable).toBeUndefined();
	});

	it('falls back to the text renderer for an unknown type', () => {
		const root = render('algo', 'no-such-widget');
		expect(root.find('metadata-input-longtext')).not.toBeNull();
	});

	it('keeps wikilink precedence inside a text property', () => {
		const root = render('[[Nota]]', 'text');
		const link = root.find('internal-link');
		expect(link?.tagName).toBe('a');
		expect(link?.textContent).toBe('Nota');
		expect(root.find('metadata-input-longtext')).toBeNull();
	});

	it('renders a wikilink inside the pill content for pill types', () => {
		const root = render('[[Cocina]]', 'tags');
		const content = root.find('multi-select-pill-content');
		expect(content).not.toBeNull();
		const link = content?.find('internal-link');
		expect(link?.tagName).toBe('a');
		expect(link?.textContent).toBe('Cocina');
	});

	it('honours the wikilink alias in both the plain and pill paths', () => {
		expect(render('[[Nota|alias]]', 'text').find('internal-link')?.textContent).toBe(
			'alias',
		);
		expect(
			render('[[Nota|alias]]', 'aliases').find('internal-link')?.textContent,
		).toBe('alias');
	});
});

describe('U121-003 shard 07 — pill remove button', () => {
	it('omits the remove button when no delete callback is supplied', () => {
		const root = render('cocina', 'tags');
		expect(root.find('multi-select-pill-remove-button')).toBeNull();
	});

	it.each(PILL_TYPES)('renders a Core remove button for %s', (type) => {
		const root = render('cocina', type, () => undefined);
		const button = root.find('multi-select-pill-remove-button');
		expect(button).not.toBeNull();
		// Core builds the same icon: `tv(s, "lucide-x")`.
		expect(button?.find('svg-icon')).not.toBeNull();
	});

	it('never renders a remove button on a non-pill type', () => {
		for (const type of ['text', 'number', 'date', 'datetime', 'checkbox']) {
			const root = render('2026-08-01', type, () => undefined);
			expect(root.find('multi-select-pill-remove-button')).toBeNull();
		}
	});

	it('invokes the delete callback exactly once per activation', () => {
		let calls = 0;
		const root = render('cocina', 'tags', () => {
			calls += 1;
		});
		const button = root.find('multi-select-pill-remove-button');
		expect(button).not.toBeNull();
		click(button!);
		expect(calls).toBe(1);
	});

	it('keeps the removal gesture off the row', () => {
		let stopped = 0;
		const root = render('cocina', 'tags', () => undefined);
		const button = root.find('multi-select-pill-remove-button');
		for (const handler of button!.listeners.get('click') ?? []) {
			handler({
				preventDefault: () => undefined,
				stopPropagation: () => {
					stopped += 1;
				},
			});
		}
		expect(stopped).toBe(1);
	});
});
