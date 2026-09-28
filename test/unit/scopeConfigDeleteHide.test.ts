import { describe, expect, it } from 'vitest';
import {
	deleteScopeTarget,
	normalizeExplorerSortState,
	resolveScopeSet,
	setScopeTargetHidden,
} from '../../src/logic/logicScopedSort';
import type { ExplorerSortState } from '../../src/types/typeUI';

/**
 * U130-GGC-029 (smoke 2026-09-24 §4.3/§4.5): Delete/Hide de un scope_config
 * debe purgar el ScopeSet acumulativo, no sólo el sort plano. Antes del fix,
 * `deleteScope`/`setScopeHidden` de navbarFilters sólo tocaban
 * `sorts`/`hiddenScopes` y `handleScopeChangeForTab` preservaba
 * `scopeState.sets`, así que grupos, celdas y engine seguían aplicados.
 */
function stateWithLevel2Group(): ExplorerSortState {
	return normalizeExplorerSortState('files', {
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
					cellToggles: { count: false },
				},
			},
		},
	});
}

describe('U130-GGC-029 scope config Delete/Hide purges the ScopeSet', () => {
	it('delete removes the legacy sort AND the cumulative set', () => {
		const next = deleteScopeTarget('files', stateWithLevel2Group(), 'level:2');
		expect(next.sorts['level:2' as never]).toBeUndefined();
		expect(next.scopeState?.sets['level:2' as never]).toBeUndefined();
		// The surviving `all` set is untouched.
		expect(next.scopeState?.sets.all?.groupPreset?.kind).toBe('letter');
	});

	it('delete resets the cursor when it pointed at the removed target', () => {
		const viewing = normalizeExplorerSortState('files', {
			sorts: { all: { sortBy: 'name', direction: 'asc' } },
			activeScope: 'level:2',
			scopeState: {
				cursor: 'level:2',
				sets: { 'level:2': { sort: { sortBy: 'name', direction: 'asc' } } },
			},
		});
		const next = deleteScopeTarget('files', viewing, 'level:2');
		expect(next.activeScope).toBe('all');
		expect(next.scopeState?.cursor).toBe('all');
		expect(next.scopeState?.sets['level:2' as never]).toBeUndefined();
	});

	it('delete of `all` empties it instead of breaking the cursor', () => {
		const next = deleteScopeTarget('files', stateWithLevel2Group(), 'all');
		expect(next.sorts.all).toBeUndefined();
		expect(next.scopeState?.sets.all).toBeUndefined();
		expect(next.activeScope).toBe('all');
		expect(next.scopeState?.cursor).toBe('all');
	});

	it('hide marks both layers and un-hide clears both', () => {
		const hidden = setScopeTargetHidden(
			'files',
			stateWithLevel2Group(),
			'level:2',
			true,
		);
		expect(hidden.hiddenScopes).toContain('level:2');
		expect(hidden.scopeState?.sets['level:2' as never]).toMatchObject({
			hidden: true,
		});
		// The set survives hiding (reversible).
		expect(
			(hidden.scopeState?.sets['level:2' as never] as { groupPreset?: { kind?: string } })
				?.groupPreset?.kind,
		).toBe('words');

		const shown = setScopeTargetHidden('files', hidden, 'level:2', false);
		expect(shown.hiddenScopes).not.toContain('level:2');
		expect(
			(shown.scopeState?.sets['level:2' as never])
				?.hidden,
		).not.toBe(true);
	});

	it('after delete/hide, All levels governs the level again (§4.5)', () => {
		const base = stateWithLevel2Group();
		const deleted = deleteScopeTarget('files', base, 'level:2');
		const afterDelete = resolveScopeSet(deleted.scopeState, { level: 2 });
		expect(afterDelete.groupPreset?.kind).toBe('letter');
		expect(afterDelete.sort).toEqual({ sortBy: 'name', direction: 'asc' });

		const hidden = setScopeTargetHidden('files', base, 'level:2', true);
		const afterHide = resolveScopeSet(hidden.scopeState, { level: 2 });
		expect(afterHide.groupPreset?.kind).toBe('letter');
	});

	it('an explicit none override still switches the level off', () => {
		const base = stateWithLevel2Group();
		const withNone: ExplorerSortState = {
			...base,
			scopeState: {
				cursor: 'all',
				sets: {
					...base.scopeState?.sets,
					'level:2': { groupPreset: { kind: 'none', direction: 'asc' } },
				},
			},
		};
		expect(
			resolveScopeSet(withNone.scopeState, { level: 2 }).groupPreset?.kind,
		).toBe('none');
	});

	it('historical legacy state without scopeState normalizes unchanged', () => {
		const legacy = normalizeExplorerSortState('files', {
			sorts: { all: { sortBy: 'name', direction: 'asc' } },
			activeScope: 'all',
		});
		const next = deleteScopeTarget('files', legacy, 'level:2');
		expect(next.sorts['level:2' as never]).toBeUndefined();
		expect(next.activeScope).toBe('all');
	});
});
