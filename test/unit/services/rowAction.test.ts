import { describe, expect, it, vi } from 'vitest';
import { createRowAction, type RowActionContext } from '../../../src/services/serviceRowAction';

const allFeatures = {
	selection: true,
	keyboardFocus: true,
	contextMenu: true,
	scrollReveal: true,
	badges: true,
	nodeElementToggles: true,
	acceptsMediaDescriptors: true,
};

function makeCtx(overrides: Partial<RowActionContext> = {}): RowActionContext {
	return {
		explorerId: 'files',
		role: 'treeitem',
		features: allFeatures,
		contract: {
			onContextMenu: vi.fn(),
			onToggle: vi.fn(),
			onRowKeydown: vi.fn(),
		},
		...overrides,
	};
}

function mouseEvent(): MouseEvent {
	return {
		preventDefault: vi.fn(),
		stopPropagation: vi.fn(),
	} as unknown as MouseEvent;
}

function keyboardEvent(): KeyboardEvent {
	return {} as KeyboardEvent;
}

describe('createRowAction.getRowProps', () => {
	it('emits structural attributes plus contextmenu and keyboard handlers without pointer click handlers', () => {
		const ctx = makeCtx();
		const builder = createRowAction(ctx);
		const props = builder.getRowProps('sel', {
			selected: true,
			expandable: false,
			expanded: false,
		});

		expect(props.role).toBe('treeitem');
		expect(props.tabindex).toBe(0);
		expect(props['aria-selected']).toBe(true);
		expect(props['data-row-key']).toBe('sel');
		expect('onclick' in props).toBe(false);

		const contextMenuEvent = mouseEvent();
		props.oncontextmenu?.(contextMenuEvent);
		expect(contextMenuEvent.preventDefault).toHaveBeenCalled();
		expect(ctx.contract.onContextMenu).toHaveBeenCalledWith('sel', contextMenuEvent);

		const keydownEvent = keyboardEvent();
		props.onkeydown?.(keydownEvent);
		expect(ctx.contract.onRowKeydown).toHaveBeenCalledWith('sel', keydownEvent);
	});

	it('emits aria-expanded only for expandable rows', () => {
		const builder = createRowAction(makeCtx());

		expect(
			builder.getRowProps('branch', { selected: false, expandable: true, expanded: false })[
				'aria-expanded'
			],
		).toBe(false);
		expect(
			builder.getRowProps('leaf', { selected: false, expandable: false, expanded: false })[
				'aria-expanded'
			],
		).toBeUndefined();
	});

	it('gates structural attributes and handlers by feature flags', () => {
		const builder = createRowAction(
			makeCtx({
				features: {
					...allFeatures,
					selection: false,
					keyboardFocus: false,
					contextMenu: false,
				},
			}),
		);

		const props = builder.getRowProps('x', {
			selected: false,
			expandable: false,
			expanded: false,
		});

		expect(props['aria-selected']).toBeUndefined();
		expect(props.tabindex).toBe(-1);
		expect(props.onkeydown).toBeUndefined();
		expect(props.oncontextmenu).toBeUndefined();
	});
});

describe('createRowAction.getCaretProps', () => {
	it('stops propagation and toggles', () => {
		const ctx = makeCtx();
		const builder = createRowAction(ctx);
		const props = builder.getCaretProps('branch');

		expect(props['aria-hidden']).toBe(true);
		const event = mouseEvent();
		props.onclick(event);

		expect(event.stopPropagation).toHaveBeenCalled();
		expect(ctx.contract.onToggle).toHaveBeenCalledWith('branch', event);
	});
});
