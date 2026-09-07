import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { U130_S3_SNIPPET } from './probes/u130-s3.mjs';

const options = parseOptions(process.argv.slice(2));

if (!options.noBuild) {
	runChecked('pnpm', ['run', 'build:plugin'], { shell: true });
}

if (!options.noInstall) {
	installToVault(options.pluginDir);
}

const probes = {};
const failures = [];

if (!options.noReload) {
	// Amarre build->DOM: el DOM mirado viene del build recien compilado.
	// 1. ANTES del reload, guarda la referencia viva en window.__u130Prev.
	//    El reload va dirigido por vault al servidor mediante obsidian-cli:
	//    el disable+enable dentro del mismo eval creaba una instancia nueva
	//    del CODIGO VIEJO (modulo en cache: el DOM seguia con
	//    .vaultman-filters-search-mode y 0 .vaultman-action-cell aunque el
	//    main.js en disco ya fuera el nuevo). Verificado L-16 en vivo.
	// 2. Recarga por el servidor (relee main.js del disco).
	// 3. DESPUES, comprueba en la misma pestana que la instancia es OTRA.
	//    Si es la misma, el plugin no se recargo y la sonda FALLA, no sigue.
	const prevAlive = await execInVault(`(async () => {
		window.__u130Prev = app.plugins?.plugins?.vaultman;
		return Boolean(window.__u130Prev);
	})()`);
	if (!prevAlive) {
		probes['gate.reload-efectivo'] = { ok: false, detail: 'prev-absent' };
		failures.push('reload-no-efectivo');
		printReport({ failures, probes });
		process.exit(1);
	}
	runChecked('obsidian-cli', [`--vault=${options.vault}`, 'plugin:reload', 'id=vaultman'], {
		env: { ...process.env, OBSIDIAN_HOST: options.host },
	});
	const reloaded = await execInVault(`(async () => {
		const after = app.plugins?.plugins?.vaultman;
		if (!after) return 'after-absent';
		return after !== window.__u130Prev ? true : 'same-instance';
	})()`);

	if (reloaded !== true) {
		const detail = typeof reloaded === 'string' ? reloaded : 'reload-no-efectivo';
		probes['gate.reload-efectivo'] = { ok: false, detail };
		failures.push('reload-no-efectivo');
		printReport({ failures, probes });
		process.exit(1);
	}
	probes['gate.reload-efectivo'] = { ok: true, detail: null };
}

if (!(await frameIsOpen())) {
	await execInVault('app.commands.executeCommandById("vaultman:open")');
	const start = Date.now();
	while (Date.now() - start < 3000) {
		if (await frameIsOpen()) break;
		await new Promise((r) => setTimeout(r, 100));
	}
}

const toggleResult = await ensureSearchOpen();
probes['s1.toggle-transicion'] = {
	ok: Boolean(toggleResult?.ok),
	detail: toggleResult?.error ?? null,
};
if (!toggleResult?.ok) {
	failures.push('s1.toggle-transicion');
}

const rawResult = await execInVault(buildProbeCode());
const domResult = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;

Object.assign(probes, domResult.probes);
if (Array.isArray(domResult.failures)) {
	failures.push(...domResult.failures);
}

printReport({ failures, probes });
process.exit(failures.length > 0 ? 1 : 0);

function buildProbeCode() {
	// Promise.race obligatorio: un await colgado dentro de evalCode MATA el
	// puente y deja el web-lab sin responder, no solo esta llamada.
	return `(async () => {
		const deadline = (p, ms) => Promise.race([
			p,
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('probe-timeout')), ms)),
		]);
		// El doble-rAF espera a que el navegador pinte... pero en una pestana
		// de FONDO el navegador congela requestAnimationFrame y no vuelve
		// nunca: la sonda moria con 'probe-timeout' aunque el DOM estuviera
		// perfecto. Y con un vault por carril, como mucho una pestana puede
		// estar visible, asi que ese timeout falso seria la norma, no la
		// excepcion.
		//
		// El plazo lo arregla porque lo que la sonda mira --querySelector y
		// getComputedStyle-- SI funciona con la pestana oculta; lo unico
		// congelado es el reloj de pintado. Verificado el 2026-09-06: con
		// document.hidden === true, las cinco sondas pasan por esta via y
		// ninguna por la anterior.
		const nextPaint = () => Promise.race([
			new Promise((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(resolve))),
			new Promise((resolve) => setTimeout(resolve, 300)),
		]);
		const failures = [];
		const probes = {};
		const check = (name, ok, detail) => {
			probes[name] = { ok: Boolean(ok), detail: detail ?? null };
			if (!ok) failures.push(name);
		};

		const frame = document.querySelector(
			'.workspace-leaf-content[data-type="vaultman-frame"]');
		if (!frame) return JSON.stringify({
			failures: ['frame-absent'], probes: {} });

		await deadline(nextPaint(), 2000);

		// --- SLICE 1 -------------------------------------------------------
		const decorator = frame.querySelector('.vaultman-filters-search-decorator');
		const cells = decorator
			? Array.from(decorator.querySelectorAll('.vaultman-action-cell'))
			: [];
		// El decorador existe y hospeda CELDAS, no botones crudos.
		check('s1.decorator-present', Boolean(decorator));
		check('s1.cells-rendered', cells.length > 0, cells.length);
		// Guarda negativa: las clases viejas no pueden quedar vivas en el DOM.
		check('s1.old-classes-gone',
			frame.querySelectorAll(
				'.vaultman-filters-search-mode, .vaultman-filters-search-create',
			).length === 0);
		// El area tactil se cumple aunque el glifo sea menor (spec-05 test 8).
		// Con 0 celdas el every() seria vacuamente true: se exige al menos una.
		check('s1.touch-target',
			cells.length > 0 && cells.every((cell) => {
				const after = getComputedStyle(cell, '::after');
				return parseFloat(after.minWidth) >= 36
					&& parseFloat(after.minHeight) >= 36;
			}));
		// Cada celda tiene nombre accesible y resuelto por SASI: si SASI no
		// resuelve, CellAction hace fallback al actionId crudo (cellAction.svelte:44,57).
		// La sonda debe fallar si falta la etiqueta o si coincide con el actionId crudo.
		const rawActionIds = new Set([
			'vaultman.search.cycleCategory',
			'vaultman.search.createTarget',
			'vaultman.move.toggleWrite',
			'vaultman.move.toggleOriginDisposition',
			...((typeof app !== 'undefined' && app.plugins?.plugins?.vaultman?.sasiRegistry?.listActions?.().map((a) => a.id)) || []),
		]);
		const invalidLabels = cells
			.map((c) => c.getAttribute('aria-label'))
			.filter((label) => !label || rawActionIds.has(label) || label.startsWith('vaultman.'));
		check(
			's1.labelled',
			cells.length > 0 && invalidLabels.length === 0,
			invalidLabels.length > 0 ? invalidLabels : null,
		);

		${U130_S3_SNIPPET}

		return JSON.stringify({ failures, probes });
	})()`;
}

function installToVault(targetDir) {
	const artifacts = ['main.js', 'styles.css', 'manifest.json'];
	try {
		mkdirSync(targetDir, { recursive: true });
	} catch (error) {
		console.error(`Failed to create target directory ${targetDir}:`, error);
		process.exit(1);
	}
	for (const artifact of artifacts) {
		const src = path.join(process.cwd(), artifact);
		const dest = path.join(targetDir, artifact);
		try {
			copyFileSync(src, dest);
		} catch (error) {
			console.error(`Failed to install ${artifact} to ${dest}:`, error);
			process.exit(1);
		}
	}
	console.log(`Installed fresh build artifacts to ${targetDir}`);
}

async function execInVault(evalCode, timeout = 25000) {
	// El CLI manda el eval SIN vault y se lo queda la pestana que sondee
	// primero; con dos pestanas abiertas eso puede ser la del dev. El servidor
	// si sabe dirigir por vault (server/api/cli.js, commandMatchesPoller), asi
	// que la sonda va por HTTP y acotada, no por el CLI.
	const response = await fetch(`${options.host}/api/cli/exec`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ evalCode, vault: options.vault, timeout }),
	});
	const payload = await response.json();
	if (!payload.ok) throw new Error(payload.error ?? 'exec failed');
	return payload.result;
}

async function frameIsOpen() {
	const result = await execInVault(
		'Boolean(document.querySelector(\'.workspace-leaf-content[data-type="vaultman-frame"]\'))',
	);
	return Boolean(result);
}

/**
 * Antes aqui vivia `ensureActiveTab()`, que si la pestana estaba oculta le
 * ROBABA EL FOCO DE VENTANA AL DEV (AppActivate por PowerShell en el pc) y,
 * si aun asi seguia oculta, ABRIA OTRA PESTANA del mismo vault. Las dos cosas
 * estan prohibidas: la segunda es la fuente de las pestanas duplicadas que el
 * dev reporto, y la primera le arranca la ventana de las manos mientras
 * trabaja.
 *
 * No hace falta ninguna de las dos: lo que la sonda mira --querySelector y
 * getComputedStyle-- funciona igual con la pestana oculta. Lo unico congelado
 * en segundo plano es requestAnimationFrame, y para eso estan los plazos.
 *
 * Abrir la pestana, si falta, es de `weblab-ensure-vault`, que es idempotente
 * y lleva lock. Repartir un vault por carril, de `weblab-claim-vault`.
 */

async function ensureSearchOpen() {
	return await execInVault(`(async () => {
		const leaves = app.workspace.getLeavesOfType('vaultman-frame');
		for (let i = leaves.length - 1; i > 0; i--) {
			leaves[i].detach();
		}
		const frame = document.querySelector('.workspace-leaf-content[data-type="vaultman-frame"]');
		if (!frame) return { ok: false, error: 'frame-absent' };
		const toggle = frame.querySelector('[data-vaultman-search-toggle="true"]');
		if (!toggle) return { ok: false, error: 'search-toggle-absent' };

		let dec = frame.querySelector('.vaultman-filters-search-decorator');
		if (!dec) {
			toggle.click();
			const startOpen = Date.now();
			while (Date.now() - startOpen < 2000) {
				await new Promise((r) => setTimeout(r, 50));
				if (frame.querySelector('.vaultman-filters-search-decorator')) break;
			}
			dec = frame.querySelector('.vaultman-filters-search-decorator');
			if (!dec) return { ok: false, error: 'abrir-no-aparece' };
		}

		// Cuando el decorador YA exista, cierra y vuelve a abrir la busqueda
		// para ejercitar la transicion de verdad, y verifica que desaparece y reaparece.
		toggle.click();
		const startClose = Date.now();
		let closed = false;
		while (Date.now() - startClose < 2000) {
			await new Promise((r) => setTimeout(r, 50));
			if (!frame.querySelector('.vaultman-filters-search-decorator')) {
				closed = true;
				break;
			}
		}
		if (!closed) return { ok: false, error: 'cerrar-no-desaparece' };

		toggle.click();
		const startReopen = Date.now();
		let reopened = false;
		while (Date.now() - startReopen < 2000) {
			await new Promise((r) => setTimeout(r, 50));
			if (frame.querySelector('.vaultman-filters-search-decorator')) {
				reopened = true;
				break;
			}
		}
		if (!reopened) return { ok: false, error: 'abrir-no-reaparece' };

		return { ok: true };
	})()`);
}

function parseOptions(args) {
	const parsed = {
		vault: '',
		host: 'http://127.0.0.1:3000',
		noBuild: false,
		noInstall: false,
		noReload: false,
		pluginDir: '',
	};
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--') continue;
		if (arg === '--no-build') parsed.noBuild = true;
		else if (arg === '--no-install') parsed.noInstall = true;
		else if (arg === '--no-reload') parsed.noReload = true;
		else if (arg === '--vault' && i + 1 < args.length) {
			parsed.vault = args[++i].trim();
		} else if (arg.startsWith('--vault=')) {
			parsed.vault = arg.slice(arg.indexOf('=') + 1).trim();
		} else if (arg === '--host' && i + 1 < args.length) {
			parsed.host = args[++i].trim().replace(/\/+$/, '');
		} else if (arg.startsWith('--host=')) {
			parsed.host = arg.slice(arg.indexOf('=') + 1).trim().replace(/\/+$/, '');
		} else if (arg === '--plugin-dir' && i + 1 < args.length) {
			parsed.pluginDir = args[++i].trim();
		} else if (arg.startsWith('--plugin-dir=')) {
			parsed.pluginDir = arg.slice(arg.indexOf('=') + 1).trim();
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}
	if (!parsed.vault) {
		console.error('usa: V=$(weblab-claim-vault <carril>) && pnpm run smoke:u130 -- --vault="$V"');
		process.exit(1);
	}
	if (!parsed.host) throw new Error('--host must not be empty');
	const rawPluginDir =
		parsed.pluginDir ||
		process.env.VAULTMAN_PLUGIN_DIR ||
		path.join(
			os.homedir(),
			'storage/shared/Documents',
			parsed.vault,
			'.obsidian/plugins/vaultman',
		);
	parsed.pluginDir = rawPluginDir.startsWith('~/')
		? path.join(os.homedir(), rawPluginDir.slice(2))
		: rawPluginDir;
	return parsed;
}

function printReport(result) {
	for (const [name, probe] of Object.entries(result.probes ?? {})) {
		const detail =
			probe?.detail === null || probe?.detail === undefined
				? ''
				: ` (${JSON.stringify(probe.detail)})`;
		console.log(`${name}: ${probe?.ok ? 'ok' : 'FAIL'}${detail}`);
	}
	if (result.failures.length > 0) {
		console.error(`U130 smoke failures: ${result.failures.join(', ')}`);
	}
}

function runChecked(
	command,
	args,
	{ print = true, shell = false, env = process.env } = {},
) {
	const result = spawnSync(command, args, {
		cwd: process.cwd(),
		encoding: 'utf8',
		shell: process.platform === 'win32' && shell,
		env,
	});
	if (print && result.stdout) process.stdout.write(result.stdout);
	if (print && result.stderr) process.stderr.write(result.stderr);
	if (result.error) throw result.error;
	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} exited ${result.status}`);
	}
	return result;
}
