import { afterEach, describe, it, expect } from 'vitest';
import {
	clearActivePerfProbe,
	createPerfProbe,
	setActivePerfProbe,
} from '../../../src/dev/perfProbe';
import { mockApp } from '../../helpers/obsidian-mocks';
import { DecorationManager } from '../../../src/services/serviceDecorate';
import { IconOverrideStore } from '../../../src/services/serviceIconOverrides';

describe('DecorationManager', () => {
	afterEach(() => {
		clearActivePerfProbe();
	});

	it('returns empty highlights when query is empty', () => {
		const dm = new DecorationManager(mockApp());
		const out = dm.decorate({ id: 'a', label: 'hello world' } as never);
		expect(out.highlights).toEqual([]);
	});

	it('highlights all occurrences of the query in the label', () => {
		const dm = new DecorationManager(mockApp());
		dm.setHighlightQuery('foo');
		const out = dm.decorate({ id: 'a', label: 'foo bar foo' } as never);
		expect(out.highlights).toEqual([
			{ start: 0, end: 3 },
			{ start: 8, end: 11 },
		]);
	});

	it('notifies subscribers when query changes', () => {
		const dm = new DecorationManager(mockApp());
		let count = 0;
		dm.subscribe(() => count++);
		dm.setHighlightQuery('x');
		expect(count).toBe(1);
	});

	it('falls back through tag/property/basename when label absent', () => {
		const dm = new DecorationManager(mockApp());
		dm.setHighlightQuery('pro');
		const out = dm.decorate({ id: 'x', property: 'project' } as never);
		expect(out.highlights.length).toBeGreaterThan(0);
		expect(out.highlights[0].start).toBe(0);
	});

	it('uses context query without mutating the global query', () => {
		const dm = new DecorationManager(mockApp());
		const out = dm.decorate({ id: 'a', label: 'Alpha beta' } as never, { highlightQuery: 'alpha' });
		expect(out.highlights).toEqual([{ start: 0, end: 5 }]);
		expect(dm.decorate({ id: 'b', label: 'Alpha' } as never).highlights).toEqual([]);
	});

	it('returns default icons for explorer node contexts', () => {
		const dm = new DecorationManager(mockApp());
		expect(
			dm.decorate({ id: 'p', label: 'status' } as never, { kind: 'prop', propType: 'text' })
				.icons[0],
		).toBe('lucide-text-align-start');
		expect(dm.decorate({ id: 't', label: '#project' } as never, { kind: 'tag' }).icons[0]).toBe(
			'lucide-tag',
		);
		expect(
			dm.decorate({ id: 'f', label: 'Notes' } as never, { kind: 'file', isFolder: true }).icons[0],
		).toBe('lucide-folder');
	});

	// Characterization (PAI-001): captured BEFORE routing serviceDecorate through
	// logicIconResolver, to prove the resolver wiring is visual-parity-preserving,
	// not just assumed. These exact icon ids must stay stable across the wiring.
	describe('characterization — icon output per representative node type (pre-resolver baseline)', () => {
		it('folder node -> lucide-folder', () => {
			const dm = new DecorationManager(mockApp());
			const out = dm.decorate({ id: 'folder-1', label: 'Projects' } as never, {
				kind: 'file',
				isFolder: true,
			});
			expect(out.icons[0]).toBe('lucide-folder');
		});

		it('plain file node (.md) -> lucide-file', () => {
			const dm = new DecorationManager(mockApp());
			const out = dm.decorate({ id: 'file-1', label: 'note.md' } as never, {
				kind: 'file',
				isFolder: false,
				extension: 'md',
			});
			expect(out.icons[0]).toBe('lucide-file');
		});

		it('image file node (.png) -> lucide-image', () => {
			const dm = new DecorationManager(mockApp());
			const out = dm.decorate({ id: 'file-2', label: 'photo.png' } as never, {
				kind: 'file',
				isFolder: false,
				extension: 'png',
			});
			expect(out.icons[0]).toBe('lucide-image');
		});

		it('tag node without Iconic -> lucide-tag', () => {
			const dm = new DecorationManager(mockApp());
			const out = dm.decorate({ id: 'tag-1', label: '#project' } as never, {
				kind: 'tag',
				iconicIcon: null,
			});
			expect(out.icons[0]).toBe('lucide-tag');
		});

		it('tag node with Iconic override -> Iconic wins', () => {
			const dm = new DecorationManager(mockApp());
			const out = dm.decorate({ id: 'tag-2', label: '#project' } as never, {
				kind: 'tag',
				iconicIcon: 'lucide-star',
			});
			expect(out.icons[0]).toBe('lucide-star');
		});

		it('prop node with known type (checkbox) -> TYPE_ICON_MAP entry', () => {
			const dm = new DecorationManager(mockApp());
			const out = dm.decorate({ id: 'prop-1', label: 'done' } as never, {
				kind: 'prop',
				propType: 'checkbox',
			});
			expect(out.icons[0]).toBe('lucide-check-square');
		});

		it('prop node with unknown type -> generic lucide-tag fallback', () => {
			const dm = new DecorationManager(mockApp());
			const out = dm.decorate({ id: 'prop-2', label: 'weird' } as never, {
				kind: 'prop',
				propType: 'not-a-real-type',
			});
			expect(out.icons[0]).toBe('lucide-tag');
		});

		it('prop node with Iconic override -> Iconic wins over type map', () => {
			const dm = new DecorationManager(mockApp());
			const out = dm.decorate({ id: 'prop-3', label: 'done' } as never, {
				kind: 'prop',
				propType: 'checkbox',
				iconicIcon: 'lucide-flag',
			});
			expect(out.icons[0]).toBe('lucide-flag');
		});

		it('value node (isValueNode) -> generic lucide-tag fallback (no dedicated file/tag/prop branch)', () => {
			const dm = new DecorationManager(mockApp());
			const out = dm.decorate({ id: 'value-1', label: 'active' } as never, {
				kind: 'prop',
				isValueNode: true,
			});
			// Today's decorateNode has no branch for isValueNode -> icons stays empty.
			expect(out.icons).toEqual([]);
		});
	});

	// PAI-002: DecorationManager consults an IconOverrideStore for the node's
	// D6-namespaced key before falling through to the resolver chain.
	describe('icon overrides (PAI-002)', () => {
		it('with zero overrides stored, output is byte-identical to today (parity default)', () => {
			const store = new IconOverrideStore();
			const dm = new DecorationManager(mockApp(), store);
			const out = dm.decorate({ id: 'folder-1', label: 'Projects' } as never, {
				kind: 'file',
				isFolder: true,
				nodeKey: 'folder.Projects',
			});
			expect(out.icons[0]).toBe('lucide-folder');
		});

		it('applies a stored node override for a file node', () => {
			const store = new IconOverrideStore();
			store.setForNode('file.notes/todo.md', 'emoji:📝');
			const dm = new DecorationManager(mockApp(), store);
			const out = dm.decorate({ id: 'file-1', label: 'todo.md' } as never, {
				kind: 'file',
				isFolder: false,
				extension: 'md',
				nodeKey: 'file.notes/todo.md',
			});
			expect(out.icons[0]).toBe('📝');
		});

		it('applies a stored node override for a tag node', () => {
			const store = new IconOverrideStore();
			store.setForNode('tag.project', 'star');
			const dm = new DecorationManager(mockApp(), store);
			const out = dm.decorate({ id: 'tag-1', label: '#project' } as never, {
				kind: 'tag',
				nodeKey: 'tag.project',
			});
			expect(out.icons[0]).toBe('lucide-star');
		});

		it('applies a stored node override for a prop node, winning over the type map', () => {
			const store = new IconOverrideStore();
			store.setForNode('prop.status', 'flag');
			const dm = new DecorationManager(mockApp(), store);
			const out = dm.decorate({ id: 'prop-1', label: 'status' } as never, {
				kind: 'prop',
				propType: 'checkbox',
				nodeKey: 'prop.status',
			});
			expect(out.icons[0]).toBe('lucide-flag');
		});

		it('override WINS over Iconic (explicit user intent beats the Iconic bridge)', () => {
			const store = new IconOverrideStore();
			store.setForNode('tag.project', 'star');
			const dm = new DecorationManager(mockApp(), store);
			const out = dm.decorate({ id: 'tag-2', label: '#project' } as never, {
				kind: 'tag',
				iconicIcon: 'lucide-flame',
				nodeKey: 'tag.project',
			});
			expect(out.icons[0]).toBe('lucide-star');
		});

		it('no node override + Iconic present -> Iconic still wins over the resolver chain (unchanged precedence)', () => {
			const store = new IconOverrideStore();
			const dm = new DecorationManager(mockApp(), store);
			const out = dm.decorate({ id: 'tag-3', label: '#project' } as never, {
				kind: 'tag',
				iconicIcon: 'lucide-flame',
				nodeKey: 'tag.other',
			});
			expect(out.icons[0]).toBe('lucide-flame');
		});

		it('falls through to the resolver chain when the node has no nodeKey', () => {
			const store = new IconOverrideStore();
			store.setForProvider('tags', 'star');
			const dm = new DecorationManager(mockApp(), store);
			const out = dm.decorate({ id: 'tag-4', label: '#project' } as never, { kind: 'tag' });
			// No nodeKey supplied by the caller (older call sites) -> the provider
			// default cannot be looked up either; parity behavior applies.
			expect(out.icons[0]).toBe('lucide-tag');
		});

		it('applies a provider-level default override when no per-node override is set', () => {
			const store = new IconOverrideStore();
			store.setForProvider('tags', 'emoji:🏷️');
			const dm = new DecorationManager(mockApp(), store);
			const out = dm.decorate({ id: 'tag-5', label: '#other' } as never, {
				kind: 'tag',
				nodeKey: 'tag.other',
				providerId: 'tags',
			});
			expect(out.icons[0]).toBe('🏷️');
		});

		it('round-trips through the store: set -> new DecorationManager instance -> resolve applies', () => {
			const store = new IconOverrideStore();
			store.setForNode('folder.Archive', 'emoji:🗄️');
			const persisted = store.toDocument();

			const reloadedStore = new IconOverrideStore();
			reloadedStore.hydrate(persisted);
			const dm = new DecorationManager(mockApp(), reloadedStore);
			const out = dm.decorate({ id: 'folder-2', label: 'Archive' } as never, {
				kind: 'file',
				isFolder: true,
				nodeKey: 'folder.Archive',
			});
			expect(out.icons[0]).toBe('🗄️');
		});

		it('constructing DecorationManager without a store argument keeps today exact behavior', () => {
			// Back-compat: the store parameter is optional so every existing
			// `new DecorationManager(app)` call site (9 test files + main.ts
			// pre-wiring) keeps working unchanged.
			const dm = new DecorationManager(mockApp());
			const out = dm.decorate({ id: 'file-3', label: 'photo.png' } as never, {
				kind: 'file',
				isFolder: false,
				extension: 'png',
			});
			expect(out.icons[0]).toBe('lucide-image');
		});
	});

	it('records active probe metrics for decoration calls', () => {
		const probe = createPerfProbe({ now: () => 0 });
		const dm = new DecorationManager(mockApp());

		setActivePerfProbe(probe.api);
		dm.decorate({ id: 'p', label: 'status' } as never, { kind: 'prop' });

		expect(probe.snapshot().timings['decoration.decorate']).toMatchObject({
			count: 1,
			totalNodes: 1,
		});
	});
});
