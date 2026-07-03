import { describe, it, expect } from 'vitest';
import {
	normalizeIconOverride,
	normalizeIconOverridesDocument,
	EMPTY_AUTO_ICON_OVERRIDE,
	EMPTY_MANUAL_ICON_OVERRIDE,
	type IconOverrideSpec,
	type IconOverridesDocument,
} from '../../../src/logic/logicIconOverride';

describe('logicIconOverride', () => {
	describe('normalizeIconOverride — string forms (v12 icons.jsx:236-257)', () => {
		it('normalizes emoji: prefix to the emoji pack (v12 :239)', () => {
			expect(normalizeIconOverride('emoji:🚀')).toEqual({
				mode: 'manual',
				packId: 'emoji',
				iconId: '🚀',
			});
		});

		it('normalizes adw: shortcut to the adwaita pack form (v12 :240 uses adwaita-v10 local pack)', () => {
			expect(normalizeIconOverride('adw:folder')).toEqual({
				mode: 'manual',
				packId: 'adwaita-v10',
				iconId: 'folder',
			});
		});

		it('normalizes a generic packId:iconId form (v12 :241-243 — no special "pack:" keyword, any colon splits)', () => {
			expect(normalizeIconOverride('lucide:star')).toEqual({
				mode: 'manual',
				packId: 'lucide',
				iconId: 'star',
			});
		});

		it('normalizes an arbitrary packId:iconId form (v12 :241-243 generic colon split)', () => {
			expect(normalizeIconOverride('papirus:tag')).toEqual({
				mode: 'manual',
				packId: 'papirus',
				iconId: 'tag',
			});
		});

		it('normalizes a bare id (no colon) to the lucide pack (v12 :244-245)', () => {
			expect(normalizeIconOverride('star')).toEqual({
				mode: 'manual',
				packId: 'lucide',
				iconId: 'star',
			});
		});

		it('splits only on the first colon (iconId may itself contain colons, v12 :242 /:(.*)/s)', () => {
			expect(normalizeIconOverride('pack:lucide:sub:path')).toEqual({
				mode: 'manual',
				packId: 'pack',
				iconId: 'lucide:sub:path',
			});
		});
	});

	describe('normalizeIconOverride — object form (v12 icons.jsx:247-255)', () => {
		it('normalizes an explicit manual object', () => {
			expect(normalizeIconOverride({ mode: 'manual', packId: 'emoji', iconId: '🔥' })).toEqual({
				mode: 'manual',
				packId: 'emoji',
				iconId: '🔥',
			});
		});

		it('normalizes an explicit auto object', () => {
			expect(normalizeIconOverride({ mode: 'auto', packId: 'lucide', iconId: null })).toEqual({
				mode: 'auto',
				packId: 'lucide',
				iconId: null,
			});
		});

		it('defaults an object with no mode to auto (v12 :248)', () => {
			expect(normalizeIconOverride({ packId: 'lucide', iconId: 'star' })).toEqual({
				mode: 'auto',
				packId: 'lucide',
				iconId: 'star',
			});
		});

		it('accepts pack/icon/name aliases (v12 :252-253)', () => {
			expect(normalizeIconOverride({ mode: 'manual', pack: 'emoji', icon: '🎯' })).toEqual({
				mode: 'manual',
				packId: 'emoji',
				iconId: '🎯',
			});
			expect(normalizeIconOverride({ mode: 'manual', name: 'star' })).toEqual({
				mode: 'manual',
				packId: 'lucide',
				iconId: 'star',
			});
		});

		it('falls back to the empty manual/auto shape for missing packId/iconId (v12 :249-251)', () => {
			expect(normalizeIconOverride({ mode: 'manual' })).toEqual(EMPTY_MANUAL_ICON_OVERRIDE);
			expect(normalizeIconOverride({ mode: 'auto' })).toEqual(EMPTY_AUTO_ICON_OVERRIDE);
		});
	});

	describe('normalizeIconOverride — invalid/empty inputs', () => {
		it('returns null for falsy inputs (v12 :237)', () => {
			expect(normalizeIconOverride(null)).toBeNull();
			expect(normalizeIconOverride(undefined)).toBeNull();
			expect(normalizeIconOverride('')).toBeNull();
		});

		it('returns null for non-string non-object inputs', () => {
			expect(normalizeIconOverride(42 as unknown as string)).toBeNull();
			expect(normalizeIconOverride(true as unknown as string)).toBeNull();
		});

		it('returns null for an empty object with no usable packId/iconId and default mode', () => {
			// Object form with nothing usable still normalizes to a typed empty shape,
			// never null — this documents that only non-object/non-string/falsy inputs
			// short-circuit to null (v12 :237, :256).
			expect(normalizeIconOverride({})).toEqual(EMPTY_AUTO_ICON_OVERRIDE);
		});
	});

	describe('normalizeIconOverridesDocument — PSS-shaped persisted payload', () => {
		it('produces an empty, well-formed document from undefined input', () => {
			const doc = normalizeIconOverridesDocument(undefined);
			expect(doc).toEqual({
				pssVersion: 1,
				storageClass: 'config',
				scope: 'node',
				nodes: {},
				providers: {},
			});
		});

		it('keeps namespaced D6 node keys (file.X/folder.X/tag.X/prop.X) and normalizes their override spec', () => {
			const raw = {
				nodes: {
					'file.notes/todo.md': 'emoji:📝',
					'tag.project': { mode: 'manual', packId: 'lucide', iconId: 'star' },
				},
			};
			const doc = normalizeIconOverridesDocument(raw);
			expect(doc.nodes['file.notes/todo.md']).toEqual({
				mode: 'manual',
				packId: 'emoji',
				iconId: '📝',
			});
			expect(doc.nodes['tag.project']).toEqual({
				mode: 'manual',
				packId: 'lucide',
				iconId: 'star',
			});
		});

		it('drops malformed node entries (non-normalizable override values) rather than throwing', () => {
			const raw = { nodes: { 'file.a': 42, 'file.b': 'valid-id' } };
			const doc = normalizeIconOverridesDocument(raw);
			expect(doc.nodes['file.a']).toBeUndefined();
			expect(doc.nodes['file.b']).toEqual({ mode: 'manual', packId: 'lucide', iconId: 'valid-id' });
		});

		it('drops raw keys that are not D6-namespaced (missing a "kind." prefix)', () => {
			const raw = { nodes: { 'notes/todo.md': 'star', 'file.ok': 'star' } };
			const doc = normalizeIconOverridesDocument(raw);
			expect(doc.nodes['notes/todo.md']).toBeUndefined();
			expect(doc.nodes['file.ok']).toBeDefined();
		});

		it('normalizes per-provider default overrides', () => {
			const raw = { providers: { tags: 'emoji:🏷️', props: null, bogus: 42 } };
			const doc = normalizeIconOverridesDocument(raw);
			expect(doc.providers.tags).toEqual({ mode: 'manual', packId: 'emoji', iconId: '🏷️' });
			expect(doc.providers.props).toBeUndefined();
			expect(doc.providers.bogus).toBeUndefined();
		});

		it('pins the PSS-shaped envelope fields regardless of tampered input', () => {
			const raw = { pssVersion: 99, storageClass: 'session', scope: 'workspace', nodes: {} };
			const doc = normalizeIconOverridesDocument(raw);
			expect(doc.pssVersion).toBe(1);
			expect(doc.storageClass).toBe('config');
			expect(doc.scope).toBe('node');
		});

		it('is resilient to non-object input', () => {
			expect(normalizeIconOverridesDocument(null).nodes).toEqual({});
			expect(normalizeIconOverridesDocument('garbage' as unknown as IconOverridesDocument).nodes).toEqual(
				{},
			);
			expect(normalizeIconOverridesDocument(42 as unknown as IconOverridesDocument).nodes).toEqual({});
		});
	});

	describe('typed shape sanity', () => {
		it('IconOverrideSpec has mode/packId/iconId', () => {
			const spec: IconOverrideSpec = { mode: 'manual', packId: 'lucide', iconId: 'x' };
			expect(spec.mode).toBe('manual');
		});
	});
});
