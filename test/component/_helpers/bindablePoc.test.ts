import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import BindablePocHarness from './BindablePocHarness.svelte';

describe('POC: bind: against runes class get/set pair', () => {
	let target: HTMLElement;
	let instance: ReturnType<typeof mount> | null = null;

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

	it('child write propagates through class setter and rerenders host readback', () => {
		instance = mount(BindablePocHarness, { target });
		flushSync();

		const input = target.querySelector('[data-testid="poc-input"]') as HTMLInputElement;
		input.value = 'updated';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		expect(target.querySelector('[data-testid="poc-readback"]')?.textContent).toBe('updated');
		expect(target.querySelector('[data-testid="host-readback"]')?.textContent).toBe('updated');
	});
});
