import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { attachNativeClickInterceptor } from '../../src/services/serviceNativeClickIntercept';

describe('nativeClickInterceptor component gate', () => {
	let teardown: (() => void) | null = null;

	beforeEach(() => {
		teardown = attachNativeClickInterceptor({
			activeDocument: document,
			enabled: () => true,
		});
	});

	afterEach(() => {
		teardown?.();
		teardown = null;
		document.body.innerHTML = '';
	});

	function captureAlias(): Promise<string> {
		return new Promise((resolve) => {
			document.addEventListener(
				'vm:open-node-note',
				(event) => resolve((event as CustomEvent<{ alias: string }>).detail.alias),
				{ once: true },
			);
		});
	}

	it('routes Ctrl+Click on native hashtag surfaces to the node-note event', async () => {
		const tag = document.createElement('span');
		tag.classList.add('cm-hashtag');
		tag.textContent = '#projects';
		document.body.appendChild(tag);

		const pending = captureAlias();
		tag.dispatchEvent(new MouseEvent('click', { ctrlKey: true, bubbles: true }));

		await expect(pending).resolves.toBe('#projects');
	});
});
