import { afterEach, describe, it, expect } from 'vitest';
import {
	clearActivePerfProbe,
	createPerfProbe,
	setActivePerfProbe,
} from '../../../src/dev/perfProbe';
import { mockApp } from '../../helpers/obsidian-mocks';
import { DecorationManager } from '../../../src/services/serviceDecorate';

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
