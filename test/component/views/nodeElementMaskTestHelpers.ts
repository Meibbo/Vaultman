import { vi } from 'vitest';
import { NODE_ELEMENT_MASK_KEY } from '../../../src/components/explorer/viewHostContext';
import type { NodeElementMask } from '../../../src/types/typeViewHost';

export function makeMask(overrides: Partial<NodeElementMask> = {}): NodeElementMask {
	const badges = overrides.badges ?? {};
	return {
		icon: true,
		label: true,
		detail: true,
		media: false,
		actions: true,
		...overrides,
		badges: {
			ops: true,
			filters: true,
			warnings: true,
			inherited: true,
			counts: true,
			...badges,
		},
	};
}

export function maskContext(mask: NodeElementMask): ReadonlyArray<readonly [symbol, unknown]> {
	return [[NODE_ELEMENT_MASK_KEY, { value: () => mask }]];
}

export function iconStub() {
	return vi.fn(() => ({ update: vi.fn() }));
}

export const resizeObserverStub = class {
	observe(): void {}
	disconnect(): void {}
};
