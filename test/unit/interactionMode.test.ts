import { describe, expect, it } from 'vitest';

import {
	DEFAULT_INTERACTION_MODE,
	interactionModesForTab,
	normalizeInteractionMode,
	resolveInteractionAction,
} from '../../src/logic/logicInteractionMode';

describe('explorer interaction modes', () => {
	it('defines the locked per-tab mode order and defaults', () => {
		expect(interactionModesForTab('files')).toEqual(['open', 'add', 'select']);
		expect(interactionModesForTab('props')).toEqual([
			'open',
			'filter',
			'add',
			'select',
		]);
		expect(interactionModesForTab('tags')).toEqual([
			'open',
			'filter',
			'add',
			'select',
		]);
		expect(interactionModesForTab('snippets')).toEqual(['open', 'select']);
		expect(interactionModesForTab('plugins')).toEqual(['open', 'select']);
		expect(DEFAULT_INTERACTION_MODE).toEqual({
			files: 'open',
			props: 'filter',
			tags: 'filter',
			snippets: 'open',
			plugins: 'open',
		});
	});

	it('dispatches every Files mode', () => {
		expect(resolveInteractionAction('files', 'open', false)).toBe('open');
		expect(resolveInteractionAction('files', 'add', false)).toBe('add');
		expect(resolveInteractionAction('files', 'select', false)).toBe('select');
	});

	it('dispatches every Props and Tags mode', () => {
		for (const tab of ['props', 'tags'] as const) {
			expect(resolveInteractionAction(tab, 'open', false)).toBe('expand');
			expect(resolveInteractionAction(tab, 'open', true)).toBe(
				'content-search',
			);
			expect(resolveInteractionAction(tab, 'filter', false)).toBe('filter');
			expect(resolveInteractionAction(tab, 'add', false)).toBe('add');
			expect(resolveInteractionAction(tab, 'select', false)).toBe('select');
		}
	});

	it('dispatches selection for add-on providers', () => {
		for (const tab of ['snippets', 'plugins'] as const) {
			expect(resolveInteractionAction(tab, 'open', false)).toBe('open');
			expect(resolveInteractionAction(tab, 'select', false)).toBe('select');
		}
	});

	it('normalizes stale or cross-tab saved values to each tab default', () => {
		expect(normalizeInteractionMode('files', 'filter')).toBe('open');
		expect(normalizeInteractionMode('props', 'select')).toBe('select');
		expect(normalizeInteractionMode('tags', undefined)).toBe('filter');
	});
});
