import { describe, expect, it } from 'vitest';

import mainSource from '../../src/main.ts?raw';
import { nativeSurfaceSearchQuery } from '../../src/logic/logicNativeSurfaceSearch';

/**
 * U130 A15: "search selection in Vaultman" from a native surface (node-note
 * pill, editor tag, file explorer folder) is a TEXT search with the same
 * semantics as the editor-menu entry. It never mints a filter chip.
 */
describe('A15 native-surface search query', () => {
	it('tags search their bare path, with and without the hash', () => {
		expect(nativeSurfaceSearchQuery({ kind: 'tag', label: '#research' })).toBe('research');
		expect(
			nativeSurfaceSearchQuery({ kind: 'tag', label: 'research', tagPath: 'research/sub' }),
		).toBe('research/sub');
	});

	it('folders and files search their last path segment, not the whole path', () => {
		expect(
			nativeSurfaceSearchQuery({ kind: 'folder', label: 'Inbox/2026', path: 'Inbox/2026' }),
		).toBe('2026');
		expect(
			nativeSurfaceSearchQuery({ kind: 'file', label: 'a.pdf', path: 'docs/a.pdf' }),
		).toBe('a.pdf');
	});

	it('props and values search their real name/value, other kinds their label', () => {
		expect(nativeSurfaceSearchQuery({ kind: 'prop', label: 'x', propName: 'status' })).toBe(
			'status',
		);
		expect(nativeSurfaceSearchQuery({ kind: 'value', label: 'x', rawValue: 'done' })).toBe(
			'done',
		);
		expect(nativeSurfaceSearchQuery({ kind: 'plugin', label: 'Dataview' })).toBe('Dataview');
	});

	it('an empty query is null so nothing opens on nothing', () => {
		expect(nativeSurfaceSearchQuery({ kind: 'tag', label: '#' })).toBeNull();
		expect(nativeSurfaceSearchQuery({ kind: 'folder', label: '  ', path: '' })).toBeNull();
	});

	it('main.ts routes the native search to the content search, never to a filter', () => {
		const wiring = mainSource.slice(
			mainSource.indexOf('searchInVaultman:'),
			mainSource.indexOf('this.addChild(this.nativeSurfaceBindingService)'),
		);
		expect(wiring).toContain('openContentSearchWithQuery');
		expect(wiring).not.toContain('filterService.addNode');
		expect(wiring).not.toContain("filterType: 'specific_value'");
	});
});
