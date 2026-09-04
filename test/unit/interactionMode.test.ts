import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import {
	DEFAULT_INTERACTION_MODE,
	interactionModesForTab,
	normalizeInteractionMode,
	resolveInteractionAction,
} from '../../src/logic/logicInteractionMode';

describe('explorer interaction modes', () => {
	it('defines the locked per-tab mode order and defaults', () => {
		// U121-029: Files gained `filter`, so the three node providers now offer
		// the same four modes in the same order. Files still *defaults* to
		// `open` — the mode is available, not preselected.
		expect(interactionModesForTab('files')).toEqual([
			'open',
			'filter',
			'add',
			'select',
		]);
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
		expect(resolveInteractionAction('files', 'filter', false)).toBe('filter');
		expect(resolveInteractionAction('files', 'add', false)).toBe('add');
		expect(resolveInteractionAction('files', 'select', false)).toBe('select');
		// Files opens the note; unlike Props and Tags, `open` is not expansion,
		// so the modifier does not turn it into a content search.
		expect(resolveInteractionAction('files', 'open', true)).toBe('open');
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
		// `filter` is a real Files mode now, so the cross-tab case has to come
		// from a provider that genuinely lacks it.
		expect(normalizeInteractionMode('snippets', 'filter')).toBe('open');
		expect(normalizeInteractionMode('plugins', 'add')).toBe('open');
		expect(normalizeInteractionMode('files', 'retired-mode')).toBe('open');
		expect(normalizeInteractionMode('files', 'filter')).toBe('filter');
		expect(normalizeInteractionMode('props', 'select')).toBe('select');
		expect(normalizeInteractionMode('tags', undefined)).toBe('filter');
	});
});

describe('U130-06 interaction mode persistence settings', () => {
	it('ships persistence on by default and no stored defaults', () => {
		expect(DEFAULT_SETTINGS.persistInteractionMode).toBe(true);
		expect(DEFAULT_SETTINGS.defaultInteractionModeByTab).toEqual({});
	});
});

