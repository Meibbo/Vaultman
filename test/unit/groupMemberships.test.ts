import { describe, expect, it } from 'vitest';
import type { SavedLayout } from '../../src/types/typeSettings';

describe('U130-03 groupMemberships en SavedLayout', () => {
	it('acepta un mapa de groupId a URNs', () => {
		const layout: SavedLayout = {
			name: 'x',
			summary: '',
			config: {},
			groupMemberships: {
				'grp-1': ['files:file:proyectos/alfa.md|alfa.md'],
			},
		};
		expect(layout.groupMemberships?.['grp-1']).toHaveLength(1);
	});

	it('es opcional: los layouts viejos siguen siendo validos', () => {
		const layout: SavedLayout = { name: 'x', summary: '', config: {} };
		expect(layout.groupMemberships).toBeUndefined();
	});
});
