import { describe, expect, it } from 'vitest';

import {
	addonIconKey,
	clearAddonIconOverride,
	addonIconChoices,
	getAddonIconOverride,
	normalizeAddonIconOverrides,
	readAddonIconOverrides,
	resolveAddonIcon,
	setAddonIconOverride,
	writeAddonIconOverrides,
	type AddonIconOverrides,
} from '../../src/logic/logicAddonIcons';
import pickerSource from '../../src/modals/modalAddonIconPicker.ts?raw';
import snippetsSource from '../../src/components/containers/explorerSnippets.ts?raw';
import pluginsSource from '../../src/components/containers/explorerPlugins.ts?raw';
import snippetsLogicSource from '../../src/logic/logicSnippetContextMenu.ts?raw';
import pluginsLogicSource from '../../src/logic/logicPluginContextMenu.ts?raw';
import logicSource from '../../src/logic/logicAddonIcons.ts?raw';
import enSource from '../../src/i18n/en.ts?raw';
import esSource from '../../src/i18n/es.ts?raw';
import serviceIconsSource from '../../src/services/serviceIcons.ts?raw';

describe('BT5-019 stable addon identity', () => {
	it('keys plugins by pluginId and namespaces them per kind', () => {
		expect(addonIconKey('plugin', 'dataview')).toBe('plugin:dataview');
		expect(addonIconKey('snippet', 'dataview')).toBe('snippet:dataview');
		// A plugin id and a snippet name can collide as raw labels; the key
		// must keep them apart.
		expect(addonIconKey('plugin', 'x')).not.toBe(addonIconKey('snippet', 'x'));
	});

	it('keys snippets by canonical name without the .css extension', () => {
		expect(addonIconKey('snippet', 'theme.css')).toBe('snippet:theme');
		expect(addonIconKey('snippet', 'theme')).toBe('snippet:theme');
		expect(addonIconKey('snippet', 'my.styles.css')).toBe('snippet:my.styles');
		// Only a trailing .css is an extension, never an inner one.
		expect(addonIconKey('snippet', 'a.css.b')).toBe('snippet:a.css.b');
	});

	it('trims incidental whitespace without collapsing distinct ids', () => {
		expect(addonIconKey('snippet', '  theme.css  ')).toBe('snippet:theme');
		expect(addonIconKey('plugin', ' dataview ')).toBe('plugin:dataview');
	});

	it('percent-encodes the id so a separator inside it cannot forge a key', () => {
		// Without encoding, a snippet literally named "x:y" would collide with
		// another kind/id tuple once split.
		expect(addonIconKey('snippet', 'my styles.css')).toBe(
			'snippet:my%20styles',
		);
		expect(addonIconKey('plugin', 'a:b')).toBe('plugin:a%3Ab');
		expect(addonIconKey('plugin', 'a%b')).toBe('plugin:a%25b');
	});

	it('rejects an empty identity instead of writing a kind-only key', () => {
		for (const raw of ['', '   ', '.css']) {
			expect(addonIconKey('snippet', raw)).toBeNull();
		}
		expect(addonIconKey('plugin', '')).toBeNull();
		expect(addonIconKey('plugin', '   ')).toBeNull();
	});
});

describe('BT5-019 empty identity is inert across the store', () => {
	it('never stores, reads or clears through an empty id', () => {
		const store = setAddonIconOverride({}, 'snippet', '  ', {
			icon: 'lucide-star',
		});
		expect(store).toEqual({});
		expect(getAddonIconOverride({}, 'plugin', '')).toBeNull();
		expect(
			clearAddonIconOverride({ 'plugin:x': { icon: 'i' } }, 'plugin', ''),
		).toEqual({ 'plugin:x': { icon: 'i' } });
	});
});

describe('BT5-019 override store (pure, persistence-agnostic)', () => {
	it('sets and reads an override through the canonical key', () => {
		const store = setAddonIconOverride({}, 'snippet', 'theme.css', {
			icon: 'lucide-palette',
			color: 'purple',
		});
		expect(getAddonIconOverride(store, 'snippet', 'theme')).toEqual({
			icon: 'lucide-palette',
			color: 'purple',
		});
		// Same snippet reached with the raw filename resolves identically.
		expect(getAddonIconOverride(store, 'snippet', 'theme.css')).toEqual({
			icon: 'lucide-palette',
			color: 'purple',
		});
	});

	it('never mutates the input store', () => {
		const original: AddonIconOverrides = {};
		const next = setAddonIconOverride(original, 'plugin', 'dataview', {
			icon: 'lucide-database',
		});
		expect(original).toEqual({});
		expect(next).not.toBe(original);
		const cleared = clearAddonIconOverride(next, 'plugin', 'dataview');
		expect(getAddonIconOverride(next, 'plugin', 'dataview')).not.toBeNull();
		expect(getAddonIconOverride(cleared, 'plugin', 'dataview')).toBeNull();
	});

	it('clearing an absent id is a no-op instead of an error', () => {
		expect(clearAddonIconOverride({}, 'plugin', 'ghost')).toEqual({});
		expect(getAddonIconOverride({}, 'plugin', 'ghost')).toBeNull();
	});

	it('drops the color when an override has none', () => {
		const store = setAddonIconOverride({}, 'plugin', 'p', {
			icon: 'lucide-plug',
		});
		expect(getAddonIconOverride(store, 'plugin', 'p')).toEqual({
			icon: 'lucide-plug',
		});
	});

	it('normalizes unknown persisted shapes without throwing or losing valid rows', () => {
		const persisted = {
			'plugin:dataview': { icon: 'lucide-database', color: 'blue' },
			'snippet:theme': { icon: 'lucide-palette' },
			'plugin:broken': { color: 'red' }, // no icon → unusable
			'snippet:bad': 'lucide-x', // wrong shape
			'plugin:nested': { icon: { name: 'x' } }, // wrong icon type
			legacyKeyWithoutKind: { icon: 'lucide-file' },
			42: { icon: 'lucide-file' },
		};

		const store = normalizeAddonIconOverrides(persisted);

		expect(getAddonIconOverride(store, 'plugin', 'dataview')).toEqual({
			icon: 'lucide-database',
			color: 'blue',
		});
		expect(getAddonIconOverride(store, 'snippet', 'theme')).toEqual({
			icon: 'lucide-palette',
		});
		expect(getAddonIconOverride(store, 'plugin', 'broken')).toBeNull();
		expect(getAddonIconOverride(store, 'snippet', 'bad')).toBeNull();
		expect(getAddonIconOverride(store, 'plugin', 'nested')).toBeNull();
		expect(Object.keys(store)).toEqual(['plugin:dataview', 'snippet:theme']);
	});

	it('survives non-object persisted values', () => {
		for (const value of [null, undefined, 'x', 7, []]) {
			expect(normalizeAddonIconOverrides(value)).toEqual({});
		}
	});
});

describe('BT5-019 precedence: Vaultman > Iconic > emitted > fallback', () => {
	const iconic = { icon: 'lucide-ribbon', color: 'blue' };
	const emitted = { icon: 'lucide-emitted' };

	it('prefers the Vaultman override over every external source', () => {
		expect(
			resolveAddonIcon({
				override: { icon: 'lucide-star', color: 'purple' },
				iconic,
				emitted,
				fallback: 'lucide-plug',
			}),
		).toEqual({ icon: 'lucide-star', color: 'purple' });
	});

	it('falls to Iconic when Vaultman has no override', () => {
		expect(
			resolveAddonIcon({
				override: null,
				iconic,
				emitted,
				fallback: 'lucide-plug',
			}),
		).toEqual({ icon: 'lucide-ribbon', color: 'blue' });
	});

	it('falls to the addon-emitted icon when Iconic is absent or disabled', () => {
		expect(
			resolveAddonIcon({
				override: null,
				iconic: null,
				emitted,
				fallback: 'lucide-plug',
			}),
		).toEqual({ icon: 'lucide-emitted' });
	});

	it('falls to the kind fallback when nothing else exists', () => {
		expect(
			resolveAddonIcon({
				override: null,
				iconic: null,
				emitted: null,
				fallback: 'lucide-file-code',
			}),
		).toEqual({ icon: 'lucide-file-code' });
	});

	it('resolves with Iconic entirely absent (plugin not installed)', () => {
		// No iconic key at all, not merely null.
		expect(
			resolveAddonIcon({ override: null, emitted, fallback: 'lucide-plug' }),
		).toEqual({ icon: 'lucide-emitted' });
		expect(resolveAddonIcon({ fallback: 'lucide-plug' })).toEqual({
			icon: 'lucide-plug',
		});
	});

	it('ignores sources whose icon is empty instead of rendering a blank cell', () => {
		expect(
			resolveAddonIcon({
				override: { icon: '   ' },
				iconic: { icon: '' },
				emitted,
				fallback: 'lucide-plug',
			}),
		).toEqual({ icon: 'lucide-emitted' });
	});

	it('keeps a persisted icon that the library no longer knows, but degrades the render', () => {
		const store = setAddonIconOverride({}, 'plugin', 'dataview', {
			icon: 'lucide-removed-icon',
			color: 'red',
		});

		const resolved = resolveAddonIcon({
			override: getAddonIconOverride(store, 'plugin', 'dataview'),
			iconic,
			emitted,
			fallback: 'lucide-plug',
			isKnownIcon: (icon) => icon !== 'lucide-removed-icon',
		});

		// Renders the next source in the chain…
		expect(resolved).toEqual({ icon: 'lucide-ribbon', color: 'blue' });
		// …but the override is NOT purged: the icon may come back.
		expect(getAddonIconOverride(store, 'plugin', 'dataview')).toEqual({
			icon: 'lucide-removed-icon',
			color: 'red',
		});
	});

	it('validates isKnownIcon ONLY against the persisted override', () => {
		// Iconic and the add-on publish icons from their own registries; they
		// must not be dropped just because getIconIds() does not list them.
		expect(
			resolveAddonIcon({
				override: null,
				iconic: { icon: 'iconic-only-glyph' },
				emitted,
				fallback: 'lucide-plug',
				isKnownIcon: (icon) => icon.startsWith('lucide-'),
			}),
		).toEqual({ icon: 'iconic-only-glyph' });

		expect(
			resolveAddonIcon({
				override: null,
				iconic: null,
				emitted: { icon: 'plugin-own-glyph' },
				fallback: 'lucide-plug',
				isKnownIcon: (icon) => icon.startsWith('lucide-'),
			}),
		).toEqual({ icon: 'plugin-own-glyph' });
	});

	it('lets an Iconic color-only entry tint the icon that actually renders', () => {
		// Iconic can carry a color without an icon; the color must survive onto
		// the emitted/fallback glyph instead of being thrown away.
		expect(
			resolveAddonIcon({
				override: null,
				iconic: { color: 'blue' },
				emitted,
				fallback: 'lucide-plug',
			}),
		).toEqual({ icon: 'lucide-emitted', color: 'blue' });

		expect(
			resolveAddonIcon({
				override: null,
				iconic: { color: 'blue' },
				emitted: null,
				fallback: 'lucide-plug',
			}),
		).toEqual({ icon: 'lucide-plug', color: 'blue' });
	});

	it('keeps the winning icon source colorless when no source offers a color', () => {
		expect(
			resolveAddonIcon({
				override: null,
				iconic: null,
				emitted: { icon: 'lucide-emitted' },
				fallback: 'lucide-plug',
			}),
		).toEqual({ icon: 'lucide-emitted' });
	});

	it('prefers the color of the source that won the icon over a lower one', () => {
		expect(
			resolveAddonIcon({
				override: { icon: 'lucide-star', color: 'purple' },
				iconic: { color: 'blue' },
				emitted,
				fallback: 'lucide-plug',
			}),
		).toEqual({ icon: 'lucide-star', color: 'purple' });
	});

	it('takes an override color even when the icon comes from the same override only', () => {
		expect(
			resolveAddonIcon({
				override: { icon: 'lucide-star' },
				iconic,
				fallback: 'lucide-plug',
			}),
		).toEqual({ icon: 'lucide-star' });
	});
});

describe('BT5-019 lifecycle policy', () => {
	it('keeps the override when an addon is disabled or uninstalled', () => {
		// Nothing in the pure layer removes entries on state change; only an
		// explicit reset does.
		const store = setAddonIconOverride({}, 'plugin', 'dataview', {
			icon: 'lucide-database',
		});
		// Simulated disable/uninstall/reload = the id simply stops being listed.
		expect(getAddonIconOverride(store, 'plugin', 'dataview')).toEqual({
			icon: 'lucide-database',
		});
	});

	it('does not transfer a snippet override on rename', () => {
		const store = setAddonIconOverride({}, 'snippet', 'old.css', {
			icon: 'lucide-palette',
		});
		// The renamed snippet is a different identity; no heuristic follows it.
		expect(getAddonIconOverride(store, 'snippet', 'new.css')).toBeNull();
		expect(getAddonIconOverride(store, 'snippet', 'old')).toEqual({
			icon: 'lucide-palette',
		});
	});

	it('reset clears only the Vaultman override and restores the chain', () => {
		const store = setAddonIconOverride({}, 'snippet', 'theme.css', {
			icon: 'lucide-star',
		});
		const cleared = clearAddonIconOverride(store, 'snippet', 'theme.css');

		expect(
			resolveAddonIcon({
				override: getAddonIconOverride(cleared, 'snippet', 'theme'),
				iconic: { icon: 'lucide-ribbon' },
				emitted: { icon: 'lucide-emitted' },
				fallback: 'lucide-file-code',
			}),
		).toEqual({ icon: 'lucide-ribbon' });
	});
});

describe('BT5-019 persistence port (provisional settings seam)', () => {
	it('reads a sanitized store from a settings-like object', () => {
		const settings = {
			addonIconOverrides: {
				'plugin:dataview': { icon: 'lucide-database' },
				'plugin:bad': { color: 'red' },
			},
		};
		expect(readAddonIconOverrides(settings)).toEqual({
			'plugin:dataview': { icon: 'lucide-database' },
		});
	});

	it('reads an empty store when the field is absent or malformed', () => {
		expect(readAddonIconOverrides({})).toEqual({});
		expect(readAddonIconOverrides({ addonIconOverrides: 'x' })).toEqual({});
		expect(readAddonIconOverrides(null)).toEqual({});
	});

	it('writes a NEW map and preserves rows this version does not understand', () => {
		const settings: Record<string, unknown> = {
			addonIconOverrides: {
				'plugin:dataview': { icon: 'lucide-database' },
				'future:thing': { icon: 'lucide-x', shape: 'square' },
			},
		};
		const before = settings.addonIconOverrides;

		writeAddonIconOverrides(
			settings,
			setAddonIconOverride(
				readAddonIconOverrides(settings),
				'snippet',
				'theme.css',
				{ icon: 'lucide-palette' },
			),
		);

		const after = settings.addonIconOverrides as Record<string, unknown>;
		// New object, not a mutation of the persisted one.
		expect(after).not.toBe(before);
		expect(after['snippet:theme']).toEqual({ icon: 'lucide-palette' });
		expect(after['plugin:dataview']).toEqual({ icon: 'lucide-database' });
		// A row from a future/other version survives the round-trip.
		expect(after['future:thing']).toEqual({
			icon: 'lucide-x',
			shape: 'square',
		});
	});

	it('drops a cleared override from persistence while keeping foreign rows', () => {
		const settings: Record<string, unknown> = {
			addonIconOverrides: {
				'plugin:dataview': { icon: 'lucide-database' },
				'future:thing': { icon: 'lucide-x' },
			},
		};
		writeAddonIconOverrides(
			settings,
			clearAddonIconOverride(
				readAddonIconOverrides(settings),
				'plugin',
				'dataview',
			),
		);
		const after = settings.addonIconOverrides as Record<string, unknown>;
		expect(after['plugin:dataview']).toBeUndefined();
		expect(after['future:thing']).toEqual({ icon: 'lucide-x' });
	});
});

describe('BT5-019 panel wiring guards', () => {
	for (const [name, source, logicSource] of [
		['snippets', snippetsSource, snippetsLogicSource],
		['plugins', pluginsSource, pluginsLogicSource],
	] as const) {
		it(`${name}: resolves icons through the shared precedence chain`, () => {
			expect(source).toMatch(/resolveAddonIcon/);
			expect(source).toMatch(/readAddonIconOverrides/);
		});

		it(`${name}: offers Change icon in the context menu and can reset`, () => {
			expect(logicSource).toMatch(/addon\.icon\.change/);
			expect(logicSource).toMatch(/openAddonIconPicker/);
			expect(logicSource).toMatch(/clearAddonIconOverride/);
		});

		it(`${name}: persists through one saveSettings per human action`, () => {
			expect(logicSource).toMatch(/writeAddonIconOverrides/);
			expect(logicSource).toMatch(/saveSettings\(\)/);
		});

		it(`${name}: subscribes to Iconic changes with cleanup and no new polling`, () => {
			expect(source).toMatch(/onChanged\(/);
			expect(source).toMatch(/this\.register\(/);
			// The 2.5s external-state poll is the pre-existing one; no new timer.
			expect(source.match(/setInterval/g)?.length ?? 0).toBeLessThanOrEqual(1);
		});
	}

	it('plugins: keeps the Vaultman self-protection on state, not on the icon', () => {
		// Change icon is cosmetic and must stay available for Vaultman itself.
		const protectedIndex = pluginsLogicSource.indexOf('self_protected');
		const changeIconIndex = pluginsLogicSource.indexOf('addon.icon.change');
		expect(protectedIndex).toBeGreaterThan(-1);
		expect(changeIconIndex).toBeGreaterThan(-1);
		expect(pluginsLogicSource).toMatch(/isVaultman/);
	});
});

describe('BT5-019 picker choices (pure)', () => {
	const library = ['lucide-file', 'lucide-file', 'lucide-folder'];

	it('puts Reset first and only when an override exists', () => {
		const withOverride = addonIconChoices(library, { hasOverride: true });
		expect(withOverride[0]).toEqual({ kind: 'reset' });

		const withoutOverride = addonIconChoices(library, { hasOverride: false });
		expect(withoutOverride[0]).not.toEqual({ kind: 'reset' });
		expect(withoutOverride.some((c) => c.kind === 'reset')).toBe(false);
	});

	it('deduplicates ids and keeps library order deterministically', () => {
		expect(addonIconChoices(library, { hasOverride: false })).toEqual([
			{ kind: 'icon', id: 'lucide-file' },
			{ kind: 'icon', id: 'lucide-folder' },
		]);
		// Same input, same output — no locale or hash ordering.
		expect(addonIconChoices(library, { hasOverride: false })).toEqual(
			addonIconChoices(library, { hasOverride: false }),
		);
	});

	it('survives an empty library without offering a broken choice', () => {
		expect(addonIconChoices([], { hasOverride: false })).toEqual([]);
		expect(addonIconChoices([], { hasOverride: true })).toEqual([
			{ kind: 'reset' },
		]);
	});
});

describe('BT5-019 picker uses the native fuzzy suggester', () => {
	it('extends FuzzySuggestModal instead of a hand-rolled grid', () => {
		expect(pickerSource).toMatch(/extends FuzzySuggestModal/);
		expect(pickerSource).toMatch(/getItems\(/);
		expect(pickerSource).toMatch(/getItemText\(/);
		expect(pickerSource).toMatch(/onChooseItem\(/);
	});

	it('drops the hand-rolled grid, its columns constant and its CSS classes', () => {
		expect(pickerSource).not.toMatch(/columns\s*=\s*8/);
		expect(pickerSource).not.toMatch(/roving|tabindex/);
		expect(pickerSource).not.toMatch(/vaultman-addon-icon-picker-grid/);
		expect(pickerSource).not.toMatch(/ArrowRight|ArrowDown/);
	});

	it('renders each suggestion with its glyph and label', () => {
		expect(pickerSource).toMatch(/renderSuggestion/);
		expect(pickerSource).toMatch(/setIcon\(/);
	});

	it('keeps a single active picker and never delegates to Iconic', () => {
		expect(pickerSource).toMatch(/activePicker/);
		expect(pickerSource).not.toMatch(/openRibbonIconMenu|iconicService/);
	});

	it('reads its copy from i18n with no duplicated English fallback', () => {
		expect(pickerSource).toMatch(/translate\('addon\.icon\./);
		// The temporary two-arg label helper and its table are gone; the
		// remaining addonIconLabelFor() only prettifies an icon id.
		expect(pickerSource).not.toMatch(/addonIconLabel\(/);
		expect(pickerSource).not.toMatch(/ADDON_ICON_LABEL_FALLBACKS/);
	});
});

describe('BT5-019 i18n keys ship in both locales', () => {
	for (const key of [
		'addon.icon.title',
		'addon.icon.change',
		'addon.icon.reset',
		'addon.icon.search',
		'addon.icon.empty',
		'addon.icon.current',
	]) {
		it(`declares ${key} in EN and ES`, () => {
			expect(enSource).toContain(`'${key}':`);
			expect(esSource).toContain(`'${key}':`);
		});
	}

	it('no longer carries the temporary fallback table', () => {
		expect(logicSource).not.toMatch(/ADDON_ICON_LABEL_FALLBACKS/);
	});
});

describe('BT5-019 identity is the id, never the visible label', () => {
	it('two plugins sharing a display name keep separate overrides', () => {
		// Same human name, different pluginId — the store must not merge them.
		let store = setAddonIconOverride({}, 'plugin', 'author-a.tasks', {
			icon: 'lucide-check',
		});
		store = setAddonIconOverride(store, 'plugin', 'author-b.tasks', {
			icon: 'lucide-star',
		});
		expect(getAddonIconOverride(store, 'plugin', 'author-a.tasks')).toEqual({
			icon: 'lucide-check',
		});
		expect(getAddonIconOverride(store, 'plugin', 'author-b.tasks')).toEqual({
			icon: 'lucide-star',
		});
	});

	it('renaming a plugin display name does not move its override', () => {
		const store = setAddonIconOverride({}, 'plugin', 'dataview', {
			icon: 'lucide-database',
		});
		// The panel always resolves by pluginId, so a new label changes nothing.
		expect(getAddonIconOverride(store, 'plugin', 'dataview')).toEqual({
			icon: 'lucide-database',
		});
		expect(
			getAddonIconOverride(store, 'plugin', 'Dataview (renamed)'),
		).toBeNull();
	});
});

describe('BT5-019 keeps the Iconic adapter regressions intact', () => {
	it('serviceIcons still watches raw vault events for external edits', () => {
		// BT4-024/BT5-030: the external-change watch and its coalescing must
		// survive; BT5-019 subscribes to it instead of adding its own polling.
		expect(serviceIconsSource).toMatch(/on\?\.\('raw'/);
		expect(serviceIconsSource).toMatch(/onChanged\(/);
		expect(serviceIconsSource).toMatch(/notifyChanged\(/);
	});

	it('panels consume that event rather than polling the icon library', () => {
		for (const source of [snippetsSource, pluginsSource]) {
			expect(source).toMatch(/iconic\.onChanged\(this\._scheduleIconRebuild\)/);
			// The single 2.5s poll is the pre-existing add-on state signature.
			expect(source.match(/setInterval/g)?.length ?? 0).toBe(1);
			expect(source).toMatch(/_iconRebuildScheduled/);
		}
	});
});
