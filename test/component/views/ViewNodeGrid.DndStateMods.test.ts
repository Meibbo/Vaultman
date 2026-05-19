import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewNodeGrid from '../../../src/components/views/ViewNodeGrid.svelte';
import type { TreeNode } from '../../../src/types/typeNode';
import { iconStub, resizeObserverStub } from './nodeElementMaskTestHelpers';
import { nativePresetContext, vaultmanPresetContext } from './nativeClassEmissionTestHelpers';

const nodes: TreeNode[] = [
	{ id: 'grid-a', label: 'Grid A', depth: 0, meta: {}, icon: 'lucide-file' },
	{ id: 'grid-b', label: 'Grid B', depth: 0, meta: {}, icon: 'lucide-file' },
];

function dragEvent(type: string): DragEvent {
	const dataTransfer = {
		effectAllowed: 'copyMove',
		dropEffect: 'move',
		setData: vi.fn(),
		getData: vi.fn(),
		clearData: vi.fn(),
	} as unknown as DataTransfer;
	const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
	Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
	return event;
}

describe('ViewNodeGrid - DnD state mod emission (C9)', () => {
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

	function renderGrid(contextEntries = vaultmanPresetContext()) {
		app = withContext(
			target,
			ViewNodeGrid as unknown as Component<Record<string, unknown>>,
			{
				nodes,
				manualDndEnabled: true,
				onTileClick: vi.fn(),
				onContextMenu: vi.fn(),
				onManualDrop: vi.fn(),
				icon: iconStub(),
			},
			contextEntries,
		);
		flushSync();
	}

	it('emits vm-drag-source without legacy is-dnd-dragging when dragging in Vaultman mode', () => {
		renderGrid(vaultmanPresetContext());

		target.querySelector<HTMLElement>('[data-id="grid-a"]')?.dispatchEvent(dragEvent('dragstart'));
		flushSync();

		const tile = target.querySelector<HTMLElement>('[data-id="grid-a"]');
		expect(tile?.classList.contains('vm-drag-source')).toBe(true);
		expect(tile?.classList.contains('is-dnd-dragging')).toBe(false);
		expect(tile?.classList.contains('is-being-dragged')).toBe(false);
	});

	it('emits vm-drop-target without legacy is-dnd-drop-target when hovering a target', () => {
		renderGrid(vaultmanPresetContext());

		target.querySelector<HTMLElement>('[data-id="grid-a"]')?.dispatchEvent(dragEvent('dragstart'));
		target.querySelector<HTMLElement>('[data-id="grid-b"]')?.dispatchEvent(dragEvent('dragover'));
		flushSync();

		const tile = target.querySelector<HTMLElement>('[data-id="grid-b"]');
		expect(tile?.classList.contains('vm-drop-target')).toBe(true);
		expect(tile?.classList.contains('is-dnd-drop-target')).toBe(false);
		expect(tile?.classList.contains('is-being-dragged-over')).toBe(false);
	});

	it('does NOT emit native DnD classes when useNativeDom=true because grid rowStateMods is empty', () => {
		renderGrid(nativePresetContext());

		target.querySelector<HTMLElement>('[data-id="grid-a"]')?.dispatchEvent(dragEvent('dragstart'));
		target.querySelector<HTMLElement>('[data-id="grid-b"]')?.dispatchEvent(dragEvent('dragover'));
		flushSync();

		expect(target.querySelector('[data-id="grid-a"]')?.classList.contains('vm-drag-source')).toBe(
			true,
		);
		expect(target.querySelector('[data-id="grid-a"]')?.classList.contains('is-being-dragged')).toBe(
			false,
		);
		expect(
			target.querySelector('[data-id="grid-b"]')?.classList.contains('is-being-dragged-over'),
		).toBe(false);
	});
});
