import type { RowInteractionContract } from '../types/typeActionRouting';
import type { ExplorerViewFeatureFlags } from './serviceExplorerViewContract';

export type RowRole = 'treeitem' | 'row' | 'gridcell' | 'option';

export interface RowActionContext {
	explorerId: string;
	role: RowRole;
	features: ExplorerViewFeatureFlags;
	contract: Pick<RowInteractionContract, 'onContextMenu' | 'onToggle' | 'onRowKeydown'>;
}

export interface RowState {
	selected: boolean;
	focused?: boolean;
	expandable: boolean;
	expanded: boolean;
}

export interface RowProps {
	role: RowRole;
	tabindex: 0 | -1;
	'aria-selected': boolean | undefined;
	'aria-expanded': boolean | undefined;
	'data-row-key': string;
	oncontextmenu?: (e: MouseEvent) => void;
	onkeydown?: (e: KeyboardEvent) => void;
}

export interface CaretProps {
	role: 'button';
	tabindex: -1;
	'aria-hidden': true;
	onclick: (e: MouseEvent) => void;
}

export interface RowActionBuilder {
	getRowProps(id: string, state: RowState): RowProps;
	getCaretProps(id: string): CaretProps;
	getKeyboardHandlers(id: string): { onkeydown: (e: KeyboardEvent) => void };
}

export function createRowAction(ctx: RowActionContext): RowActionBuilder {
	function getRowProps(id: string, state: RowState): RowProps {
		const keyboardEnabled = ctx.features.keyboardFocus;
		return {
			role: ctx.role,
			tabindex: keyboardEnabled ? 0 : -1,
			'aria-selected': ctx.features.selection ? state.selected : undefined,
			'aria-expanded': state.expandable ? state.expanded : undefined,
			'data-row-key': id,
			oncontextmenu: ctx.features.contextMenu
				? (e) => {
						e.preventDefault();
						ctx.contract.onContextMenu(id, e);
					}
				: undefined,
			onkeydown: keyboardEnabled ? (e) => ctx.contract.onRowKeydown?.(id, e) : undefined,
		};
	}

	function getCaretProps(id: string): CaretProps {
		return {
			role: 'button',
			tabindex: -1,
			'aria-hidden': true,
			onclick: (e) => {
				e.stopPropagation();
				ctx.contract.onToggle(id, e);
			},
		};
	}

	function getKeyboardHandlers(id: string): { onkeydown: (e: KeyboardEvent) => void } {
		return { onkeydown: (e) => ctx.contract.onRowKeydown?.(id, e) };
	}

	return { getRowProps, getCaretProps, getKeyboardHandlers };
}
