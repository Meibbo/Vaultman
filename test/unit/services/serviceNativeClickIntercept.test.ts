// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { attachNativeClickInterceptor } from '../../../src/services/serviceNativeClickIntercept';

let teardown: (() => void) | null = null;
let enabledFlag = true;

beforeEach(() => {
	enabledFlag = true;
	teardown = attachNativeClickInterceptor({
		activeDocument: document,
		enabled: () => enabledFlag,
	});
});

afterEach(() => {
	teardown?.();
	teardown = null;
	document.body.innerHTML = '';
});

function captureNextAlias(): Promise<string> {
	return new Promise((resolve) => {
		document.addEventListener(
			'vm:open-node-note',
			(e: Event) => {
				resolve((e as CustomEvent<{ alias: string }>).detail.alias);
			},
			{ once: true },
		);
	});
}

describe('attachNativeClickInterceptor', () => {
	it('dispatches alias #tag on Ctrl+Click on .cm-hashtag', async () => {
		const tag = document.createElement('span');
		tag.classList.add('cm-hashtag');
		tag.textContent = '#projects';
		document.body.appendChild(tag);
		const pending = captureNextAlias();
		tag.dispatchEvent(new MouseEvent('click', { ctrlKey: true, bubbles: true }));
		await expect(pending).resolves.toBe('#projects');
	});

	it('dispatches alias $name on Ctrl+Click on [data-snippet-name]', async () => {
		const row = document.createElement('div');
		row.setAttribute('data-snippet-name', 'mytheme.css');
		document.body.appendChild(row);
		const pending = captureNextAlias();
		row.dispatchEvent(new MouseEvent('click', { ctrlKey: true, bubbles: true }));
		await expect(pending).resolves.toBe('$mytheme');
	});

	it('dispatches alias %id on Ctrl+Click on [data-plugin-id]', async () => {
		const row = document.createElement('div');
		row.setAttribute('data-plugin-id', 'vaultman');
		document.body.appendChild(row);
		const pending = captureNextAlias();
		row.dispatchEvent(new MouseEvent('click', { ctrlKey: true, bubbles: true }));
		await expect(pending).resolves.toBe('%vaultman');
	});

	it('does nothing when enabled() is false', async () => {
		enabledFlag = false;
		const tag = document.createElement('span');
		tag.classList.add('cm-hashtag');
		tag.textContent = '#x';
		document.body.appendChild(tag);
		let received: string | null = null;
		document.addEventListener('vm:open-node-note', (e: Event) => {
			received = (e as CustomEvent<{ alias: string }>).detail.alias;
		}, { once: true });
		tag.dispatchEvent(new MouseEvent('click', { ctrlKey: true, bubbles: true }));
		await new Promise((r) => setTimeout(r, 5));
		expect(received).toBeNull();
	});

	it('does nothing without modifier key', async () => {
		const tag = document.createElement('span');
		tag.classList.add('cm-hashtag');
		tag.textContent = '#x';
		document.body.appendChild(tag);
		let received: string | null = null;
		document.addEventListener('vm:open-node-note', (e: Event) => {
			received = (e as CustomEvent<{ alias: string }>).detail.alias;
		}, { once: true });
		tag.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await new Promise((r) => setTimeout(r, 5));
		expect(received).toBeNull();
	});
});
