import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewNodeList from '../../../src/components/views/ViewNodeList.svelte';
import { rowInputFromViewRow } from '../../../src/services/serviceExplorerRowInput';
import type { NodeBase } from '../../../src/types/typeContracts';
import type { ViewRow } from '../../../src/types/typeViews';
import { iconStub, resizeObserverStub } from './nodeElementMaskTestHelpers';
import { nativePresetContext } from './nativeClassEmissionTestHelpers';

const row: ViewRow<NodeBase> = {
	id: 'list-native-a',
	node: { id: 'list-native-a' },
	label: 'List Alpha',
	detail: 'List detail',
	icon: 'lucide-file',
	cells: [],
	layers: {},
	actions: [],
	depth: 0,
};

describe('ViewNodeList - native class emission', () => {
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

	function render() {
		app = withContext(
			target,
			ViewNodeList as unknown as Component<Record<string, unknown>>,
			{
				rowInputs: [rowInputFromViewRow(row)],
				selectedIds: new Set<string>(['list-native-a']),
				focusedId: 'list-native-a',
				icon: iconStub(),
			},
			nativePresetContext(),
		);
		flushSync();
	}

	it('stays vm-only and emits vm state mods under native preset', () => {
		render();

		const rowEl = target.querySelector<HTMLElement>('.vm-view-list-row');
		expect(rowEl).not.toBeNull();
		expect(rowEl?.classList.contains('vm-is-selected')).toBe(true);
		expect(rowEl?.classList.contains('vm-is-focused')).toBe(true);
		expect(target.querySelector('.nav-file')).toBeNull();
		expect(target.querySelector('[class*="bases-"]')).toBeNull();
	});
});
