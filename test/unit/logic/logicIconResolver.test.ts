import { describe, it, expect } from 'vitest';
import {
	resolveIcon,
	ICON_ROLES,
	TYPE_ICON_MAP,
	PROTO_POLISH_ROLE_ICONS,
	type IconResolutionInput,
} from '../../../src/logic/logicIconResolver';

describe('logicIconResolver', () => {
	describe('priority chain', () => {
		it('resolves folders first regardless of other fields (folder step)', () => {
			const input: IconResolutionInput = {
				kind: 'file',
				isFolder: true,
				extension: 'md',
				propType: 'text',
			};
			const result = resolveIcon(input);
			expect(result).toEqual({ role: 'folder', source: 'folder', iconId: 'lucide-folder' });
		});

		it('resolves tag role before type/ext (role step)', () => {
			const result = resolveIcon({ kind: 'tag' });
			expect(result).toEqual({ role: 'tag', source: 'role', iconId: 'lucide-tag' });
		});

		it('resolves prop role via type when propType is known (type step)', () => {
			const result = resolveIcon({ kind: 'prop', propType: 'checkbox' });
			expect(result).toEqual({
				role: 'prop',
				source: 'type',
				iconId: TYPE_ICON_MAP.checkbox,
			});
		});

		it('falls back to the generic prop icon when propType is unknown (role step under prop)', () => {
			const result = resolveIcon({ kind: 'prop', propType: 'unknown-type' });
			expect(result).toEqual({ role: 'prop', source: 'role', iconId: 'lucide-tag' });
		});

		it('resolves file nodeType before extension (type step, v12 icons.jsx:202-203)', () => {
			const result = resolveIcon({
				kind: 'file',
				isFolder: false,
				nodeType: 'pdf',
				extension: 'md',
			});
			expect(result).toEqual({ role: 'pdf', source: 'type', iconId: 'lucide-file' });
		});

		it('normalizes nodeType through ext aliases then the type map (json-canvas -> canvas)', () => {
			const result = resolveIcon({ kind: 'file', isFolder: false, nodeType: 'json-canvas' });
			expect(result).toEqual({ role: 'canvas', source: 'type', iconId: 'lucide-file' });
		});

		it('ignores a nodeType outside the type map and falls to ext (v12: markdown type has no NODE_TYPE_ICONS entry)', () => {
			const result = resolveIcon({
				kind: 'file',
				isFolder: false,
				nodeType: 'markdown',
				extension: 'png',
			});
			expect(result).toEqual({ role: 'img', source: 'ext', iconId: 'lucide-image' });
		});

		it('resolves file extension when kind is file and not a folder (ext step)', () => {
			const result = resolveIcon({ kind: 'file', isFolder: false, extension: 'png' });
			expect(result).toEqual({ role: 'img', source: 'ext', iconId: 'lucide-image' });
		});

		it('classifies an unknown extension as the generic file role (ext step, generic)', () => {
			const result = resolveIcon({ kind: 'file', isFolder: false, extension: 'xyz' });
			expect(result).toEqual({ role: 'file', source: 'ext', iconId: 'lucide-file' });
		});

		it('resolves an extensionless file to the file role itself (role step)', () => {
			const result = resolveIcon({ kind: 'file', isFolder: false });
			expect(result).toEqual({ role: 'file', source: 'role', iconId: 'lucide-file' });
		});

		it('resolves content/match roles with parity icon ids (v12 polish ids stay unwired)', () => {
			expect(resolveIcon({ kind: 'content' })).toEqual({
				role: 'content',
				source: 'role',
				iconId: 'lucide-search',
			});
			expect(resolveIcon({ kind: 'match' })).toEqual({
				role: 'match',
				source: 'role',
				iconId: 'lucide-search',
			});
		});

		it('resolves value role with the parity icon id', () => {
			expect(resolveIcon({ kind: 'value' })).toEqual({
				role: 'value',
				source: 'role',
				iconId: 'lucide-sliders-horizontal',
			});
		});
	});

	describe('kind alias normalization (v12 icons.jsx:73-90 NODE_KIND_ICONS)', () => {
		it('normalizes folder aliases (dir, directory)', () => {
			expect(resolveIcon({ kind: 'dir' }).role).toBe('folder');
			expect(resolveIcon({ kind: 'directory' }).role).toBe('folder');
			expect(resolveIcon({ kind: 'folder' })).toEqual({
				role: 'folder',
				source: 'folder',
				iconId: 'lucide-folder',
			});
		});

		it('normalizes file aliases (doc, document)', () => {
			expect(resolveIcon({ kind: 'doc', extension: 'png' })).toEqual({
				role: 'img',
				source: 'ext',
				iconId: 'lucide-image',
			});
			expect(resolveIcon({ kind: 'document' }).role).toBe('file');
		});

		it('normalizes tag/prop/value/content aliases (tags, property, properties, option, search)', () => {
			expect(resolveIcon({ kind: 'tags' }).role).toBe('tag');
			expect(resolveIcon({ kind: 'property' }).role).toBe('prop');
			expect(resolveIcon({ kind: 'properties', propType: 'date' })).toEqual({
				role: 'prop',
				source: 'type',
				iconId: TYPE_ICON_MAP.date,
			});
			expect(resolveIcon({ kind: 'option' }).role).toBe('value');
			expect(resolveIcon({ kind: 'search' }).role).toBe('content');
		});

		it('is case-insensitive on kind', () => {
			expect(resolveIcon({ kind: 'Tag' }).role).toBe('tag');
			expect(resolveIcon({ kind: 'FOLDER' }).role).toBe('folder');
		});
	});

	describe('override parameter (designed, unwired this slice)', () => {
		it('accepts an override in the input shape without applying it (PAI-002 wires it)', () => {
			const input: IconResolutionInput = {
				kind: 'tag',
				override: 'lucide-star',
			};
			const result = resolveIcon(input);
			// PAI-001 tracer slice passes no overrides through; the resolver must not
			// apply `override` yet, to keep visual parity with today's behavior.
			expect(result.iconId).toBe('lucide-tag');
			expect(result.source).not.toBe('override');
		});
	});

	describe('degradation without Iconic', () => {
		it('resolves purely from role/type/ext when no Iconic icon is supplied', () => {
			// The resolver itself has no knowledge of Iconic — that precedence lives
			// in the caller (serviceDecorate). This test documents that resolveIcon
			// never reads an "iconic" field and always returns a deterministic value.
			const result = resolveIcon({ kind: 'tag' });
			expect(result.iconId).toBe('lucide-tag');
			expect(result.source).toBe('role');
		});
	});

	describe('unknown role -> fallback (v12 icons.jsx:212 final chain: type || ext || file)', () => {
		it('still tries nodeType for an unrecognized kind', () => {
			const result = resolveIcon({ kind: 'mystery' as never, nodeType: 'base' });
			expect(result).toEqual({ role: 'base', source: 'type', iconId: 'lucide-file' });
		});

		it('still tries extension for an unrecognized kind', () => {
			const result = resolveIcon({ kind: 'mystery' as never, extension: 'png' });
			expect(result).toEqual({ role: 'img', source: 'ext', iconId: 'lucide-image' });
		});

		it('falls back to the generic file icon for an unrecognized kind with no type/ext', () => {
			const result = resolveIcon({ kind: 'totally-unknown' as never });
			expect(result).toEqual({ role: 'fallback', source: 'fallback', iconId: 'lucide-file' });
		});

		it('falls back when input is empty', () => {
			const result = resolveIcon({});
			expect(result).toEqual({ role: 'fallback', source: 'fallback', iconId: 'lucide-file' });
		});
	});

	describe('.md vs other extensions (v12 icons.jsx:47-71 FILE_ICON_ALIASES)', () => {
		it('classifies .md as the md role but keeps the parity icon id (visual output unchanged)', () => {
			const result = resolveIcon({ kind: 'file', isFolder: false, extension: 'md' });
			expect(result).toEqual({ role: 'md', source: 'ext', iconId: 'lucide-file' });
		});

		it('normalizes markdown/mdown aliases to the md role', () => {
			expect(resolveIcon({ kind: 'file', extension: 'markdown' }).role).toBe('md');
			expect(resolveIcon({ kind: 'file', extension: 'mdown' }).role).toBe('md');
		});

		it('classifies code-ish extensions as json role with parity icon id', () => {
			for (const extension of ['json', 'yml', 'yaml', 'lock', 'js', 'jsx', 'ts', 'tsx']) {
				expect(resolveIcon({ kind: 'file', extension })).toEqual({
					role: 'json',
					source: 'ext',
					iconId: 'lucide-file',
				});
			}
		});

		it('classifies txt/text/plain as txt role with parity icon id', () => {
			for (const extension of ['txt', 'text', 'plain']) {
				expect(resolveIcon({ kind: 'file', extension })).toEqual({
					role: 'txt',
					source: 'ext',
					iconId: 'lucide-file',
				});
			}
		});

		it('classifies pdf/doc/docx as pdf role with parity icon id', () => {
			for (const extension of ['pdf', 'doc', 'docx']) {
				expect(resolveIcon({ kind: 'file', extension })).toEqual({
					role: 'pdf',
					source: 'ext',
					iconId: 'lucide-file',
				});
			}
		});

		it('classifies canvas/base extensions as their roles with parity icon id', () => {
			expect(resolveIcon({ kind: 'file', extension: 'canvas' }).role).toBe('canvas');
			expect(resolveIcon({ kind: 'file', extension: 'base' }).role).toBe('base');
			expect(resolveIcon({ kind: 'file', extension: 'canvas' }).iconId).toBe('lucide-file');
			expect(resolveIcon({ kind: 'file', extension: 'base' }).iconId).toBe('lucide-file');
		});

		it('classifies every current product image extension as img -> lucide-image (parity superset of v12)', () => {
			// v12 aliases jpg/jpeg/png/gif/svg; the product also treats
			// avif/bmp/ico/tif/tiff/webp as images today. Parity keeps the superset.
			for (const extension of [
				'avif',
				'bmp',
				'gif',
				'ico',
				'jpeg',
				'jpg',
				'png',
				'svg',
				'tif',
				'tiff',
				'webp',
			]) {
				expect(resolveIcon({ kind: 'file', extension })).toEqual({
					role: 'img',
					source: 'ext',
					iconId: 'lucide-image',
				});
			}
		});

		it('normalizes extension casing and a leading dot', () => {
			const upper = resolveIcon({ kind: 'file', isFolder: false, extension: 'PNG' });
			const dotted = resolveIcon({ kind: 'file', isFolder: false, extension: '.png' });
			expect(upper.iconId).toBe('lucide-image');
			expect(dotted.iconId).toBe('lucide-image');
		});
	});

	describe('ICON_ROLES canon (v12 icons.jsx:126-143 LUCIDE_ROLE_ICONS keys)', () => {
		it('exposes exactly the 16 v12 semantic roles as a typed const', () => {
			expect([...ICON_ROLES].sort()).toEqual(
				[
					'folder',
					'file',
					'md',
					'txt',
					'json',
					'img',
					'code',
					'sheet',
					'canvas',
					'base',
					'pdf',
					'tag',
					'prop',
					'value',
					'content',
					'match',
				].sort(),
			);
			expect(ICON_ROLES).toHaveLength(16);
		});
	});

	describe('PROTO_POLISH_ROLE_ICONS (v12 icons.jsx:126-143 — defined, UNWIRED)', () => {
		it('covers all 16 roles with the v12 polish lucide ids', () => {
			expect(Object.keys(PROTO_POLISH_ROLE_ICONS).sort()).toEqual([...ICON_ROLES].sort());
			expect(PROTO_POLISH_ROLE_ICONS.md).toBe('lucide-file-text');
			expect(PROTO_POLISH_ROLE_ICONS.json).toBe('lucide-file-code');
			expect(PROTO_POLISH_ROLE_ICONS.img).toBe('lucide-file-image');
			expect(PROTO_POLISH_ROLE_ICONS.sheet).toBe('lucide-table');
			expect(PROTO_POLISH_ROLE_ICONS.canvas).toBe('lucide-workflow');
			expect(PROTO_POLISH_ROLE_ICONS.base).toBe('lucide-database');
			expect(PROTO_POLISH_ROLE_ICONS.pdf).toBe('lucide-file-type');
			expect(PROTO_POLISH_ROLE_ICONS.tag).toBe('lucide-tags');
			expect(PROTO_POLISH_ROLE_ICONS.prop).toBe('lucide-sliders-horizontal');
			expect(PROTO_POLISH_ROLE_ICONS.value).toBe('lucide-list-check');
			expect(PROTO_POLISH_ROLE_ICONS.content).toBe('lucide-scan-text');
			expect(PROTO_POLISH_ROLE_ICONS.match).toBe('lucide-search-check');
		});

		it('stays unwired: the active output for themed roles keeps the parity ids', () => {
			// Sentinel pairs where polish differs from today's product output.
			expect(resolveIcon({ kind: 'content' }).iconId).not.toBe(PROTO_POLISH_ROLE_ICONS.content);
			expect(resolveIcon({ kind: 'tag' }).iconId).not.toBe(PROTO_POLISH_ROLE_ICONS.tag);
			expect(resolveIcon({ kind: 'file', extension: 'md' }).iconId).not.toBe(
				PROTO_POLISH_ROLE_ICONS.md,
			);
		});
	});
});
