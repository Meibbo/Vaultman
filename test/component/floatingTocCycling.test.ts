import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import FloatingToc from '../../src/components/layout/floatingToc.svelte';
import type { IndexGroup } from '../../src/logic/logicIndexGroups';

interface TestNiagaraOptions {
	nodes: boolean;
	plainStyle: boolean;
	position: 'right' | 'left' | 'top' | 'bottom';
	glyphMode: 'letter' | 'name';
	labelMode: 'off' | 'selected' | 'scrub' | 'always';
	reveal: 'selected' | 'near' | 'wide' | 'all';
	glow: boolean;
	nameOrder: 'down' | 'up' | 'flat';
	namePill: boolean;
}

describe('FloatingToc repeated-letter cycling', () => {
	let target: HTMLElement;
	let instance: ReturnType<typeof mount> | null = null;
	const jumped: string[] = [];

	const defaultOpts: TestNiagaraOptions = {
		nodes: false,
		plainStyle: false,
		position: 'right',
		glyphMode: 'letter',
		labelMode: 'off',
		reveal: 'all',
		glow: false,
		nameOrder: 'down',
		namePill: false,
	};

	const sampleGroups: IndexGroup[] = [
		{
			key: 'A',
			label: 'A',
			firstId: 'node-a1',
			firstLabel: 'Alpha 1',
			count: 3,
			memberIds: ['node-a1', 'node-a2', 'node-a3'],
		},
		{
			key: 'B',
			label: 'B',
			firstId: 'node-b1',
			firstLabel: 'Beta 1',
			count: 2,
			memberIds: ['node-b1', 'node-b2'],
		},
	];

	let onToggleKind = vi.fn();
	let onEnterPick = vi.fn();
	let onClose = vi.fn();
	let onBack = vi.fn();

	const render = (props: Record<string, unknown> = {}) => {
		jumped.length = 0;
		onToggleKind = vi.fn();
		onEnterPick = vi.fn();
		onClose = vi.fn();
		onBack = vi.fn();

		instance = mount(FloatingToc, {
			target,
			props: {
				visible: true,
				groups: sampleGroups,
				kind: 'files',
				kindToggle: true,
				drill: true,
				scoped: false,
				pickMode: false,
				niagara: false,
				opts: defaultOpts,
				onJump: (id: string) => jumped.push(id),
				onToggleKind: () => onToggleKind(),
				onEnterPick: () => onEnterPick(),
				onClose: () => onClose(),
				onBack: () => onBack(),
				...props,
			},
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

	it('cycles through all matching group members on repeated discrete clicks and wraps to first', () => {
		render();
		const items = target.querySelectorAll<HTMLButtonElement>(
			'button.vaultman-floating-toc-item',
		);
		expect(items).toHaveLength(2);
		const groupAButton = items[0];

		// 1st click -> first member
		groupAButton.click();
		flushSync();
		expect(jumped).toEqual(['node-a1']);

		// 2nd click -> second member
		groupAButton.click();
		flushSync();
		expect(jumped).toEqual(['node-a1', 'node-a2']);

		// 3rd click -> third member
		groupAButton.click();
		flushSync();
		expect(jumped).toEqual(['node-a1', 'node-a2', 'node-a3']);

		// 4th click -> wraps to first member
		groupAButton.click();
		flushSync();
		expect(jumped).toEqual(['node-a1', 'node-a2', 'node-a3', 'node-a1']);
	});

	it('resets cycling when clicking a different group', () => {
		render();
		const items = target.querySelectorAll<HTMLButtonElement>(
			'button.vaultman-floating-toc-item',
		);
		const groupAButton = items[0];
		const groupBButton = items[1];

		// Click A twice
		groupAButton.click();
		groupAButton.click();
		flushSync();
		expect(jumped).toEqual(['node-a1', 'node-a2']);

		// Click B -> jumps to first member of B
		groupBButton.click();
		flushSync();
		expect(jumped).toEqual(['node-a1', 'node-a2', 'node-b1']);

		// Click A again -> resets and jumps to first member of A
		groupAButton.click();
		flushSync();
		expect(jumped).toEqual(['node-a1', 'node-a2', 'node-b1', 'node-a1']);
	});

	it('resets discrete cycle cursor when an action button is clicked', () => {
		render();
		const items = target.querySelectorAll<HTMLButtonElement>(
			'button.vaultman-floating-toc-item',
		);
		const groupAButton = items[0];

		// Click A twice
		groupAButton.click();
		groupAButton.click();
		flushSync();
		expect(jumped).toEqual(['node-a1', 'node-a2']);

		// Click action (toggle kind)
		const toggleAction = target.querySelector<HTMLButtonElement>(
			'button.vaultman-floating-toc-toggle',
		);
		expect(toggleAction).not.toBeNull();
		toggleAction?.click();
		flushSync();
		expect(onToggleKind).toHaveBeenCalledTimes(1);

		// Click A again -> starts back at first member because action reset scope
		groupAButton.click();
		flushSync();
		expect(jumped).toEqual(['node-a1', 'node-a2', 'node-a1']);
	});

	it('resets discrete cursor when scrubbing enters a group', async () => {
		render({ niagara: true });
		const items = target.querySelectorAll<HTMLButtonElement>(
			'button.vaultman-floating-toc-item',
		);
		const groupAButton = items[0];
		const groupBButton = items[1];

		const glyphs = target.querySelector<HTMLElement>(
			'.vaultman-floating-toc-glyphs',
		);
		expect(glyphs).not.toBeNull();

		vi.spyOn(groupAButton, 'getBoundingClientRect').mockReturnValue({
			top: 0,
			bottom: 30,
			left: 0,
			right: 30,
			width: 30,
			height: 30,
			x: 0,
			y: 0,
			toJSON: () => {},
		});

		vi.spyOn(groupBButton, 'getBoundingClientRect').mockReturnValue({
			top: 30,
			bottom: 60,
			left: 0,
			right: 30,
			width: 30,
			height: 30,
			x: 0,
			y: 30,
			toJSON: () => {},
		});

		// Click Group A twice -> advances cursor to second member ('node-a2')
		groupAButton.click();
		groupAButton.click();
		flushSync();
		expect(jumped).toEqual(['node-a1', 'node-a2']);

		// Scrub pointerdown at y=45 (center of Group B)
		glyphs?.dispatchEvent(
			new MouseEvent('pointerdown', {
				bubbles: true,
				cancelable: true,
				button: 0,
				clientX: 15,
				clientY: 45,
			}),
		);
		flushSync();

		// Scrub into group B jumps to firstId of group B
		expect(jumped).toEqual(['node-a1', 'node-a2', 'node-b1']);

		// End scrub
		window.dispatchEvent(
			new MouseEvent('pointerup', {
				bubbles: true,
				cancelable: true,
			}),
		);
		flushSync();

		// Wait for post-gesture click suppression timer to clear
		await new Promise((resolve) => setTimeout(resolve, 20));

		// Subsequent discrete click on Group A starts at first member ('node-a1')
		groupAButton.click();
		flushSync();
		expect(jumped).toEqual(['node-a1', 'node-a2', 'node-b1', 'node-a1']);
	});
});
