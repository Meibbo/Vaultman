import { describe, expect, it } from 'vitest';

import propsExplorerSource from '../../src/components/containers/explorerProps.ts?raw';

/**
 * U121-034 — Inline renaming an `empty` node_value used to discard what was
 * typed: the empty value was projected as the translated word (label text, so
 * the editor started seeded with it and the seed changed with the language),
 * and the tree's `onRename` only had a branch for property nodes, silently
 * dropping value-node commits. These source contracts pin the fixed behavior:
 * placeholder, not label; empty editor seed; a value-node write path; and a
 * guard that fails loudly instead of discarding.
 */
describe('U121-034 empty value inline rename', () => {
	it('routes value-node renames through the queueable vault write path', () => {
		const onRenameBlock = propsExplorerSource.match(
			/onRename: \(id: string, newLabel: string\) => \{[\s\S]*?\n\t\t\t\},/,
		);
		expect(onRenameBlock?.[0]).toContain('node.meta.isValueNode');
		expect(onRenameBlock?.[0]).toContain('_replaceValueInVault(');
		expect(onRenameBlock?.[0]).toContain('_renamePropQueued(');
	});

	it('projects the empty value as a placeholder attribute, not as label text', () => {
		expect(propsExplorerSource).toMatch(
			/if \(\(node\.meta\.rawValue \?\? ''\) === ''\) \{[\s\S]*?data-placeholder/,
		);
	});

	it('starts the empty-value inline editor with an empty raw seed', () => {
		expect(propsExplorerSource).toMatch(
			/if \(\(node\.meta\.rawValue \?\? ''\) === ''\) \{[\s\S]*?renderEditableText\(label, \{[\s\S]*?raw: '',/,
		);
	});

	it('guards onRename against silently discarding an unknown node branch', () => {
		expect(propsExplorerSource).toContain(
			'props inline rename: no write path for node',
		);
	});
});
