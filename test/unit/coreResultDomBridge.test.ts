import { describe, expect, it } from 'vitest';
import type { App, TFile } from 'obsidian';

import {
	CoreResultDomBridge,
	isCoreResultDomAvailable,
} from '../../src/services/serviceCoreResultDom';
import type { NativeSearchInput } from '../../src/services/serviceNativeSearchAdapter';

/**
 * Core's `SearchResultDOM` is not exported, so the bridge borrows the class off
 * a live search view's prototype. The stub below is shaped like that: a leaf
 * whose `view.dom` is an instance, so `Object.getPrototypeOf(dom).constructor`
 * is the class the bridge will instantiate.
 */
class FakeResultDom {
	calls: string[] = [];
	resultDomLookup = new Map<TFile, { file: TFile }>();
	working = false;

	constructor(
		readonly app: App,
		readonly el: unknown,
		readonly emptyStateText: string,
		readonly scrollEl: unknown,
	) {}

	addResult(file: TFile) {
		this.calls.push(`add:${file.path}`);
		const item = { file };
		this.resultDomLookup.set(file, item);
		return item;
	}
	removeResult(file: TFile) {
		this.calls.push(`remove:${file.path}`);
		this.resultDomLookup.delete(file);
		return undefined;
	}
	emptyResults() {
		this.calls.push('empty');
		this.resultDomLookup.clear();
	}
	setExtraContext(value: boolean) {
		this.calls.push(`extraContext:${String(value)}`);
	}
	setCollapseAll(value: boolean) {
		this.calls.push(`collapseAll:${String(value)}`);
	}
	startLoader() {
		this.calls.push('startLoader');
	}
	stopLoader() {
		this.calls.push('stopLoader');
	}
	getFiles(): TFile[] {
		return [...this.resultDomLookup.keys()];
	}
}

/**
 * Instances the bridge builds, captured for assertions. A list rather than a
 * single slot so TypeScript cannot narrow it to `null` across the `mount` call.
 */
const built: FakeResultDom[] = [];

function lastBuilt(): FakeResultDom {
	const dom = built[built.length - 1];
	if (!dom) throw new Error('bridge did not build a result dom');
	return dom;
}

class CapturingResultDom extends FakeResultDom {
	constructor(app: App, el: unknown, text: string, scrollEl: unknown) {
		super(app, el, text, scrollEl);
		built.push(this);
	}
}

function appWithSearchView(available: boolean): App {
	const sample = available
		? new CapturingResultDom({} as App, null, '', null)
		: undefined;
	return {
		workspace: {
			getLeavesOfType: (type: string) =>
				type === 'search' && sample ? [{ view: { dom: sample } }] : [],
		},
	} as unknown as App;
}

function file(path: string): TFile {
	const name = path.split('/').pop() ?? path;
	return {
		basename: name.replace(/\.md$/, ''),
		extension: 'md',
		name,
		parent: null,
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault: {} as TFile['vault'],
	} satisfies TFile;
}

function input(path: string, offsets: [number, number][]): NativeSearchInput {
	return { file: file(path), content: `body of ${path}`, offsets };
}

const el = {} as HTMLElement;

describe('borrowing core’s result DOM', () => {
	it('reports unavailable when there is no core search view', () => {
		const app = appWithSearchView(false);
		expect(isCoreResultDomAvailable(app)).toBe(false);
		expect(new CoreResultDomBridge(app).mount(el, 'nothing')).toBe(false);
	});

	it('instantiates the borrowed class against our own container', () => {
		const app = appWithSearchView(true);
		built.length = 0;
		const bridge = new CoreResultDomBridge(app);

		expect(bridge.mount(el, 'nothing found')).toBe(true);
		expect(bridge.mounted).toBe(true);
		expect(lastBuilt().el).toBe(el);
		expect(lastBuilt().emptyStateText).toBe('nothing found');
		// Core defaults `infinityScroll` to the container when no scroll element
		// is given, so passing the container keeps that behaviour explicit.
		expect(lastBuilt().scrollEl).toBe(el);
	});
});

describe('publishing snapshots without rebuilding rows', () => {
	function mounted(): { bridge: CoreResultDomBridge; dom: FakeResultDom } {
		const app = appWithSearchView(true);
		built.length = 0;
		const bridge = new CoreResultDomBridge(app);
		bridge.mount(el, 'nothing');
		const dom = lastBuilt();
		dom.calls.length = 0;
		return { bridge, dom };
	}

	it('adds each file once and leaves it alone while it is unchanged', () => {
		// The scan publishes many times a second. `addResult` replaces the item,
		// so re-adding an untouched file would snap shut an expansion the user
		// opened mid-scan.
		const { bridge, dom } = mounted();
		const snapshot = [input('a.md', [[0, 4]])];

		bridge.render(snapshot);
		bridge.render([input('a.md', [[0, 4]])]);
		bridge.render([input('a.md', [[0, 4]])]);

		expect(dom.calls).toEqual(['add:a.md']);
	});

	it('re-adds only the file whose matches moved', () => {
		const { bridge, dom } = mounted();
		bridge.render([input('a.md', [[0, 4]]), input('b.md', [[0, 4]])]);
		dom.calls.length = 0;

		bridge.render([
			input('a.md', [
				[0, 4],
				[8, 12],
			]),
			input('b.md', [[0, 4]]),
		]);

		expect(dom.calls).toEqual(['add:a.md']);
	});

	it('removes a file that stopped matching', () => {
		const { bridge, dom } = mounted();
		bridge.render([input('a.md', [[0, 4]]), input('b.md', [[0, 4]])]);
		dom.calls.length = 0;

		bridge.render([input('a.md', [[0, 4]])]);

		expect(dom.calls).toEqual(['remove:b.md']);
	});

	it('grows past the caps this change exists to remove', () => {
		const { bridge, dom } = mounted();
		const many = Array.from({ length: 1000 }, (_, i) =>
			input(`f${i}.md`, [[0, 4]]),
		);

		bridge.render(many);

		expect(dom.calls).toHaveLength(1000);
		expect(dom.getFiles()).toHaveLength(1000);
	});

	it('does nothing when it was never mounted', () => {
		const bridge = new CoreResultDomBridge(appWithSearchView(false));
		expect(() => bridge.render([input('a.md', [[0, 4]])])).not.toThrow();
		expect(bridge.mounted).toBe(false);
	});
});

describe('the core state the bridge exposes', () => {
	it('routes context, collapse and loading to core instead of reimplementing', () => {
		const app = appWithSearchView(true);
		built.length = 0;
		const bridge = new CoreResultDomBridge(app);
		bridge.mount(el, 'nothing');
		const dom = lastBuilt();
		dom.calls.length = 0;

		bridge.setExtraContext(true);
		bridge.setCollapseAll(true);
		bridge.setLoading(true);
		bridge.setLoading(false);

		expect(dom.calls).toEqual([
			'extraContext:true',
			'collapseAll:true',
			'startLoader',
			'stopLoader',
		]);
	});

	it('empties core’s results on destroy so a remount starts clean', () => {
		const app = appWithSearchView(true);
		built.length = 0;
		const bridge = new CoreResultDomBridge(app);
		bridge.mount(el, 'nothing');
		const dom = lastBuilt();
		bridge.render([input('a.md', [[0, 4]])]);
		dom.calls.length = 0;

		bridge.destroy();

		expect(dom.calls).toEqual(['empty']);
		expect(bridge.mounted).toBe(false);
	});
});
