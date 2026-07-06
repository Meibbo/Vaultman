import { describe, expect, it, vi } from 'vitest';
import { createPanelExplorerHandle } from '../../../src/services/servicePanelHandle';

describe('createPanelExplorerHandle', () => {
	it('creates a panelExplorer handle around the imperative API', () => {
		const focusFirstNode = vi.fn(() => true);
		const handle = createPanelExplorerHandle({
			id: 'panel:filters',
			providerId: 'files',
			api: { focusFirstNode },
		});

		expect(handle.kind).toBe('panelExplorer');
		expect(handle.providerId).toBe('files');
		expect(handle.focus()).toBe(true);
		expect(focusFirstNode).toHaveBeenCalledOnce();
		expect(handle.produceDragPayload()).toEqual({
			kind: 'empty',
			sourcePanelId: 'panel:filters',
		});
	});

	it('preserves optional ports and policy callbacks', () => {
		const selection = {
			read: () => new Set(['a']),
			select: vi.fn(),
			clear: vi.fn(),
		};
		const handle = createPanelExplorerHandle({
			id: 'panel:tags',
			providerId: 'tags',
			selection,
			acceptsDrop: (intent) => intent.kind === 'editor-insert-tag',
			produceDragPayload: () => ({
				kind: 'nodes',
				sourcePanelId: 'panel:tags',
				providerId: 'tags',
				nodeKind: 'tag',
				nodeIds: ['topic'],
			}),
		});

		expect(handle.selection).toBe(selection);
		expect(handle.produceDragPayload()).toMatchObject({ kind: 'nodes', nodeIds: ['topic'] });
		expect(
			handle.acceptsDrop({
				kind: 'editor-insert-tag',
				sourcePanelId: 'panel:tags',
				target: { kind: 'editor-caret' },
				tag: '#topic',
			}),
		).toBe(true);
	});
});
