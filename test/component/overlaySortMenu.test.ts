import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import SortPopup from '../../src/components/layout/overlays/overlaySortMenu.svelte';

describe('SortPopup node expansion toggle', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
	});

	function renderSortPopup(
		props: Partial<{
			nodeExpansionSummary: { canToggle: boolean; hasExpandedParents: boolean };
			onToggleNodeExpansion: () => void;
			manualDndEnabled: boolean;
			onManualDndChange: (active: boolean) => void;
			sortTarget: 'top' | 'children';
			onSortTargetChange: (target: 'top' | 'children') => void;
		}> = {},
	) {
		const defaults = {
			onClose: vi.fn(),
			operationScope: 'auto',
			icon: vi.fn(() => ({ update: vi.fn() })),
		};
		app = mount(SortPopup as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				activeTab: 'props',
				sortBy: 'name',
				sortDir: 'asc',
				...defaults,
				...props,
			},
		});
		flushSync();
		return {
			onToggleNodeExpansion: props.onToggleNodeExpansion,
		};
	}

	it('shows expand-all when no parent nodes are expanded', () => {
		renderSortPopup({
			nodeExpansionSummary: { canToggle: true, hasExpandedParents: false },
			onToggleNodeExpansion: vi.fn(),
		});

		const button = target.querySelector('[data-vm-sort-node-expansion]') as HTMLElement;
		expect(button).not.toBeNull();
		expect(button.getAttribute('aria-label')).toBe('Expand all');
	});

	it('shows collapse-all and calls the generic expansion callback when parents are expanded', () => {
		const onToggleNodeExpansion = vi.fn();
		renderSortPopup({
			nodeExpansionSummary: { canToggle: true, hasExpandedParents: true },
			onToggleNodeExpansion,
		});

		const button = target.querySelector('[data-vm-sort-node-expansion]') as HTMLElement;
		expect(button.getAttribute('aria-label')).toBe('Collapse all');

		button.click();

		expect(onToggleNodeExpansion).toHaveBeenCalledOnce();
		expect(target.querySelector('.vm-squircle.is-accent')?.getAttribute('aria-label')).toContain(
			'Name',
		);
	});

	it('hides the node expansion button when the current explorer has no parent nodes', () => {
		renderSortPopup({
			nodeExpansionSummary: { canToggle: false, hasExpandedParents: false },
			onToggleNodeExpansion: vi.fn(),
		});

		expect(target.querySelector('[data-vm-sort-node-expansion]')).toBeNull();
	});

	it('does not expose an all-vault operation scope option', () => {
		renderSortPopup();

		const optionValues = [...target.querySelectorAll('option')].map((option) =>
			option.getAttribute('value'),
		);
		expect(optionValues).toEqual(['auto', 'filtered', 'selected']);
	});

	it('toggles manual drag mode from the sort controls', () => {
		const onManualDndChange = vi.fn();
		renderSortPopup({ manualDndEnabled: false, onManualDndChange });

		const toggle = target.querySelector<HTMLButtonElement>('[data-vm-sort-manual-dnd]');
		expect(toggle).toBeTruthy();
		expect(toggle?.getAttribute('aria-pressed')).toBe('false');

		toggle?.click();
		flushSync();

		expect(onManualDndChange).toHaveBeenCalledWith(true);
		expect(toggle?.getAttribute('aria-pressed')).toBe('true');
		expect(toggle?.textContent).toContain('DnD');
	});

	it('toggles sort target between top-level categories and children', () => {
		const onSortTargetChange = vi.fn();
		renderSortPopup({ sortTarget: 'top', onSortTargetChange });

		const toggle = target.querySelector<HTMLElement>('[data-vm-sort-target]');
		expect(toggle).toBeTruthy();
		expect(toggle?.getAttribute('aria-pressed')).toBe('false');

		toggle?.click();
		flushSync();

		expect(onSortTargetChange).toHaveBeenCalledWith('children');
		expect(toggle?.getAttribute('aria-pressed')).toBe('true');
	});
});
