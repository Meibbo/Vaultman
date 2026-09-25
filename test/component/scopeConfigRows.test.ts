import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import PopupSort from '../../src/components/layout/popupSort.svelte';
import {
	deleteScopeTarget,
	normalizeExplorerSortState,
	resolveScopeSet,
	setScopeTargetHidden,
} from '../../src/logic/logicScopedSort';
import type { ScopeMenuScene } from '../../src/logic/logicSortMenu';

/**
 * U130-GGC-029 (smoke 2026-09-24 §4.3): evidencia DOM sin tocar data.json.
 *
 * El popup real pinta la fila del scope_config con su resumen, arma la fila
 * de confirmacion con Hide/Delete y despacha la clave exacta. El cableado
 * NavCo (`deleteScope`/`setScopeHidden` -> helpers puros) purga el ScopeSet
 * acumulativo, no solo el sort plano: tras Delete/Hide, `resolveScopeSet`
 * vuelve a gobernar el nivel desde `all`.
 */
describe('U130-GGC-029 scope config rows montadas', () => {
	let target: HTMLElement;
	let instance: ReturnType<typeof mount> | null = null;

	const icon = (el: HTMLElement, name: string) => {
		el.setAttribute('data-icon', name);
		return {
			update(next: string) {
				el.setAttribute('data-icon', next);
			},
		};
	};

	const scopeScene: ScopeMenuScene = {
		parentLabel: () => null,
		parentLevel: () => null,
		sortLabel: (sort) => `${sort.sortBy} ${sort.direction}`,
		levelLabel: (level) => `Level ${level}`,
		allLevelsLabel: () => 'All levels',
		canPickParent: true,
		canPickLevel: true,
	};

	const initialSortState = normalizeExplorerSortState('files', {
		sorts: {
			all: { sortBy: 'name', direction: 'asc' },
			'level:2': { sortBy: 'modified', direction: 'desc' },
		},
		activeScope: 'all',
		scopeState: {
			cursor: 'all',
			sets: {
				all: {
					sort: { sortBy: 'name', direction: 'asc' },
					groupPreset: { kind: 'letter', direction: 'asc' },
				},
				'level:2': {
					sort: { sortBy: 'modified', direction: 'desc' },
					groupPreset: { kind: 'words', direction: 'desc' },
				},
			},
		},
	});

	const render = (props: Record<string, unknown> = {}) => {
		instance = mount(PopupSort, {
			target,
			props: {
				activeTab: 'files',
				onClose: () => {},
				scopeScene,
				initialSortState,
				icon,
				...props,
			},
		});
		flushSync();
		return target;
	};

	const reset = () => {
		if (instance) {
			void unmount(instance);
			instance = null;
		}
		target.innerHTML = '';
	};

	const openScopeDrawer = (el: HTMLElement) => {
		const toggle = el.querySelector(
			'.vaultman-sort-vertcol-btn',
		) as HTMLElement | null;
		expect(toggle).not.toBeNull();
		toggle!.click();
		flushSync();
		return el.querySelector('.vaultman-sort-vertcol-drawer') as HTMLElement | null;
	};

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		reset();
		target.remove();
	});

	it('pinta las filas fijas All/Level1 y el target configurado con su resumen', () => {
		const el = render();
		const drawer = openScopeDrawer(el);
		expect(drawer).not.toBeNull();
		// Icon-only drawer (Spec 08 §4): labels live in aria-label/title.
		const labels = [
			...drawer!.querySelectorAll('.vaultman-sort-drawer-item'),
		].map((b) => b.getAttribute('aria-label') ?? '');
		const text = labels.join(' | ');
		expect(text).toContain('All levels');
		expect(text).toContain('Level 1');
		expect(text).toContain('Level 2');
		expect(text).toContain('modified');
	});

	it('la fila arma Hide/Delete y Delete despacha la clave exacta', () => {
		const onDeleteScope = vi.fn();
		const onHideScope = vi.fn();
		const el = render({ onDeleteScope, onHideScope });
		const drawer = openScopeDrawer(el);
		expect(drawer).not.toBeNull();
		const rows = [...drawer!.querySelectorAll('.vaultman-sort-drawer-item')];
		const level2 = rows.find((row) =>
			(row.getAttribute('aria-label') ?? '').includes('Level 2'),
		) as HTMLElement | undefined;
		expect(level2).toBeDefined();
		level2!.click();
		flushSync();
		const confirm = drawer!.querySelector(
			'.vaultman-sort-drawer-confirm',
		) as HTMLElement | null;
		expect(confirm).not.toBeNull();
		const buttons = [...confirm!.querySelectorAll('button')];
		// select + hide + delete + cancel.
		expect(buttons).toHaveLength(4);
		buttons[2].click();
		flushSync();
		expect(onDeleteScope).toHaveBeenCalledWith('level:2');
		expect(onHideScope).not.toHaveBeenCalled();
	});

	it('tras el Delete despachado, el set purgado deja gobernar a All levels', () => {
		const onDeleteScope = vi.fn(
			(key: string) =>
				deleteScopeTarget('files', initialSortState, key as never),
		);
		const el = render({ onDeleteScope });
		const drawer = openScopeDrawer(el);
		expect(drawer).not.toBeNull();
		const rows = [...drawer!.querySelectorAll('.vaultman-sort-drawer-item')];
		const level2 = rows.find((row) =>
			(row.getAttribute('aria-label') ?? '').includes('Level 2'),
		) as HTMLElement | undefined;
		level2!.click();
		flushSync();
		const confirm = drawer!.querySelector('.vaultman-sort-drawer-confirm')!;
		const buttons = [...confirm.querySelectorAll('button')];
		buttons[2].click();
		flushSync();
		const next = onDeleteScope.mock.results[0].value;
		expect(next.scopeState.sets['level:2']).toBeUndefined();
		expect(resolveScopeSet(next.scopeState, { level: 2 }).groupPreset?.kind).toBe(
			'letter',
		);
	});

	it('tras el Hide despachado, el set se conserva oculto y All gobierna', () => {
		const onHideScope = vi.fn(
			(key: string) =>
				setScopeTargetHidden('files', initialSortState, key as never, true),
		);
		const el = render({ onHideScope });
		const drawer = openScopeDrawer(el);
		expect(drawer).not.toBeNull();
		const rows = [...drawer!.querySelectorAll('.vaultman-sort-drawer-item')];
		const level2 = rows.find((row) =>
			(row.getAttribute('aria-label') ?? '').includes('Level 2'),
		) as HTMLElement | undefined;
		level2!.click();
		flushSync();
		const confirm = drawer!.querySelector('.vaultman-sort-drawer-confirm')!;
		const buttons = [...confirm.querySelectorAll('button')];
		buttons[1].click();
		flushSync();
		expect(onHideScope).toHaveBeenCalledWith('level:2', true);
		const next = onHideScope.mock.results[0].value;
		expect(next.scopeState.sets['level:2']).toMatchObject({ hidden: true });
		expect(next.scopeState.sets['level:2'].groupPreset?.kind).toBe('words');
		expect(resolveScopeSet(next.scopeState, { level: 2 }).groupPreset?.kind).toBe(
			'letter',
		);
	});
});
