import { describe, expect, it, beforeEach } from 'vitest';
import {
	__resetGroupSelectionTokens,
	captureGroupSelectionSnapshot,
	classifyGroupTargets,
	groupSelectedAvailability,
	intersectDegroupTargets,
	noteSelectionState,
	reconcileCommittedSelection,
	GROUP_SELECTED_SASI_ID,
	DEGROUP_SELECTED_SASI_ID,
	ADD_PROPERTY_ROW_ID,
} from '../../src/logic/logicGroupSelectionTransaction';
import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import { registerGroupSasiActions } from '../../src/logic/logicGroupSelectionTransaction';

describe('U130 selection transactions', () => {
	beforeEach(() => __resetGroupSelectionTokens());

	it('freezes the visible snapshot and reconciles only confirmed members', () => {
		const key = 'instance:files:files';
		const selected = new Set(['A', 'B']);
		const snapshot = captureGroupSelectionSnapshot({
			selectionKey: key,
			rowIds: ['A', 'B'],
			entityIds: ['A', 'B'],
			urns: ['files:file:A|A', 'files:file:B|B'],
			providerId: 'files',
			scene: 'files',
			instanceId: 'instance',
			revision: 1,
		});
		expect(Object.isFrozen(snapshot)).toBe(true);
		expect(Object.isFrozen(snapshot.rowIds)).toBe(true);
		const next = reconcileCommittedSelection(
			snapshot,
			{ status: 'committed', groupId: 'G1', affectedUrns: ['files:file:A|A'] },
			selected,
			{ instanceId: 'instance', revision: 1 },
		);
		expect([...next]).toEqual(['B']);
	});

	it('preserves a reselection after the snapshot ABA race', () => {
		const key = 'instance:files:files';
		noteSelectionState(key, new Set(['A']));
		const snapshot = captureGroupSelectionSnapshot({
			selectionKey: key,
			rowIds: ['A'],
			entityIds: ['A'],
			urns: ['files:file:A|A'],
			providerId: 'files',
			scene: 'files',
		});
		noteSelectionState(key, new Set());
		noteSelectionState(key, new Set(['A']));
		const next = reconcileCommittedSelection(
			snapshot,
			{ status: 'committed', groupId: 'G1', affectedUrns: ['files:file:A|A'] },
			new Set(['A']),
		);
		expect([...next]).toEqual(['A']);
	});

	it('does not clean a different instance or revision', () => {
		const snapshot = captureGroupSelectionSnapshot({
			selectionKey: 'one:files:files',
			rowIds: ['A'],
			entityIds: ['A'],
			urns: ['files:file:A|A'],
			providerId: 'files',
			scene: 'files',
			instanceId: 'one',
			revision: 3,
		});
		const selected = new Set(['A']);
		expect(
			reconcileCommittedSelection(
				snapshot,
				{ status: 'committed', groupId: 'G1', affectedUrns: ['files:file:A|A'] },
				selected,
				{ instanceId: 'two', revision: 3 },
			),
		).toBe(selected);
	});

	it('intersects degroup targets by membership identity, not row text', () => {
		expect(
			intersectDegroupTargets({
				selectedEntityIds: ['A', 'B'],
				ownerMemberKeys: ['A'],
				selectedUrns: ['files:file:A|A', 'files:file:B|B'],
				ownerUrns: ['files:file:A|A'],
			}),
		).toEqual(['A']);
	});

	it('rejects action-only targets without silently taking a subset', () => {
		const flags = classifyGroupTargets(new Set(['A', ADD_PROPERTY_ROW_ID]));
		expect(groupSelectedAvailability(flags, true)).toEqual({
			available: false,
			reason: 'group.selected.action_only',
		});
	});

	it('registers the two group actions in the same SASI catalog', () => {
		const registry = createSasiRegistry();
		registerGroupSasiActions(registry);
		expect(registry.listActions().map((entry) => entry.id)).toEqual([
			GROUP_SELECTED_SASI_ID,
			DEGROUP_SELECTED_SASI_ID,
		]);
		expect(registry.resolve(GROUP_SELECTED_SASI_ID).available).toBe(true);
	});
});
