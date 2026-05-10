import { describe, it, expect } from 'vitest';
import type { App } from 'obsidian';
import { PropsLogic } from '../../../src/logic/logicProps';
import type { IPropsIndex, PropNode } from '../../../src/types/typeContracts';
import { mockApp, mockTFile, type CachedMetadata } from '../../helpers/obsidian-mocks';

function makePropsIndex(app: App): IPropsIndex {
	const acc = new Map<string, { values: Map<string, number>; files: Set<string> }>();
	for (const file of app.vault.getMarkdownFiles()) {
		const fm = app.metadataCache.getFileCache(file)?.frontmatter;
		if (!fm) continue;
		for (const [property, value] of Object.entries(fm)) {
			if (property === 'position') continue;
			let entry = acc.get(property);
			if (!entry) {
				entry = { values: new Map(), files: new Set() };
				acc.set(property, entry);
			}
			entry.files.add(file.path);
			for (const raw of Array.isArray(value) ? value : [value]) {
				if (raw == null) continue;
				const key = String(raw);
				entry.values.set(key, (entry.values.get(key) ?? 0) + 1);
			}
		}
	}
	const nodes: PropNode[] = Array.from(acc.entries()).map(([property, entry]) => ({
		id: property,
		property,
		values: Array.from(entry.values.keys()),
		valueFrequencies: Object.fromEntries(entry.values),
		fileCount: entry.files.size,
	}));
	return {
		nodes,
		revision: 1,
		refresh: () => {},
		subscribe: () => () => {},
		byId: (id: string) => nodes.find((node) => node.id === id),
	};
}

function setup() {
	const a = mockTFile('a.md', { frontmatter: { status: 'draft', tags: ['x'] } });
	const b = mockTFile('b.md', { frontmatter: { status: 'done' } });
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { status: 'draft', tags: ['x'] } }],
		[b.path, { frontmatter: { status: 'done' } }],
	]);
	const app = mockApp({ files: [a, b], metadata: meta });
	(
		app.metadataCache as unknown as { getAllPropertyInfos: () => Record<string, { type: string }> }
	).getAllPropertyInfos = () => ({ status: { type: 'text' }, tags: { type: 'list' } });
	return { app, propsIndex: makePropsIndex(app) };
}

describe('PropsLogic.getTree', () => {
	it('builds a 2-level tree of property → value nodes with counts', () => {
		const { app, propsIndex } = setup();
		const logic = new PropsLogic(app, propsIndex);
		const tree = logic.getTree();

		const status = tree.find((n) => n.id === 'status');
		expect(status).toBeDefined();
		expect(status!.count).toBe(2);
		expect(status!.children?.map((c) => c.label).sort()).toEqual(['done', 'draft']);
		expect(status!.meta.isValueNode).toBe(false);
	});

	it('value nodes carry isTypeIncompatible when the value does not match the declared type', () => {
		const file = mockTFile('a.md', { frontmatter: { age: 'not-a-number' } });
		const meta = new Map<string, CachedMetadata>([
			[file.path, { frontmatter: { age: 'not-a-number' } }],
		]);
		const app = mockApp({ files: [file], metadata: meta });
		(
			app.metadataCache as unknown as {
				getAllPropertyInfos: () => Record<string, { type: string }>;
			}
		).getAllPropertyInfos = () => ({ age: { type: 'number' } });

		const logic = new PropsLogic(app, makePropsIndex(app));
		const valueNode = logic.getTree()[0].children![0];
		expect(valueNode.meta.isTypeIncompatible).toBe(true);
	});

	it('caches results across calls and invalidates on demand', () => {
		const { app, propsIndex } = setup();
		const logic = new PropsLogic(app, propsIndex);
		const t1 = logic.getTree();
		const t2 = logic.getTree();
		expect(t1).toBe(t2);

		logic.invalidate();
		const t3 = logic.getTree();
		expect(t3).not.toBe(t1);
	});
});

describe('PropsLogic.filterTree', () => {
	it('mode 0 (Property name): keeps all child values when parent matches', () => {
		const { app, propsIndex } = setup();
		const logic = new PropsLogic(app, propsIndex);
		const tree = logic.getTree();
		const filtered = logic.filterTree(tree, 'status', 0);
		expect(filtered).toHaveLength(1);
		expect(filtered[0].children?.length).toBe(2);
	});

	it('mode 1 (Value): keeps only the matching child', () => {
		const { app, propsIndex } = setup();
		const logic = new PropsLogic(app, propsIndex);
		const tree = logic.getTree();
		const filtered = logic.filterTree(tree, 'draft', 1);
		const status = filtered.find((n) => n.id === 'status');
		expect(status?.children?.map((c) => c.label)).toEqual(['draft']);
	});

	it('empty term returns the original tree', () => {
		const { app, propsIndex } = setup();
		const logic = new PropsLogic(app, propsIndex);
		const tree = logic.getTree();
		expect(logic.filterTree(tree, '', 0)).toBe(tree);
	});
});
