// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	bindTreeKeyboardBoundary,
	isInteractiveControlTarget,
	routeTreeKeyboardEvent,
} from '../../src/logic/logicTreeKeyboardBoundary';

const disposers: Array<() => void> = [];
afterEach(() => {
	for (const dispose of disposers.splice(0)) dispose();
	document.body.replaceChildren();
});

function createFrameHierarchy() {
	const leaf = document.body.appendChild(document.createElement('div'));
	leaf.className = 'workspace-leaf';
	const frame = leaf.appendChild(document.createElement('div'));
	frame.className = 'workspace-leaf-content';
	const toolbar = frame.appendChild(document.createElement('div'));
	toolbar.className = 'vaultman-toolbar';
	const tree = frame.appendChild(document.createElement('div'));
	tree.className = 'vaultman-tree-container';
	const row = tree.appendChild(document.createElement('div'));
	row.className = 'vaultman-tree-row';
	return { leaf, frame, toolbar, tree, row };
}

describe('Semantic interactive control exclusion (isInteractiveControlTarget)', () => {
	it('identifies standard interactive and focusable controls', () => {
		const doc = document.createElement('div');
		const btn = doc.appendChild(document.createElement('button'));
		const roleBtn = doc.appendChild(document.createElement('div'));
		roleBtn.setAttribute('role', 'button');
		const link = doc.appendChild(document.createElement('a'));
		link.setAttribute('href', '#');
		const tab = doc.appendChild(document.createElement('div'));
		tab.setAttribute('role', 'tab');
		const tabIndexed = doc.appendChild(document.createElement('div'));
		tabIndexed.setAttribute('tabindex', '0');
		const editable = doc.appendChild(document.createElement('div'));
		editable.setAttribute('contenteditable', 'true');

		expect(isInteractiveControlTarget(btn)).toBe(true);
		expect(isInteractiveControlTarget(roleBtn)).toBe(true);
		expect(isInteractiveControlTarget(link)).toBe(true);
		expect(isInteractiveControlTarget(tab)).toBe(true);
		expect(isInteractiveControlTarget(tabIndexed)).toBe(true);
		expect(isInteractiveControlTarget(editable)).toBe(true);
	});

	it('returns false for neutral containers, tree rows, and negative tabindex', () => {
		const doc = document.createElement('div');
		const row = doc.appendChild(document.createElement('div'));
		row.className = 'vaultman-tree-row';
		const span = row.appendChild(document.createElement('span'));
		const negativeTab = doc.appendChild(document.createElement('div'));
		negativeTab.setAttribute('tabindex', '-1');

		expect(isInteractiveControlTarget(row)).toBe(false);
		expect(isInteractiveControlTarget(span)).toBe(false);
		expect(isInteractiveControlTarget(negativeTab)).toBe(false);
		expect(isInteractiveControlTarget(document.body)).toBe(false);
		expect(isInteractiveControlTarget(null)).toBe(false);
	});
});

describe('Shared keyboard owner routing (routeTreeKeyboardEvent)', () => {
	it('routes tree path first for genuine descendants inside tree boundary', () => {
		const { frame, tree, row } = createFrameHierarchy();
		const handleTreeKey = vi.fn((_e: KeyboardEvent) => true);
		disposers.push(bindTreeKeyboardBoundary(tree, handleTreeKey, () => true));

		let result: false | undefined;
		const route = (event: KeyboardEvent) => {
			result = routeTreeKeyboardEvent(event, { frameEl: frame });
		};
		document.addEventListener('keydown', route, true);
		disposers.push(() => document.removeEventListener('keydown', route, true));

		row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));

		expect(result).toBe(false);
		expect(handleTreeKey).toHaveBeenCalledOnce();
	});

	it('does NOT intercept Space, Enter, letters, or Home/End from toolbar controls', () => {
		const { frame, toolbar, tree } = createFrameHierarchy();
		const sortRoleBtn = toolbar.appendChild(document.createElement('div'));
		sortRoleBtn.setAttribute('role', 'button');
		sortRoleBtn.setAttribute('tabindex', '0');
		const sortIcon = sortRoleBtn.appendChild(document.createElement('span'));

		const handleTreeKey = vi.fn((_e: KeyboardEvent) => true);
		disposers.push(bindTreeKeyboardBoundary(tree, handleTreeKey, () => true));

		let result: false | undefined;
		const route = (event: KeyboardEvent) => {
			result = routeTreeKeyboardEvent(event, { frameEl: frame });
		};
		document.addEventListener('keydown', route, true);
		disposers.push(() => document.removeEventListener('keydown', route, true));

		for (const key of [' ', 'Enter', 's', 'Home', 'End']) {
			result = undefined;
			sortIcon.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
			expect(result).toBeUndefined();
			expect(handleTreeKey).not.toHaveBeenCalled();
		}
	});

	it('routes neutral body and frame fallback to active tree owner', () => {
		const { frame, tree } = createFrameHierarchy();
		const handleTreeKey = vi.fn((_e: KeyboardEvent) => true);
		disposers.push(bindTreeKeyboardBoundary(tree, handleTreeKey, () => true));

		// Neutral target: document.body
		const bodyEvent = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true });
		const bodyResult = routeTreeKeyboardEvent(bodyEvent, { frameEl: frame });
		expect(bodyResult).toBe(false);
		expect(handleTreeKey).toHaveBeenCalledTimes(1);

		// Neutral target: frame element shell (blank area)
		const frameEvent = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true });
		Object.defineProperty(frameEvent, 'target', { value: frame });
		const frameResult = routeTreeKeyboardEvent(frameEvent, { frameEl: frame });
		expect(frameResult).toBe(false);
		expect(handleTreeKey).toHaveBeenCalledTimes(2);
	});

	it('routes to the active owner belonging to the active frame when multiple frame owners exist', () => {
		const frame1 = createFrameHierarchy();
		const frame2 = createFrameHierarchy();

		const handleTree1 = vi.fn((_e: KeyboardEvent) => true);
		const handleTree2 = vi.fn((_e: KeyboardEvent) => true);
		disposers.push(bindTreeKeyboardBoundary(frame1.tree, handleTree1, () => true));
		disposers.push(bindTreeKeyboardBoundary(frame2.tree, handleTree2, () => true));

		const bodyEvent = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true });

		// Frame 1 active
		const res1 = routeTreeKeyboardEvent(bodyEvent, { frameEl: frame1.frame });
		expect(res1).toBe(false);
		expect(handleTree1).toHaveBeenCalledOnce();
		expect(handleTree2).not.toHaveBeenCalled();

		// Frame 2 active
		const res2 = routeTreeKeyboardEvent(bodyEvent, { frameEl: frame2.frame });
		expect(res2).toBe(false);
		expect(handleTree2).toHaveBeenCalledOnce();
	});

	it('rejects targets belonging to unrelated workspace leaves', () => {
		const { frame, tree } = createFrameHierarchy();
		const handleTreeKey = vi.fn((_e: KeyboardEvent) => true);
		disposers.push(bindTreeKeyboardBoundary(tree, handleTreeKey, () => true));

		const otherLeaf = document.body.appendChild(document.createElement('div'));
		otherLeaf.className = 'workspace-leaf';
		const otherLeafChild = otherLeaf.appendChild(document.createElement('div'));

		const event = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true });
		Object.defineProperty(event, 'target', { value: otherLeafChild });

		const result = routeTreeKeyboardEvent(event, { frameEl: frame });
		expect(result).toBeUndefined();
		expect(handleTreeKey).not.toHaveBeenCalled();
	});
});
