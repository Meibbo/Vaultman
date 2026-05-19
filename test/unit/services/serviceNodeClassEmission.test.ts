import { describe, expect, it } from 'vitest';
import { stateModEmissions } from '../../../src/services/serviceNodeClassEmission';
import type { NativeClassVocabulary } from '../../../src/services/serviceExplorerViewContract';

const TREE_VOCAB: NativeClassVocabulary = {
	rowRoot: 'tree-item',
	primaryLabel: 'tree-item-inner',
	innerWrapper: 'tree-item-self',
	childrenContainer: 'tree-item-children',
	collapseIcon: 'collapse-icon',
	cellWrapper: null,
	coverImage: null,
	headerCell: null,
	rowStateMods: ['is-active', 'is-selected', 'is-focused', 'is-being-dragged'],
};

const NULL_VOCAB: NativeClassVocabulary = {
	rowRoot: null,
	primaryLabel: null,
	innerWrapper: null,
	childrenContainer: null,
	collapseIcon: null,
	cellWrapper: null,
	coverImage: null,
	headerCell: null,
	rowStateMods: [],
};

describe('stateModEmissions', () => {
	it('emits vm-* always when row state booleans are true', () => {
		const out = stateModEmissions(TREE_VOCAB, {
			isSelected: true,
			isFocused: true,
			isActive: false,
			isDragSource: false,
			isDropTarget: false,
			hasActiveMenu: false,
		});

		expect(out).toContain('vm-is-selected');
		expect(out).toContain('vm-is-focused');
	});

	it('emits native is-* when vocab is present and the state mod is allow-listed', () => {
		const out = stateModEmissions(TREE_VOCAB, {
			isSelected: true,
			isFocused: false,
			isActive: false,
			isDragSource: false,
			isDropTarget: false,
			hasActiveMenu: false,
		});

		expect(out).toContain('is-selected');
	});

	it('does not emit native is-* when vocab is null', () => {
		const out = stateModEmissions(null, {
			isSelected: true,
			isFocused: true,
			isActive: false,
			isDragSource: false,
			isDropTarget: false,
			hasActiveMenu: false,
		});

		expect(out).toContain('vm-is-selected');
		expect(out).not.toContain('is-selected');
	});

	it('does not emit native is-* when state mod is not in the allowlist', () => {
		const out = stateModEmissions(NULL_VOCAB, {
			isSelected: true,
			isFocused: true,
			isActive: false,
			isDragSource: false,
			isDropTarget: false,
			hasActiveMenu: false,
		});

		expect(out).not.toContain('is-selected');
	});
});
