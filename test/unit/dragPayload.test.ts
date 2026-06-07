import { describe, expect, it, vi } from 'vitest';

import { setVaultmanDragPayload } from '../../src/utils/dragPayload';

describe('setVaultmanDragPayload', () => {
	it('stores a JSON Vaultman payload and readable text fallback', () => {
		const setData = vi.fn();
		const event = {
			dataTransfer: {
				setData,
				effectAllowed: '',
			},
		} as unknown as DragEvent;

		setVaultmanDragPayload(event, { kind: 'file', path: 'Notes/a.md' });

		expect(setData).toHaveBeenCalledWith(
			'application/x-vaultman-node',
			JSON.stringify({ kind: 'file', path: 'Notes/a.md' }),
		);
		expect(setData).toHaveBeenCalledWith('text/plain', 'Notes/a.md');
		expect(event.dataTransfer?.effectAllowed).toBe('copyMove');
	});
});
