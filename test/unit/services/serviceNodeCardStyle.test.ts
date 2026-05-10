import { describe, expect, it, vi } from 'vitest';
import {
	DEFAULT_NODE_CARD_MEASURE_STYLE,
	nodeCardMeasureStyleKey,
	resolveNodeCardMeasureStyle,
} from '../../../src/services/serviceNodeCardStyle';

describe('serviceNodeCardStyle', () => {
	it('resolves title and meta measurement styles from rendered card fields', () => {
		const title = {} as Element;
		const meta = {} as Element;
		const root = {
			querySelector: vi.fn((selector: string) => {
				if (selector === '.vm-node-card-field.is-title') return title;
				if (selector === '.vm-node-card-field.is-meta') return meta;
				return null;
			}),
		} as unknown as Element;
		const getComputedStyle = vi.fn((element: Element) => {
			const titleStyle = {
				font: '',
				fontStyle: 'italic',
				fontVariant: 'normal',
				fontWeight: '700',
				fontSize: '15px',
				fontFamily: 'Inter',
				lineHeight: '21px',
				letterSpacing: '0.5px',
				whiteSpace: 'pre-wrap',
				wordBreak: 'keep-all',
			} as CSSStyleDeclaration;
			const metaStyle = {
				font: '500 12px Arial',
				fontStyle: 'normal',
				fontVariant: 'normal',
				fontWeight: '500',
				fontSize: '12px',
				fontFamily: 'Arial',
				lineHeight: '17px',
				letterSpacing: 'normal',
				whiteSpace: 'normal',
				wordBreak: 'normal',
			} as CSSStyleDeclaration;
			return element === title ? titleStyle : metaStyle;
		});

		const style = resolveNodeCardMeasureStyle(root, DEFAULT_NODE_CARD_MEASURE_STYLE, {
			getComputedStyle,
		});

		expect(style.title.font).toContain('italic');
		expect(style.title.font).toContain('700');
		expect(style.title.font).toContain('15px');
		expect(style.title.font).toContain('Inter');
		expect(style.title.lineHeight).toBe(21);
		expect(style.title.letterSpacing).toBe(0.5);
		expect(style.title.whiteSpace).toBe('pre-wrap');
		expect(style.title.wordBreak).toBe('keep-all');
		expect(style.meta.font).toBe('500 12px Arial');
		expect(style.meta.lineHeight).toBe(17);
		expect(style.meta.letterSpacing).toBe(0);
	});

	it('keeps a stable key and falls back when CSS values are unavailable', () => {
		const style = resolveNodeCardMeasureStyle(null);

		expect(style).toEqual(DEFAULT_NODE_CARD_MEASURE_STYLE);
		expect(nodeCardMeasureStyleKey(style)).toBe(
			nodeCardMeasureStyleKey(DEFAULT_NODE_CARD_MEASURE_STYLE),
		);
	});
});
