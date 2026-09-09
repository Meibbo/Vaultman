import { beforeEach, describe, expect, it, vi } from 'vitest';

const knownIcons = new Set<string>();
const setIconCalls: Array<{ icon: string }> = [];

vi.mock('obsidian', () => ({
	getIcon: (id: string) => (knownIcons.has(id) ? {} : null),
	setIcon: (_el: unknown, icon: string) => {
		setIconCalls.push({ icon });
	},
	getLanguage: () => 'en',
}));

import { renderIconValue } from '../../src/utils/renderIconValue';

interface FakeSpan {
	cls: string;
	text: string;
}

function makeElement(): HTMLElement {
	const spans: FakeSpan[] = [];
	const el = {
		spans,
		emptied: 0,
		style: { setProperty: (_name: string, _value: string) => {} },
		empty() {
			this.emptied += 1;
		},
		createSpan(opts: { cls: string; text: string }) {
			spans.push({ cls: opts.cls, text: opts.text });
		},
	};
	return el as unknown as HTMLElement;
}

function spansOf(el: HTMLElement): FakeSpan[] {
	return (el as unknown as { spans: FakeSpan[] }).spans;
}

beforeEach(() => {
	knownIcons.clear();
	setIconCalls.length = 0;
});

describe('renderIconValue', () => {
	it('renders a shipped icon through setIcon', () => {
		knownIcons.add('lucide-folder');
		const el = makeElement();
		renderIconValue(el, 'lucide-folder');
		expect(setIconCalls).toEqual([{ icon: 'lucide-folder' }]);
		expect(spansOf(el)).toHaveLength(0);
	});

	it('renders faint not-found text for a retired lucide id instead of the literal id', () => {
		const el = makeElement();
		renderIconValue(el, 'lucide-codepen');
		expect(setIconCalls).toHaveLength(0);
		expect(spansOf(el)).toHaveLength(1);
		expect(spansOf(el)[0].cls).toContain('vaultman-icon-missing');
		expect(spansOf(el)[0].text).toBe('not found');
	});

	it('keeps the emoji-as-text path for plain values', () => {
		const el = makeElement();
		renderIconValue(el, '📁');
		expect(setIconCalls).toHaveLength(0);
		expect(spansOf(el)).toHaveLength(1);
		expect(spansOf(el)[0].cls).toContain('iconic-emoji');
		expect(spansOf(el)[0].text).toBe('📁');
	});
});
