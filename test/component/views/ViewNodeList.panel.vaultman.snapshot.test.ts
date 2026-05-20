import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewNodeList from '../../../src/components/views/ViewNodeList.svelte';
import { rowInputFromViewRow } from '../../../src/services/serviceExplorerRowInput';
import type { NodeBase } from '../../../src/types/typeContracts';
import type { ViewAction, ViewRow } from '../../../src/types/typeViews';
import { iconStub, makeMask, maskContext, resizeObserverStub } from './nodeElementMaskTestHelpers';
import { vaultmanPresetContext } from './nativeClassEmissionTestHelpers';
import { normalizedSnapshotHtml } from './panelSnapshotHelpers';

interface ListNode extends NodeBase {
	label: string;
	detail?: string;
}

function row(id: string, label: string, detail: string): ViewRow<ListNode> {
	const action: ViewAction<ListNode> = { id: 'open', label: 'Open', icon: 'lucide-arrow-up-right' };
	return {
		id,
		node: { id, label, detail },
		label,
		detail,
		icon: 'lucide-file',
		cells: [],
		layers: { badges: { ops: [{ id: `${id}:op`, label: 'Queued', tone: 'accent' }] } },
		actions: [action],
		depth: 1,
	};
}

describe('ViewNodeList - panel x vaultman snapshot', () => {
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

	it('row root + label + detail + badge + action render under default vaultman mask', () => {
		const rowInput = rowInputFromViewRow(row('list-alpha', 'Alpha', 'alpha.md'));
		app = withContext(
			target,
			ViewNodeList as unknown as Component<Record<string, unknown>>,
			{
				rowInputs: [rowInput],
				selectedIds: new Set<string>(['list-alpha']),
				focusedId: 'list-alpha',
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: iconStub(),
			},
			[...vaultmanPresetContext(), ...maskContext(makeMask())],
		);
		flushSync();

		expect(normalizedSnapshotHtml(target.firstElementChild)).toMatchSnapshot();
	});
});
