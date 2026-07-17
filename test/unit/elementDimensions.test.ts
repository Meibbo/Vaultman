import { describe, expect, it } from 'vitest';

import { elementContentWidth } from '../../src/utils/elementDimensions';

describe('element dimensions', () => {
	it('removes physical inline padding from clientWidth', () => {
		const element = {
			clientWidth: 160,
			ownerDocument: {
				defaultView: {
					getComputedStyle: () => ({
						paddingLeft: '12px',
						paddingRight: '28px',
					}),
				},
			},
		} as unknown as HTMLElement;

		expect(elementContentWidth(element)).toBe(120);
	});

	it('clamps invalid or oversized padding safely', () => {
		const element = {
			clientWidth: 20,
			ownerDocument: {
				defaultView: {
					getComputedStyle: () => ({
						paddingLeft: 'not-a-size',
						paddingRight: '40px',
					}),
				},
			},
		} as unknown as HTMLElement;

		expect(elementContentWidth(element)).toBe(0);
	});
});
