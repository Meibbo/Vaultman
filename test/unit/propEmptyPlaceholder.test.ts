import { describe, expect, it } from 'vitest';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';
import {
	normalizeExplorerSortState,
	sameExplorerSortState,
	sameSortProjection,
} from '../../src/logic/logicScopedSort';
import type { ExplorerSortState } from '../../src/types/typeUI';

describe('propScene empty placeholder and addPropertyFirst reactivity', () => {
	it('detects addPropertyFirst change in sameSortProjection and sameExplorerSortState', () => {
		const base = normalizeExplorerSortState('props', null);
		const withAddFirst: ExplorerSortState = {
			...base,
			addPropertyFirst: true,
		};
		const withoutAddFirst: ExplorerSortState = {
			...base,
			addPropertyFirst: false,
		};

		// Toggling addPropertyFirst must NOT be considered the same state
		expect(sameSortProjection(withAddFirst, withoutAddFirst)).toBe(false);
		expect(sameExplorerSortState(withAddFirst, withoutAddFirst)).toBe(false);

		// Same addPropertyFirst must be considered equal
		expect(sameSortProjection(withAddFirst, { ...withAddFirst })).toBe(true);
		expect(sameExplorerSortState(withAddFirst, { ...withAddFirst })).toBe(true);
	});

	it('removes redundant action buttons from explorerProps _renderEmptyState', () => {
		const renderEmptyStateStart = propsSource.indexOf(
			'private _renderEmptyState(): void {',
		);
		const renderEmptyStateEnd = propsSource.indexOf(
			'\n\tprivate _deletionSubject',
			renderEmptyStateStart,
		);
		const emptyStateCode = propsSource.slice(
			renderEmptyStateStart,
			renderEmptyStateEnd,
		);

		// No redundant buttons in the placeholder
		expect(emptyStateCode).not.toContain('vaultman-explorer-empty-actions');
		expect(emptyStateCode).not.toContain('switch_general');
		expect(emptyStateCode).not.toContain('ops.add_property');

		// Still renders the informative title & description
		expect(emptyStateCode).toContain('explorer.props.empty_title');
		expect(emptyStateCode).toContain('explorer.props.empty_search_desc');
		expect(emptyStateCode).toContain('explorer.ctx.reveal_this_file.empty');
		expect(emptyStateCode).toContain(
			'explorer.ctx.reveal_this_file.empty_desc_props',
		);
	});

	it('removes redundant action buttons from explorerTags _renderEmptyState', () => {
		const renderEmptyStateStart = tagsSource.indexOf(
			'private _renderEmptyState(): void {',
		);
		const renderEmptyStateEnd = tagsSource.indexOf(
			'\n\tprivate _resolveIcons',
			renderEmptyStateStart,
		);
		const emptyStateCode = tagsSource.slice(
			renderEmptyStateStart,
			renderEmptyStateEnd,
		);

		// No redundant buttons in tags placeholder
		expect(emptyStateCode).not.toContain('vaultman-explorer-empty-actions');
		expect(emptyStateCode).not.toContain('switch_general');
	});

	it('maintains the add-property widget node in reveal mode during zero matches and renders search placeholder', () => {
		// Does not abort tree render when nodesWithIcons is empty if revealing active file
		expect(propsSource).toContain(
			'nodesWithIcons.length === 0 &&\n\t\t\t(!this.isRevealingActiveFile() || !this._revealPath())',
		);

		// Renders empty search notice when searchTerm is set and matches are 0
		expect(propsSource).toContain(
			'if (nodesWithIcons.length === 0 && this.searchTerm) {',
		);

		// Preserves the + Add property row widget via _withAddPropertyRow
		expect(propsSource).toContain('this._withAddPropertyRow(');
		expect(propsSource).toContain('ADD_PROPERTY_ROW_ID');
	});
});
