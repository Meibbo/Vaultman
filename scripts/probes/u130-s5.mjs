/**
 * U130-35 (Slice 5): sondas de DOM del inspector de SASI.
 *
 * Carril L-S5P. Este modulo vive aparte para no chocar con los carriles que
 * estan editando `scripts/run-u130-ui-smoke.mjs` y `scripts/probes/u130-s3.mjs`:
 * ahi solo se toca la linea de import/registro de este modulo. Si algun
 * ayudante parece compartido, va DUPLICADO aqui a proposito; un merge limpio
 * vale mas hoy que evitar diez lineas repetidas.
 *
 * Que demuestra: el boton existe en Settings -> Developer tools colocado antes
 * de `settings.data_transfer`, al invocarlo el modal se abre DE VERDAD en el
 * DOM y muestra contenido del registro SASI VIVO (cruzado con
 * `sasiRegistry.list('function')` de la instancia recargada, no una lista
 * vacia ni ids hardcodeados), y el inspector NO aparece en el `providers_menu`
 * del sidebar (intent §7.2; la guarda unitaria lo afirma sobre el fuente, esta
 * lo afirma sobre el DOM vivo, con el simbolo exacto).
 *
 * Las sondas prueban TRANSICION, no estado: cerrado -> abrir -> comprobar que
 * aparece -> cerrar -> comprobar que desaparece. Un `if (x) return` deja pasar
 * un control roto. Van SIEMPRE despues de `gate.reload-efectivo`: sin esa
 * puerta, una sonda da verde mirando un build viejo.
 *
 * Al terminar CIERRA el modal y los Settings: la sonda la corren otros
 * carriles despues y nadie quiere heredar un modal abierto.
 *
 * El bloque es defensivo: un fallo es un check en rojo, nunca una excepcion
 * que mate el resto de la sonda. Todos los ayudantes llevan prefijo `s5` para
 * no colisionar con las sondas s1/s3 del mismo eval.
 */
export const U130_S5_SNIPPET = [
	'// --- SLICE 5 (lane L-S5P, scripts/probes/u130-s5.mjs) -----------------',
	'const s5WaitFor = async (pred, ms) => {',
	'	const start = Date.now();',
	'	while (Date.now() - start < ms) {',
	'		const got = pred();',
	'		if (got) return got;',
	'		await new Promise((r) => setTimeout(r, 50));',
	'	}',
	'	return pred();',
	'};',
	'const s5NameOf = (el) =>',
	'	((el.querySelector(\'.setting-item-name\')?.textContent || \'\').trim());',
	'const s5DevRe = /developer tools|herramientas de desarrollador|herramientas de desarrollo/i;',
	'const s5SasiRe = /^(sasi registry|registro sasi)$/i;',
	'const s5DataRe = /^(filters, operation sets & layouts|filtros, sets de operaciones y layouts)$/i;',
	'// Normaliza a settings cerrados antes de empezar: la transicion se prueba',
	'// de verdad (cerrado -> abrir), no heredando un modal ya abierto.',
	'try { app.setting?.close?.(); } catch (s5e) {}',
	'await deadline(nextPaint(), 1000);',
	'app.setting.open();',
	'app.setting.openTabById(\'vaultman\');',
	'const s5RootReady = await s5WaitFor(() =>',
	'	document.querySelector(\'.setting-item\') || null, 3000);',
	'check(\'s5.settings-opens\', s5RootReady instanceof HTMLElement,',
	'	s5RootReady instanceof HTMLElement ? null : \'settings-absent\');',
	'// Encuentra el item "Developer tools" navegable (con chevron), no el heading.',
	'const s5DevRow = () => {',
	'	const items = Array.from(document.querySelectorAll(\'.setting-item\'));',
	'	return items.find((el) =>',
	'		s5DevRe.test(s5NameOf(el)) && el.classList.contains(\'mod-navigable\'),',
	') || null;',
	'};',
	'const s5Dev = await s5WaitFor(s5DevRow, 3000);',
	'check(\'s5.developer-page-present\', s5Dev instanceof HTMLElement,',
	'	s5Dev instanceof HTMLElement ? null : \'developer-absent\');',
	'if (s5Dev instanceof HTMLElement) {',
	'	const nameEl = s5Dev.querySelector(\'.setting-item-name\');',
	'	if (nameEl instanceof HTMLElement) nameEl.click();',
	'	else s5Dev.click();',
	'}',
	'// Espera a que la sub-pagina de developer tools cargue sus items.',
	'await deadline(nextPaint(), 2000);',
	'const s5SasiItem = () =>',
	'	Array.from(document.querySelectorAll(\'.setting-item\')).find((el) => s5SasiRe.test(s5NameOf(el))) || null;',
	'const s5Sasi = await s5WaitFor(s5SasiItem, 3000);',
	'const s5Btn = s5Sasi instanceof HTMLElement ? s5Sasi.querySelector(\'button\') : null;',
	'check(\'s5.button-present\', s5Btn instanceof HTMLElement,',
	'	s5Btn instanceof HTMLElement ? s5NameOf(s5Sasi) : \'button-absent\');',
	'const s5Items = Array.from(document.querySelectorAll(\'.setting-item\'));',
	'const s5SasiIdx = s5Sasi instanceof HTMLElement ? s5Items.indexOf(s5Sasi) : -1;',
	'const s5DataIdx = s5Items.findIndex((el) => s5DataRe.test(s5NameOf(el)));',
	'check(\'s5.button-before-datatransfer\',',
	'	s5SasiIdx >= 0 && s5DataIdx >= 0 && s5SasiIdx < s5DataIdx,',
	'	{ sasi: s5SasiIdx, data_transfer: s5DataIdx });',
	'// Guarda negativa EN DOM con el simbolo exacto: nada en el sidebar ofrece',
	'// el inspector (el unitario lo afirma sobre navbarTabs.svelte; este sobre',
	'// el frame vivo).',
	'const s5SidebarTriggers = Array.from(',
	'	frame.querySelectorAll(\'.vaultman-tab, [role="tab"], .menu-item, button\'))',
	'	.map((el) => (((el.getAttribute(\'aria-label\') || \'\') + \' \' + (el.textContent || \'\')).trim()))',
	'	.filter((t) => /sasi registry|registro sasi/i.test(t));',
	'const s5FrameHtml = frame.innerHTML || \'\';',
	'check(\'s5.not-in-providers-menu\',',
	'	s5SidebarTriggers.length === 0',
	'		&& !/SasiInspectorModal/.test(s5FrameHtml)',
	'		&& !/sasiInspector/.test(s5FrameHtml),',
	'	s5SidebarTriggers.length > 0 ? s5SidebarTriggers : null);',
	'// TRANSICION cerrado -> abrir: el modal no puede estar ya abierto.',
	'check(\'s5.modal-closed-before\',',
	'	!document.querySelector(\'.vaultman-sasi-inspector\'));',
	'if (s5Btn instanceof HTMLElement) s5Btn.click();',
	'const s5Modal = await s5WaitFor(() =>',
	'	document.querySelector(\'.vaultman-sasi-inspector\') || null, 3000);',
	'check(\'s5.modal-opens\', s5Modal instanceof HTMLElement,',
	'	s5Modal instanceof HTMLElement ? null : \'modal-absent\');',
	'// Contenido VIVO: cada funcion del registro vivo aparece en el modal.',
	'let s5LiveIds = [];',
	'try {',
	'	s5LiveIds = (app.plugins?.plugins?.vaultman?.sasiRegistry?.list?.(\'function\') || []).map((d) => d.id);',
	'} catch (s5e) {}',
	'const s5ModalIds = s5Modal instanceof HTMLElement',
	'	? Array.from(s5Modal.querySelectorAll(\'.vaultman-sasi-inspector-id\')).map((el) => (el.textContent || \'\').trim())',
	'	: [];',
	'const s5Missing = s5LiveIds.filter((id) => !s5ModalIds.includes(id));',
	'check(\'s5.modal-shows-live-registry\',',
	'	s5Modal instanceof HTMLElement && s5ModalIds.length > 0 && s5LiveIds.length > 0 && s5Missing.length === 0,',
	'	{ live: s5LiveIds.length, shown: s5ModalIds.length, missing: s5Missing });',
	'// TRANSICION abrir -> cerrar, y limpieza: no heredar modal ni settings.',
	'const s5CloseBtns = Array.from(document.querySelectorAll(\'.modal-close-button\'));',
	'const s5Top = s5CloseBtns[s5CloseBtns.length - 1];',
	'if (s5Top instanceof HTMLElement) s5Top.click();',
	'else document.dispatchEvent(new KeyboardEvent(\'keydown\', { key: \'Escape\', bubbles: true }));',
	'const s5Gone = await s5WaitFor(() =>',
	'	(!document.querySelector(\'.vaultman-sasi-inspector\') ? true : null), 3000);',
	'check(\'s5.modal-closes\', s5Gone === true,',
	'	s5Gone === true ? null : \'modal-still-open\');',
	'try { app.setting?.close?.(); } catch (s5e2) {}',
	'const s5Clean = await s5WaitFor(() =>',
	'	(document.querySelectorAll(\'.modal\').length === 0 ? true : null), 3000);',
	'check(\'s5.settings-closed\', s5Clean === true,',
	'	s5Clean === true ? null : document.querySelectorAll(\'.modal\').length);',
].join('\n');