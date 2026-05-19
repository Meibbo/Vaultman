import type { NativeClassVocabulary } from './serviceExplorerViewContract';
import { UNIVERSAL_DND_VOCAB } from '../types/typeViewHost';

export interface RowStateBooleans {
	isSelected: boolean;
	isFocused: boolean;
	isActive: boolean;
	isDragSource: boolean;
	isDropTarget: boolean;
	hasActiveMenu: boolean;
}

export function stateModEmissions(
	vocab: NativeClassVocabulary | null,
	state: RowStateBooleans,
): string[] {
	const out: string[] = [];

	if (state.isSelected) out.push('vm-is-selected');
	if (state.isFocused) out.push('vm-is-focused');
	if (state.isActive) out.push('vm-is-active');
	if (state.isDragSource) out.push('vm-drag-source');
	if (state.isDropTarget) out.push('vm-drop-target');
	if (state.hasActiveMenu) out.push('vm-has-active-menu');

	if (vocab) {
		if (state.isSelected && vocab.rowStateMods.includes('is-selected')) out.push('is-selected');
		if (state.isFocused && vocab.rowStateMods.includes('is-focused')) out.push('is-focused');
		if (state.isActive && vocab.rowStateMods.includes('is-active')) out.push('is-active');
		if (state.isDragSource && vocab.rowStateMods.includes(UNIVERSAL_DND_VOCAB.dragSource)) {
			out.push(UNIVERSAL_DND_VOCAB.dragSource);
		}
		if (state.isDropTarget && vocab.rowStateMods.includes(UNIVERSAL_DND_VOCAB.dragTarget)) {
			out.push(UNIVERSAL_DND_VOCAB.dragTarget);
		}
		if (state.hasActiveMenu && vocab.rowStateMods.includes('has-active-menu')) {
			out.push('has-active-menu');
		}
	}

	return out;
}
