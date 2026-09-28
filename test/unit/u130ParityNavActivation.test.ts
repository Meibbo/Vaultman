import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	executeSettingSceneActivation,
	resolveSettingSceneActivation,
	scrollToSettingTarget,
} from '../../src/logic/logicSettingSceneActivation';

/* ---------- helpers ---------- */

function makeApp({
	navigateToSearchResult,
	searchIndex,
	openTabById,
	open,
}: {
	navigateToSearchResult?: (group: unknown, item?: unknown) => void;
	searchIndex?: { search?: (query: string) => unknown[] } | null;
	openTabById?: (id: string) => unknown;
	open?: () => void;
} = {}) {
	return {
		setting: {
			open,
			openTabById,
			searchIndex,
			navigateToSearchResult,
		},
	} as never;
}

function nativeGroup(tab: string, page: string, results: unknown[] = []) {
	return { tab, page, pagePath: '', results };
}

function nativeItem(definition: string) {
	return { entry: { definition, tab: '', page: '', pagePath: '' } };
}

beforeEach(() => {
	vi.restoreAllMocks();
});

/* ---------- resolution (F5 target shape) ---------- */

describe('U130 parity NAV: resolution', () => {
	it('target carries tab alongside page/definition', () => {
		const act = resolveSettingSceneActivation({
			row: {
				pluginId: '',
				settingsTab: 'developer-toolbox',
				hasPluginTab: false,
				settingsDefinition: 'Storage folder',
			},
			settingApiAvailable: true,
		});
		expect(act).toEqual({
			kind: 'open-settings-tab',
			tab: 'developer-toolbox',
			target: {
				tab: 'developer-toolbox',
				page: '',
				pagePath: '',
				definition: 'Storage folder',
			},
		});
	});

	it('tab-only shape intact without page/definition (F5 compat)', () => {
		expect(
			resolveSettingSceneActivation({
				row: { pluginId: '', settingsTab: 'editor', hasPluginTab: false },
				settingApiAvailable: true,
			}),
		).toEqual({ kind: 'open-settings-tab', tab: 'editor' });
	});

	it('settings without tab stays select-only even with definition', () => {
		expect(
			resolveSettingSceneActivation({
				row: {
					pluginId: '',
					settingsTab: '',
					hasPluginTab: false,
					settingsDefinition: 'Storage folder',
				},
				settingApiAvailable: true,
			}),
		).toEqual({ kind: 'select-only', reason: 'settings-without-tab' });
	});
});

/* ---------- native helper path ---------- */

describe('U130 parity NAV: scrollToSettingTarget (native API)', () => {
	it('returns false without navigateToSearchResult (no native API)', () => {
		const app = makeApp({ searchIndex: { search: () => [] } });
		expect(
			scrollToSettingTarget(app, {
				tab: 'developer-toolbox',
				page: '',
				pagePath: '',
				definition: 'Storage folder',
			}),
		).toBe(false);
	});

	it('returns false without searchIndex (no native API)', () => {
		const app = makeApp({ navigateToSearchResult: vi.fn() });
		expect(
			scrollToSettingTarget(app, {
				tab: 'developer-toolbox',
				page: '',
				pagePath: '',
				definition: 'Storage folder',
			}),
		).toBe(false);
	});

	it('finds exact definition and calls navigateToSearchResult', () => {
		const navigate = vi.fn();
		const search = vi.fn(() => [
			nativeGroup('developer-toolbox', '', [
				nativeItem('Other setting'),
				nativeItem('Storage folder'),
			]),
		]);
		const app = makeApp({ navigateToSearchResult: navigate, searchIndex: { search } });
		const ok = scrollToSettingTarget(app, {
			tab: 'developer-toolbox',
			page: '',
			pagePath: '',
			definition: 'Storage folder',
		});
		expect(ok).toBe(true);
		expect(navigate).toHaveBeenCalledOnce();
		const [group, item] = navigate.mock.calls[0];
		expect(group.tab).toBe('developer-toolbox');
		expect(item.entry.definition).toBe('Storage folder');
	});

	it('definition duplicate across tabs: matches correct tab only', () => {
		const navigate = vi.fn();
		const search = vi.fn(() => [
			nativeGroup('tab-a', '', [nativeItem('Shared label')]),
			nativeGroup('tab-b', '', [nativeItem('Shared label')]),
		]);
		const app = makeApp({ navigateToSearchResult: navigate, searchIndex: { search } });
		scrollToSettingTarget(app, {
			tab: 'tab-b',
			page: '',
			pagePath: '',
			definition: 'Shared label',
		});
		expect(navigate).toHaveBeenCalledOnce();
		expect(navigate.mock.calls[0][0].tab).toBe('tab-b');
	});

	it('finds page label and calls navigateToSearchResult (group only)', () => {
		const navigate = vi.fn();
		const search = vi.fn(() => [
			nativeGroup('developer-toolbox', 'Context menus', [
				nativeItem('Context menus'),
				nativeItem('Core plugin'),
			]),
		]);
		const app = makeApp({ navigateToSearchResult: navigate, searchIndex: { search } });
		const ok = scrollToSettingTarget(app, {
			tab: 'developer-toolbox',
			page: 'Context menus',
			pagePath: 'Context menus',
			definition: '',
		});
		expect(ok).toBe(true);
		expect(navigate).toHaveBeenCalledOnce();
		expect(navigate.mock.calls[0][0].tab).toBe('developer-toolbox');
	});

	it('page label repeated across tabs: matches correct tab only', () => {
		const navigate = vi.fn();
		const search = vi.fn(() => [
			nativeGroup('tab-x', 'General', [nativeItem('General')]),
			nativeGroup('tab-y', 'General', [nativeItem('General')]),
		]);
		const app = makeApp({ navigateToSearchResult: navigate, searchIndex: { search } });
		scrollToSettingTarget(app, {
			tab: 'tab-y',
			page: 'General',
			pagePath: '',
			definition: '',
		});
		expect(navigate).toHaveBeenCalledOnce();
		expect(navigate.mock.calls[0][0].tab).toBe('tab-y');
	});

	it('row-not-found returns false (caller falls back to tab-only)', () => {
		const navigate = vi.fn();
		const search = vi.fn(() => [nativeGroup('developer-toolbox', '', [nativeItem('Other')])]);
		const app = makeApp({ navigateToSearchResult: navigate, searchIndex: { search } });
		expect(
			scrollToSettingTarget(app, {
				tab: 'developer-toolbox',
				page: '',
				pagePath: '',
				definition: 'Missing setting XYZ',
			}),
		).toBe(false);
		expect(navigate).not.toHaveBeenCalled();
	});

	it('search error → false (degraded, never throws)', () => {
		const app = makeApp({
			navigateToSearchResult: vi.fn(),
			searchIndex: { search: vi.fn(() => { throw new Error('boom'); }) },
		});
		expect(
			scrollToSettingTarget(app, {
				tab: 'developer-toolbox',
				page: '',
				pagePath: '',
				definition: 'X',
			}),
		).toBe(false);
	});

	it('non-array search result → false', () => {
		const app = makeApp({
			navigateToSearchResult: vi.fn(),
			searchIndex: { search: vi.fn(() => 'not-array') as unknown as (query: string) => unknown[] },
		});
		expect(
			scrollToSettingTarget(app, {
				tab: 'developer-toolbox',
				page: '',
				pagePath: '',
				definition: 'X',
			}),
		).toBe(false);
	});
});

/* ---------- execute never dead-clicks ---------- */

describe('U130 parity NAV: execute never dead-clicks', () => {
	it('opens the tab and calls native helper (exact match)', () => {
		const open = vi.fn();
		const openTabById = vi.fn();
		const navigate = vi.fn();
		const search = vi.fn(() => [
			nativeGroup('developer-toolbox', '', [nativeItem('Storage folder')]),
		]);
		const app = makeApp({ open, openTabById, navigateToSearchResult: navigate, searchIndex: { search } });
		const ok = executeSettingSceneActivation(app, {
			kind: 'open-settings-tab',
			tab: 'developer-toolbox',
			target: { tab: 'developer-toolbox', page: '', pagePath: '', definition: 'Storage folder' },
		});
		expect(ok).toBe(true);
		expect(navigate).toHaveBeenCalledOnce();
	});

	it('navigate fails → still true (tab-only fallback, never dead)', () => {
		const open = vi.fn();
		const openTabById = vi.fn();
		const navigate = vi.fn(() => { throw new Error('native crash'); });
		const search = vi.fn(() => [nativeGroup('developer-toolbox', '', [nativeItem('Storage folder')])]);
		const app = makeApp({ open, openTabById, navigateToSearchResult: navigate, searchIndex: { search } });
		const ok = executeSettingSceneActivation(app, {
			kind: 'open-settings-tab',
			tab: 'developer-toolbox',
			target: { tab: 'developer-toolbox', page: '', pagePath: '', definition: 'Storage folder' },
		});
		expect(ok).toBe(true);
		expect(open).toHaveBeenCalledOnce();
	});

	it('tab-only (no target) → true, no native search', () => {
		const open = vi.fn();
		const openTabById = vi.fn();
		const navigate = vi.fn();
		const app = makeApp({ open, openTabById, navigateToSearchResult: navigate });
		const ok = executeSettingSceneActivation(app, {
			kind: 'open-settings-tab',
			tab: 'developer-toolbox',
		});
		expect(ok).toBe(true);
		expect(open).toHaveBeenCalledOnce();
		expect(openTabById).toHaveBeenCalledWith('developer-toolbox');
		expect(navigate).not.toHaveBeenCalled();
	});

	it('select-only → false (caller applies selection fallback)', () => {
		const app = makeApp();
		const ok = executeSettingSceneActivation(app, {
			kind: 'select-only',
			reason: 'settings-api-missing',
		});
		expect(ok).toBe(false);
	});

	it('row-not-found in native search → true (tab-only degraded)', () => {
		const open = vi.fn();
		const openTabById = vi.fn();
		const navigate = vi.fn();
		const search = vi.fn(() => [nativeGroup('developer-toolbox', '', [nativeItem('Other')])]);
		const app = makeApp({ open, openTabById, navigateToSearchResult: navigate, searchIndex: { search } });
		const ok = executeSettingSceneActivation(app, {
			kind: 'open-settings-tab',
			tab: 'developer-toolbox',
			target: { tab: 'developer-toolbox', page: '', pagePath: '', definition: 'Missing XYZ' },
		});
		expect(ok).toBe(true);
		expect(open).toHaveBeenCalledOnce();
		expect(navigate).not.toHaveBeenCalled();
	});
});