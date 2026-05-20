import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createKeyboardNav,
	type KeyboardNavContext,
} from '../../../src/services/serviceKeyboardNav';

function makeCtx(overrides: Partial<KeyboardNavContext> = {}): KeyboardNavContext {
	return {
		topology: 'linear',
		orderedIds: () => ['a', 'b', 'c', 'd'],
		isExpandable: () => false,
		isExpanded: () => false,
		parentOf: () => null,
		firstChildOf: () => null,
		labelOf: (id) => id,
		moveFocus: vi.fn(),
		focusEdge: vi.fn(),
		focusId: vi.fn(),
		movePage: vi.fn(),
		toggleSelect: vi.fn(),
		selectAll: vi.fn(),
		expand: vi.fn(),
		collapse: vi.fn(),
		activate: vi.fn(),
		...overrides,
	};
}

function key(value: string, overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
	return {
		key: value,
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		altKey: false,
		preventDefault: vi.fn(),
		...overrides,
	} as unknown as KeyboardEvent;
}

beforeEach(() => {
	vi.stubGlobal('activeWindow', {
		setTimeout: vi.fn(() => 1),
		clearTimeout: vi.fn(),
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('serviceKeyboardNav linear topology', () => {
	it('routes ArrowDown and ArrowUp to roving focus movement', () => {
		const ctx = makeCtx();
		const nav = createKeyboardNav(ctx);

		nav.handleKeydown('b', key('ArrowDown'));
		expect(ctx.moveFocus).toHaveBeenCalledWith(1, { additive: false, range: false });

		nav.handleKeydown('b', key('ArrowUp', { shiftKey: true }));
		expect(ctx.moveFocus).toHaveBeenCalledWith(-1, { additive: false, range: true });
	});

	it('routes Home and End to edge focus', () => {
		const ctx = makeCtx();
		const nav = createKeyboardNav(ctx);

		nav.handleKeydown('b', key('Home'));
		expect(ctx.focusEdge).toHaveBeenCalledWith('home', { range: false });

		nav.handleKeydown('b', key('End', { shiftKey: true }));
		expect(ctx.focusEdge).toHaveBeenCalledWith('end', { range: true });
	});

	it('routes Enter to activation and Space to selection toggle', () => {
		const ctx = makeCtx();
		const nav = createKeyboardNav(ctx);

		const enter = key('Enter');
		nav.handleKeydown('b', enter);
		expect(ctx.activate).toHaveBeenCalledWith('b', enter);

		nav.handleKeydown('b', key(' ', { ctrlKey: true }));
		expect(ctx.toggleSelect).toHaveBeenCalledWith({ additive: true, range: false });
	});

	it('routes Ctrl/Cmd+A to selectAll', () => {
		const ctx = makeCtx();
		const nav = createKeyboardNav(ctx);

		nav.handleKeydown('b', key('a', { metaKey: true }));
		expect(ctx.selectAll).toHaveBeenCalled();
	});

	it('routes tree ArrowRight and ArrowLeft through expansion state', () => {
		const ctx = makeCtx({ isExpandable: () => true, isExpanded: (id) => id === 'open' });
		const nav = createKeyboardNav(ctx);

		nav.handleKeydown('closed', key('ArrowRight'));
		expect(ctx.expand).toHaveBeenCalledWith('closed');

		nav.handleKeydown('open', key('ArrowLeft'));
		expect(ctx.collapse).toHaveBeenCalledWith('open');
	});

	it('type-ahead focuses the next label prefix match', () => {
		const ctx = makeCtx({
			orderedIds: () => ['apple', 'banana', 'cherry'],
			labelOf: (id) => id,
		});
		const nav = createKeyboardNav(ctx);

		nav.handleKeydown('apple', key('b'));

		expect(ctx.focusId).toHaveBeenCalledWith('banana');
	});
});

describe('serviceKeyboardNav planar topology', () => {
	it('routes vertical arrows by the current column count', () => {
		const ctx = makeCtx({
			topology: 'planar',
			columnsAt: () => 3,
			orderedIds: () => ['0', '1', '2', '3', '4', '5'],
		});
		const nav = createKeyboardNav(ctx);

		nav.handleKeydown('0', key('ArrowDown'));

		expect(ctx.moveFocus).toHaveBeenCalledTimes(3);
		expect(ctx.moveFocus).toHaveBeenLastCalledWith(1, { additive: false, range: false });
	});
});

describe('serviceKeyboardNav planar-drill topology', () => {
	it('routes Enter to descend on expandable containers and Backspace to ascend', () => {
		const descend = vi.fn(() => true);
		const ascend = vi.fn(() => true);
		const ctx = makeCtx({
			topology: 'planar-drill',
			columnsAt: () => 2,
			isExpandable: () => true,
			drill: { descend, ascend },
		});
		const nav = createKeyboardNav(ctx);

		nav.handleKeydown('folder', key('Enter'));
		expect(descend).toHaveBeenCalledWith('folder');

		nav.handleKeydown('x', key('Backspace'));
		expect(ascend).toHaveBeenCalled();
	});

	it('routes folder-history chords through the drill contract', () => {
		const back = vi.fn(() => true);
		const forward = vi.fn(() => true);
		const ascend = vi.fn(() => true);
		const ctx = makeCtx({
			topology: 'planar-drill',
			drill: {
				descend: vi.fn(() => false),
				ascend,
				back,
				forward,
			},
		});
		const nav = createKeyboardNav(ctx);

		nav.handleKeydown('folder', key('ArrowLeft', { altKey: true }));
		expect(back).toHaveBeenCalled();

		nav.handleKeydown('folder', key('ArrowRight', { altKey: true }));
		expect(forward).toHaveBeenCalled();

		nav.handleKeydown('folder', key('ArrowUp', { altKey: true }));
		expect(ascend).toHaveBeenCalled();
	});
});
