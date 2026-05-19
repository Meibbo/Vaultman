import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewNodeList from '../../../src/components/views/ViewNodeList.svelte';
import { rowInputFromViewRow } from '../../../src/services/serviceExplorerRowInput';
import type { NodeBase } from '../../../src/types/typeContracts';
import type { ViewRow } from '../../../src/types/typeViews';
import { iconStub, resizeObserverStub } from './nodeElementMaskTestHelpers';
import { nativePresetContext } from './nativeClassEmissionTestHelpers';

function row(id: string, label: string): ViewRow<NodeBase> {
	const node = { id, label };
	return {
		id,
		node,
		label,
		cells: [],
		layers: {},
		depth: 0,
	};
}

describe('ViewNodeList - DnD state mod emission (C9)', () => {
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

	it('does NOT emit DnD state classes on passive render', () => {
		app = withContext(
			target,
			ViewNodeList as unknown as Component<Record<string, unknown>>,
			{
				rowInputs: [rowInputFromViewRow(row('list-dnd-a', 'List A'))],
				icon: iconStub(),
			},
			nativePresetContext(),
		);
		flushSync();

		expect(target.querySelector('.is-being-dragged')).toBeNull();
		expect(target.querySelector('.is-being-dragged-over')).toBeNull();
		expect(target.querySelector('.vm-drag-source')).toBeNull();
		expect(target.querySelector('.vm-drop-target')).toBeNull();
	});
});
