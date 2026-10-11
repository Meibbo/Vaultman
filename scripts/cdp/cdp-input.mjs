// Pure CDP Input.* event builders (no transport). Trusted events only:
// dispatchKeyEvent keyDown/keyUp pairs plus insertText, following the proven
// u130-parity-driver.cjs mechanics (bare keyDown/keyUp, no char events) and
// the run-explorer-scroll-smoke.mjs precedent of driving the page through
// CDP Input instead of synthetic element.click(). Text rides keyDown exactly
// once; keyUp never carries text; no separate char event is ever emitted.
export const MODIFIERS = { Alt: 1, Ctrl: 2, Meta: 4, Shift: 8 };

const NAMED_KEYS = {
	Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 },
	Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' },
	Escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
	Space: { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' },
	Home: { key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 },
	End: { key: 'End', code: 'End', windowsVirtualKeyCode: 35 },
	ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 },
	ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 },
	ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 },
	ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 },
	Backspace: { key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 },
	Delete: { key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 },
	Control: { key: 'Control', code: 'ControlLeft', windowsVirtualKeyCode: 17 },
	Shift: { key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 },
	Alt: { key: 'Alt', code: 'AltLeft', windowsVirtualKeyCode: 18 },
	Meta: { key: 'Meta', code: 'MetaLeft', windowsVirtualKeyCode: 91 },
	F2: { key: 'F2', code: 'F2', windowsVirtualKeyCode: 113 },
};

export function validateModifiers(modifiers) {
	const value = Number(modifiers ?? 0);
	if (!Number.isInteger(value) || value < 0 || value > 15) {
		throw new Error(`--modifiers must be an integer bitmask 0-15 (Alt=1 Ctrl=2 Meta=4 Shift=8), got: ${modifiers}`);
	}
	return value;
}

export function resolveKeyDefinition(keyName) {
	if (typeof keyName !== 'string' || keyName === '') throw new Error('key name must be a non-empty string');
	if (keyName === ' ') return { ...NAMED_KEYS.Space };
	if (NAMED_KEYS[keyName]) return { ...NAMED_KEYS[keyName] };
	if (keyName.length === 1) {
		const upper = keyName.toUpperCase();
		if (/^[A-Z]$/.test(upper)) {
			return { key: keyName, code: `Key${upper}`, windowsVirtualKeyCode: upper.charCodeAt(0), text: keyName };
		}
		if (/^[0-9]$/.test(keyName)) {
			return { key: keyName, code: `Digit${keyName}`, windowsVirtualKeyCode: keyName.charCodeAt(0), text: keyName };
		}
		return { key: keyName, code: 'Unidentified', windowsVirtualKeyCode: 0, text: keyName };
	}
	throw new Error(`unknown key: ${keyName} (use Tab Space Home End Enter Escape arrows, Control, or a single character)`);
}

// Trusted key press: keyDown then keyUp, exactly like the parity driver.
// Unmodified printable keys carry their text on keyDown (a real key press
// both navigates and inserts); Ctrl/Meta chords carry no text anywhere, or
// the chord would also insert the character. Space text therefore appears
// exactly once, on keyDown, with no duplicate char event.
export function buildKeyEvents(keyName, modifiers = 0) {
	const mods = validateModifiers(modifiers);
	const definition = resolveKeyDefinition(keyName);
	const chorded = (mods & (MODIFIERS.Ctrl | MODIFIERS.Meta)) !== 0;
	const down = { type: 'keyDown', modifiers: mods, key: definition.key, code: definition.code, windowsVirtualKeyCode: definition.windowsVirtualKeyCode };
	if (!chorded && definition.text !== undefined) down.text = definition.text;
	const up = { type: 'keyUp', modifiers: mods, key: definition.key, code: definition.code, windowsVirtualKeyCode: definition.windowsVirtualKeyCode };
	return [
		{ method: 'Input.dispatchKeyEvent', params: down },
		{ method: 'Input.dispatchKeyEvent', params: up },
	];
}

export function clickPointFromRect(rect) {
	if (!rect || typeof rect !== 'object') throw new Error('click failed: selector matched nothing');
	const { x, y, width, height } = rect;
	for (const [name, value] of [['x', x], ['y', y], ['width', width], ['height', height]]) {
		if (!Number.isFinite(value)) throw new Error(`click failed: bounds ${name} is not a number`);
	}
	if (width <= 0 || height <= 0) throw new Error('click failed: element has zero bounds (hidden or unlaid-out)');
	return { x: Math.floor(x + width / 2), y: Math.floor(y + height / 2) };
}

export function buildClickEvents(point, { button = 'left' } = {}) {
	if (!['left', 'middle', 'right'].includes(button)) throw new Error(`--button must be left|middle|right, got: ${button}`);
	const { x, y } = point;
	if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error('click point must be integer CSS pixels');
	const buttons = button === 'left' ? 1 : button === 'right' ? 2 : 4;
	return [
		{ method: 'Input.dispatchMouseEvent', params: { type: 'mouseMoved', x, y, button, buttons: 0, clickCount: 0 } },
		{ method: 'Input.dispatchMouseEvent', params: { type: 'mousePressed', x, y, button, buttons, clickCount: 1 } },
		{ method: 'Input.dispatchMouseEvent', params: { type: 'mouseReleased', x, y, button, buttons, clickCount: 1 } },
	];
}

export function boundsExpression(selector) {
	if (typeof selector !== 'string' || selector.trim() === '') throw new Error('click selector must be a non-empty string');
	return `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`;
}
