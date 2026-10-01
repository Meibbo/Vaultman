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
	searchIndex?: { search?: (query: string) => unknown } | null;
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
	return {
		tab: { id: tab, name: tab },
		page: page === '' ? undefined : { id: page.toLowerCase().replaceAll(' ', '-'), name: page },
		pagePath: page === '' ? [] : [page],
		results,
	};
}

function nativeItem(definition: string) {
	return {
		entry: { definition: { name: definition }, tab: undefined, page: undefined, pagePath: [] },
		nameMatch: { score: 1, matches: [[0, definition.length]] },
		descMatch: { score: 0, matches: [] },
	};
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

	it.each([
		['general', 'general'],
		['files and links', 'files'],
	])('maps the global row %s to native tab %s', (settingsTab, nativeTab) => {
		expect(
			resolveSettingSceneActivation({
				row: { pluginId: '', settingsTab, hasPluginTab: false },
				settingApiAvailable: true,
			}),
		).toEqual({ kind: 'open-settings-tab', tab: nativeTab });
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
		const [group, item] = navigate.mock.calls[0] as [
			ReturnType<typeof nativeGroup>,
			ReturnType<typeof nativeItem>,
		];
		expect(group.tab.id).toBe('developer-toolbox');
		expect(item.entry.definition.name).toBe('Storage folder');
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
		expect(
			(navigate.mock.calls[0][0] as ReturnType<typeof nativeGroup>).tab.id,
		).toBe('tab-b');
	});

	it('finds the exact native page identity and calls navigateToSearchResult (group only)', () => {
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
		expect(
			(navigate.mock.calls[0][0] as ReturnType<typeof nativeGroup>).tab.id,
		).toBe('developer-toolbox');
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
		expect(
			(navigate.mock.calls[0][0] as ReturnType<typeof nativeGroup>).tab.id,
		).toBe('tab-y');
	});

	it('does not approximate a page label with substring matching', () => {
		const navigate = vi.fn();
		const groups = [
			nativeGroup('general', 'General settings'),
			nativeGroup('general', 'General'),
		];
		const search = vi.fn(() => groups);
		const app = makeApp({ navigateToSearchResult: navigate, searchIndex: { search } });
		expect(
			scrollToSettingTarget(app, {
				tab: 'general',
				page: 'General',
				pagePath: 'General',
				definition: '',
			}),
		).toBe(true);
		expect(navigate).toHaveBeenCalledWith(groups[1]);
	});

	it('routes the Files and links legacy row identity to the native files tab', () => {
		const navigate = vi.fn();
		const groups = [
			nativeGroup('files', 'Files and links', [nativeItem('Default location for new notes')]),
		];
		const search = vi.fn(() => groups);
		const app = makeApp({ navigateToSearchResult: navigate, searchIndex: { search } });
		expect(
			scrollToSettingTarget(app, {
				tab: 'files and links',
				page: 'Files and links',
				pagePath: 'Files and links',
				definition: 'Default location for new notes',
			}),
		).toBe(true);
		expect(navigate).toHaveBeenCalledWith(
			groups[0],
			groups[0]?.results[0],
		);
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
		const search = () => 'not-array';
		const app = makeApp({
			navigateToSearchResult: vi.fn(),
			searchIndex: { search },
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
		expect(ok).toEqual({ status: 'success', destination: 'settings-row' });
		expect(navigate).toHaveBeenCalledOnce();
		expect(openTabById).not.toHaveBeenCalled();
	});

	it('navigate fails → reports degraded after tab-only fallback', () => {
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
		expect(ok).toEqual({ status: 'degraded', reason: 'native-navigation-failed' });
		expect(open).toHaveBeenCalledOnce();
		expect(openTabById).toHaveBeenCalledWith('developer-toolbox');
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
		expect(ok).toEqual({ status: 'success', destination: 'settings-tab' });
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
		expect(ok).toEqual({ status: 'failed' });
	});

	it('row-not-found in native search → degraded tab-only fallback', () => {
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
		expect(ok).toEqual({ status: 'degraded', reason: 'target-not-found' });
		expect(open).toHaveBeenCalledOnce();
		expect(navigate).not.toHaveBeenCalled();
	});
});
