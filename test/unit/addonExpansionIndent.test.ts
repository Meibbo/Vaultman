import { describe, expect, it } from 'vitest';
import { PluginsExplorerPanel } from '../../src/components/containers/explorerPlugins';
import { SnippetsExplorerPanel } from '../../src/components/containers/explorerSnippets';

type PanelCtor =
	| typeof PluginsExplorerPanel
	| typeof SnippetsExplorerPanel;

interface AddonHarness extends Record<string, unknown> {
	groupPreset: { kind: string; direction: string };
	_groupIds: Set<string>;
	_seenGroupHeaderIds: Set<string>;
	_expandedGroupIds: Set<string>;
	nodes: unknown[];
	visibleCells: Set<string>;
	interactionMode: string;
	selectedNodeIds: Set<string>;
	pendingToggleIds: Set<string>;
	hiddenGroupIds: Set<string>;
	groupMemberships: Record<string, string[]>;
	sortState: { filtered: boolean };
	cellStyle: string;
	plugin: Record<string, unknown>;
	containerEl: Record<string, unknown>;
	treeView: { opts: Record<string, unknown> | null } | null;
	projectedNodes: () => Record<string, unknown>[];
	setIndentEnabled: (enabled: boolean) => void;
	expandAll: () => void;
	collapseAll: () => void;
	hasExpandedNodes: () => boolean;
	setExpansionChangeHandler: (handler?: () => void) => void;
	render: () => void;
}

function makeHarness(Ctor: PanelCtor): AddonHarness {
	const base: Record<string, unknown> = {};
	Object.setPrototypeOf(base, Ctor.prototype);
	const harness = base as unknown as AddonHarness;
	harness.groupPreset = { kind: 'custom', direction: 'asc' };
	harness._groupIds = new Set(['g1', 'g2']);
	harness._seenGroupHeaderIds = new Set(['g1', 'g2']);
	harness._expandedGroupIds = new Set<string>();
	harness.nodes = [];
	harness.visibleCells = new Set(['checkbox', 'icon', 'text', 'state']);
	harness.interactionMode = 'open';
	harness.selectedNodeIds = new Set();
	harness.pendingToggleIds = new Set();
	harness.hiddenGroupIds = new Set();
	harness.groupMemberships = {};
	harness.sortState = { filtered: false };
	harness.cellStyle = 'toggle';
	harness.plugin = {
		settings: {},
		queueService: { queue: [] },
	};
	harness.containerEl = {
		createDiv: () => ({ remove: () => {} }),
		isShown: () => true,
	};
	const treeView = {
		opts: null as Record<string, unknown> | null,
		render(opts: Record<string, unknown>) {
			this.opts = opts;
		},
	};
	harness.treeView = treeView;
	harness.projectedNodes = () => [
		{
			id: 'g1',
			label: 'g1',
			depth: 0,
			children: [
				{ id: 'a', label: 'a' },
				{ id: 'b', label: 'b' },
			],
		},
		{
			id: 'g2',
			label: 'g2',
			depth: 0,
			children: [{ id: 'c', label: 'c' }],
		},
	];
	return harness;
}

const PANELS: Array<[string, PanelCtor]> = [
	['plugins', PluginsExplorerPanel],
	['snippets', SnippetsExplorerPanel],
];

describe.each(PANELS)('A07 — %s: paridad de indent con files/props/tags', (_name, Ctor) => {
	it('expone setIndentEnabled y lo pasa al tree como `indent`', () => {
		const panel = makeHarness(Ctor);
		expect(typeof panel.setIndentEnabled).toBe('function');
		panel.render();
		expect(panel.treeView?.opts?.['indent']).toBe(true);
		panel.setIndentEnabled(false);
		expect(panel.treeView?.opts?.['indent']).toBe(false);
	});
});

describe.each(PANELS)('A07 — %s: paridad del toggle expand/collapse', (_name, Ctor) => {
	it('expone hasExpandedNodes / expandAll / collapseAll sobre cabeceras de grupo', () => {
		const panel = makeHarness(Ctor);
		expect(typeof panel.hasExpandedNodes).toBe('function');
		expect(typeof panel.expandAll).toBe('function');
		expect(typeof panel.collapseAll).toBe('function');
		expect(panel.hasExpandedNodes()).toBe(false);
		panel.expandAll();
		expect(panel.hasExpandedNodes()).toBe(true);
		expect([...panel._expandedGroupIds].sort()).toEqual(['g1', 'g2']);
		panel.collapseAll();
		expect(panel.hasExpandedNodes()).toBe(false);
		expect(panel._expandedGroupIds.size).toBe(0);
	});

	it('notifica al togglear una cabecera y en expand/collapse-all', () => {
		const panel = makeHarness(Ctor);
		const seen: number[] = [];
		panel.setExpansionChangeHandler(() => {
			seen.push(1);
		});
		panel.render();
		const onToggle = panel.treeView?.opts?.['onToggle'] as
			| ((id: string) => void)
			| undefined;
		expect(typeof onToggle).toBe('function');
		onToggle?.('g1');
		expect(panel._expandedGroupIds.has('g1')).toBe(true);
		const afterToggle = seen.length;
		expect(afterToggle).toBeGreaterThan(0);
		panel.expandAll();
		expect(seen.length).toBeGreaterThan(afterToggle);
		panel.collapseAll();
		expect(seen.length).toBeGreaterThan(afterToggle + 1);
	});

	it('sin grupos activos no hay nada que plegar', () => {
		const panel = makeHarness(Ctor);
		panel.groupPreset = { kind: 'none', direction: 'asc' };
		panel.expandAll();
		expect(panel.hasExpandedNodes()).toBe(false);
		expect(panel._expandedGroupIds.size).toBe(0);
	});
});
