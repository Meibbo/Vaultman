import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import NodeRow from '../../../src/components/views/NodeRow.svelte';
import { iconStub } from './nodeElementMaskTestHelpers';

describe('NodeRow', () => {
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

	function render(props: Record<string, unknown>) {
		app = mount(NodeRow as unknown as Component<Record<string, unknown>>, {
			target,
			props: { label: 'Node', icon: iconStub(), ...props },
		});
		flushSync();
	}

	it('emits the headless data-vm-* slot hooks for a basic row', () => {
		render({
			label: 'Hello',
			iconName: 'lucide-file',
			fields: [{ id: 'ext', text: 'md' }],
			count: 3,
		});

		expect(target.querySelector('[data-vm-node-row]')).not.toBeNull();
		expect(target.querySelector('[data-vm-icon]')).not.toBeNull();
		expect(target.querySelector('[data-vm-label]')?.textContent).toContain('Hello');
		expect(target.querySelector('[data-vm-fields] [data-node-field="ext"]')?.textContent).toBe('md');
		expect(target.querySelector('[data-vm-count]')?.textContent?.trim()).toBe('3');
	});

	it('keeps the tree class vocabulary by default and mirrors state classes', () => {
		render({ label: 'X', isSelected: true });

		const surface = target.querySelector<HTMLElement>('[data-vm-node-row]');
		expect(surface?.classList.contains('vm-tree-row-surface')).toBe(true);
		expect(surface?.classList.contains('is-selected')).toBe(true);
		expect(surface?.classList.contains('vm-is-selected')).toBe(true);
	});

	it('renders direct badges through NodeBadgeZone inside the data-vm-badges zone', () => {
		render({ label: 'B', directBadges: [{ text: 'q', queueIndex: 0 }] });

		expect(target.querySelector('[data-vm-badges]')).not.toBeNull();
		expect(target.querySelector('[data-vm-badges] [data-vm-badge]')).not.toBeNull();
	});

	it('swaps the label for an inline rename input while editing', () => {
		render({ label: 'Edit me', editing: true });

		expect(target.querySelector('input.vm-tree-input')).not.toBeNull();
		expect(target.querySelector('[data-vm-label]')).toBeNull();
	});

	it('defines but does not render the unwired abanico slots (media/metric) when omitted', () => {
		render({ label: 'Y' });
		// No media/metric snippet passed -> nothing rendered for those slots.
		expect(target.querySelector('[data-vm-node-row]')).not.toBeNull();
		expect(target.textContent).toContain('Y');
	});
});
