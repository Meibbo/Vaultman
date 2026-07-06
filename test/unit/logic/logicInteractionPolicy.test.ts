import { describe, expect, it } from 'vitest';
import {
	normalizeTagReference,
	resolveInteractionPolicy,
} from '../../../src/logic/logicInteractionPolicy';

describe('logicInteractionPolicy', () => {
	it('resolves panel drops without owning adapter-specific behavior', () => {
		const result = resolveInteractionPolicy(
			{
				kind: 'nodes',
				sourcePanelId: 'panel:files',
				providerId: 'files',
				nodeIds: ['file:daily'],
			},
			{
				kind: 'panel',
				panelId: 'panel:tags',
				panelKind: 'panelExplorer',
				providerId: 'tags',
			},
		);

		expect(result).toMatchObject({
			kind: 'panel-drop',
			sourcePanelId: 'panel:files',
			targetPanelId: 'panel:tags',
		});
	});

	it('resolves tag node drops to editor tag insertion', () => {
		const result = resolveInteractionPolicy(
			{
				kind: 'nodes',
				sourcePanelId: 'panel:tags',
				providerId: 'tags',
				nodeKind: 'tag',
				nodeIds: ['project/vaultman'],
				label: '#project/vaultman',
			},
			{ kind: 'editor-caret', filePath: 'Daily.md', position: { line: 4, ch: 8 } },
		);

		expect(result).toMatchObject({
			kind: 'editor-insert-tag',
			sourcePanelId: 'panel:tags',
			tag: '#project/vaultman',
			nodeIds: ['project/vaultman'],
		});
	});

	it('rejects empty payloads and unsupported editor payloads', () => {
		expect(
			resolveInteractionPolicy(
				{ kind: 'empty', sourcePanelId: 'panel:files' },
				{ kind: 'panel', panelId: 'panel:tags', panelKind: 'panelExplorer' },
			),
		).toMatchObject({ kind: 'reject', reason: 'empty-payload' });

		expect(
			resolveInteractionPolicy(
				{
					kind: 'nodes',
					sourcePanelId: 'panel:files',
					providerId: 'files',
					nodeIds: ['file:one'],
				},
				{ kind: 'editor-caret' },
			),
		).toMatchObject({ kind: 'reject', reason: 'unsupported-payload' });
	});

	it('normalizes tag references', () => {
		expect(normalizeTagReference(' #project/vaultman ')).toBe('#project/vaultman');
		expect(normalizeTagReference('')).toBeNull();
	});
});
