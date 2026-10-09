// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	bindTreeKeyboardBoundary,
	routeTreeKeyboardEvent,
} from '../../src/logic/logicTreeKeyboardBoundary';

afterEach(() => {
	document.body.replaceChildren();
});

describe('Tree Keyboard Boundary & Owner Fallback (native parity)', () => {
	it('falls back to active frame tree when target is document.body (parent verified live parity)', () => {
		const frame = document.createElement('div');
		frame.className = 'workspace-leaf';
		const tree = frame.appendChild(document.createElement('div'));
		tree.className = 'nav-files-container';
		document.body.append(frame);

		const handleTreeKey = vi.fn((_e: KeyboardEvent) => true);
		const dispose = bindTreeKeyboardBoundary(tree, handleTreeKey, () => true);

		try {
			// When keydown occurs on document.body while frame is active
			const bodyDown = new KeyboardEvent('keydown', {
				key: 'ArrowDown',
				bubbles: true,
				cancelable: true,
			});
			// route with frameEl fallback
			const handled = routeTreeKeyboardEvent(bodyDown, { frameEl: frame });
			expect(handled).toBe(false);
			expect(handleTreeKey).toHaveBeenCalledOnce();
		} finally {
			dispose();
		}
	});

	it('does NOT capture keystrokes when target is an editable input inside the frame', () => {
		const frame = document.createElement('div');
		frame.className = 'workspace-leaf';
		const input = frame.appendChild(document.createElement('input'));
		const tree = frame.appendChild(document.createElement('div'));
		document.body.append(frame);

		const handleTreeKey = vi.fn((_e: KeyboardEvent) => true);
		const dispose = bindTreeKeyboardBoundary(tree, handleTreeKey);

		try {
			const inputDown = new KeyboardEvent('keydown', {
				key: 'ArrowDown',
				bubbles: true,
				cancelable: true,
			});
			Object.defineProperty(inputDown, 'target', { value: input });
			const handled = routeTreeKeyboardEvent(inputDown, { frameEl: frame });
			expect(handled).toBeUndefined();
			expect(handleTreeKey).not.toHaveBeenCalled();
		} finally {
			dispose();
		}
	});

	it('does NOT capture keystrokes targeting an unrelated workspace leaf', () => {
		const frame = document.createElement('div');
		frame.className = 'workspace-leaf';
		const tree = frame.appendChild(document.createElement('div'));

		const otherLeaf = document.createElement('div');
		otherLeaf.className = 'workspace-leaf';
		const otherLeafContent = otherLeaf.appendChild(document.createElement('div'));

		document.body.append(frame, otherLeaf);

		const handleTreeKey = vi.fn((_e: KeyboardEvent) => true);
		const dispose = bindTreeKeyboardBoundary(tree, handleTreeKey);

		try {
			const otherDown = new KeyboardEvent('keydown', {
				key: 'ArrowDown',
				bubbles: true,
				cancelable: true,
			});
			Object.defineProperty(otherDown, 'target', { value: otherLeafContent });
			const handled = routeTreeKeyboardEvent(otherDown, { frameEl: frame });
			expect(handled).toBeUndefined();
			expect(handleTreeKey).not.toHaveBeenCalled();
		} finally {
			dispose();
		}
	});
});
