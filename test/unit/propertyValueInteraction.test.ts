import { describe, expect, it, vi } from 'vitest';
import type { PropertyValueInteractionPort } from '../../src/types/typePropertyValueInteraction';

describe('PropertyValueInteractionPort contracts', () => {
	it('invokes renameValue on interaction port with normalized values', async () => {
		const port: PropertyValueInteractionPort = {
			renameValue: vi.fn().mockResolvedValue(undefined),
		};

		await port.renameValue({
			property: 'status',
			oldValue: 'false',
			newValue: 'true',
			valueType: 'checkbox',
		});

		expect(port.renameValue).toHaveBeenCalledWith({
			property: 'status',
			oldValue: 'false',
			newValue: 'true',
			valueType: 'checkbox',
		});
	});
});
