import { describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';
import { explorerProps } from '../../../src/components/containers/explorerProps';
import { DecorationManager } from '../../../src/services/serviceDecorate';
import { ViewService } from '../../../src/services/serviceViews.svelte';
import type { VaultmanPlugin } from '../../../src/main';
import type {
	ExplorerDataPlaneRevisions,
	ExplorerSnapshot,
} from '../../../src/types/typeExplorerDataPlane';
import type { PropMeta, TreeNode } from '../../../src/types/typeNode';
import type { IPropsIndex, PropNode } from '../../../src/types/typeContracts';
import { mockApp, mockTFile, type CachedMetadata, type TFile } from '../../helpers/obsidian-mocks';

/**
 * Slice-2 snapshot guard (D6). Mirrors `explorerTagsSnapshot.test.ts` for the props
 * domain: asserts the dual-snapshot trio yields rows with `kind: 'prop' | 'value'`,
 * D6-namespaced ids (`note.<prop>`, `note.<prop>::<rawValue>`), and RAW (un-namespaced)
 * `domainKey`s / `domainKeyToId` lookups so filter toggles keep keying off raw values.
 */

type SnapshotBackedProps = explorerProps & {
	getStructuralTree(): TreeNode<PropMeta>[];
	getStructuralRevisions(): ExplorerDataPlaneRevisions;
	getSnapshot(expandedIds: ReadonlySet<string>): ExplorerSnapshot<PropMeta>;
};

function makePropsIndex(app: App, revision: number): IPropsIndex {
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
		flatIds: nodes.map((node) => node.id),
		revision,
		refresh: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
		byId: (id: string) => nodes.find((node) => node.id === id),
		getSearchBuffer: (id: string) => {
			const node = nodes.find((item) => item.id === id);
			return node ? `${node.property}\n${node.values.join('\n')}`.toLowerCase() : '';
		},
	};
}

function makePlugin(revision = 7): VaultmanPlugin {
	const a = mockTFile('a.md', { frontmatter: { Status: 'draft' } });
	const b = mockTFile('b.md', { frontmatter: { Status: 'draft' } });
	const c = mockTFile('c.md', { frontmatter: { Status: 'done' } });
	const files = [a, b, c] as TFile[];
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { Status: 'draft' } }],
		[b.path, { frontmatter: { Status: 'draft' } }],
		[c.path, { frontmatter: { Status: 'done' } }],
	]);
	const app = mockApp({ files, metadata: meta });
	// Honest casing: only the capitalized `Status` key is declared.
	(
		app.metadataCache as unknown as { getAllPropertyInfos: () => Record<string, { type: string }> }
	).getAllPropertyInfos = () => ({ Status: { type: 'text' } });
	const decorationManager = new DecorationManager(app);
	return {
		app,
		contextMenuService: { registerAction: vi.fn(), openPanelMenu: vi.fn() },
		queueService: { queue: [], add: vi.fn() },
		operationsIndex: { nodes: [], revision: 0, refresh: vi.fn(), subscribe: vi.fn(), byId: vi.fn() },
		activeFiltersIndex: {
			nodes: [],
			revision: 0,
			refresh: vi.fn(),
			subscribe: vi.fn(),
			byId: vi.fn(),
		},
		filterService: { filteredFiles: files, addNode: vi.fn() },
		decorationManager,
		viewService: new ViewService({ decorationManager }),
		iconicService: { getIcon: vi.fn(() => null) },
		propsIndex: makePropsIndex(app, revision),
	} as unknown as VaultmanPlugin;
}

describe('explorerProps snapshot adapter (D6)', () => {
	it('emits prop/value rows with namespaced ids, parent links, and RAW domain keys', () => {
		const plugin = makePlugin(7);
		const explorer = new explorerProps(plugin) as SnapshotBackedProps;

		const snapshot = explorer.getSnapshot(new Set(['note.Status']));

		expect(snapshot.explorerId).toBe('props');
		expect(snapshot.providerKey).toBe('props');
		expect(snapshot.sourceRevisions).toEqual({ propsRevision: 7 });

		// kind is 'prop' for the parent, 'value' for the children
		expect(snapshot.rows.map((row) => [row.id, row.kind, row.parentId, row.domainKey])).toEqual([
			['note.Status', 'prop', null, 'Status'],
			['note.Status::draft', 'value', 'note.Status', 'Status::draft'],
			['note.Status::done', 'value', 'note.Status', 'Status::done'],
		]);

		// value child sorted by frequency (draft=2 before done=1)
		expect(snapshot.byId.get('note.Status::draft')?.node.meta.rawValue).toBe('draft');

		// domain-key lookups stay raw / un-namespaced for filter toggles + reveal
		expect(snapshot.domainKeyToId.get('Status')).toBe('note.Status');
		expect(snapshot.domainKeyToId.get('Status::draft')).toBe('note.Status::draft');
		expect(snapshot.domainKeyToId.has('note.Status')).toBe(false);

		expect(snapshot.visibleIds).toEqual([
			'note.Status',
			'note.Status::draft',
			'note.Status::done',
		]);
	});

	it('reads the structural tree without invoking ViewService decorations', () => {
		const plugin = makePlugin();
		const explorer = new explorerProps(plugin) as SnapshotBackedProps;
		const getModel = vi.spyOn(plugin.viewService, 'getModel');

		expect(explorer.getStructuralTree().map((node) => node.id)).toEqual(['note.Status']);
		expect(getModel).not.toHaveBeenCalled();
	});
});
