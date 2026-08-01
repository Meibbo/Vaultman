import { describe, expect, it } from 'vitest';

import tabContentSource from '../../src/components/pages/tabContent.svelte?raw';

describe('Content tab source guards', () => {
	it('keeps Content as a body surface because its tab/sort/expand controls live in the filters header', () => {
		expect(tabContentSource).toContain('sortedContentFiles');
		expect(tabContentSource).toContain('toggleContentFile');
		expect(tabContentSource).not.toContain(
			'vaultman-content-header nav-header',
		);
	});

	it('renders a landing state for idle or empty Content searches', () => {
		expect(tabContentSource).toContain('vaultman-content-landing');
		expect(tabContentSource).toContain("translate('content.landing_title')");
		expect(tabContentSource).toContain("translate('content.empty_desc')");
	});

	it('keeps replace input collapsed behind a dedicated toggle', () => {
		expect(tabContentSource).toContain('contentReplaceOpen');
		expect(tabContentSource).toContain("translate('content.toggle_replace')");
		expect(tabContentSource).toContain(
			'{#if contentReplaceOpen || contentReplace}',
		);
		expect(tabContentSource).toContain('vaultman-content-replace-toggle');
	});

	it('keeps clear buttons inside Content search and replace inputs', () => {
		expect(tabContentSource).toContain('vaultman-content-clear-button');
		expect(tabContentSource).toContain(
			'class="clickable-icon vaultman-content-clear-button"',
		);
		expect(tabContentSource).not.toContain('search-input-clear-button');
		expect(tabContentSource).not.toContain(
			"title={translate('filter.search_clear')}",
		);
		expect(tabContentSource).toContain(
			'class="clickable-icon vaultman-icon-toggle',
		);
		expect(tabContentSource).toContain('{#if contentFind}');
		expect(tabContentSource).toContain('{#if contentReplace}');
		expect(tabContentSource).toContain("contentFind = ''");
		expect(tabContentSource).toContain("contentReplace = ''");
	});

	it('uses distinct explicit icons for Content search and replace inputs', () => {
		expect(tabContentSource).toContain("use:iconAction={'lucide-search'}");
		expect(tabContentSource).toContain("use:iconAction={'lucide-replace'}");
		expect(tabContentSource).toContain('vaultman-content-replace-container');
	});

	it('does not own the Has/Hasn’t action after it moves to the Text panelWidget', () => {
		expect(tabContentSource).not.toContain(
			'contentIsExclusion = !contentIsExclusion;',
		);
		expect(tabContentSource).not.toContain(
			'class:is-active={contentIsExclusion}',
		);
	});

	it('can reveal the active file inside Content results', () => {
		expect(tabContentSource).toContain('activeContentRevealPath');
		expect(tabContentSource).toContain('contentRevealRevision');
		expect(tabContentSource).toContain('bind:this={contentResultsEl}');
		expect(tabContentSource).toContain('scrollIntoView({ block:');
		expect(tabContentSource).toContain('data-vm-content-path');
	});
});
