import type { TFile, TFolder, Vault } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { FilesGridView } from '../../src/components/layout/viewFilesGrid';
import {
	buildAnchoredGridWindow,
	buildVirtualGridWindow,
} from '../../src/utils/gridVirtualization';

/**
 * Minimal DOM stand-in for the files grid render path. The scroll element
 * clamps scrollTop against the CURRENT spacer height, exactly like a real
 * browser, so the spacer-before-scrollTop ordering contract is observable.
 */
class StubEl {
	children: StubEl[] = [];
	parent: StubEl | null = null;
	style: Record<string, string> = {};
	dataset: Record<string, string> = {};
	classes = new Set<string>();
	textContent = '';
	className = '';
	draggable = false;
	clientHeight = 0;
	clientWidth = 0;
	ownerDocument: unknown = {
		defaultView: null,
		body: { classList: { contains: () => false } },
	};
	maxScrollProvider: (() => number) | null = null;
	private scrollTopValue = 0;

	get scrollTop(): number {
		return this.scrollTopValue;
	}

	set scrollTop(value: number) {
		const max = this.maxScrollProvider
			? Math.max(0, this.maxScrollProvider())
			: Number.POSITIVE_INFINITY;
		this.scrollTopValue = Math.min(Math.max(0, value), max);
	}

	get offsetHeight(): number {
		return 0; // probes measure 0 → deterministic density fallback heights
	}

	private applyOptions(options?: { cls?: string; text?: string }): void {
		if (options?.cls) {
			this.className = options.cls;
			for (const cls of options.cls.split(/\s+/)) this.classes.add(cls);
		}
		if (options?.text) this.textContent = options.text;
	}

	createDiv(options?: { cls?: string; text?: string }): StubEl {
		const el = new StubEl();
		el.ownerDocument = this.ownerDocument;
		el.applyOptionsPublic(options);
		el.parent = this;
		this.children.push(el);
		return el;
	}

	applyOptionsPublic(options?: { cls?: string; text?: string }): void {
		this.applyOptions(options);
	}

	createSpan(options?: { cls?: string; text?: string }): StubEl {
		return this.createDiv(options);
	}

	appendChild(el: StubEl): StubEl {
		if (!this.children.includes(el)) this.children.push(el);
		el.parent = this;
		return el;
	}

	remove(): void {
		if (!this.parent) return;
		this.parent.children = this.parent.children.filter((c) => c !== this);
		this.parent = null;
	}

	empty(): void {
		this.children = [];
	}

	contains(el: StubEl): boolean {
		if (el === this) return true;
		return this.children.some((child) => child.contains(el));
	}

	addClass(cls: string): void {
		this.classes.add(cls);
	}

	removeClass(cls: string): void {
		this.classes.delete(cls);
	}

	toggleClass(cls: string, on: boolean): void {
		if (on) this.classes.add(cls);
		else this.classes.delete(cls);
	}

	setAttribute(): void {}
	addEventListener(): void {}
	removeEventListener(): void {}
}

const vault = {} as Vault;

function makeFile(index: number): TFile {
	const name = `note-${String(index).padStart(4, '0')}.md`;
	return {
		basename: name.slice(0, -3),
		extension: 'md',
		name,
		parent: null as TFolder | null,
		path: name,
		stat: { ctime: 1, mtime: 1, size: 1 },
		vault,
	} satisfies TFile;
}

interface Harness {
	view: FilesGridView;
	container: StubEl;
	scrollEl: StubEl;
	spacerEl: StubEl;
	contentEl: StubEl;
}

function makeHarness(fileCount: number, cells: string[]): Harness {
	const container = new StubEl();
	container.clientWidth = 120;
	const view = new FilesGridView(container as unknown as HTMLElement, {
		onContextMenu: () => {},
		onSelectionChange: () => {},
		onFileClick: () => {},
	});
	view.setVisibleCells(new Set(cells));
	view.render(Array.from({ length: fileCount }, (_, i) => makeFile(i)));

	const scrollEl = container.children.find((c) =>
		c.classes.has('vaultman-files-grid-scroll'),
	);
	const spacerEl = scrollEl?.children.find((c) =>
		c.classes.has('vaultman-files-grid-spacer'),
	);
	const contentEl = spacerEl?.children.find((c) =>
		c.classes.has('vaultman-files-grid-content'),
	);
	if (!scrollEl || !spacerEl || !contentEl) {
		throw new Error('grid scaffold missing');
	}
	scrollEl.clientHeight = 300;
	scrollEl.clientWidth = 120;
	// Real-browser behavior: scrollTop can never exceed content - viewport.
	scrollEl.maxScrollProvider = () =>
		Number.parseFloat(spacerEl.style.height ?? '0') - scrollEl.clientHeight;
	return { view, container, scrollEl, spacerEl, contentEl };
}

function renderedPaths(contentEl: StubEl): string[] {
	return contentEl.children
		.filter((c) => c.classes.has('vaultman-files-grid-card'))
		.map((c) => c.dataset.path)
		.filter((p): p is string => Boolean(p));
}

describe('buildAnchoredGridWindow (pure geometry contract)', () => {
	it('keeps the bottom anchor when the row height grows', () => {
		const rows = Array.from({ length: 200 }, (_, i) => i);
		const result = buildAnchoredGridWindow({
			rows,
			scrollTop: 14100, // bottom under 72px rows (200*72 - 300)
			previousRowHeight: 72,
			rowHeight: 92,
			viewportHeight: 300,
			columnCount: 1,
			overscanRows: 2,
		});
		expect(result.spacerHeight).toBe(18400);
		expect(result.scrollTop).toBe(17940); // floor(14100/72)=195 → 195*92
		expect(
			result.window.visibleRows.some((item) => item.rowNumber === 195),
		).toBe(true);
	});

	it('keeps the bottom anchor when the row height shrinks', () => {
		const rows = Array.from({ length: 100 }, (_, i) => i);
		const result = buildAnchoredGridWindow({
			rows,
			scrollTop: 8900, // bottom under 92px rows
			previousRowHeight: 92,
			rowHeight: 72,
			viewportHeight: 300,
			columnCount: 1,
			overscanRows: 2,
		});
		expect(result.spacerHeight).toBe(7200);
		expect(result.scrollTop).toBe(6900); // row 96 → 6912 clamped to max 6900
		expect(result.window.endRow).toBe(99);
		expect(result.window.visibleRows.length).toBeGreaterThan(0);
	});

	it('passes scrollTop through (clamped only) when nothing changed', () => {
		const rows = Array.from({ length: 50 }, (_, i) => i);
		const same = buildAnchoredGridWindow({
			rows,
			scrollTop: 1234,
			previousRowHeight: 92,
			rowHeight: 92,
			viewportHeight: 300,
			columnCount: 1,
			overscanRows: 2,
		});
		expect(same.scrollTop).toBe(1234);
		const first = buildAnchoredGridWindow({
			rows,
			scrollTop: 999999,
			previousRowHeight: null,
			rowHeight: 92,
			viewportHeight: 300,
			columnCount: 1,
			overscanRows: 2,
		});
		expect(first.scrollTop).toBe(50 * 92 - 300);
	});

	it('matches the plain window projection for the anchored position', () => {
		const rows = Array.from({ length: 40 }, (_, i) => i);
		const anchored = buildAnchoredGridWindow({
			rows,
			scrollTop: 2000,
			previousRowHeight: null,
			rowHeight: 92,
			viewportHeight: 300,
			columnCount: 2,
			overscanRows: 1,
		});
		const plain = buildVirtualGridWindow({
			rows,
			scrollTop: anchored.scrollTop,
			viewportHeight: 300,
			rowHeight: 92,
			columnCount: 2,
			overscanRows: 1,
		});
		expect(anchored.window).toEqual(plain);
	});
});

describe('FilesGridView anchor behavior near the bottom (browser-like clamp)', () => {
	it('shrink: toggling meta cells off at the bottom keeps the last rows visible', () => {
		const harness = makeHarness(200, ['name', 'ext', 'count']); // meta → 92
		harness.scrollEl.scrollTop = 18100; // bottom (200*92 - 300)
		expect(harness.scrollEl.scrollTop).toBe(18100);

		harness.view.setVisibleCells(new Set(['name'])); // compact → 72
		harness.view.render(Array.from({ length: 200 }, (_, i) => makeFile(i)));

		// floor(18100/92)=196 → 196*72=14112 → clamped to 200*72-300=14100
		expect(harness.scrollEl.scrollTop).toBe(14100);
		expect(Number.parseFloat(harness.spacerEl.style.height)).toBe(14400);
		expect(renderedPaths(harness.contentEl).length).toBeGreaterThan(0);
		expect(renderedPaths(harness.contentEl)).toContain('note-0199.md');
	});

	it('grow: toggling meta cells back on at the bottom re-anchors instead of clamping against the old spacer', () => {
		const harness = makeHarness(200, ['name']); // compact → 72
		harness.scrollEl.scrollTop = 14100; // bottom (200*72 - 300)
		expect(harness.scrollEl.scrollTop).toBe(14100);

		harness.view.setVisibleCells(new Set(['name', 'ext', 'count'])); // meta → 92
		harness.view.render(Array.from({ length: 200 }, (_, i) => makeFile(i)));

		// Anchor row floor(14100/72)=195 → 195*92=17940. If the spacer is not
		// grown before assigning scrollTop, the browser clamps to the OLD max
		// (14100) and the anchor is silently lost.
		expect(Number.parseFloat(harness.spacerEl.style.height)).toBe(18400);
		expect(harness.scrollEl.scrollTop).toBe(17940);
		expect(renderedPaths(harness.contentEl)).toContain('note-0195.md');
	});
});
