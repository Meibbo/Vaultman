// eslint-disable-next-line import/no-nodejs-modules -- source guard reads the root CSS file in Vitest's Node environment.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import {
	condensedToolbarHiddenCount,
	shouldCondenseFilesToolbar,
	toolbarUsesHorizontalScroll,
} from '../../src/logic/logicResponsiveLayout';

describe('progressive condensed toolbar', () => {
	it('removes the two rightmost nodes first, then one per narrower slot', () => {
		expect(
			condensedToolbarHiddenCount({
				frameWidth: 360,
				nodeCount: 10,
				tabLabelVisible: false,
			}),
		).toBe(2);
		expect(
			condensedToolbarHiddenCount({
				frameWidth: 288,
				nodeCount: 10,
				tabLabelVisible: false,
			}),
		).toBe(4);
	});

	it('keeps the requested minimum including the Tools node', () => {
		expect(
			condensedToolbarHiddenCount({
				frameWidth: 100,
				nodeCount: 10,
				tabLabelVisible: true,
			}),
		).toBe(7);
		expect(
			condensedToolbarHiddenCount({
				frameWidth: 100,
				nodeCount: 10,
				tabLabelVisible: false,
			}),
		).toBe(6);
	});
});
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';
import enSource from '../../src/i18n/en.ts?raw';
import esSource from '../../src/i18n/es.ts?raw';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

describe('BT5-021 toolbar overflow strategy', () => {
	it('defaults to the condensed menu and persists an enum', () => {
		expect(DEFAULT_SETTINGS.toolbarOverflowStrategy).toBe('condensed');
	});

	it('keeps auto-condense and the manual preference in condensed mode', () => {
		const base = {
			activeSectionTab: 'files',
			minimalStyle: true,
			tabLabelVisible: false,
		};
		// Width-driven condense still fires.
		expect(
			shouldCondenseFilesToolbar({
				...base,
				frameWidth: 100,
				manual: false,
				overflowStrategy: 'condensed',
			}),
		).toBe(true);
		// The manual force still fires.
		expect(
			shouldCondenseFilesToolbar({
				...base,
				frameWidth: 9999,
				manual: true,
				overflowStrategy: 'condensed',
			}),
		).toBe(true);
	});

	it('never condenses in horizontal-scroll mode', () => {
		expect(
			shouldCondenseFilesToolbar({
				activeSectionTab: 'files',
				minimalStyle: true,
				tabLabelVisible: false,
				frameWidth: 60,
				manual: true,
				overflowStrategy: 'scroll',
			}),
		).toBe(false);
		expect(toolbarUsesHorizontalScroll('scroll')).toBe(true);
		expect(toolbarUsesHorizontalScroll('condensed')).toBe(false);
	});

	it('marks the toolbar as a centered scrollable line without a scrollbar', () => {
		expect(navbarSource).toContain('toolbarUsesHorizontalScroll(');
		expect(navbarSource).toContain(
			'class:vaultman-filters-actions--scroll={toolbarScroll}',
		);
		expect(stylesSource).toContain('.vaultman-filters-actions--scroll');
		expect(stylesSource).toContain('overflow-x: auto');
		expect(stylesSource).toContain('flex-wrap: nowrap');
		expect(stylesSource).toContain('scrollbar-width: none');
		expect(stylesSource).toContain(
			'.vaultman-filters-actions--scroll::-webkit-scrollbar',
		);
		// An accessible overflow hint (edge fade) is part of the feature.
		expect(stylesSource).toContain('vaultman-filters-actions--scroll::after');
		// Focus brings an off-screen action into view.
		expect(stylesSource).toContain('scroll-margin');
	});

	it('delegates wrap to the natural multi-line flex layout', () => {
		expect(navbarSource).toContain(
			'class:vaultman-filters-actions--wrap={toolbarWrap}',
		);
		expect(stylesSource).toContain('.vaultman-filters-actions--wrap');
		expect(stylesSource).toContain('flex-wrap: wrap');
	});

	it('keeps condensed nodes and its Tools case on one shrinkable line', () => {
		const baseActions =
			stylesSource.match(/\.vaultman-filters-actions\s*\{[\s\S]*?\n\}/)?.[0] ??
			'';
		expect(baseActions).toContain('flex-wrap: nowrap');
		expect(baseActions).toContain('min-width: 0');
		expect(baseActions).toContain('overflow: hidden');
		expect(stylesSource).toContain(
			'.vaultman-filters-actions > .nav-action-button',
		);
		expect(stylesSource).toContain('flex: 0 0 auto');
	});

	it('exposes the strategy selector in settings', () => {
		expect(settingsSource).toContain("'condensed'");
		expect(settingsSource).toContain("'scroll'");
		expect(settingsSource).toContain('toolbarOverflowStrategy');
		for (const source of [enSource, esSource]) {
			expect(source).toContain("'settings.toolbar_overflow':");
			expect(source).toContain("'settings.toolbar_overflow.condensed':");
			expect(source).toContain("'settings.toolbar_overflow.scroll':");
		}
	});
});
