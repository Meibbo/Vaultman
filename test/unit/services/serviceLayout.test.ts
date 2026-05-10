import { describe, expect, it } from 'vitest';
import {
	DEFAULT_LAYOUT_SETTINGS,
	resolveLayoutSettings,
	type LayoutSettings,
} from '../../../src/services/serviceLayout';

describe('serviceLayout', () => {
	it('defaults pages to tabs and filter tabs to the dock with labels hidden', () => {
		expect(resolveLayoutSettings(undefined)).toEqual(DEFAULT_LAYOUT_SETTINGS);
		expect(DEFAULT_LAYOUT_SETTINGS.dock.content).toBe('filter-tabs');
		expect(DEFAULT_LAYOUT_SETTINGS.tabs.content).toBe('frame-pages');
		expect(DEFAULT_LAYOUT_SETTINGS.dock.labels.visible).toBe(false);
		expect(DEFAULT_LAYOUT_SETTINGS.tabs.labels.visible).toBe(false);
	});

	it('normalizes partial persisted settings without accepting invalid slots', () => {
		const stored = {
			dock: {
				content: 'frame-pages',
				labels: { visible: true, position: 'side' },
				presentation: { mode: 'drawer', drawerDirection: 'left' },
			},
			tabs: {
				content: 'bogus',
				labels: { visible: true, position: 'bottom' },
			},
		} as unknown as Partial<LayoutSettings>;

		expect(resolveLayoutSettings(stored)).toEqual({
			dock: {
				content: 'frame-pages',
				labels: { visible: true, position: 'side' },
				presentation: { mode: 'drawer', drawerDirection: 'left' },
			},
			tabs: {
				content: 'frame-pages',
				labels: { visible: true, position: 'bottom' },
				presentation: { mode: 'bar', drawerDirection: 'up' },
			},
		});
	});

	it('falls back to a bottom-up drawer direction for invalid dock presentation settings', () => {
		expect(
			resolveLayoutSettings({
				dock: {
					presentation: { mode: 'bad', drawerDirection: 'diagonal' },
				},
			}),
		).toEqual(DEFAULT_LAYOUT_SETTINGS);
	});
});
