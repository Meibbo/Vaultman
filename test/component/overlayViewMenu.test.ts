import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewModePopup from '../../src/components/layout/overlays/overlayViewMenu.svelte';
import type { NodeFieldDefinition } from '../../src/services/serviceNodeFieldVisibility';
import { ViewHostService } from '../../src/services/serviceViewHost.svelte';
import { VIEW_HOST_KEY } from '../../src/components/explorer/viewHostContext';
import type { ThemePreset } from '../../src/types/typeThemePreset';
import { withContext } from './_helpers/withContext';

describe('ViewModePopup', () => {
	let target: HTMLDivElement;
	let app: { destroy(): void } | null = null;
	const fieldDefinitions: NodeFieldDefinition[] = [
		{ id: 'icon', labelKey: 'viewmode.pill.icon', defaultOn: true, identity: true },
		{ id: 'name', labelKey: 'viewmode.pill.name', defaultOn: true, identity: true },
		{ id: 'path', labelKey: 'viewmode.pill.path', defaultOn: false },
		{ id: 'media', labelKey: 'viewmode.pill.media', defaultOn: false },
	];

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (app) {
			app.destroy();
			app = null;
		}
		target.remove();
	});

	function makePreset(args: { viewModes: readonly string[]; lock: boolean }): ThemePreset {
		return {
			source: 'built-in',
			id: 'test',
			displayName: 'test',
			useNativeDom: false,
			chrome: { popupBgOpacity: 1, popupBackdropBlur: '0px', popupBgTint: 0 },
			density: { rowHeight: '26px', rowPaddingY: '2px', iconSize: '16px' },
			dock: { visible: true, presentation: 'bar' },
			tabs: { visible: true, presentation: 'top-tabs', kind: 'workspace' },
			toolbar: { buttons: 'core' },
			viewModes: args.viewModes as never,
			nodeElements: {
				icon: true,
				label: true,
				detail: true,
				media: false,
				badges: { ops: true, filters: true, warnings: true, inherited: true, counts: true },
				actions: true,
			},
			lockNodeElementVisibility: args.lock,
		} as ThemePreset;
	}

	function renderViewModePopup(
		props: Record<string, unknown> = {},
		viewHostService?: ViewHostService,
	) {
		const component = ViewModePopup as unknown as Component<Record<string, unknown>>;
		const childProps = {
			activeTab: 'props',
			onClose: vi.fn(),
			viewMode: 'tree',
			addMode: false,
			icon: vi.fn(() => ({ update: vi.fn() })),
			...props,
		};
		if (viewHostService) {
			app = withContext(target, component, childProps, [[VIEW_HOST_KEY, viewHostService]]);
			flushSync();
			return;
		}
		const instance = mount(component, {
			target,
			props: childProps,
		});
		app = { destroy: () => void unmount(instance) };
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

	it('offers cards mode but not deferred map modes in the platform view menu', () => {
		renderViewModePopup({ fieldDefinitions, visibleFields: ['icon', 'name'] });

		expect(target.querySelector<HTMLElement>('.vm-squircle[aria-label="Cards"]')).not.toBeNull();
		expect(target.querySelector<HTMLElement>('.vm-squircle[aria-label="Markmap"]')).toBeNull();
		expect(target.querySelector<HTMLElement>('.vm-squircle[aria-label="Drag & Drop list"]')).toBeNull();
	});

	it('offers list mode after the 0-H list view is wired', () => {
		renderViewModePopup();

		expect(target.querySelector<HTMLElement>('.vm-squircle[aria-label="List"]')).not.toBeNull();
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

	it('shows the media element toggle in the custom element pill control', () => {
		const onVisibleFieldsChange = vi.fn();
		renderViewModePopup({
			activeTab: 'files',
			viewMode: 'cards',
			fieldDefinitions,
			visibleFields: ['icon', 'name'],
			onVisibleFieldsChange,
		});

		const media = target.querySelector<HTMLButtonElement>('[data-node-field="media"]');
		expect(media).not.toBeNull();
		expect(media?.textContent).toBe('Media');

		media!.click();
		flushSync();

		expect(onVisibleFieldsChange).toHaveBeenCalledWith(['icon', 'name', 'media']);
	});

	it('hides granular element toggles while the native preset is active', () => {
		renderViewModePopup({
			activeTab: 'files',
			viewMode: 'cards',
			fieldDefinitions,
			visibleFields: ['icon', 'name'],
			nativePresetActive: true,
		});

		expect(target.querySelector<HTMLButtonElement>('[data-node-field="media"]')).toBeNull();
		expect(target.querySelector<HTMLButtonElement>('.vm-viewmode-pill')).toBeNull();
	});

	it('renders only selectableModes mode buttons from the view host service', () => {
		const svc = new ViewHostService({
			preset: makePreset({ viewModes: ['tree', 'list', 'table', 'grid', 'cards'], lock: false }),
			mountContext: 'panel',
		});

		renderViewModePopup({}, svc);

		const buttons = Array.from(target.querySelectorAll<HTMLButtonElement>('.vm-view-menu-mode'));
		expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
			'Tree',
			'List',
			'Table',
			'Grid',
			'Cards',
		]);
	});

	it('renders only Tree mode under a native-like locked preset', () => {
		const svc = new ViewHostService({
			preset: makePreset({ viewModes: ['tree'], lock: true }),
			mountContext: 'panel',
		});

		renderViewModePopup({}, svc);

		const buttons = target.querySelectorAll<HTMLButtonElement>('.vm-view-menu-mode');
		expect(buttons.length).toBe(1);
		expect(buttons[0].getAttribute('aria-label')).toBe('Tree');
	});

	it('hides btnNodeElementsVisibility submenu when node element visibility is locked', () => {
		const svc = new ViewHostService({
			preset: makePreset({ viewModes: ['tree'], lock: true }),
			mountContext: 'panel',
		});

		renderViewModePopup({}, svc);

		expect(target.querySelector('.vm-node-elements-toggle')).toBeNull();
	});

	it('renders btnNodeElementsVisibility submenu when node element visibility is unlocked', () => {
		const svc = new ViewHostService({
			preset: makePreset({ viewModes: ['tree', 'cards'], lock: false }),
			mountContext: 'panel',
		});

		renderViewModePopup({}, svc);

		expect(target.querySelector('.vm-node-elements-toggle')).not.toBeNull();
	});

	it('renders simple node element toggles plus indented badge sub-kind toggles', () => {
		const svc = new ViewHostService({
			preset: makePreset({ viewModes: ['tree'], lock: false }),
			mountContext: 'panel',
		});

		renderViewModePopup({}, svc);

		const allCheckboxes = target.querySelectorAll(
			'.vm-node-elements-toggle input[type="checkbox"]',
		);
		const indented = target.querySelectorAll(
			'.vm-node-elements-toggle .vm-indent-1 input[type="checkbox"]',
		);
		expect(allCheckboxes.length).toBe(11);
		expect(indented.length).toBe(5);
	});

	it('clicking a simple-kind checkbox toggles the shared mask', () => {
		const svc = new ViewHostService({
			preset: makePreset({ viewModes: ['tree'], lock: false }),
			mountContext: 'panel',
		});
		expect(svc.nodeElementMask.media).toBe(false);

		renderViewModePopup({}, svc);

		const labels = Array.from(target.querySelectorAll('.vm-node-elements-toggle-row'));
		const mediaLabel = labels.find((label) =>
			label.textContent?.toLowerCase().includes('media'),
		);
		const checkbox = mediaLabel?.querySelector<HTMLInputElement>('input[type="checkbox"]');
		expect(checkbox).not.toBeUndefined();
		checkbox!.click();
		flushSync();

		expect(svc.nodeElementMask.media).toBe(true);
	});

	it('clicking reset clears btnNodeElementsVisibility overrides', () => {
		const svc = new ViewHostService({
			preset: makePreset({ viewModes: ['tree'], lock: false }),
			mountContext: 'panel',
		});
		svc.toggleElement('media');
		expect(svc.nodeElementMask.media).toBe(true);

		renderViewModePopup({}, svc);

		const resetBtn = target.querySelector<HTMLButtonElement>('.vm-node-elements-toggle-reset');
		expect(resetBtn).not.toBeNull();
		resetBtn!.click();
		flushSync();

		expect(svc.nodeElementMask.media).toBe(false);
		expect(svc.btnNodeElementsVisibility).toEqual({});
	});
});
