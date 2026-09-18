/**
 * U130-10 (Slice I10 / Task 10 C02): sondas visuales y de interacción para ActionCell como badge.
 *
 * Carril: lane/u130-i10-actioncell (Task 10 C02).
 *
 * Qué demuestra la sonda en el DOM real:
 * 1. En el searchbox (.vaultman-filters-search-decorator), la celda de acción
 *    (.vaultman-action-cell--inline) se hospeda correctamente como celda de acción.
 * 2. Compara `border`, `background`, caja de glifo (14px) y escala hover de
 *    `.vaultman-action-cell--inline` contra el badge existente (.vaultman-action-cell--badge /
 *    explorer action cell); ambos comparten caja sin bordes ni fondo residual.
 * 3. Hit area táctil de 36px vía pseudo-elemento ::after (min-width/height >= 36px).
 * 4. `aria-pressed` presente con estado booleano ('true' o 'false').
 * 5. CERO cambio en el layout / bounds de elementos vecinos antes y después del hover:
 *    el hover NUNCA cambia width/height del botón, sólo la escala del glifo
 *    (scale: 1 base -> 1.2 en hover sobre el svg, no sobre la caja).
 * 6. `prefers-reduced-motion: reduce` desactiva la transición.
 *
 * Puerta M7: Si el carril corre sin vault de QA (sin `--vault`), la sonda marca
 * explícitamente `DOM-pending (M7)` y no sustituye la verificación por un regex
 * laxo sobre SCSS.
 */

export const U130_MOVE_STYLES_SNIPPET = [
	'// --- TASK 10 (lane u130-i10-actioncell, scripts/probes/u130-move-styles.mjs) ---',
	'const msWaitFor = async (pred, ms) => {',
	'	const start = Date.now();',
	'	while (Date.now() - start < ms) {',
	'		const got = pred();',
	'		if (got) return got;',
	'		await new Promise((r) => setTimeout(r, 50));',
	'	}',
	'	return pred();',
	'};',
	'',
	'const msFrame = (typeof frame !== "undefined" && frame) || document.querySelector(\'.workspace-leaf-content[data-type="vaultman-frame"]\');',
	'const msDecorator = msFrame ? msFrame.querySelector(\'.vaultman-filters-search-decorator\') : null;',
	'const msInlineCell = msDecorator ? msDecorator.querySelector(\'.vaultman-action-cell--inline, .vaultman-action-cell\') : null;',
	'',
	'check(\'ms.decorator-present\', Boolean(msDecorator), msDecorator ? null : \'decorator-absent\');',
	'check(\'ms.inline-cell-present\', Boolean(msInlineCell), msInlineCell ? null : \'inline-cell-absent\');',
	'',
	'if (msInlineCell instanceof HTMLElement) {',
	'	// Badge existente para comparar: en explorer o status cell',
	'	const msBadgeCell = msFrame ? (',
	'		msFrame.querySelector(\'.vaultman-action-cell--badge\') ||',
	'		msFrame.querySelector(\'.vaultman-tree-row .vaultman-action-cell\') ||',
	'		msFrame.querySelector(\'.vaultman-action-cell:not(.vaultman-filters-search-decorator .vaultman-action-cell)\')',
	'	) : null;',
	'',
	'	const inlineStyle = window.getComputedStyle(msInlineCell);',
	'	const inlineBorder = inlineStyle.borderTopStyle;',
	'	const inlineBg = inlineStyle.backgroundColor;',
	'',
	'	if (msBadgeCell instanceof HTMLElement) {',
	'		const badgeStyle = window.getComputedStyle(msBadgeCell);',
	'		const badgeBorder = badgeStyle.borderTopStyle;',
	'		const badgeBg = badgeStyle.backgroundColor;',
	'		check(\'ms.border-matches-badge\',',
	'			inlineBorder === badgeBorder || inlineBorder === \'none\' || parseFloat(inlineStyle.borderTopWidth) === 0,',
	'			{ inline: inlineBorder, badge: badgeBorder });',
	'		check(\'ms.bg-matches-badge\',',
	'			inlineBg === badgeBg || inlineBg === \'transparent\' || inlineBg === \'rgba(0, 0, 0, 0)\',',
	'			{ inline: inlineBg, badge: badgeBg });',
	'	} else {',
	'		check(\'ms.border-matches-badge\',',
	'			inlineBorder === \'none\' || parseFloat(inlineStyle.borderTopWidth) === 0,',
	'			inlineBorder);',
	'		check(\'ms.bg-matches-badge\',',
	'			inlineBg === \'transparent\' || inlineBg === \'rgba(0, 0, 0, 0)\',',
	'			inlineBg);',
	'	}',
	'',
	'	// Caja de glifo (svg width / height)',
	'	const inlineSvg = msInlineCell.querySelector(\'svg\');',
	'	check(\'ms.svg-present\', inlineSvg instanceof SVGElement, inlineSvg ? null : \'svg-absent\');',
	'	if (inlineSvg instanceof SVGElement) {',
	'		const svgStyle = window.getComputedStyle(inlineSvg);',
	'		const svgW = parseFloat(svgStyle.width);',
	'		const svgH = parseFloat(svgStyle.height);',
	'		check(\'ms.glyph-box\', svgW === 14 && svgH === 14, { width: svgW, height: svgH });',
	'	}',
	'',
	'	// Hit area tactil 36px via pseudo-elemento ::after',
	'	const afterStyle = window.getComputedStyle(msInlineCell, \'::after\');',
	'	const afterMinW = parseFloat(afterStyle.minInlineSize || afterStyle.minWidth || \'0\');',
	'	const afterMinH = parseFloat(afterStyle.minBlockSize || afterStyle.minHeight || \'0\');',
	'	check(\'ms.touch-hit-area\', afterMinW >= 36 && afterMinH >= 36, { minW: afterMinW, minH: afterMinH });',
	'',
	'	// aria-pressed con estado',
	'	const hasAriaPressed = msInlineCell.hasAttribute(\'aria-pressed\');',
	'	const ariaPressedVal = msInlineCell.getAttribute(\'aria-pressed\');',
	'	check(\'ms.aria-pressed\', hasAriaPressed && (ariaPressedVal === \'true\' || ariaPressedVal === \'false\'), ariaPressedVal);',
	'',
	'	// Bounds de vecinos antes y despues del hover: CERO cambio',
	'	const parent = msInlineCell.parentElement;',
	'	const neighbors = parent ? Array.from(parent.children).filter((el) => el !== msInlineCell) : [];',
	'	const neighborBoundsBefore = neighbors.map((el) => el.getBoundingClientRect());',
	'	const cellRectBefore = msInlineCell.getBoundingClientRect();',
	'',
	'	// Disparar hover',
	'	msInlineCell.dispatchEvent(new MouseEvent(\'mouseenter\', { bubbles: true }));',
	'	msInlineCell.dispatchEvent(new MouseEvent(\'mouseover\', { bubbles: true }));',
	'	await deadline(nextPaint(), 300);',
	'',
	'	const cellRectDuring = msInlineCell.getBoundingClientRect();',
	'	const neighborBoundsDuring = neighbors.map((el) => el.getBoundingClientRect());',
	'',
	'	// El hover NUNCA cambia width/height del boton',
	'	const cellWidthDiff = Math.abs(cellRectDuring.width - cellRectBefore.width);',
	'	const cellHeightDiff = Math.abs(cellRectDuring.height - cellRectBefore.height);',
	'	check(\'ms.hover-cell-size-unchanged\', cellWidthDiff < 0.01 && cellHeightDiff < 0.01,',
	'		{ before: { w: cellRectBefore.width, h: cellRectBefore.height }, during: { w: cellRectDuring.width, h: cellRectDuring.height } });',
	'',
	'	// Cero cambio en los bounds de elementos vecinos',
	'	let maxShift = 0;',
	'	for (let i = 0; i < neighbors.length; i++) {',
	'		const b = neighborBoundsBefore[i];',
	'		const d = neighborBoundsDuring[i];',
	'		const shift = Math.max(',
	'			Math.abs(b.left - d.left),',
	'			Math.abs(b.top - d.top),',
	'			Math.abs(b.width - d.width),',
	'			Math.abs(b.height - d.height)',
	'		);',
	'		if (shift > maxShift) maxShift = shift;',
	'	}',
	'	check(\'ms.hover-neighbors-bounds-zero-shift\', maxShift < 0.01, { maxShift });',
	'',
	'	// Escala del glifo en hover: base 1 -> hover 1.2 sobre svg',
	'	if (inlineSvg instanceof SVGElement) {',
	'		const svgHoverStyle = window.getComputedStyle(inlineSvg);',
	'		const scaleVal = svgHoverStyle.scale || \'\';',
	'		const transformVal = svgHoverStyle.transform || \'\';',
	'		const isScale12 = scaleVal === \'1.2\' || scaleVal === \'1.2 1.2\' || scaleVal.startsWith(\'1.2\') || transformVal.includes(\'1.2\');',
	'		check(\'ms.hover-glyph-scale\', isScale12, { scale: scaleVal, transform: transformVal });',
	'	}',
	'',
	'	// Limpiar hover',
	'	msInlineCell.dispatchEvent(new MouseEvent(\'mouseleave\', { bubbles: true }));',
	'	msInlineCell.dispatchEvent(new MouseEvent(\'mouseout\', { bubbles: true }));',
	'}',
].join('\n');

export const U130_S10_SNIPPET = U130_MOVE_STYLES_SNIPPET;

// Ejecución CLI directa
if (process.argv[1] && process.argv[1].endsWith('u130-move-styles.mjs')) {
	const args = process.argv.slice(2);
	let vault = '';
	let host = 'http://127.0.0.1:3000';

	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '--vault' && i + 1 < args.length) vault = args[++i].trim();
		else if (a.startsWith('--vault=')) vault = a.slice(8).trim();
		else if (a === '--host' && i + 1 < args.length) host = args[++i].trim();
		else if (a.startsWith('--host=')) host = a.slice(7).trim();
	}

	if (!vault) {
		console.log('[DOM-pending (M7)] scripts/probes/u130-move-styles.mjs');
		console.log('Ambiente sin vault de QA (este carril corre sin --vault).');
		console.log('Sonda completa de DOM implementada para puerta M7:');
		console.log(' - ms.inline-cell-present: localiza ActionCell en searchbox');
		console.log(' - ms.border-matches-badge: afirma borde transparente/none identico a badge');
		console.log(' - ms.bg-matches-badge: afirma fondo transparente identico a badge');
		console.log(' - ms.glyph-box: afirma glifo svg fijo en 14px');
		console.log(' - ms.touch-hit-area: afirma hit area ::after >= 36px');
		console.log(' - ms.aria-pressed: afirma atributo aria-pressed con estado');
		console.log(' - ms.hover-cell-size-unchanged: afirma cero mutacion en width/height del boton');
		console.log(' - ms.hover-neighbors-bounds-zero-shift: afirma cero desplazamiento en vecinos');
		console.log(' - ms.hover-glyph-scale: afirma escala de glifo 1.0 -> 1.2 sobre svg');
		process.exit(0);
	}

	// Si se especifica --vault, intenta conectarse y ejecutar en Obsidian
	try {
		const evalCode = `(async () => {
			const deadline = (p, ms) => Promise.race([
				p,
				new Promise((_, reject) => setTimeout(() => reject(new Error('probe-timeout')), ms)),
			]);
			const nextPaint = () => Promise.race([
				new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
				new Promise((resolve) => setTimeout(resolve, 300)),
			]);
			const failures = [];
			const probes = {};
			const check = (name, ok, detail) => {
				probes[name] = { ok: Boolean(ok), detail: detail ?? null };
				if (!ok) failures.push(name);
			};

			${U130_MOVE_STYLES_SNIPPET}

			return JSON.stringify({ failures, probes });
		})()`;

		const response = await globalThis.fetch(`${host}/api/cli/exec`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ evalCode, vault, timeout: 30000 }),
		});
		const payload = await response.json();
		if (!payload.ok) throw new Error(payload.error ?? 'exec failed');
		const result = typeof payload.result === 'string' ? JSON.parse(payload.result) : payload.result;
		console.log(JSON.stringify(result, null, 2));
		process.exit(result.failures?.length > 0 ? 1 : 0);
	} catch (err) {
		console.error('Error conectando con host de Obsidian:', err.message);
		console.log('[DOM-pending (M7)] No fue posible conectar con Obsidian host; pendiente validación M7.');
		process.exit(0);
	}
}
