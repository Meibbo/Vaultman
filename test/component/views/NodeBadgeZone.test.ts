import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import NodeBadgeZone from '../../../src/components/views/NodeBadgeZone.svelte';
import type { NodeBadge } from '../../../src/types/typeNode';
import { iconStub } from './nodeElementMaskTestHelpers';

describe('NodeBadgeZone', () => {
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
		app = mount(NodeBadgeZone as unknown as Component<Record<string, unknown>>, {
			target,
			props: { icon: iconStub(), onPress: vi.fn(), onKeydown: vi.fn(), ...props },
		});
		flushSync();
	}

	it('renders one data-vm-badge atom per badge with the vm-badge vocabulary', () => {
		render({
			badges: [
				{ text: 'A', solid: true, color: 'red', queueIndex: 0 },
				{ text: 'B' },
			] as NodeBadge[],
		});

		const atoms = target.querySelectorAll('[data-vm-badge]');
		expect(atoms.length).toBe(2);
		expect(atoms[0].classList.contains('vm-badge')).toBe(true);
		expect(atoms[0].classList.contains('is-solid')).toBe(true);
		expect(atoms[0].classList.contains('vm-badge--red')).toBe(true);
		expect(atoms[0].classList.contains('is-undoable')).toBe(true);
		expect(atoms[1].classList.contains('is-solid')).toBe(false);
	});

	it('annotates inherited clusters with is-inherited', () => {
		render({ badges: [{ text: 'C', isInherited: true }] as NodeBadge[], inherited: true });
		expect(target.querySelector('[data-vm-badge]')?.classList.contains('is-inherited')).toBe(true);
	});

	it('invokes onPress when an actionable badge is activated', () => {
		const onPress = vi.fn();
		render({ badges: [{ text: 'Q', queueIndex: 2 }] as NodeBadge[], onPress });
		target.querySelector<HTMLElement>('[data-vm-badge]')?.click();
		expect(onPress).toHaveBeenCalledTimes(1);
	});
});
