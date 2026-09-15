import { describe, expect, it, vi } from 'vitest';
import { createConfirmRow } from '../../src/logic/logicConfirmRow';
import { resolveSceneConfig, diffSceneConfig } from '../../src/logic/logicSettingsCascade';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import type { SceneConfig } from '../../src/types/typeInstance';

function fakeTimer() {
	let pending: { cb: () => void; ms: number } | null = null;
	return {
		timer: {
			set: (cb: () => void, ms: number) => {
				pending = { cb, ms };
				return 1;
			},
			clear: () => {
				pending = null;
			},
		},
		fire: () => {
			const p = pending;
			pending = null;
			p?.cb();
		},
		pendingMs: () => pending?.ms ?? null,
	};
}

describe('spec 08 §4 — "Want to hide this preset?" row', () => {
	it('arms a row, reports it, and cancels itself after 4 s', () => {
		const t = fakeTimer();
		const onChange = vi.fn();
		const row = createConfirmRow(t.timer, onChange);
		row.arm('Work');
		expect(row.armedId()).toBe('Work');
		expect(onChange).toHaveBeenLastCalledWith('Work');
		expect(t.pendingMs()).toBe(4000);
		t.fire();
		expect(row.armedId()).toBeNull();
		expect(onChange).toHaveBeenLastCalledWith(null);
	});

	it('cancel disarms immediately and clears the clock', () => {
		const t = fakeTimer();
		const row = createConfirmRow(t.timer, () => {});
		row.arm('Work');
		row.disarm();
		expect(row.armedId()).toBeNull();
		expect(t.pendingMs()).toBeNull();
	});

	it('arming another row moves the question without an intermediate null', () => {
		const t = fakeTimer();
		const onChange = vi.fn();
		const row = createConfirmRow(t.timer, onChange);
		row.arm('A');
		row.arm('B');
		expect(onChange.mock.calls.map((c: unknown[]) => c[0])).toEqual(['A', 'B']);
	});
});

describe('spec 08 §4 — hidden custom groups ride the per-instance cascade', () => {
	const defaults: Required<SceneConfig> = {
		viewMode: 'tree',
		interactionMode: 'open',
		visibleCells: ['name'],
		sortState: normalizeExplorerSortState('files', null),
		stickyRows: true,
		compactFolders: false,
		indent: true,
		groupPreset: { kind: 'none', direction: 'asc' },
		hiddenGroupIds: [],
		sceneLabelMode: 'auto',
		autoRevealMode: 'auto',
		hiddenToolbarNodes: [],
	};

	it('replaces the list wholesale and diffs only when it changed', () => {
		const resolved = resolveSceneConfig({
			defaults,
			instanceSelf: { hiddenGroupIds: ['A', 'B'] },
			scene: { hiddenGroupIds: ['C'] },
		});
		expect(resolved.hiddenGroupIds).toEqual(['C']);
		expect(diffSceneConfig(defaults, defaults).hiddenGroupIds).toBeUndefined();
		expect(diffSceneConfig(defaults, resolved).hiddenGroupIds).toEqual(['C']);
	});
});
