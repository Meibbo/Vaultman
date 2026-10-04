// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindTreeKeyboardBoundary, routeTreeKeyboardEvent } from '../../src/logic/logicTreeKeyboardBoundary';

afterEach(() => { document.body.replaceChildren(); });

describe('owner-local Obsidian keyboard scope', () => {
	it('handles F2 before the global rename binding when the target belongs to a tree', () => {
		// Given a focused tree and a global rename binding in the platform scope.
		const tree = document.createElement('div');
		const row = tree.appendChild(document.createElement('div'));
		document.body.append(tree);
		const rename = vi.fn();
		const dispose = bindTreeKeyboardBoundary(tree, event => { rename(); event.preventDefault(); return true; });
		const globalRename = vi.fn();
		const platformScope = (event: KeyboardEvent) => {
			if (routeTreeKeyboardEvent(event) !== false) globalRename();
		};
		document.addEventListener('keydown', platformScope, true);
		try {
			// When the platform receives F2 from that tree.
			row.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true, cancelable: true }));
			// Then only the tree's rename affordance runs.
			expect(rename).toHaveBeenCalledOnce();
			expect(globalRename).not.toHaveBeenCalled();
		} finally { dispose(); document.removeEventListener('keydown', platformScope, true); }
	});

	it('leaves unrelated targets and disposed trees to the platform', () => {
		// Given a retired tree boundary.
		const tree = document.createElement('div');
		document.body.append(tree);
		const handle = vi.fn(() => false);
		bindTreeKeyboardBoundary(tree, handle)();
		const platformScope = (event: KeyboardEvent) => { routeTreeKeyboardEvent(event); };
		document.addEventListener('keydown', platformScope, true);
		try {
			// When a key targets its old owner.
			tree.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true }));
			// Then no retired controller intercepts it.
			expect(handle).not.toHaveBeenCalled();
		} finally { document.removeEventListener('keydown', platformScope, true); }
	});

	it('does not claim a pre-prevented key that its own controller did not handle', () => {
		const tree = document.createElement('div');
		document.body.append(tree);
		const dispose = bindTreeKeyboardBoundary(tree, () => false);
		const results: (false | undefined)[] = [];
		const platformScope = (event: KeyboardEvent) => {
			event.preventDefault();
			results.push(routeTreeKeyboardEvent(event));
		};
		document.addEventListener('keydown', platformScope, true);
		try {
			tree.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true, cancelable: true }));
			expect(results).toEqual([undefined]);
		} finally { dispose(); document.removeEventListener('keydown', platformScope, true); }
	});
});
