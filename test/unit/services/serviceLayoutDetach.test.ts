import { describe, expect, it } from 'vitest';
import { resolveLayoutDropAction } from '../../../src/services/serviceLayout';

describe('serviceLayout detachable drop actions', () => {
	it('resolves a Vaultman tab dropped from the dock to the workspace as detach-tab', () => {
		expect(
			resolveLayoutDropAction({
				source: { kind: 'vaultman-tab', tabId: 'explorer-files', surface: 'dock' },
				target: { kind: 'workspace' },
			}),
		).toMatchObject({
			ok: true,
			operation: 'detach-tab',
			tabId: 'explorer-files',
			from: 'dock',
			to: 'workspace',
		});
	});

	it('resolves a Vaultman tab dropped from the workspace to the dock as attach-tab', () => {
		expect(
			resolveLayoutDropAction({
				source: { kind: 'vaultman-tab', tabId: 'explorer-files', surface: 'workspace' },
				target: { kind: 'dock' },
			}),
		).toMatchObject({
			ok: true,
			operation: 'attach-tab',
			tabId: 'explorer-files',
			from: 'workspace',
			to: 'dock',
		});
	});

	it('resolves same-surface Vaultman tab drops as reorder', () => {
		expect(
			resolveLayoutDropAction({
				source: { kind: 'vaultman-tab', tabId: 'explorer-tags', surface: 'dock' },
				target: { kind: 'dock' },
			}),
		).toMatchObject({
			ok: true,
			operation: 'reorder',
			tabId: 'explorer-tags',
			from: 'dock',
			to: 'dock',
		});
	});

	it('rejects arbitrary workspace tabs until a stable adapter exists', () => {
		expect(
			resolveLayoutDropAction({
				source: { kind: 'workspace-tab', viewType: 'markdown', surface: 'workspace' },
				target: { kind: 'dock' },
			}),
		).toEqual({
			ok: false,
			reason: 'unsupported-source',
		});
	});
});
