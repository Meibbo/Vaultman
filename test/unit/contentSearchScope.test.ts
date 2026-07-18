import { describe, expect, it } from 'vitest';

import {
	CONTENT_SEARCHABLE_EXTENSIONS,
	isContentSearchableFile,
} from '../../src/logic/logicContentSearch';
import adapterSource from '../../src/services/serviceNativeSearchAdapter.ts?raw';
import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';
import frameSource from '../../src/VaultmanFrame.svelte?raw';

describe('content search scope + input responsiveness (BT4-008 / D28)', () => {
	it('only scans allowlisted text formats', () => {
		expect(CONTENT_SEARCHABLE_EXTENSIONS).toContain('md');
		expect(isContentSearchableFile({ extension: 'md' })).toBe(true);
		expect(isContentSearchableFile({ extension: 'MD' })).toBe(true);
		expect(isContentSearchableFile({ extension: 'mp4' })).toBe(false);
		expect(isContentSearchableFile({ extension: 'png' })).toBe(false);
		expect(isContentSearchableFile({ extension: 'canvas' })).toBe(false);
	});

	it('skips non-searchable files before reading their content', () => {
		expect(adapterSource).toContain(
			'if (!isContentSearchableFile(file)) continue;',
		);
		const skipIndex = adapterSource.indexOf(
			'if (!isContentSearchableFile(file)) continue;',
		);
		const readIndex = adapterSource.indexOf(
			'content = await this.app.vault.cachedRead(file);',
		);
		expect(skipIndex).toBeGreaterThan(-1);
		expect(skipIndex).toBeLessThan(readIndex);
	});

	it('defers the synchronous filter re-run behind the debounce timer', () => {
		const timerIndex = pageFiltersSource.indexOf(
			'const timer = window.setTimeout(() => {',
		);
		const pendingIndex = pageFiltersSource.indexOf(
			'plugin.filterService.setContentSearchPending(find);',
		);
		expect(timerIndex).toBeGreaterThan(-1);
		expect(pendingIndex).toBeGreaterThan(timerIndex);
	});
});

describe('preview refresh after edits (BT4-020)', () => {
	it('re-keys the content search when the vault changes mid-search', () => {
		expect(frameSource).toContain("plugin.app.vault.on('modify', onVaultModified)");
		expect(frameSource).toContain('hasEnabledContentSearchRule()');
		expect(frameSource).toContain(':edit:${contentEditRevision}');
		expect(frameSource).toContain('plugin.app.vault.offref(vaultModifyRef)');
	});
});

describe('pause/resume content search (BT4-018 / D46)', () => {
	it('freezes partial matches into the filter and unlocks replace while paused', () => {
		expect(pageFiltersSource).toContain("id: 'content-pause'");
		expect(pageFiltersSource).toContain('contentSearchPaused = !contentSearchPaused;');
		const pauseIndex = pageFiltersSource.indexOf('if (paused) {');
		const timerIndex = pageFiltersSource.indexOf(
			'const timer = window.setTimeout(() => {',
		);
		expect(pauseIndex).toBeGreaterThan(-1);
		expect(pauseIndex).toBeLessThan(timerIndex);
		const branch = pageFiltersSource.slice(pauseIndex, timerIndex);
		expect(branch).toContain('isLoading: false');
		expect(branch).toContain('setContentSearchRule(find, matched)');
	});
});
