import { describe, expect, it, vi } from 'vitest';
import {
	DEFAULT_NODE_ROW_MEASURE_STYLE,
	nodeRowMeasureStyleKey,
	resolveNodeRowMeasureStyle,
} from '../../../src/services/serviceNodeRowStyle';

describe('serviceNodeRowStyle', () => {
	it('resolves row measurement style from the rendered label element', () => {
		const label = {} as Element;
		const root = {
			querySelector: vi.fn((selector: string) =>
				selector === '.vm-node-table-primary' ? label : null,
			),
		} as unknown as Element;
		const getComputedStyle = vi.fn((element: Element) => {
			if (element === label) {
				return {
					font: '',
					fontStyle: 'italic',
					fontVariant: 'normal',
					fontWeight: '700',
					fontSize: '15px',
					fontFamily: 'Inter',
					lineHeight: '22px',
					letterSpacing: '0.25px',
					whiteSpace: 'pre-wrap',
					wordBreak: 'keep-all',
					getPropertyValue: () => '',
				} as unknown as CSSStyleDeclaration;
			}
			return { getPropertyValue: () => '' } as unknown as CSSStyleDeclaration;
		});

		const style = resolveNodeRowMeasureStyle(root, '.vm-node-table-primary', undefined, {
			getComputedStyle,
		});

		expect(style.font).toContain('italic');
		expect(style.font).toContain('700');
		expect(style.font).toContain('15px');
		expect(style.font).toContain('Inter');
		expect(style.lineHeight).toBe(22);
		expect(style.letterSpacing).toBe(0.25);
		expect(style.whiteSpace).toBe('pre-wrap');
		expect(style.wordBreak).toBe('keep-all');
	});

	it('falls back to Obsidian interface font and nav item size variables from the root', () => {
		const root = {
			querySelector: vi.fn(() => null),
		} as unknown as Element;
		const getComputedStyle = vi.fn(
			() =>
				({
					getPropertyValue: (name: string) => {
						if (name === '--font-interface') return 'Vault Sans';
						if (name === '--nav-item-size') return '19px';
						return '';
					},
				}) as CSSStyleDeclaration,
		);

		const style = resolveNodeRowMeasureStyle(root, '.vm-node-grid-label', undefined, {
			getComputedStyle,
		});

		expect(style.font).toBe('13px Vault Sans');
		expect(style.lineHeight).toBe(19);
	});

	it('keeps a stable key that changes for text measurement inputs', () => {
		const base = DEFAULT_NODE_ROW_MEASURE_STYLE;
		const changed = { ...base, letterSpacing: 0.5 };

		expect(nodeRowMeasureStyleKey(base)).toBe(nodeRowMeasureStyleKey({ ...base }));
		expect(nodeRowMeasureStyleKey(changed)).not.toBe(nodeRowMeasureStyleKey(base));
		expect(nodeRowMeasureStyleKey({ ...base, whiteSpace: 'pre-wrap' })).not.toBe(
			nodeRowMeasureStyleKey(base),
		);
		expect(nodeRowMeasureStyleKey({ ...base, wordBreak: 'keep-all' })).not.toBe(
			nodeRowMeasureStyleKey(base),
		);
	});
});
