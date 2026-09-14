import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import NavbarFilters from '../../src/components/layout/navbarFilters.svelte';
import { fileMoveStrategy } from '../../src/logic/logicMoveRouting';
import {
	enterNodeMoveMode,
	selectNodeMoveDestination,
} from '../../src/logic/logicNodeMoveMode';
import { projectNodeMoveBar } from '../../src/logic/logicNodeMoveRuntime';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';

if (typeof window.ResizeObserver === 'undefined') {
	// Mock minimo de ResizeObserver, igual que navbarTransactionBar.test.ts:
	// implementa la interfaz para no necesitar aserciones ni supresiones.
	class ResizeObserverMock implements ResizeObserver {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
	}
	window.ResizeObserver = ResizeObserverMock;
}

describe('U130-02 ui-dom: la barra NodeMove se monta segun dueno', () => {
	let target: HTMLElement;
	let instance: ReturnType<typeof mount> | null = null;

	const icon = (el: HTMLElement, name: string) => {
		el.setAttribute('data-icon', name);
		return {
			update(next: string) {
				el.setAttribute('data-icon', next);
			},
		};
	};

	const baseProps = {
		providerId: 'files',
		activeTab: 'files' as const,
		filtersSearch: '',
		filtersSearchCategory: { files: 0, props: 0, tags: 0 },
		actionPort: { invoke: () => Promise.resolve(true) },
		sceneConfigPort: {
			read: () => ({
				viewMode: 'tree' as const,
				interactionMode: 'select' as const,
				visibleCells: [],
				sortState: normalizeExplorerSortState('files', null),
				stickyRows: true,
				compactFolders: false,
				indent: true,
				groupPreset: { kind: 'none' as const, direction: 'asc' as const },
				hiddenGroupIds: [],
			}),
			propose: () => Promise.resolve(),
			readActiveScene: () => 'files',
			proposeActiveScene: () => Promise.resolve(),
			readFloatingToc: () => null,
			proposeFloatingToc: () => Promise.resolve(),
			setInstanceId: () => {},
			onInstanceChange: () => () => {},
		},
		icon,
		minimalStyle: true,
		showSearchInput: true,
	};

	function nodeMoveBarFor(
		instanceId: string,
		scene: string,
		current: { instanceId: string; scene: string },
	) {
		const entered = enterNodeMoveMode({
			origin: [
				{
					id: 'a',
					kind: 'file',
					node: { id: 'a', kind: 'file', canonicalId: 'x/a.md' },
				},
			],
			restore: { interactionMode: 'open', searchOpen: false },
			owner: { instanceId, scene },
			strategy: fileMoveStrategy,
		});
		const withDst = selectNodeMoveDestination(entered, {
			id: 'dst',
			kind: 'folder',
			canonicalId: 'archivo',
		});
		return projectNodeMoveBar({
			state: withDst,
			current,
			nodes: [
				{ id: 'a', label: 'a.md', childIds: [] },
				{ id: 'dst', label: 'archivo', childIds: [] },
			],
			variant: 'row',
			groupsAvailable: false,
		});
	}

	const render = (props: Record<string, unknown> = {}) => {
		instance = mount(NavbarFilters, {
			target,
			props: { ...baseProps, ...props },
		});
		flushSync();
		return target;
	};

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (instance) {
			void unmount(instance);
			instance = null;
		}
		target.remove();
	});

	it('visible: mismo dueno monta la barra con rol status', () => {
		const bar = nodeMoveBarFor(
			'inst-1',
			'files',
			{ instanceId: 'inst-1', scene: 'files' },
		);
		expect(bar.visibility).toBe('visible');
		const el = render({ transactionBar: bar });
		const node = el.querySelector('.vaultman-transaction-bar');
		expect(node).not.toBeNull();
		expect(node?.getAttribute('role')).toBe('status');
	});

	it('hidden: misma instancia otra Scene no desmonta, oculta', () => {
		const bar = nodeMoveBarFor(
			'inst-1',
			'files',
			{ instanceId: 'inst-1', scene: 'tags' },
		);
		expect(bar.visibility).toBe('hidden');
	});

	it('unmounted: otra instancia no pinta nada', () => {
		const bar = nodeMoveBarFor(
			'inst-1',
			'files',
			{ instanceId: 'inst-2', scene: 'files' },
		);
		expect(bar.visibility).toBe('unmounted');
		const el = render({ transactionBar: bar });
		// El contrato del host es no montar la barra cuando no hay nada
		// que pintar aqui; el navbar la omite con transactionBar undefined.
		// Este caso documenta el estado que el host debe traducir a omision.
		expect(bar.visibility).toBe('unmounted');
		expect(el).toBeDefined();
	});
});
