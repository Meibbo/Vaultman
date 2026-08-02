import { describe, expect, it } from 'vitest';

import {
	coerceDestinationValues,
	decidePropMoveConflict,
	normalizePropMoveTypeConflict,
	type PropMoveDecision,
} from '../../src/logic/logicPropMoveConflict';
import conflictSource from '../../src/logic/logicPropMoveConflict.ts?raw';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import { NATIVE_SET_PROP_TYPE } from '../../src/types/typeOps';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

const incoming = { rawValue: '2026-08-02', propType: 'date' };

function decide(
	destination: { property: string; currentType?: string; occupied: boolean },
	write: 'append' | 'replace',
	policy: 'coerce' | 'block' | 'ask',
): PropMoveDecision {
	return decidePropMoveConflict(destination, incoming, write, policy);
}

describe('prop move destination type conflict policy', () => {
	it('leaves a list-shaped destination alone under every policy', () => {
		for (const currentType of ['list', 'multitext', 'tags', 'aliases', 'cssclasses']) {
			for (const policy of ['coerce', 'block', 'ask'] as const) {
				const decision = decide(
					{ property: 'buscar', currentType, occupied: true },
					'append',
					policy,
				);
				expect(decision.kind).toBe('compatible');
				expect(decision.typeChange).toBeNull();
			}
		}
	});

	it('leaves a scalar destination alone when the value fits and nothing is displaced', () => {
		const decision = decide(
			{ property: 'buscar', currentType: 'date', occupied: false },
			'append',
			'coerce',
		);
		expect(decision.kind).toBe('compatible');
		expect(decision.typeChange).toBeNull();
	});

	it('coerces an occupied scalar to the minimum type that holds both values', () => {
		const decision = decide(
			{ property: 'buscar', currentType: 'date', occupied: true },
			'append',
			'coerce',
		);
		expect(decision.kind).toBe('coerce');
		expect(decision.typeChange).toMatchObject({
			property: 'buscar',
			fromType: 'date',
			toType: 'list',
			sentinel: NATIVE_SET_PROP_TYPE,
		});
		// The summary declares the change literally, so the consequence is read
		// before it is accepted.
		expect(decision.typeChange?.declaration).toBe('buscar: date -> list');
	});

	it('coerces a scalar that cannot hold the incoming value to the value own type', () => {
		// Replacing discards what the destination held, so the minimum type is
		// the one the incoming value actually is — not the widest one.
		const decision = decide(
			{ property: 'buscar', currentType: 'number', occupied: true },
			'replace',
			'coerce',
		);
		expect(decision.kind).toBe('coerce');
		expect(decision.typeChange).toMatchObject({
			fromType: 'number',
			toType: 'date',
		});
		expect(decision.typeChange?.declaration).toBe('buscar: number -> date');
	});

	it('falls back to text when the incoming value has no assignable type of its own', () => {
		const decision = decidePropMoveConflict(
			{ property: 'buscar', currentType: 'number', occupied: false },
			{ rawValue: 'cocina', propType: 'unknown' },
			'replace',
			'coerce',
		);
		expect(decision.kind).toBe('coerce');
		expect(decision.typeChange).toMatchObject({ toType: 'text' });
	});

	it('accepts a value that already fits the destination scalar', () => {
		const decision = decidePropMoveConflict(
			{ property: 'peso', currentType: 'number', occupied: false },
			{ rawValue: '42', propType: 'number' },
			'replace',
			'coerce',
		);
		expect(decision.kind).toBe('compatible');
	});

	it('blocks an incompatible destination with a reason instead of changing its type', () => {
		const occupied = decide(
			{ property: 'buscar', currentType: 'date', occupied: true },
			'append',
			'block',
		);
		expect(occupied.kind).toBe('blocked');
		expect(occupied.typeChange).toBeNull();
		expect(occupied.reasonKey).toBe('explorer.prop_move.blocked.scalar_occupied');

		const mismatch = decide(
			{ property: 'peso', currentType: 'number', occupied: false },
			'replace',
			'block',
		);
		expect(mismatch.kind).toBe('blocked');
		expect(mismatch.reasonKey).toBe('explorer.prop_move.blocked.type_mismatch');
	});

	it('lets the compatible destinations run while blocking the incompatible ones', () => {
		const decisions = [
			decide({ property: 'notas', currentType: 'list', occupied: true }, 'append', 'block'),
			decide({ property: 'buscar', currentType: 'date', occupied: true }, 'append', 'block'),
		];
		expect(decisions.map((decision) => decision.kind)).toEqual([
			'compatible',
			'blocked',
		]);
	});

	it('asks per destination rather than deciding, and still names the change it would make', () => {
		const decision = decide(
			{ property: 'buscar', currentType: 'date', occupied: true },
			'append',
			'ask',
		);
		expect(decision.kind).toBe('ask');
		expect(decision.typeChange).toMatchObject({ toType: 'list' });
		expect(decision.reasonKey).toBe('explorer.prop_move.blocked.scalar_occupied');
	});

	it('treats an untyped destination as text', () => {
		const decision = decidePropMoveConflict(
			{ property: 'buscar', occupied: false },
			{ rawValue: 'cocina' },
			'replace',
			'coerce',
		);
		expect(decision.kind).toBe('compatible');
	});

	it('converts the displaced values through the one existing converter', () => {
		expect(coerceDestinationValues('cocina', 'list')).toEqual(['cocina']);
		expect(coerceDestinationValues(['a', 'b'], 'text')).toBe('a, b');
		expect(coerceDestinationValues('42', 'number')).toBe(42);
	});

	it('names exactly one writer of the property type', () => {
		expect(conflictSource).toContain('convertPropertyValueType');
		expect(conflictSource).toContain('NATIVE_SET_PROP_TYPE');
		// A second path to types.json is what this policy exists to avoid.
		expect(conflictSource).not.toContain('PropertyTypeService');
		expect(conflictSource).not.toContain('setType');
		expect(conflictSource).not.toContain('types.json');
	});
});

describe('prop move conflict setting', () => {
	it('defaults to coerce', () => {
		expect(DEFAULT_SETTINGS.propMoveTypeConflict).toBe('coerce');
	});

	it('normalizes an unknown or missing persisted value to the default', () => {
		expect(normalizePropMoveTypeConflict('block')).toBe('block');
		expect(normalizePropMoveTypeConflict('ask')).toBe('ask');
		expect(normalizePropMoveTypeConflict('coerce')).toBe('coerce');
		expect(normalizePropMoveTypeConflict('nonsense')).toBe('coerce');
		expect(normalizePropMoveTypeConflict(undefined)).toBe('coerce');
		expect(normalizePropMoveTypeConflict(null)).toBe('coerce');
		expect(normalizePropMoveTypeConflict(7)).toBe('coerce');
	});

	it('localizes the setting and both block reasons', () => {
		for (const key of [
			'settings.prop_move_conflict',
			'settings.prop_move_conflict.desc',
			'settings.prop_move_conflict.coerce',
			'settings.prop_move_conflict.block',
			'settings.prop_move_conflict.ask',
			'explorer.prop_move.blocked.scalar_occupied',
			'explorer.prop_move.blocked.type_mismatch',
		] as const) {
			expect(en[key]).toBeTruthy();
			expect(es[key]).toBeTruthy();
			expect(es[key]).not.toBe(en[key]);
		}
	});
});
