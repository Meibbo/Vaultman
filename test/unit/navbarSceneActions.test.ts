import { describe, expect, it, vi } from 'vitest';

import { createScenePanelWidgetActionPort } from '../../src/logic/logicNavbarSceneActions';

describe('Scene-local WASA seam for the Navbar panelWidget', () => {
	it('routes an ActionNode reference to a scene handler with its origin and payload', async () => {
		const reveal = vi.fn();
		const port = createScenePanelWidgetActionPort({
			'files.reveal-active': reveal,
		});

		const handled = await port.invoke({
			actionId: 'files.reveal-active',
			origin: 'keyboard',
			payload: { path: 'Notes/Active.md' },
		});

		expect(handled).toBe(true);
		expect(reveal).toHaveBeenCalledWith({
			actionId: 'files.reveal-active',
			origin: 'keyboard',
			payload: { path: 'Notes/Active.md' },
		});
	});

	it('reports an unsupported reference without inventing provider discovery', async () => {
		const port = createScenePanelWidgetActionPort({});

		await expect(
			port.invoke({
				actionId: 'future-provider.action',
				origin: 'pointer',
			}),
		).resolves.toBe(false);
	});
});
