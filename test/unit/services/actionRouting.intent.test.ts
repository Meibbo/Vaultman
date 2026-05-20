import { describe, expect, it } from 'vitest';
import {
	resolveActionIntent,
	selectionModifiersFromEvent,
} from '../../../src/types/typeActionRouting';
import { DEFAULT_NODE_MOUSE_ACTIONS } from '../../../src/services/serviceMouse';

describe('selectionModifiersFromEvent', () => {
	it('maps ctrl/meta to additive and shift to range', () => {
		expect(
			selectionModifiersFromEvent({ ctrlKey: true, metaKey: false, shiftKey: false }),
		).toEqual({ additive: true, range: false });
		expect(
			selectionModifiersFromEvent({ ctrlKey: false, metaKey: true, shiftKey: false }),
		).toEqual({ additive: true, range: false });
		expect(
			selectionModifiersFromEvent({ ctrlKey: false, metaKey: false, shiftKey: true }),
		).toEqual({ additive: false, range: true });
	});
});

describe('resolveActionIntent', () => {
	const mouseConfig = DEFAULT_NODE_MOUSE_ACTIONS;

	it('routes row mouse clicks to the configured primary action with selection modifiers', () => {
		const intent = resolveActionIntent(
			{
				surface: 'row',
				gesture: 'click',
				modifiers: { additive: true, range: false, alt: false },
				pointerType: 'mouse',
			},
			mouseConfig,
		);

		expect(intent.kind).toBe('filter');
		expect(intent.selection).toEqual({ additive: true, range: false });
	});

	it('routes row mouse aux gestures to the configured tertiary action', () => {
		const intent = resolveActionIntent(
			{
				surface: 'row',
				gesture: 'aux',
				modifiers: { additive: false, range: false, alt: false },
				pointerType: 'mouse',
			},
			mouseConfig,
		);

		expect(intent.kind).toBe('delete');
	});

	it('routes caret clicks to toggle', () => {
		const intent = resolveActionIntent(
			{
				surface: 'caret',
				gesture: 'click',
				modifiers: { additive: false, range: false, alt: false },
				pointerType: 'mouse',
			},
			mouseConfig,
		);

		expect(intent.kind).toBe('toggle');
	});

	it('routes row keyboard gestures to activation with selection modifiers', () => {
		const intent = resolveActionIntent(
			{
				surface: 'row',
				gesture: 'keyboard',
				modifiers: { additive: false, range: true, alt: false },
				pointerType: 'keyboard',
			},
			mouseConfig,
		);

		expect(intent.kind).toBe('activate');
		expect(intent.selection).toEqual({ additive: false, range: true });
	});

	it('ignores reserved gestures and surfaces', () => {
		expect(
			resolveActionIntent(
				{
					surface: 'row',
					gesture: 'hover',
					modifiers: { additive: false, range: false, alt: false },
					pointerType: 'mouse',
				},
				mouseConfig,
			).kind,
		).toBe('ignored');
		expect(
			resolveActionIntent(
				{
					surface: 'fab',
					gesture: 'click',
					modifiers: { additive: false, range: false, alt: false },
					pointerType: 'touch',
				},
				mouseConfig,
			).kind,
		).toBe('ignored');
	});
});
