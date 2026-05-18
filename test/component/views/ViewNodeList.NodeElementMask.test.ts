import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewNodeList from '../../../src/components/views/ViewNodeList.svelte';
import { rowInputFromViewRow } from '../../../src/services/serviceExplorerRowInput';
import type { NodeBase } from '../../../src/types/typeContracts';
import type { ViewAction, ViewRow } from '../../../src/types/typeViews';
import { iconStub, makeMask, maskContext, resizeObserverStub } from './nodeElementMaskTestHelpers';

interface ListNode extends NodeBase {
	label: string;
	detail: string;
}

const removeAction: ViewAction<ListNode> = { id: 'remove', label: 'Remove', icon: 'lucide-x' };

const row: ViewRow<ListNode> = {
	id: 'list-a',
	node: { id: 'list-a', label: 'List Alpha', detail: 'List detail' },
	label: 'List Alpha',
	detail: 'List detail',
	icon: 'lucide-file',
	cells: [],
	layers: {
		badges: {
			filters: [{ id: 'filter-badge', label: 'Filtered', tone: 'accent' }],
		},
	},
	actions: [removeAction],
	depth: 0,
};

describe('ViewNodeList - NodeElementMask gating', () => {
	let target: HTMLDivElement;
	let app: { destroy(): void } | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal('ResizeObserver', resizeObserverStub);
	});

	afterEach(() => {
		app?.destroy();
		app = null;
		target.remove();
		vi.unstubAllGlobals();
	});

	function render(mask = makeMask()) {
		app = withContext(
			target,
			ViewNodeList as unknown as Component<Record<string, unknown>>,
			{
				rowInputs: [rowInputFromViewRow(row as ViewRow<NodeBase>)],
				onAction: vi.fn(),
				icon: iconStub(),
			},
			maskContext(mask),
		);
		flushSync();
	}

	it('gates icon, label, detail, filter badges, and actions', () => {
		render(
			makeMask({
				icon: false,
				label: false,
				detail: false,
				badges: { filters: false },
				actions: false,
			}),
		);

		const rowEl = target.querySelector('[data-id="list-a"]');
		expect(rowEl).not.toBeNull();
		expect(rowEl?.querySelector('.vm-view-list-icon')).toBeNull();
		expect(rowEl?.querySelector('.vm-view-list-label')).toBeNull();
		expect(rowEl?.querySelector('.vm-view-list-detail')).toBeNull();
		expect(rowEl?.querySelector('.vm-view-list-badges')).toBeNull();
		expect(rowEl?.querySelector('button[aria-label="Remove"]')).toBeNull();
		expect(rowEl?.textContent).not.toContain('Filtered');
	});
});
