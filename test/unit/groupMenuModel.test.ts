import { describe, expect, it } from 'vitest';
import { groupMenuModel, nextGroupPreset } from '../../src/logic/logicSortMenu';
import { GROUP_PRESETS_BY_TAB } from '../../src/types/typeGroupPreset';

describe('spec 08 §3.2 — the groups submenu model', () => {
	it('lists `none` first and checked by default', () => {
		const model = groupMenuModel('files', { kind: 'none', direction: 'asc' }, [], true);
		const first = model.items[0];
		expect(first?.kind).toBe('preset');
		if (first?.kind !== 'preset') throw new Error('preset expected');
		expect(first.id).toBe('none');
		expect(first.checked).toBe(true);
		expect(first.direction).toBeNull();
	});

	it('offers exactly the presets of the tab, `custom` among them', () => {
		for (const tab of ['files', 'props', 'tags', 'snippets', 'plugins'] as const) {
			const model = groupMenuModel(tab, { kind: 'none', direction: 'asc' }, [], false);
			const presets = model.items.filter((i) => i.kind === 'preset').map((i) => i.id);
			expect(presets).toEqual(GROUP_PRESETS_BY_TAB[tab]);
		}
	});

	it('ends with divider, New group and the custom groups as hide/delete rows', () => {
		const model = groupMenuModel(
			'files',
			{ kind: 'custom', direction: 'asc' },
			[
				{ id: 'Work', label: 'Work' },
				{ id: 'Old', label: 'Old', hidden: true },
			],
			true,
		);
		const tail = model.items.slice(-4);
		expect(tail.map((i) => i.kind)).toEqual([
			'separator',
			'new-group',
			'custom-group',
			'custom-group',
		]);
		const [work, old] = tail.slice(2);
		if (work?.kind !== 'custom-group' || old?.kind !== 'custom-group') {
			throw new Error('custom-group expected');
		}
		expect(work.hidden).toBe(false);
		expect(old.hidden).toBe(true);
		expect(old.icon).toBe('lucide-eye-off');
	});

	it('disables New group when there is no layout to hold the group', () => {
		const model = groupMenuModel('tags', { kind: 'none', direction: 'asc' }, [], false);
		const row = model.items.find((i) => i.kind === 'new-group');
		if (row?.kind !== 'new-group') throw new Error('new-group expected');
		expect(row.disabled).toBe(true);
	});

	it('shows the direction only on the checked, non-none preset', () => {
		const model = groupMenuModel('files', { kind: 'letter', direction: 'desc' }, [], false);
		const letter = model.items.find((i) => i.kind === 'preset' && i.id === 'letter');
		const name = model.items.find((i) => i.kind === 'preset' && i.id === 'name');
		if (letter?.kind !== 'preset' || name?.kind !== 'preset') throw new Error('presets');
		expect(letter.direction).toBe('desc');
		expect(name.direction).toBeNull();
	});
});

describe('spec 08 §3.2 — presets are asc/desc toggles, except none', () => {
	it('picking another preset selects it ascending', () => {
		expect(nextGroupPreset({ kind: 'none', direction: 'asc' }, 'letter')).toEqual({
			kind: 'letter',
			direction: 'asc',
		});
	});

	it('picking the checked preset flips its direction', () => {
		expect(nextGroupPreset({ kind: 'letter', direction: 'asc' }, 'letter')).toEqual({
			kind: 'letter',
			direction: 'desc',
		});
	});

	it('`none` never carries a direction', () => {
		expect(nextGroupPreset({ kind: 'letter', direction: 'desc' }, 'none')).toEqual({
			kind: 'none',
			direction: 'asc',
		});
	});
});
