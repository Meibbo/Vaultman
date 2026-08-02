import { describe, expect, it } from 'vitest';

import {
	applyValueMove,
	planValueMoveTypeChanges,
} from '../../src/logic/logicValueMoveApply';
import applySource from '../../src/logic/logicValueMoveApply.ts?raw';
import {
	decidePropMoveConflict,
	type PropMoveDecision,
} from '../../src/logic/logicPropMoveConflict';
import type { ValueMoveOperation } from '../../src/logic/logicValueMoveMode';

function operation(
	overrides: Partial<ValueMoveOperation> = {},
): ValueMoveOperation {
	return {
		originId: 'v1',
		originProperty: 'lugar',
		destinationProperty: 'buscar',
		rawValue: 'cocina',
		propType: 'text',
		write: 'append',
		originDisposition: 'move',
		...overrides,
	};
}

const compatible: PropMoveDecision = {
	destination: 'buscar',
	kind: 'compatible',
	typeChange: null,
	reasonKey: null,
};

describe('applying one value move to one file', () => {
	it('creates a destination property that the file does not have', () => {
		const outcome = applyValueMove(
			operation(),
			{ lugar: 'cocina' },
			compatible,
			'text',
		);
		expect(outcome.status).toBe('written');
		expect(outcome.frontmatter).toEqual({ buscar: 'cocina' });
	});

	it('appends into a list destination with a duplicate guard', () => {
		const outcome = applyValueMove(
			operation(),
			{ lugar: 'cocina', buscar: ['salon'] },
			compatible,
			'list',
		);
		expect(outcome.frontmatter).toEqual({ buscar: ['salon', 'cocina'] });

		const duplicate = applyValueMove(
			operation(),
			{ lugar: 'cocina', buscar: ['cocina'] },
			compatible,
			'list',
		);
		expect(duplicate.status).toBe('written');
		expect(duplicate.frontmatter).toEqual({ buscar: ['cocina'] });
	});

	it('overwrites the destination under replace', () => {
		const outcome = applyValueMove(
			operation({ write: 'replace' }),
			{ lugar: 'cocina', buscar: ['salon', 'patio'] },
			compatible,
			'list',
		);
		expect(outcome.frontmatter).toEqual({ buscar: ['cocina'] });
	});

	it('keeps the origin under copy and removes it under move', () => {
		const copied = applyValueMove(
			operation({ originDisposition: 'copy' }),
			{ lugar: 'cocina' },
			compatible,
			'text',
		);
		expect(copied.frontmatter).toEqual({ lugar: 'cocina', buscar: 'cocina' });

		const moved = applyValueMove(
			operation({ originDisposition: 'move' }),
			{ lugar: 'cocina' },
			compatible,
			'text',
		);
		expect(moved.frontmatter).toEqual({ buscar: 'cocina' });
	});

	it('removes only the moved element and keeps the origin key when values remain', () => {
		const outcome = applyValueMove(
			operation(),
			{ lugar: ['cocina', 'salon'] },
			compatible,
			'text',
		);
		expect(outcome.frontmatter).toEqual({ lugar: ['salon'], buscar: 'cocina' });
	});

	it('drops the origin key once its last value leaves', () => {
		const outcome = applyValueMove(
			operation(),
			{ lugar: ['cocina'], otra: 'x' },
			compatible,
			'text',
		);
		expect(outcome.frontmatter).toEqual({ otra: 'x', buscar: 'cocina' });
	});

	it('reports no failure when replace lands a value the destination already holds', () => {
		// move + replace into a destination that already holds this value still
		// removes the origin. Nothing changed at the destination, and that is not
		// an error.
		const outcome = applyValueMove(
			operation({ write: 'replace' }),
			{ lugar: 'cocina', buscar: 'cocina' },
			compatible,
			'text',
		);
		expect(outcome.status).toBe('written');
		expect(outcome.frontmatter).toEqual({ buscar: 'cocina' });
	});

	it('skips a file that does not carry the origin value', () => {
		const outcome = applyValueMove(
			operation(),
			{ lugar: 'salon' },
			compatible,
			'text',
		);
		expect(outcome.status).toBe('unchanged');
		expect(outcome.frontmatter).toBeNull();
	});

	it('skips a destination the policy blocked', () => {
		const blocked = decidePropMoveConflict(
			{ property: 'buscar', currentType: 'date', occupied: true },
			{ rawValue: 'cocina', propType: 'text' },
			'append',
			'block',
		);
		const outcome = applyValueMove(
			operation(),
			{ lugar: 'cocina', buscar: '2026-08-02' },
			blocked,
			'date',
		);
		expect(outcome.status).toBe('skipped');
		expect(outcome.frontmatter).toBeNull();
	});

	it('converts what the destination held when the policy coerces its type', () => {
		const coerced = decidePropMoveConflict(
			{ property: 'buscar', currentType: 'date', occupied: true },
			{ rawValue: 'cocina', propType: 'text' },
			'append',
			'coerce',
		);
		expect(coerced.typeChange?.toType).toBe('list');

		const outcome = applyValueMove(
			operation(),
			{ lugar: 'cocina', buscar: '2026-08-02' },
			coerced,
			'date',
		);
		expect(outcome.status).toBe('written');
		expect(outcome.frontmatter).toEqual({
			buscar: ['2026-08-02', 'cocina'],
		});
		expect(outcome.typeChange).toMatchObject({
			property: 'buscar',
			toType: 'list',
		});
	});

	it('writes the value with the destination runtime type, not its text', () => {
		const outcome = applyValueMove(
			operation({ rawValue: '42', propType: 'text' }),
			{ lugar: '42' },
			compatible,
			'number',
		);
		expect(outcome.frontmatter?.buscar).toBe(42);
		expect(typeof outcome.frontmatter?.buscar).toBe('number');
	});

	it('never leaves the origin behind when the destination write is skipped', () => {
		const blocked: PropMoveDecision = {
			destination: 'buscar',
			kind: 'blocked',
			typeChange: null,
			reasonKey: 'explorer.prop_move.blocked.type_mismatch',
		};
		const outcome = applyValueMove(
			operation(),
			{ lugar: 'cocina' },
			blocked,
			'number',
		);
		expect(outcome.frontmatter).toBeNull();
	});

	it('mutates nothing it was handed', () => {
		const frontmatter = { lugar: ['cocina', 'salon'], buscar: ['x'] };
		applyValueMove(operation(), frontmatter, compatible, 'list');
		expect(frontmatter).toEqual({ lugar: ['cocina', 'salon'], buscar: ['x'] });
	});

	it('plans one type change per coercing destination, not per file or per pair', () => {
		const operations = [
			operation({ originId: 'v1', destinationProperty: 'buscar' }),
			operation({ originId: 'v2', destinationProperty: 'buscar' }),
			operation({ originId: 'v1', destinationProperty: 'archivo' }),
		];
		const changes = planValueMoveTypeChanges(operations, (destination) =>
			decidePropMoveConflict(
				{ property: destination, currentType: 'date', occupied: true },
				{ rawValue: 'cocina', propType: 'text' },
				'append',
				'coerce',
			),
		);
		expect(changes.map((change) => change.property)).toEqual([
			'buscar',
			'archivo',
		]);
		expect(changes[0]).toMatchObject({ toType: 'list' });
	});

	it('plans no type change when nothing is coerced', () => {
		const changes = planValueMoveTypeChanges([operation()], () => compatible);
		expect(changes).toEqual([]);
	});

	it('plans no type change for a destination the policy blocked', () => {
		const changes = planValueMoveTypeChanges([operation()], (destination) =>
			decidePropMoveConflict(
				{ property: destination, currentType: 'date', occupied: true },
				{ rawValue: 'cocina', propType: 'text' },
				'append',
				'block',
			),
		);
		expect(changes).toEqual([]);
	});

	it('reads no vault and queues nothing itself', () => {
		expect(applySource).not.toContain("from 'obsidian'");
		expect(applySource).not.toContain('queueService');
		expect(applySource).not.toContain('../services/');
	});
});
