/**
 * U130 native polish: official Obsidian 1.14.4 Scope registration allowlist.
 * Matches `pO.prototype.initializeKeyboardNav` (app.js offset 1489371).
 */

export interface ScopeKeyChord {
	readonly modifiers: readonly ('Shift' | 'Mod')[];
	readonly key: string;
}

/**
 * Returns the exact allowlist of key chords registered by Obsidian 1.14.4
 * on the FileExplorer / Tree view scope.
 */
export function getNativeTreeScopeChords(isMacOS: boolean): readonly ScopeKeyChord[] {
	return [
		{ modifiers: [], key: 'ArrowDown' },
		{ modifiers: ['Shift'], key: 'ArrowDown' },
		{ modifiers: ['Mod'], key: 'ArrowDown' },
		{ modifiers: [], key: 'ArrowUp' },
		{ modifiers: ['Shift'], key: 'ArrowUp' },
		{ modifiers: ['Mod'], key: 'ArrowUp' },
		{ modifiers: [], key: 'ArrowLeft' },
		{ modifiers: ['Mod'], key: 'ArrowLeft' },
		{ modifiers: [], key: 'ArrowRight' },
		{ modifiers: ['Mod'], key: 'ArrowRight' },
		{ modifiers: [], key: 'Escape' },
		{ modifiers: [], key: 'Enter' },
		{ modifiers: ['Mod'], key: 'Enter' },
		{ modifiers: [], key: ' ' },
		{ modifiers: [], key: 'F2' },
		isMacOS
			? { modifiers: ['Mod'], key: 'Backspace' }
			: { modifiers: [], key: 'Delete' },
	];
}

/** The DOM listener must obey the same exact chords as the host Scope. */
export function isNativeTreeKeyboardChord(event: KeyboardEvent, isMacOS: boolean): boolean {
	if (event.altKey || (isMacOS ? event.ctrlKey : event.metaKey)) return false;
	const mod = isMacOS ? event.metaKey : event.ctrlKey;
	return getNativeTreeScopeChords(isMacOS).some(chord =>
		chord.key === event.key &&
		chord.modifiers.includes('Shift') === event.shiftKey &&
		chord.modifiers.includes('Mod') === mod,
	);
}

/**
 * U130 tree Navco letter routes: unmodified (+Shift) printable single glyphs.
 * Deliberately SEPARATE from the exact native allowlist above, whose contract
 * stays frozen. Letters need guarded Scope routes so the active-leaf BODY
 * fallback can reach the visible tree; Ctrl/Meta/Alt glyphs never qualify and
 * stay global hotkeys. Space is excluded (native activation). IME/composing
 * and editable targets are guarded by the caller, which owns the DOM.
 */
export function isTreeLetterJumpChord(event: KeyboardEvent): boolean {
	if (event.ctrlKey || event.metaKey || event.altKey) return false;
	if (event.isComposing || Array.from(event.key).length !== 1 || event.key === ' ') return false;
	return true;
}

/** Guarded printable routes include the same Unicode glyphs as Floating Index. */
export function getTreeLetterScopeChords(): readonly { readonly modifiers: readonly 'Shift'[]; readonly key: null }[] {
	return [{ modifiers: [], key: null }, { modifiers: ['Shift'], key: null }];
}
