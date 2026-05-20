import { spawnSync } from 'node:child_process';

const VAULT = 'plugin-dev';
const VIEWS = new Set(['auto', 'tree', 'list', 'table', 'grid', 'cards']);
const MODES = new Set(['smoke', 'stress']);
const PATTERNS = new Set(['jump', 'smooth', 'monitor']);
const SCROLL_TARGET_SELECTORS = {
	tree: '.vm-tree-virtual-outer',
	list: '.vm-view-list',
	table: '.vm-node-table',
	grid: '.vm-node-grid',
	cards: '.vm-node-cards',
};

const options = parseOptions(process.argv.slice(2));

if (options.help) {
	printHelp();
	process.exit(0);
}

if (!options.noBuild) runChecked('pnpm', ['run', 'build'], { shellOnWindows: true });
if (!options.noReload) {
	runChecked('obsidian', [`vault=${VAULT}`, 'plugin:reload', 'id=vaultman']);
}
if (!options.noOpen) {
	if (scrollTargetAlreadyOpen(options.view)) {
		console.log(
			`Vaultman Explorer scroll target already open for view=${options.view}; skipping vaultman:open.`,
		);
	} else if (vaultmanFrameAlreadyOpen()) {
		console.log('Vaultman frame already open; waiting for requested scroll target.');
	} else {
		runChecked('obsidian', [`vault=${VAULT}`, 'command', 'id=vaultman:open']);
	}
}

const evalResult = runChecked('obsidian', [
	`vault=${VAULT}`,
	'eval',
	`code=${buildEvalCode(options)}`,
], { printOutput: false });
const snapshot = parseJsonFromOutput(evalResult.stdout);
printBurstSummary(snapshot);

const errors = runChecked('obsidian', [`vault=${VAULT}`, 'dev:errors']);
const hasDevErrors = !(errors.stdout ?? '').includes('No errors captured.');
const burstPassed = snapshot.scrollBurst?.passed === true;

if (!burstPassed || hasDevErrors) {
	if (hasDevErrors) {
		console.error(errors.stdout.trim() || errors.stderr.trim() || 'Obsidian dev errors reported.');
	}
	process.exit(1);
}

function parseOptions(args) {
	const parsed = {
		help: false,
		mode: 'smoke',
		view: 'auto',
		pattern: 'jump',
		jumps: undefined,
		scrollStepPx: undefined,
		visualDelayMs: undefined,
		overlay: true,
		strictFlicker: false,
		noBuild: false,
		noReload: false,
		noOpen: false,
	};

	for (const arg of args) {
		if (arg === '--help' || arg === '-h') parsed.help = true;
		else if (arg === '--no-build') parsed.noBuild = true;
		else if (arg === '--no-reload') parsed.noReload = true;
		else if (arg === '--no-open') parsed.noOpen = true;
		else if (arg === '--no-overlay') parsed.overlay = false;
		else if (arg === '--strict-flicker') parsed.strictFlicker = true;
		else if (arg.startsWith('--mode=')) parsed.mode = valueFor(arg);
		else if (arg.startsWith('--view=')) parsed.view = valueFor(arg);
		else if (arg.startsWith('--pattern=')) parsed.pattern = valueFor(arg);
		else if (arg.startsWith('--jumps=')) parsed.jumps = integerValue(arg, 'jumps');
		else if (arg.startsWith('--scroll-step-px=')) {
			parsed.scrollStepPx = integerValue(arg, 'scroll-step-px');
		}
		else if (arg.startsWith('--visual-delay-ms=')) {
			parsed.visualDelayMs = integerValue(arg, 'visual-delay-ms');
		} else {
			fail(`Unknown argument: ${arg}`);
		}
	}

	if (!MODES.has(parsed.mode)) fail(`Unknown mode "${parsed.mode}". Use smoke or stress.`);
	if (!VIEWS.has(parsed.view)) {
		fail(`Unknown view "${parsed.view}". Use auto, tree, list, table, grid, or cards.`);
	}
	if (!PATTERNS.has(parsed.pattern)) {
		fail(`Unknown pattern "${parsed.pattern}". Use jump, smooth, or monitor.`);
	}

	parsed.jumps ??= parsed.mode === 'stress' ? 1000 : 100;
	parsed.scrollStepPx ??= 18;
	parsed.visualDelayMs ??= parsed.mode === 'stress' ? 8 : 24;
	return parsed;
}

function valueFor(arg) {
	return arg.slice(arg.indexOf('=') + 1);
}

function integerValue(arg, name) {
	const value = Number(valueFor(arg));
	if (!Number.isInteger(value) || value < 0) fail(`--${name} must be a non-negative integer.`);
	return value;
}

function buildEvalCode({ view, pattern, jumps, scrollStepPx, visualDelayMs, overlay, strictFlicker }) {
	const scenarioOptions = JSON.stringify({
		view,
		pattern,
		jumps,
		scrollStepPx,
		visualDelayMs,
		overlay,
		strictFlicker: strictFlicker === true,
	});
	return [
		'Promise.resolve()',
		'.then(() => {',
		"  if (!window.__vaultmanPerfProbe) throw new Error('window.__vaultmanPerfProbe missing');",
		`  return window.__vaultmanPerfProbe.run('explorer-scroll-burst-live', ${scenarioOptions});`,
		'})',
		'.then((result) => {',
		'  const b = result.scrollBurst;',
		'  return JSON.stringify({',
		'    scenario: result.scenario,',
		'    scrollBurst: b ? {',
		'      requestedView: b.requestedView,',
		'      view: b.view,',
		'      pattern: b.pattern,',
		'      jumpCount: b.jumpCount,',
		'      blankFrameCount: b.blankFrameCount,',
		'      blankWindowOver100ms: b.blankWindowOver100ms,',
		'      blankWindowOver250ms: b.blankWindowOver250ms,',
		'      maxBlankDurationMs: b.maxBlankDurationMs,',
		'      maxViewportGapPx: b.maxViewportGapPx,',
		'      maxEventLoopDelayMs: b.maxEventLoopDelayMs,',
		'      longAnimationFrameCount: b.longAnimationFrameCount,',
		'      maxLongAnimationFrameMs: b.maxLongAnimationFrameMs,',
		'      longTaskCount: b.longTaskCount,',
		'      maxLongTaskMs: b.maxLongTaskMs,',
		'      strictFlicker: b.strictFlicker,',
		'      flickerFrameCount: b.flickerFrameCount,',
		'      maxFlickerRowCount: b.maxFlickerRowCount,',
		'      passed: b.passed,',
		'      reason: b.reason,',
		'    } : undefined,',
		'  });',
		'})',
	].join('\n');
}

function scrollTargetAlreadyOpen(view) {
	const result = runChecked(
		'obsidian',
		[`vault=${VAULT}`, 'eval', `code=${buildTargetPresenceCode(view)}`],
		{ printOutput: false },
	);
	return parseJsonFromOutput(result.stdout).present === true;
}

function vaultmanFrameAlreadyOpen() {
	const result = runChecked(
		'obsidian',
		[`vault=${VAULT}`, 'eval', `code=${buildFramePresenceCode()}`],
		{ printOutput: false },
	);
	return parseJsonFromOutput(result.stdout).present === true;
}

function buildTargetPresenceCode(view) {
	const selectors =
		view === 'auto'
			? Object.values(SCROLL_TARGET_SELECTORS)
			: [SCROLL_TARGET_SELECTORS[view]].filter(Boolean);
	const expression = selectors
		.map((selector) => `document.querySelector(${JSON.stringify(selector)})`)
		.join(' || ');
	return `JSON.stringify({present: Boolean(${expression || 'false'})})`;
}

function buildFramePresenceCode() {
	return 'JSON.stringify({present: Boolean(document.querySelector(\'.workspace-leaf-content[data-type="vm-frame"], .vm-frame\'))})';
}

function runChecked(command, args, { shellOnWindows = false, printOutput = true } = {}) {
	const useShell = shellOnWindows && process.platform === 'win32';
	const result = spawnSync(command, args, {
		encoding: 'utf8',
		shell: useShell,
	});
	if (printOutput && result.stdout) process.stdout.write(result.stdout);
	if (printOutput && result.stderr) process.stderr.write(result.stderr);
	if (result.error) fail(result.error.message);
	if (result.status !== 0) {
		fail(`Command failed (${result.status}): ${command} ${args.join(' ')}`);
	}
	return result;
}

function parseJsonFromOutput(output) {
	const text = output.trim();
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start < 0 || end < start) {
		fail(`Could not find JSON in Obsidian eval output:\n${text}`);
	}
	try {
		return JSON.parse(text.slice(start, end + 1));
	} catch (error) {
		fail(`Could not parse Obsidian eval JSON: ${error.message}\n${text}`);
	}
}

function printBurstSummary(snapshot) {
	const burst = snapshot.scrollBurst;
	if (!burst) fail('Obsidian eval returned no scrollBurst report.');
	const status = burst.passed ? 'PASS' : 'FAIL';
	console.log(
		[
			`Explorer scroll smoke ${status}`,
			`vault=${VAULT}`,
			`view=${burst.view}`,
			`pattern=${burst.pattern ?? 'jump'}`,
			`jumps=${burst.jumpCount}`,
			`blankFrames=${burst.blankFrameCount}`,
			`blank>100ms=${burst.blankWindowOver100ms}`,
			`blank>250ms=${burst.blankWindowOver250ms}`,
			`maxBlank=${Math.round(burst.maxBlankDurationMs)}ms`,
			`maxViewportGap=${Math.round(burst.maxViewportGapPx ?? 0)}px`,
			`maxDelay=${Math.round(burst.maxEventLoopDelayMs)}ms`,
			`LoAF=${burst.longAnimationFrameCount ?? 0}/${Math.round(
				burst.maxLongAnimationFrameMs ?? 0,
			)}ms`,
			`longtask=${burst.longTaskCount ?? 0}/${Math.round(burst.maxLongTaskMs ?? 0)}ms`,
			...(burst.strictFlicker
				? [
						`flickerFrames=${burst.flickerFrameCount}`,
						`maxFlickerRows=${burst.maxFlickerRowCount}`,
					]
				: []),
		].join(' '),
	);
}

function printHelp() {
	console.log(`Usage: node scripts/run-explorer-scroll-smoke.mjs [options]

Runs the live Vaultman Explorer scroll burst smoke against vault=${VAULT}.

Options:
  --mode=smoke|stress          smoke defaults to 100 jumps, stress to 1000
  --view=auto|tree|list|table|grid|cards
  --pattern=jump|smooth|monitor
                               jump uses ratios, smooth uses scrollTop steps, monitor samples manual scroll
  --jumps=N                    override jump count
  --scroll-step-px=N           smooth-mode scroll distance per sample
  --visual-delay-ms=N          delay between jumps so the movement is visible
  --strict-flicker             fail if node-element children disappear during active scroll
  --no-build                   skip pnpm run build
  --no-reload                  skip obsidian plugin:reload id=vaultman
  --no-open                    skip obsidian command id=vaultman:open
  --no-overlay                 run without the live in-app status overlay
  --help                       show this help

Examples:
  pnpm smoke:scroll
  pnpm smoke:scroll -- --view=tree --jumps=200
  pnpm smoke:scroll -- --view=tree --pattern=smooth --jumps=400 --visual-delay-ms=0
  pnpm smoke:scroll -- --view=tree --pattern=monitor --jumps=600 --visual-delay-ms=16
  pnpm smoke:scroll:stress -- --view=list
`);
}

function fail(message) {
	console.error(message);
	process.exit(1);
}
