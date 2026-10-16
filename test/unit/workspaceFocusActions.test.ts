import { describe, expect, it } from 'vitest';
import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import {
	createWorkspaceFocusCommandDescriptors,
	findActiveLeafInSplit,
	registerWorkspaceFocusActions,
	WORKSPACE_FOCUS_DEFS,
	WORKSPACE_FOCUS_LEFT_SIDEBAR_ID,
	WORKSPACE_FOCUS_MAIN_AREA_ID,
	WORKSPACE_FOCUS_RIGHT_SIDEBAR_ID,
	type WorkspaceFocusTarget,
} from '../../src/logic/logicSasiWorkspaceFocusActions';

describe('Workspace panel focus actions (S5)', () => {
	it('registers all 3 workspace focus actions in the SASI registry', () => {
		const registry = createSasiRegistry();
		registerWorkspaceFocusActions(registry);

		expect(WORKSPACE_FOCUS_DEFS).toHaveLength(3);
		const leftAction = registry.resolve(WORKSPACE_FOCUS_LEFT_SIDEBAR_ID).def;
		expect(leftAction).toBeDefined();
		expect(leftAction?.kind).toBe('action');
		expect(leftAction?.axis).toBe('function');
		expect(leftAction?.labelKey).toBe('sasi.workspace.focus_left_sidebar');
		expect(leftAction?.icon).toBe('lucide-panel-left');

		const rightAction = registry.resolve(WORKSPACE_FOCUS_RIGHT_SIDEBAR_ID).def;
		expect(rightAction).toBeDefined();
		expect(rightAction?.kind).toBe('action');
		expect(rightAction?.labelKey).toBe('sasi.workspace.focus_right_sidebar');
		expect(rightAction?.icon).toBe('lucide-panel-right');

		const mainAction = registry.resolve(WORKSPACE_FOCUS_MAIN_AREA_ID).def;
		expect(mainAction).toBeDefined();
		expect(mainAction?.kind).toBe('action');
		expect(mainAction?.labelKey).toBe('sasi.workspace.focus_main_area');
		expect(mainAction?.icon).toBe('lucide-layout-grid');
	});

	it('creates command descriptors for all 3 focus targets', () => {
		const invoked: WorkspaceFocusTarget[] = [];
		const runner = {
			runFocusWorkspaceSurface(target: WorkspaceFocusTarget): boolean {
				invoked.push(target);
				return true;
			},
		};

		const t = (key: string) => `trans:${key}`;
		const descriptors = createWorkspaceFocusCommandDescriptors(t, runner);

		expect(descriptors).toHaveLength(3);
		expect(descriptors.map((d) => d.id)).toEqual([
			WORKSPACE_FOCUS_LEFT_SIDEBAR_ID,
			WORKSPACE_FOCUS_RIGHT_SIDEBAR_ID,
			WORKSPACE_FOCUS_MAIN_AREA_ID,
		]);
		expect(descriptors[0].name).toBe('trans:sasi.workspace.focus_left_sidebar');
		expect(descriptors[1].name).toBe('trans:sasi.workspace.focus_right_sidebar');
		expect(descriptors[2].name).toBe('trans:sasi.workspace.focus_main_area');

		// Execute handlers
		descriptors[0].handler(false);
		descriptors[1].handler(false);
		descriptors[2].handler(false);

		expect(invoked).toEqual(['leftSidebar', 'rightSidebar', 'mainArea']);
	});

	describe('findActiveLeafInSplit', () => {
		it('returns null for null, undefined, or empty splits', () => {
			expect(findActiveLeafInSplit(null)).toBeNull();
			expect(findActiveLeafInSplit(undefined)).toBeNull();
			expect(findActiveLeafInSplit({})).toBeNull();
			expect(findActiveLeafInSplit({ children: [] })).toBeNull();
		});

		it('returns the leaf directly if the object has getViewState or view', () => {
			const mockLeaf = {
				view: { getViewType: () => 'markdown' },
				getViewState: () => ({ type: 'markdown' }),
			};
			expect(findActiveLeafInSplit(mockLeaf)).toBe(mockLeaf);
		});

		it('resolves active leaf via currentTab in a WorkspaceTabs structure', () => {
			const leaf0 = { view: { getViewType: () => 'file-explorer' } };
			const leaf1 = { view: { getViewType: () => 'search' } };
			const tabs = {
				currentTab: 1,
				children: [leaf0, leaf1],
			};
			expect(findActiveLeafInSplit(tabs)).toBe(leaf1);
		});

		it('traverses nested splits to find the active leaf', () => {
			const leafMain0 = { view: { getViewType: () => 'markdown' } };
			const leafMain1 = { view: { getViewType: () => 'canvas' } };
			const tabsRight = {
				currentTab: 0,
				children: [leafMain1],
			};
			const tabsLeft = {
				currentTab: 0,
				children: [leafMain0],
			};
			const rootSplit = {
				children: [tabsLeft, tabsRight],
			};
			expect(findActiveLeafInSplit(rootSplit)).toBe(leafMain0);
		});
	});
});
