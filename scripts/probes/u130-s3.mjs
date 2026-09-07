/**
 * U130-35 (Slice 3): sondas de DOM de las cabeceras de grupo.
 *
 * Carril L-35. Este modulo vive aparte para no chocar con el carril que esta
 * editando `scripts/run-u130-ui-smoke.mjs` (sondas de la Slice 2): ahi solo se
 * toca la linea de import/registro de este modulo. Si algun ayudante parece
 * compartido, va DUPLICADO aqui a proposito; un merge limpio vale mas hoy que
 * evitar diez lineas repetidas.
 *
 * Que demuestra: las cabeceras de grupo se ven en el arbol cuando el scope de
 * orden activo es `groups` y desaparecen cuando no lo es. Eso es la Slice 3
 * aterrizando: la proyeccion pura (`logicTreeGroupProjection`), los cinco
 * explorers aplicandola y `enabled: this.sortState?.activeScope === 'groups'`
 * (commit `d9359b5d`).
 *
 * Las sondas prueban TRANSICION, no estado: scope all -> groups -> all, y el
 * caret plegar/desplegar y vuelta. Un `if (x) return` deja pasar un control
 * roto. Van SIEMPRE despues de `gate.reload-efectivo`: sin esa puerta, una
 * sonda da verde mirando un build viejo.
 *
 * El bloque es defensivo: un fallo es un check en rojo, nunca una excepcion
 * que mate el resto de la sonda. Todos los ayudantes llevan prefijo `s3` para
 * no colisionar con las sondas s1/s2 del mismo eval.
 */
export const U130_S3_SNIPPET = [
	'// --- SLICE 3 (lane L-35, scripts/probes/u130-s3.mjs) -----------------',
	'const s3CountHeaders = () =>',
	'	frame.querySelectorAll(\'.vaultman-tree-row--group-header\').length;',
	'const s3WaitFor = async (pred, ms) => {',
	'	const start = Date.now();',
	'	while (Date.now() - start < ms) {',
	'		const got = pred();',
	'		if (got) return got;',
	'		await new Promise((r) => setTimeout(r, 100));',
	'	}',
	'	return pred();',
	'};',
	'const s3DismissMenu = async () => {',
	'	document.dispatchEvent(new KeyboardEvent(\'keydown\', { key: \'Escape\', bubbles: true }));',
	'	await deadline(nextPaint(), 2000);',
	'};',
	'// Activa un scope del menu de orden por su titulo traducido. Vale para la',
	'// via nativa (minimalStyle: .menu-item-title, confirmada en vivo en el',
	'// web-lab) y para el drawer Svelte (.vaultman-sort-drawer-item).',
	'const s3ActivateScope = async (re) => {',
	'	const sortBtn = frame.querySelector(\'[data-panel-widget-node-id$=":sort"]\');',
	'	if (!(sortBtn instanceof HTMLElement)) return \'sort-absent\';',
	'	// Un menu residual abierto convierte el click en "cerrar" en vez de',
	'	// "abrir": se descarta primero para que el click abra de verdad.',
	'	await s3DismissMenu();',
	'	sortBtn.click();',
	'	const native = await s3WaitFor(() =>',
	'		Array.from(document.querySelectorAll(\'.menu-item-title\')).find(',
	'			(el) => re.test((el.textContent || \'\').trim()),',
	'		) || null,',
	'		3000);',
	'	if (native instanceof HTMLElement) {',
	'		const row = native.closest(\'.menu-item\');',
	'		if (row) row.dispatchEvent(new MouseEvent(\'click\', { bubbles: true }));',
	'		else native.dispatchEvent(new MouseEvent(\'click\', { bubbles: true }));',
	'		await deadline(nextPaint(), 2000);',
	'		await s3DismissMenu();',
	'		return true;',
	'	}',
	'	await s3DismissMenu();',
	'	if (document.querySelectorAll(\'.menu-item-title\').length > 0) return \'scope-title-absent\';',
	'	const vertBtn = frame.querySelector(\'.vaultman-sort-vertcol-btn\');',
	'	if (vertBtn instanceof HTMLElement) {',
	'		vertBtn.click();',
	'		await deadline(nextPaint(), 2000);',
	'		const item = Array.from(frame.querySelectorAll(\'.vaultman-sort-drawer-item\')).find(',
	'			(el) => re.test(((el.getAttribute(\'aria-label\') || \'\') + \' \' + ((el.getAttribute(\'title\') || \'\'))).trim()),',
	'		);',
	'		if (item instanceof HTMLElement) {',
	'			item.click();',
	'			await deadline(nextPaint(), 2000);',
	'			return true;',
	'		}',
	'		return \'drawer-item-absent\';',
	'	}',
	'	return \'scope-item-absent\';',
	'};',
	'const s3GroupsRe = /^(groups|grupos)$/i;',
	'const s3AllRe = /^(all levels|todos los niveles)$/i;',
	'const s3RowsOf = () => frame.querySelectorAll(\'.vaultman-tree-row\').length;',
	'// El sort persiste entre reloads: se normaliza a `all` primero y la',
	'// ausencia se comprueba despues de cerrar, como transicion, no como estado.',
	'await s3ActivateScope(s3AllRe);',
	'check(\'s3.absent-while-off\', s3CountHeaders() === 0, s3CountHeaders());',
	'const s3On = await s3ActivateScope(s3GroupsRe);',
	'check(\'s3.scope-groups-activates\', s3On === true, s3On === true ? null : s3On);',
	'const s3Headers = await s3WaitFor(() => {',
	'	const n = s3CountHeaders();',
	'	return n > 0 ? n : null;',
	'}, 5000);',
	'check(\'s3.headers-visible\', typeof s3Headers === \'number\' && s3Headers > 0, s3Headers);',
	'const s3CaretNow = () => {',
	'	const h = frame.querySelector(\'.vaultman-tree-row--group-header\');',
	'	return h ? h.querySelector(\'.vaultman-tree-toggle\') : null;',
	'};',
	'check(\'s3.header-has-caret\', s3CaretNow() instanceof HTMLElement, s3Headers);',
	'// Colapsables: plegar/desplegar cambia las filas visibles y volver',
	'// deja el arbol como estaba. Transicion completa, no estado.',
	'let s3CollapseDetail = \'caret-absent\';',
	'let s3CollapseOk = false;',
	'for (let s3Try = 0; s3Try < 3 && !s3CollapseOk; s3Try++) {',
	'	const s3Heads = frame.querySelectorAll(\'.vaultman-tree-row--group-header\');',
	'	const s3Head = s3Heads[s3Try];',
	'	const s3Tgl = s3Head ? s3Head.querySelector(\'.vaultman-tree-toggle\') : null;',
	'	if (!(s3Tgl instanceof HTMLElement)) { s3CollapseDetail = \'caret-absent\'; continue; }',
	'	const s3Before = s3RowsOf();',
	'	s3Tgl.click();',
	'	const s3Mid = await s3WaitFor(() => {',
	'		const n = s3RowsOf();',
	'		return n !== s3Before ? n : null;',
	'	}, 5000);',
	'	if (typeof s3Mid !== \'number\') { s3CollapseDetail = { before: s3Before, mid: s3Mid }; continue; }',
	'	const s3Tgl2 = (frame.querySelectorAll(\'.vaultman-tree-row--group-header\')[s3Try] || {}).querySelector',
	'		? frame.querySelectorAll(\'.vaultman-tree-row--group-header\')[s3Try].querySelector(\'.vaultman-tree-toggle\')',
	'		: null;',
	'	if (s3Tgl2 instanceof HTMLElement) s3Tgl2.click();',
	'	const s3Back = await s3WaitFor(() => (s3RowsOf() === s3Before ? true : null), 5000);',
	'	s3CollapseDetail = { before: s3Before, mid: s3Mid, back: s3RowsOf() };',
	'	s3CollapseOk = s3Back === true;',
	'}',
	'check(\'s3.header-collapses\', s3CollapseOk, s3CollapseDetail);',
	'// Vuelta al scope por defecto: las cabeceras desaparecen. Sin esto la',
	'// sonda dejaria el vault en groups y la siguiente corrida veria estado,',
	'// no transicion.',
	'const s3Off = await s3ActivateScope(s3AllRe);',
	'const s3Gone = await s3WaitFor(() => (s3CountHeaders() === 0 ? true : null), 5000);',
	'check(\'s3.absent-when-scope-off\', s3Off === true && s3Gone === true,',
	'	s3Off === true ? s3CountHeaders() : s3Off);',
].join('\n');
