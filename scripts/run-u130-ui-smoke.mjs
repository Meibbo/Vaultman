import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const options = parseOptions(process.argv.slice(2));

if (!options.noBuild) {
	runChecked('pnpm', ['run', 'build:plugin'], { shell: true });
}

if (!options.noInstall) {
	installToVault(options.pluginDir);
}

if (!options.noReload) {
	// El reload va dirigido por vault al servidor mediante obsidian-cli
	runChecked('obsidian-cli', [`--vault=${options.vault}`, 'plugin:reload', 'id=vaultman'], {
		env: { ...process.env, OBSIDIAN_HOST: options.host },
	});
}

if (!(await frameIsOpen())) {
	await execInVault('app.commands.executeCommandById("vaultman:open")');
	const start = Date.now();
	while (Date.now() - start < 3000) {
		if (await frameIsOpen()) break;
		await new Promise((r) => setTimeout(r, 100));
	}
}
await ensureSearchOpen();

const rawResult = await execInVault(buildProbeCode());
const result = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
printReport(result);
process.exit(result.failures.length > 0 ? 1 : 0);

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
		check('s1.touch-target',
			cells.every((cell) => {
				const after = getComputedStyle(cell, '::after');
				return parseFloat(after.minWidth) >= 36
					&& parseFloat(after.minHeight) >= 36;
			}));
		// Cada celda tiene nombre accesible: un icono sin etiqueta no es un
		// control, es un adorno.
		check('s1.labelled', cells.every((c) => Boolean(c.getAttribute('aria-label'))));

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
	await execInVault(`(async () => {
		const leaves = app.workspace.getLeavesOfType('vaultman-frame');
		for (let i = leaves.length - 1; i > 0; i--) {
			leaves[i].detach();
		}
		const frame = document.querySelector('.workspace-leaf-content[data-type="vaultman-frame"]');
		if (!frame) return;
		const dec = frame.querySelector('.vaultman-filters-search-decorator');
		if (dec) return;
		const toggle = frame.querySelector('[data-vaultman-search-toggle="true"]');
		if (toggle) {
			toggle.click();
			// Sondear con requestAnimationFrame colgaba la llamada entera en
			// una pestana de fondo: el navegador lo congela y el await no
			// vuelve nunca, asi que ni el plazo de 2000 ms se llegaba a
			// evaluar. Con setTimeout el reloj sigue corriendo oculto.
			const start = Date.now();
			while (Date.now() - start < 2000) {
				await new Promise((r) => setTimeout(r, 50));
				if (frame.querySelector('.vaultman-filters-search-decorator')) return;
			}
		}
	})()`);
}

function parseOptions(args) {
	const parsed = {
		vault: 'plugin-dev',
		host: 'http://127.0.0.1:3000',
		maxStallMs: 100,
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
		} else if (arg === '--max-stall-ms' && i + 1 < args.length) {
			parsed.maxStallMs = Number(args[++i]);
		} else if (arg.startsWith('--max-stall-ms=')) {
			parsed.maxStallMs = Number(arg.slice(arg.indexOf('=') + 1));
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}
	if (!parsed.vault) throw new Error('--vault must not be empty');
	if (!parsed.host) throw new Error('--host must not be empty');
	if (!Number.isFinite(parsed.maxStallMs) || parsed.maxStallMs <= 0) {
		throw new Error('--max-stall-ms must be a positive number');
	}
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
