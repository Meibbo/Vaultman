import { describe, expect, it, vi } from 'vitest';
import type { PropertyValueInteractionPort } from '../../src/types/typePropertyValueInteraction';

describe('PropertyValueInteractionPort contracts', () => {
	it('invokes renameValue on interaction port with normalized values', async () => {
		const renameValue = vi.fn().mockResolvedValue(undefined);
		const port: PropertyValueInteractionPort = { renameValue };

		await port.renameValue({
			property: 'status',
			oldValue: 'false',
			newValue: 'true',
			valueType: 'checkbox',
		});

		expect(renameValue).toHaveBeenCalledWith({
			property: 'status',
			oldValue: 'false',
			newValue: 'true',
			valueType: 'checkbox',
		});
	});
});
