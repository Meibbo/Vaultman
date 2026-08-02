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
	tabIndex = 0;
	contentEditable = 'inherit';

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

	addClass(className: string): void {
		this.cls = `${this.cls} ${className}`.trim();
	}

	setText(text: string): void {
		this.textContent = text;
	}

	focus(): void {}

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
	extra: {
		onRemoveValue?: () => void;
		onRenameValue?: (next: string) => void;
	} = {},
): StubEl {
	const container = new StubEl('span');
	renderPropertyValue({
		container: container as unknown as HTMLElement,
		raw,
		type,
		app,
		...extra,
	});
	return container;
}

function click(el: StubEl): void {
	for (const handler of el.listeners.get('click') ?? []) {
		handler({ preventDefault: () => undefined, stopPropagation: () => undefined });
	}
}

function key(el: StubEl, name: string): void {
	for (const handler of el.listeners.get('keydown') ?? []) {
		handler({ key: name, preventDefault: () => undefined });
	}
}

const LIST_TYPES = ['aliases', 'multitext'] as const;

describe('U121-003 shard 07 — cell_format renders the Bases value idiom', () => {
	it('renders a checkbox with the Core metadata checkbox class', () => {
		const root = render('true', 'checkbox');
		const checkbox = root.find('metadata-input-checkbox');
		expect(checkbox?.tagName).toBe('input');
		expect(checkbox?.attributes.get('type')).toBe('checkbox');
		expect(checkbox?.checked).toBe(true);
	});

	it('disables the date input with the literal attribute Core selects on', () => {
		// `.bases-rendered-value input[disabled=true]` is what collapses the box
		// to min-height 0 and width auto. The DOM property serializes as
		// `disabled=""` and would miss that selector.
		const root = render('2026-08-01', 'date');
		const input = root.find('mod-date');
		expect(input?.tagName).toBe('input');
		expect(input?.attributes.get('disabled')).toBe('true');
		expect(root.find('clickable-icon')).not.toBeNull();
	});

	it('disables the datetime input the same way', () => {
		const root = render('2026-08-01T10:30', 'datetime');
		const input = root.find('mod-datetime');
		expect(input?.attributes.get('type')).toBe('datetime-local');
		expect(input?.attributes.get('disabled')).toBe('true');
	});

	it.each(LIST_TYPES)('renders %s as a Core value-list element', (type) => {
		const root = render('cocina', type);
		expect(root.find('value-list-container')).not.toBeNull();

		const elements = root.findAll('value-list-element');
		expect(elements).toHaveLength(1);
		expect(elements[0].find('vaultman-property-value-text')?.textContent).toBe(
			'cocina',
		);
	});

	it('renders a tag value as an anchor so it inherits the theme tag style', () => {
		const root = render('about', 'tags');
		const element = root.find('value-list-element');
		expect(element).not.toBeNull();
		const tag = element?.find('tag');
		expect(tag?.tagName).toBe('a');
		expect(tag?.textContent).toBe('#about');
	});

	it('does not double the hash on an already prefixed tag', () => {
		expect(render('#about', 'tags').find('tag')?.textContent).toBe('#about');
	});

	it('never re-splits a value into several elements', () => {
		// One value node is one value. `logicProps` already expands arrays into
		// separate nodes, so a comma here is part of the value, not a separator.
		const root = render('cocina, sala', 'multitext');
		expect(root.findAll('value-list-element')).toHaveLength(1);
		expect(root.find('vaultman-property-value-text')?.textContent).toBe(
			'cocina, sala',
		);
	});

	it('renders scalars as plain text, with no input and no box', () => {
		for (const [raw, type] of [
			['42', 'number'],
			['una nota larga', 'text'],
			['algo', 'no-such-widget'],
		]) {
			const root = render(raw, type);
			expect(root.find('vaultman-property-value-text')?.textContent).toBe(raw);
			expect(root.find('metadata-input-number')).toBeNull();
			expect(root.find('metadata-input-longtext')).toBeNull();
			expect(root.find('metadata-input')).toBeNull();
		}
	});

	it('keeps wikilink precedence inside a text property', () => {
		const root = render('[[Nota]]', 'text');
		const link = root.find('internal-link');
		expect(link?.tagName).toBe('a');
		expect(link?.textContent).toBe('Nota');
	});

	it('renders a wikilink inside the list element for list types', () => {
		const root = render('[[Cocina]]', 'multitext');
		const element = root.find('value-list-element');
		expect(element?.find('internal-link')?.textContent).toBe('Cocina');
	});

	it('honours the wikilink alias in both the scalar and list paths', () => {
		expect(
			render('[[Nota|alias]]', 'text').find('internal-link')?.textContent,
		).toBe('alias');
		expect(
			render('[[Nota|alias]]', 'aliases').find('internal-link')?.textContent,
		).toBe('alias');
	});
});

describe('U121-003 shard 07 — value affordances', () => {
	it('omits the remove control when no delete callback is supplied', () => {
		expect(
			render('cocina', 'tags').find('vaultman-property-value-remove'),
		).toBeNull();
	});

	it('invokes the delete callback exactly once per activation', () => {
		let calls = 0;
		const root = render('cocina', 'tags', {
			onRemoveValue: () => {
				calls += 1;
			},
		});
		const remove = root.find('vaultman-property-value-remove');
		expect(remove).not.toBeNull();
		click(remove!);
		expect(calls).toBe(1);
	});

	it('keeps the removal gesture off the row', () => {
		let stopped = 0;
		const root = render('cocina', 'tags', { onRemoveValue: () => undefined });
		const remove = root.find('vaultman-property-value-remove')!;
		for (const handler of remove.listeners.get('click') ?? []) {
			handler({
				preventDefault: () => undefined,
				stopPropagation: () => {
					stopped += 1;
				},
			});
		}
		expect(stopped).toBe(1);
	});

	it('is not editable without a rename callback', () => {
		const text = render('cocina', 'text').find('vaultman-property-value-text');
		expect(text?.classes()).not.toContain('vaultman-property-value-editable');
	});

	it('turns the text into a caret in place, adding no element of its own', () => {
		const root = render('cocina', 'text', { onRenameValue: () => undefined });
		const text = root.find('vaultman-property-value-text');
		expect(text?.classes()).toContain('vaultman-property-value-editable');
		// Editing must not introduce an input, a box or a second node.
		expect(root.find('metadata-input')).toBeNull();
		expect(text?.tagName).toBe('span');

		click(text!);
		expect(text?.contentEditable).toBe('true');
	});

	it('commits an inline edit on Enter and reports one rename', () => {
		const renames: string[] = [];
		const root = render('cocina', 'text', {
			onRenameValue: (next) => renames.push(next),
		});
		const text = root.find('vaultman-property-value-text')!;
		click(text);
		text.textContent = 'Sala';
		key(text, 'Enter');

		expect(renames).toEqual(['Sala']);
		expect(text.contentEditable).toBe('false');
	});

	it('reports nothing when the edit is cancelled or unchanged', () => {
		const renames: string[] = [];
		const root = render('cocina', 'text', {
			onRenameValue: (next) => renames.push(next),
		});
		const text = root.find('vaultman-property-value-text')!;

		click(text);
		text.textContent = 'Sala';
		key(text, 'Escape');
		expect(renames).toEqual([]);
		expect(text.textContent).toBe('cocina');

		click(text);
		key(text, 'Enter');
		expect(renames).toEqual([]);
	});

	it('makes list values editable too', () => {
		const root = render('cocina', 'multitext', {
			onRenameValue: () => undefined,
		});
		const text = root.find('vaultman-property-value-text');
		expect(text?.classes()).toContain('vaultman-property-value-editable');
	});
});
