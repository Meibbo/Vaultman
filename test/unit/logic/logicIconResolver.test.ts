import { describe, it, expect } from 'vitest';
import {
	resolveIcon,
	ICON_ROLES,
	TYPE_ICON_MAP,
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

		it('resolves file extension when kind is file and not a folder (ext step)', () => {
			const result = resolveIcon({ kind: 'file', isFolder: false, extension: 'png' });
			expect(result).toEqual({ role: 'file', source: 'ext', iconId: 'lucide-image' });
		});

		it('resolves plain file fallback when extension is unknown/non-image (ext step, generic)', () => {
			const result = resolveIcon({ kind: 'file', isFolder: false, extension: 'md' });
			expect(result).toEqual({ role: 'file', source: 'ext', iconId: 'lucide-file' });
		});

		it('resolves content/match roles', () => {
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

		it('resolves value role', () => {
			expect(resolveIcon({ kind: 'value' })).toEqual({
				role: 'value',
				source: 'role',
				iconId: 'lucide-sliders-horizontal',
			});
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

	describe('unknown role -> fallback', () => {
		it('falls back to the generic file icon for an unrecognized kind', () => {
			const result = resolveIcon({ kind: 'totally-unknown' as never });
			expect(result).toEqual({ role: 'fallback', source: 'fallback', iconId: 'lucide-file' });
		});

		it('falls back when input is empty', () => {
			const result = resolveIcon({});
			expect(result).toEqual({ role: 'fallback', source: 'fallback', iconId: 'lucide-file' });
		});
	});

	describe('.md vs other extensions', () => {
		it('treats .md as a plain file icon, not a distinct md icon (parity with current behavior)', () => {
			const result = resolveIcon({ kind: 'file', isFolder: false, extension: 'md' });
			expect(result.iconId).toBe('lucide-file');
			expect(result.role).toBe('file');
		});

		it('treats image extensions distinctly from other extensions', () => {
			const png = resolveIcon({ kind: 'file', isFolder: false, extension: 'png' });
			const svg = resolveIcon({ kind: 'file', isFolder: false, extension: 'svg' });
			const txt = resolveIcon({ kind: 'file', isFolder: false, extension: 'txt' });
			expect(png.iconId).toBe('lucide-image');
			expect(svg.iconId).toBe('lucide-image');
			expect(txt.iconId).toBe('lucide-file');
		});

		it('normalizes extension casing and a leading dot', () => {
			const upper = resolveIcon({ kind: 'file', isFolder: false, extension: 'PNG' });
			const dotted = resolveIcon({ kind: 'file', isFolder: false, extension: '.png' });
			expect(upper.iconId).toBe('lucide-image');
			expect(dotted.iconId).toBe('lucide-image');
		});
	});

	describe('ICON_ROLES canon', () => {
		it('is a typed const exposing the semantic role vocabulary (no proto mock data copied)', () => {
			expect(ICON_ROLES).toEqual(
				expect.arrayContaining(['folder', 'file', 'tag', 'prop', 'value', 'content', 'match']),
			);
		});
	});
});
