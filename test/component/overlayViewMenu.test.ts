import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewModePopup from '../../src/components/layout/overlays/overlayViewMenu.svelte';
import type { NodeFieldDefinition } from '../../src/services/serviceNodeFieldVisibility';

describe('ViewModePopup', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;
	const fieldDefinitions: NodeFieldDefinition[] = [
		{ id: 'icon', labelKey: 'viewmode.pill.icon', defaultOn: true, identity: true },
		{ id: 'name', labelKey: 'viewmode.pill.name', defaultOn: true, identity: true },
		{ id: 'path', labelKey: 'viewmode.pill.path', defaultOn: false },
	];

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

	function renderViewModePopup(props: Record<string, unknown> = {}) {
		app = mount(ViewModePopup as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				activeTab: 'props',
				onClose: vi.fn(),
				viewMode: 'tree',
				addMode: false,
				icon: vi.fn(() => ({ update: vi.fn() })),
				...props,
			},
		});
		flushSync();
	}

	it('offers table mode and marks it active when selected', () => {
		renderViewModePopup();

		const tableButton = target.querySelector<HTMLElement>('.vm-squircle[aria-label="Table"]');
		expect(tableButton).not.toBeNull();

		tableButton!.click();
		flushSync();

		expect(tableButton!.classList.contains('is-accent')).toBe(true);
	});

	it('offers cards mode but not dnd mode in the first measured-cards slice', () => {
		renderViewModePopup({ fieldDefinitions, visibleFields: ['icon', 'name'] });

		expect(target.querySelector<HTMLElement>('.vm-squircle[aria-label="Cards"]')).not.toBeNull();
		expect(target.querySelector<HTMLElement>('.vm-squircle[aria-label="Drag & Drop list"]')).toBeNull();
	});

	it('emits normalized field changes instead of storing pills locally', () => {
		const onVisibleFieldsChange = vi.fn();
		renderViewModePopup({
			activeTab: 'files',
			viewMode: 'cards',
			initialViewMode: 'cards',
			fieldDefinitions,
			visibleFields: ['icon', 'name'],
			onVisibleFieldsChange,
		});

		target.querySelectorAll<HTMLButtonElement>('.vm-viewmode-pill')[2].click();
		flushSync();

		expect(onVisibleFieldsChange).toHaveBeenCalledWith(['icon', 'name', 'path']);
	});
});
