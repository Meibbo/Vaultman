import { describe, it, expect } from 'vitest';
import { IconOverrideStore } from '../../../src/services/serviceIconOverrides';
import { EMPTY_ICON_OVERRIDES_DOCUMENT } from '../../../src/logic/logicIconOverride';

describe('IconOverrideStore', () => {
	it('starts empty and produces the empty PSS-shaped document by default', () => {
		const store = new IconOverrideStore();
		expect(store.toDocument()).toEqual(EMPTY_ICON_OVERRIDES_DOCUMENT);
	});

	it('getForNode returns undefined when no override is set (parity default)', () => {
		const store = new IconOverrideStore();
		expect(store.getForNode('file.notes/todo.md')).toBeUndefined();
	});

	describe('per-node overrides', () => {
		it('setForNode + getForNode round-trips a normalized override', () => {
			const store = new IconOverrideStore();
			store.setForNode('file.notes/todo.md', 'emoji:📝');
			expect(store.getForNode('file.notes/todo.md')).toEqual({
				mode: 'manual',
				packId: 'emoji',
				iconId: '📝',
			});
		});

		it('rejects non-D6-namespaced node keys (no "kind." prefix)', () => {
			const store = new IconOverrideStore();
			expect(() => store.setForNode('notes/todo.md', 'star')).toThrow();
		});

		it('clearForNode removes a previously set override', () => {
			const store = new IconOverrideStore();
			store.setForNode('tag.project', 'star');
			expect(store.getForNode('tag.project')).toBeDefined();
			store.clearForNode('tag.project');
			expect(store.getForNode('tag.project')).toBeUndefined();
		});

		it('setForNode with a falsy override clears it (symmetry with clearForNode)', () => {
			const store = new IconOverrideStore();
			store.setForNode('tag.project', 'star');
			store.setForNode('tag.project', null);
			expect(store.getForNode('tag.project')).toBeUndefined();
		});
	});

	describe('per-provider default overrides', () => {
		it('setForProvider + getForProvider round-trips a normalized override', () => {
			const store = new IconOverrideStore();
			store.setForProvider('tags', 'emoji:🏷️');
			expect(store.getForProvider('tags')).toEqual({
				mode: 'manual',
				packId: 'emoji',
				iconId: '🏷️',
			});
		});

		it('clearForProvider removes a previously set default', () => {
			const store = new IconOverrideStore();
			store.setForProvider('tags', 'star');
			store.clearForProvider('tags');
			expect(store.getForProvider('tags')).toBeUndefined();
		});
	});

	describe('resolve — node override wins over provider default', () => {
		it('returns the node override when both a node and provider override exist', () => {
			const store = new IconOverrideStore();
			store.setForProvider('tags', 'emoji:🏷️');
			store.setForNode('tag.project', 'star');
			expect(store.resolve('tag.project', 'tags')).toEqual({
				mode: 'manual',
				packId: 'lucide',
				iconId: 'star',
			});
		});

		it('falls back to the provider default when no node override is set', () => {
			const store = new IconOverrideStore();
			store.setForProvider('tags', 'emoji:🏷️');
			expect(store.resolve('tag.other', 'tags')).toEqual({
				mode: 'manual',
				packId: 'emoji',
				iconId: '🏷️',
			});
		});

		it('returns undefined when neither is set', () => {
			const store = new IconOverrideStore();
			expect(store.resolve('tag.other', 'tags')).toBeUndefined();
		});
	});

	describe('round-trip persistence: set -> toDocument -> hydrate -> resolve applies', () => {
		it('persists a node override across a serialize/hydrate cycle', () => {
			const store = new IconOverrideStore();
			store.setForNode('file.notes/todo.md', 'emoji:📝');
			store.setForProvider('tags', 'star');

			const persisted = store.toDocument();
			const reloaded = new IconOverrideStore();
			reloaded.hydrate(persisted);

			expect(reloaded.getForNode('file.notes/todo.md')).toEqual({
				mode: 'manual',
				packId: 'emoji',
				iconId: '📝',
			});
			expect(reloaded.getForProvider('tags')).toEqual({
				mode: 'manual',
				packId: 'lucide',
				iconId: 'star',
			});
		});

		it('hydrate discards prior in-memory state (fresh load replaces, not merges)', () => {
			const store = new IconOverrideStore();
			store.setForNode('file.stale', 'star');
			store.hydrate(EMPTY_ICON_OVERRIDES_DOCUMENT);
			expect(store.getForNode('file.stale')).toBeUndefined();
		});

		it('hydrate normalizes/drops malformed entries from an untrusted raw payload', () => {
			const store = new IconOverrideStore();
			store.hydrate({
				nodes: { 'file.ok': 'star', 'not-namespaced': 'star', 'file.bad': 42 },
				providers: { tags: 'star', bogus: 42 },
			});
			expect(store.getForNode('file.ok')).toBeDefined();
			expect(store.getForNode('not-namespaced' as never)).toBeUndefined();
			expect(store.getForProvider('tags')).toBeDefined();
			expect(store.getForProvider('bogus')).toBeUndefined();
		});
	});

	describe('toDocument shape', () => {
		it('emits the PSS envelope fields (config class, node scope)', () => {
			const store = new IconOverrideStore();
			store.setForNode('file.a', 'star');
			const doc = store.toDocument();
			expect(doc.pssVersion).toBe(1);
			expect(doc.storageClass).toBe('config');
			expect(doc.scope).toBe('node');
		});
	});
});
