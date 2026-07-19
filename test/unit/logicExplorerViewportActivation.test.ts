import { describe, expect, it, vi } from 'vitest';

import {
	isSameWorkspaceLeaf,
	refreshExplorerViewport,
	type ExplorerViewportPanels,
} from '../../src/logic/logicExplorerViewportActivation';

function panelMatrix() {
	const calls = {
		files: vi.fn(),
		props: vi.fn(),
		tags: vi.fn(),
		snippets: vi.fn(),
		plugins: vi.fn(),
	};
	const panels: ExplorerViewportPanels = Object.fromEntries(
		Object.entries(calls).map(([key, refreshViewport]) => [
			key,
			{ refreshViewport },
		]),
	);
	return { calls, panels };
}

describe('explorer viewport activation (BT5-002)', () => {
	it.each(['files', 'props', 'tags', 'snippets', 'plugins'] as const)(
		'refreshes only the active %s panel',
		(tab) => {
			const { calls, panels } = panelMatrix();

			expect(refreshExplorerViewport(tab, panels)).toBe(true);
			for (const [candidate, callback] of Object.entries(calls)) {
				expect(callback).toHaveBeenCalledTimes(candidate === tab ? 1 : 0);
			}
		},
	);

	it('does nothing for Content or an explorer that has not mounted yet', () => {
		const { calls, panels } = panelMatrix();

		expect(refreshExplorerViewport('content', panels)).toBe(false);
		expect(refreshExplorerViewport('files', { ...panels, files: null })).toBe(
			false,
		);
		expect(Object.values(calls).every((callback) => callback.mock.calls.length === 0)).toBe(
			true,
		);
	});

	it('matches the exact workspace leaf across main, sidebars and popouts', () => {
		const ownLeaf = {};
		expect(isSameWorkspaceLeaf(ownLeaf, ownLeaf)).toBe(true);
		expect(isSameWorkspaceLeaf({}, ownLeaf)).toBe(false);
		expect(isSameWorkspaceLeaf(null, ownLeaf)).toBe(false);
	});
});
