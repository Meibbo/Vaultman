// The unit project runs in a bare `node` environment, but product modules follow
// obsidianmd/prefer-window-timers and call window.setTimeout/clearTimeout/
// requestAnimationFrame. Obsidian always provides `window`; bare node does not —
// bridge the global here so unit tests exercise the same code path.
if (typeof (globalThis as { window?: unknown }).window === 'undefined') {
	(globalThis as { window?: unknown }).window = globalThis;
}
