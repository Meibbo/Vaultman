import { spawnSync } from 'node:child_process';

const options = parseOptions(process.argv.slice(2));

if (!options.noBuild) runChecked('pnpm', ['run', 'build'], { shell: true });
if (!options.noReload) {
	runChecked('obsidian', [
		`vault=${options.vault}`,
		'plugin:reload',
		'id=vaultman',
	]);
}
if (!frameIsOpen()) {
	runChecked('obsidian', [
		`vault=${options.vault}`,
		'command',
		'id=vaultman:open',
	]);
}

const interactionResult = runEval(buildInteractionEvalCode());
const lifecycleResult = runEval(buildLifecycleEvalCode());
const result = {
	actions: interactionResult.actions,
	lifecycle: lifecycleResult.lifecycle,
	interactionProbe: interactionResult.interactionProbe,
	lifecycleProbe: lifecycleResult.lifecycleProbe,
	lifecyclePerf: lifecycleResult.lifecyclePerf,
};

printReport(result);
const errors = runChecked('obsidian', [
	`vault=${options.vault}`,
	'dev:errors',
]);
const hasDevErrors = !(errors.stdout ?? '').includes('No errors captured.');
const skippedActions = result.actions.filter((sample) => sample.skipped);
const overBudget = [...result.actions, ...result.lifecycle].filter(
	(sample) => sample.elapsedMs > options.maxStallMs,
);

if (hasDevErrors || skippedActions.length > 0 || overBudget.length > 0) {
	if (hasDevErrors) console.error(errors.stdout.trim());
	if (skippedActions.length > 0) {
		console.error(
			`Scene smoke skipped required actions: ${skippedActions
				.map((sample) => sample.name)
				.join(', ')}`,
		);
	}
	if (overBudget.length > 0) {
		console.error(
			`Scene smoke exceeded ${options.maxStallMs}ms: ${overBudget
				.map((sample) => `${sample.name}=${sample.elapsedMs.toFixed(1)}ms`)
				.join(', ')}`,
		);
	}
	process.exit(1);
}

function parseOptions(args) {
	const parsed = {
		vault: 'plugin-dev',
		maxStallMs: 100,
		noBuild: false,
		noReload: false,
	};
	for (const arg of args) {
		if (arg === '--no-build') parsed.noBuild = true;
		else if (arg === '--no-reload') parsed.noReload = true;
		else if (arg.startsWith('--vault=')) {
			parsed.vault = arg.slice(arg.indexOf('=') + 1).trim();
		} else if (arg.startsWith('--max-stall-ms=')) {
			parsed.maxStallMs = Number(arg.slice(arg.indexOf('=') + 1));
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}
	if (!parsed.vault) throw new Error('--vault must not be empty');
	if (!Number.isFinite(parsed.maxStallMs) || parsed.maxStallMs <= 0) {
		throw new Error('--max-stall-ms must be a positive number');
	}
	return parsed;
}

function frameIsOpen() {
	const output = runChecked(
		'obsidian',
		[
			`vault=${options.vault}`,
			'eval',
			'code=Boolean(document.querySelector(\'.workspace-leaf-content[data-type="vaultman-frame"]\'))',
		],
		{ print: false },
	).stdout;
	return /\btrue\b/i.test(output ?? '');
}

function runEval(code) {
	return parseJson(
		runChecked(
			'obsidian',
			[`vault=${options.vault}`, 'eval', `code=${code}`],
			{ print: false },
		).stdout,
	);
}

function buildInteractionEvalCode() {
	return `(async () => {
		const nextPaint = () => new Promise((resolve) =>
			requestAnimationFrame(() => requestAnimationFrame(resolve)));
		const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));
		const present = () => Boolean(document.querySelector(
			'.workspace-leaf-content[data-type="vaultman-frame"]'));
		const frameLeaves = () =>
			app.workspace.getLeavesOfType('vaultman-frame');
		const probe = window.__vaultmanPerfProbe;
		if (!present() || !probe) {
			return JSON.stringify({ error: 'Vaultman frame or perf probe unavailable' });
		}
		for (const leaf of frameLeaves().slice(1)) leaf.detach();
		while (frameLeaves().length > 1) await nextTask();
		for (let tick = 0; tick < 4; tick += 1) await nextTask();
		window.__vaultmanPerf?.clear?.();
		probe.reset();
		const filtersTarget = document.querySelector(
			'[data-vaultman-page-id="filters"]',
		);
		if (filtersTarget instanceof HTMLElement) {
			filtersTarget.click();
			await nextPaint();
		}
		const actions = [];
		const panelNode = (localId) =>
			Array.from(document.querySelectorAll('[data-panel-widget-node-id]'))
				.find((element) =>
					element.getAttribute('data-panel-widget-node-id') ===
						'files:' + localId);
		const menuItemByIcon = (iconClass) =>
			Array.from(document.querySelectorAll('.menu-item'))
				.find((element) => element.querySelector('.' + iconClass));
		const runAction = async (name, selector) => {
			const element = document.querySelector(selector);
			if (!element) {
				actions.push({ name, elapsedMs: 0, skipped: true });
				return;
			}
			const started = performance.now();
			element.click();
			const commandMs = performance.now() - started;
			await nextPaint();
			actions.push({
				name,
				elapsedMs: commandMs,
				commandMs,
				wallMs: performance.now() - started,
				maxLongTaskMs: 0,
			});
		};
		const runMenuAction = async (name, localId, iconClass) => {
			panelNode(localId)?.click();
			await nextTask();
			const item = menuItemByIcon(iconClass);
			if (!item) {
				actions.push({ name, elapsedMs: 0, skipped: true });
				return;
			}
			const started = performance.now();
			item.click();
			const commandMs = performance.now() - started;
			await nextTask();
			actions.push({
				name,
				elapsedMs: commandMs,
				commandMs,
				wallMs: performance.now() - started,
				maxLongTaskMs: 0,
			});
		};
		for (const [name, selector] of [
			['expand-or-collapse', '[data-panel-widget-node-id$=":toggle-expansion"]'],
			['collapse-or-expand', '[data-panel-widget-node-id$=":toggle-expansion"]'],
			['reveal-active-file', '[data-panel-widget-node-id$=":reveal-active-file"]'],
		]) await runAction(name, selector);
		for (const [name, localId, iconClass] of [
			['toggle-cell-on', 'view', 'lucide-calendar-clock'],
			['toggle-cell-off', 'view', 'lucide-calendar-clock'],
			['change-sort', 'sort', 'lucide-file-type'],
			['restore-sort', 'sort', 'lucide-a-large-small'],
			['toggle-nested-off', 'sort', 'lucide-list-tree'],
			['toggle-nested-on', 'sort', 'lucide-list-tree'],
		]) await runMenuAction(name, localId, iconClass);
		const interactionProbe = probe.snapshot();
		return JSON.stringify({
			actions,
			lifecycle: [],
			interactionProbe,
			lifecycleProbe: null,
			lifecyclePerf: [],
		});
	})()`;
}

function buildLifecycleEvalCode() {
	return `(async () => {
		const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));
		const present = () => Boolean(document.querySelector(
			'.workspace-leaf-content[data-type="vaultman-frame"]'));
		const frameLeaves = () =>
			app.workspace.getLeavesOfType('vaultman-frame');
		const observeLongTasks = () => {
			let maxLongTaskMs = 0;
			const supportedEntryTypes =
				window.PerformanceObserver?.supportedEntryTypes ?? [];
			if (!supportedEntryTypes.includes('longtask')) return {
				stop: () => maxLongTaskMs,
			};
			const observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					maxLongTaskMs = Math.max(maxLongTaskMs, entry.duration);
				}
			});
			observer.observe({ type: 'longtask', buffered: false });
			return {
				stop: () => {
					for (const entry of observer.takeRecords()) {
						maxLongTaskMs = Math.max(maxLongTaskMs, entry.duration);
					}
					observer.disconnect();
					return maxLongTaskMs;
				},
			};
		};
		const probe = window.__vaultmanPerfProbe;
		if (!present() || !probe) {
			return JSON.stringify({ error: 'Vaultman frame or perf probe unavailable' });
		}
		window.__vaultmanPerf?.clear?.();
		probe.reset();
		const lifecycle = [];
		const toggle = async (name, expectedPresent, operation) => {
			const longTasks = observeLongTasks();
			const started = performance.now();
			operation();
			const commandMs = performance.now() - started;
			for (let attempt = 0; attempt < 8; attempt += 1) {
				await nextTask();
				if (present() === expectedPresent && attempt > 0) break;
			}
			for (let tick = 0; tick < 4; tick += 1) await nextTask();
			const wallMs = performance.now() - started;
			const maxLongTaskMs = longTasks.stop();
			lifecycle.push({
				name,
				elapsedMs: Math.max(commandMs, maxLongTaskMs),
				commandMs,
				wallMs,
				maxLongTaskMs,
			});
		};
		await toggle('close-scene', false, () => {
			const leaf = frameLeaves()[0];
			if (leaf) leaf.detach();
		});
		await toggle('open-scene', true, () => {
			app.commands.executeCommandById('vaultman:open');
		});
		const lifecycleProbe = window.__vaultmanPerfProbe?.snapshot?.();
		const lifecyclePerf = window.__vaultmanPerf?.recent?.(100) ?? [];
		return JSON.stringify({
			actions: [],
			lifecycle,
			interactionProbe: null,
			lifecycleProbe,
			lifecyclePerf,
		});
	})()`;
}

function parseJson(output) {
	const lines = String(output ?? '')
		.split(/\r?\n/)
		.map((line) => line.trim().replace(/^=>\s*/, ''))
		.filter(Boolean);
	for (let index = lines.length - 1; index >= 0; index -= 1) {
		try {
			const parsed = JSON.parse(lines[index]);
			if (parsed?.error) throw new Error(parsed.error);
			if (Array.isArray(parsed?.actions)) return parsed;
		} catch {
			// Continue past CLI framing lines until the emitted payload is found.
		}
	}
	throw new Error(`Scene smoke did not return JSON:\n${output}`);
}

function printReport(result) {
	for (const sample of [...result.actions, ...result.lifecycle]) {
		const suffix = sample.skipped ? ' (skipped)' : '';
		const lifecycleDetail =
			typeof sample.commandMs === 'number'
				? ` (command=${sample.commandMs.toFixed(1)}ms, longtask=${sample.maxLongTaskMs.toFixed(1)}ms, wall=${sample.wallMs.toFixed(1)}ms)`
				: '';
		console.log(
			`${sample.name}: ${sample.elapsedMs.toFixed(1)}ms${suffix}${lifecycleDetail}`,
		);
	}
	const timings = {
		...(result.interactionProbe?.timings ?? {}),
		...(result.lifecycleProbe?.timings ?? {}),
	};
	for (const [name, timing] of Object.entries(timings)) {
		if (!name.startsWith('scene.')) continue;
		console.log(`${name}: max=${timing.maxMs.toFixed(1)}ms count=${timing.count}`);
	}
	for (const entry of result.lifecyclePerf ?? []) {
		if (entry.ms < 50) continue;
		console.log(
			`${entry.label}: ${entry.ms.toFixed(1)}ms ${JSON.stringify(entry.detail ?? {})}`,
		);
	}
}

function runChecked(command, args, { print = true, shell = false } = {}) {
	const result = spawnSync(command, args, {
		cwd: process.cwd(),
		encoding: 'utf8',
		shell: process.platform === 'win32' && shell,
	});
	if (print && result.stdout) process.stdout.write(result.stdout);
	if (print && result.stderr) process.stderr.write(result.stderr);
	if (result.error) throw result.error;
	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} exited ${result.status}`);
	}
	return result;
}
