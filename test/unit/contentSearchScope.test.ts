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
			'plugin.filterService.setContentSearchPending(textSearchRuleId, find);',
		);
		expect(timerIndex).toBeGreaterThan(-1);
		expect(pendingIndex).toBeGreaterThan(timerIndex);
	});
});

describe('preview refresh after edits (BT4-020)', () => {
	it('re-keys the content search when the vault changes mid-search', () => {
		expect(frameSource).toContain(
			"plugin.app.vault.on('modify', onVaultModified)",
		);
		expect(frameSource).toContain('hasEnabledContentSearchRule()');
		expect(frameSource).toContain(':edit:${contentEditRevision}');
		expect(frameSource).toContain('plugin.app.vault.offref(vaultModifyRef)');
	});
});

describe('pause/resume content search (BT4-018 / D46, re-pointed by U121-017)', () => {
	it('freezes partial matches into the filter and unlocks replace while paused', () => {
		expect(pageFiltersSource).toContain("id: 'content-pause'");
		// The boolean toggle became a phase machine; the control now applies an
		// intent instead of flipping `contentSearchPaused`.
		expect(pageFiltersSource).toContain('applyTextSearchIntent(');
		expect(pageFiltersSource).toContain('contentSearchControl.intent');
		const pauseIndex = pageFiltersSource.indexOf(
			'if (!textSearchShouldScan(run)) {',
		);
		const timerIndex = pageFiltersSource.indexOf(
			'const timer = window.setTimeout(() => {',
		);
		expect(pauseIndex).toBeGreaterThan(-1);
		expect(pauseIndex).toBeLessThan(timerIndex);
		const branch = pageFiltersSource.slice(pauseIndex, timerIndex);
		expect(branch).toContain('isLoading: false');
		expect(branch).toContain('setContentSearchRule(');
	});

	it('resumes from the cursor and does not cancel the scan on tab switch (U121-016/017)', () => {
		// The teardown used to call `nativeSearchAdapter.cancel()`, which killed
		// an in-flight scan whenever the effect re-ran — including on a provider
		// switch. Only the debounce may be torn down now.
		const teardownIndex = pageFiltersSource.indexOf(
			'return () => {\n\t\t\twindow.clearTimeout(timer);',
		);
		expect(teardownIndex).toBeGreaterThan(-1);
		const teardown = pageFiltersSource.slice(
			teardownIndex,
			teardownIndex + 120,
		);
		expect(teardown).not.toContain('nativeSearchAdapter.cancel()');

		expect(pageFiltersSource).toContain('resumeFrom,');
		expect(pageFiltersSource).toContain('onProgress: (nextIndex) => {');
		expect(pageFiltersSource).toContain('reconcileTextSearchRun(');
	});

	it('claims the launch token inside the debounce, never before it', () => {
		// Claiming it before the timer meant an effect re-run inside the debounce
		// window cleared the pending timer and then returned early, so the search
		// never started and the Text tab showed nothing at all.
		const guardIndex = pageFiltersSource.indexOf('shouldLaunchTextSearch(');
		const timerIndex = pageFiltersSource.indexOf(
			'const timer = window.setTimeout(() => {',
		);
		const claimIndex = pageFiltersSource.indexOf(
			'contentSearchLaunchToken = launchToken;',
		);
		expect(guardIndex).toBeGreaterThan(-1);
		expect(claimIndex).toBeGreaterThan(timerIndex);
		expect(guardIndex).toBeLessThan(timerIndex);
	});

	it('applies the frozen filter rule once, not on every effect pass', () => {
		// setContentSearchRule -> onContentFilterChanged -> updateStats moves the
		// scope revision, which re-runs this effect. Without the token the frozen
		// branch re-applied the rule forever and pausing froze the app.
		expect(pageFiltersSource).toContain('const frozenToken =');
		expect(pageFiltersSource).toContain(
			'if (contentFrozenApplyToken !== frozenToken) {',
		);
		const tokenIndex = pageFiltersSource.indexOf(
			'if (contentFrozenApplyToken !== frozenToken) {',
		);
		const applyIndex = pageFiltersSource.indexOf(
			'setContentSearchRule(',
			tokenIndex
		);
		expect(tokenIndex).toBeGreaterThan(-1);
		expect(applyIndex).toBeGreaterThan(tokenIndex);
	});

	it('a scope-only revision change does not discard the traversal', () => {
		// `onContentFilterChanged` -> `updateStats` recomputes the scope revision,
		// so this search changes its own signature on its own tail. Only a real
		// intent change may reset the adapter.
		const resetIndex = pageFiltersSource.indexOf(
			'nativeSearchAdapter.resetRetained();',
		);
		expect(resetIndex).toBeGreaterThan(-1);
		expect(pageFiltersSource).toContain(
			'const intentChanged = !sameTextSearchIntent(',
		);
		// Asserted as "inside the intent-change branch", not as the line that
		// happens to follow it. The cancel that used to sit above this one carried
		// an `|| reconciled.phase === 'running'` arm, and folding it in on U121-017
		// moved this line two rows down without changing what guards it.
		const intentBranch =
			pageFiltersSource.match(/if \(intentChanged\) \{[\s\S]*?\n\t{3}\}/)?.[0] ??
			'';
		expect(intentBranch).not.toBe('');
		expect(intentBranch).toContain('nativeSearchAdapter.resetRetained();');
		expect(intentBranch).toContain('nativeSearchAdapter.cancel();');
	});
});
