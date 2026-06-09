import { spawnSync } from 'node:child_process';

const DEFAULT_VAULT = 'plugin-dev';
const VIEWS = new Set(['auto', 'tree', 'list', 'table', 'grid', 'cards']);
const MODES = new Set(['smoke', 'stress']);
const PATTERNS = new Set(['jump', 'smooth', 'monitor', 'thumb']);
const SURFACES = new Set(['current', 'files']);
const SCROLL_TARGET_SELECTORS = {
	tree: '.vaultman-tree-virtual-viewport, .vm-tree-virtual-outer',
	list: '.vm-view-list',
	table: '.vaultman-node-table-scroll, .vaultman-files-table, .vm-node-table',
	grid: '.vaultman-files-grid-scroll, .vm-node-grid',
	cards: '.vm-node-cards',
};
const SCROLL_ROW_SELECTORS = {
	tree: '.vaultman-tree-row, .vm-tree-virtual-row:not([data-sticky="true"])',
	list: '.vm-view-list-row[data-id], .vm-view-list-row',
	table:
		'.vaultman-node-table-row[data-id], .vaultman-node-table-row, .vaultman-file-table-row, .vaultman-file-row, .vm-node-table-row[data-id], .vm-node-table-row',
	grid: '.vaultman-files-grid-card, .vm-node-grid-tile[data-id], .vm-node-grid-row',
	cards: '.vm-node-card[data-id], .vm-node-card-row',
};
const SCROLL_TEXT_SELECTORS = {
	tree:
		'.vaultman-tree-label, .vaultman-tree-type, .vaultman-tree-count, .vaultman-tree-row, .vm-tree-label, .vm-tree-field, .vm-tree-count, .vm-tree-virtual-row',
	list: '.vm-view-list-label, .vm-view-list-detail, .vm-view-list-row',
	table:
		'.vaultman-node-table-label, .vaultman-node-table-type, .vaultman-file-name, .vaultman-file-ext, .vaultman-file-row, .vaultman-node-table-row, .vm-node-table-primary, .vm-node-table-cell, .vm-node-table-row',
	grid:
		'.vaultman-files-grid-card-name, .vaultman-files-grid-card-ext, .vaultman-files-grid-card, .vm-node-grid-label, .vm-node-grid-field, .vm-node-grid-tile',
	cards: '.vm-node-card-field, .vm-node-card',
};
const VIEW_MODE_LABELS = {
	tree: 'Tree',
	list: 'List',
	table: 'Table',
	grid: 'Grid',
	cards: 'Cards',
};

const options = parseOptions(process.argv.slice(2));

if (options.help) {
	printHelp();
	process.exit(0);
}

if (!options.noBuild) runChecked('pnpm', ['run', 'build'], { shellOnWindows: true });
if (!options.noReload) {
	runChecked('obsidian', [vaultArg(), 'plugin:reload', 'id=vaultman']);
}
if (!options.noOpen) {
	if (scrollTargetAlreadyOpen(options.view)) {
		console.log(
			`Vaultman Explorer scroll target already open for view=${options.view}; skipping vaultman:open.`,
		);
	} else if (vaultmanFrameAlreadyOpen()) {
		console.log('Vaultman frame already open; checking requested scroll target.');
	} else {
		runChecked('obsidian', [vaultArg(), 'command', 'id=vaultman:open']);
	}
}
ensureExplorerSurfaceOpen(options.surface);
ensureScrollTargetOpen(options.view);

const snapshot =
	options.pattern === 'thumb'
		? runThumbDragSmoke(options)
		: parseJsonFromOutput(
				runChecked(
					'obsidian',
					[vaultArg(), 'eval', `code=${buildEvalCode(options)}`],
					{ printOutput: false },
				).stdout,
			);
printBurstSummary(snapshot, options.vault);

const errors = runChecked('obsidian', [vaultArg(), 'dev:errors']);
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
		vault: DEFAULT_VAULT,
		mode: 'smoke',
		view: 'auto',
		surface: 'files',
		pattern: 'jump',
		jumps: undefined,
		scrollStepPx: undefined,
		visualDelayMs: undefined,
		overlay: true,
		strictFlicker: false,
		strictIdleMs: undefined,
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
		else if (arg.startsWith('--vault=')) parsed.vault = valueFor(arg);
		else if (arg.startsWith('--mode=')) parsed.mode = valueFor(arg);
		else if (arg.startsWith('--view=')) parsed.view = valueFor(arg);
		else if (arg.startsWith('--surface=')) parsed.surface = valueFor(arg);
		else if (arg.startsWith('--pattern=')) parsed.pattern = valueFor(arg);
		else if (arg.startsWith('--jumps=')) parsed.jumps = integerValue(arg, 'jumps');
		else if (arg.startsWith('--scroll-step-px=')) {
			parsed.scrollStepPx = integerValue(arg, 'scroll-step-px');
		} else if (arg.startsWith('--strict-idle-ms=')) {
			parsed.strictIdleMs = integerValue(arg, 'strict-idle-ms');
		} else if (arg.startsWith('--visual-delay-ms=')) {
			parsed.visualDelayMs = integerValue(arg, 'visual-delay-ms');
		} else {
			fail(`Unknown argument: ${arg}`);
		}
	}

	parsed.vault = parsed.vault.trim();
	if (!parsed.vault) fail('--vault must be a non-empty Obsidian vault name.');
	if (!MODES.has(parsed.mode)) fail(`Unknown mode "${parsed.mode}". Use smoke or stress.`);
	if (!VIEWS.has(parsed.view)) {
		fail(`Unknown view "${parsed.view}". Use auto, tree, list, table, grid, or cards.`);
	}
	if (!SURFACES.has(parsed.surface)) {
		fail(`Unknown surface "${parsed.surface}". Use current or files.`);
	}
	if (!PATTERNS.has(parsed.pattern)) {
		fail(`Unknown pattern "${parsed.pattern}". Use jump, smooth, monitor, or thumb.`);
	}

	parsed.jumps ??= parsed.mode === 'stress' ? 1000 : 100;
	parsed.scrollStepPx ??= 18;
	parsed.visualDelayMs ??= parsed.mode === 'stress' ? 8 : 24;
	parsed.strictIdleMs ??= parsed.strictFlicker ? 0 : undefined;
	return parsed;
}

function vaultArg() {
	return `vault=${options.vault}`;
}

function valueFor(arg) {
	return arg.slice(arg.indexOf('=') + 1);
}

function integerValue(arg, name) {
	const value = Number(valueFor(arg));
	if (!Number.isInteger(value) || value < 0) fail(`--${name} must be a non-negative integer.`);
	return value;
}

function buildEvalCode({
	view,
	pattern,
	jumps,
	scrollStepPx,
	visualDelayMs,
	overlay,
	strictFlicker,
	strictIdleMs,
}) {
	const scenarioOptions = JSON.stringify({
		view,
		pattern,
		jumps,
		scrollStepPx,
		visualDelayMs,
		overlay,
		strictFlicker: strictFlicker === true,
		strictIdleMs,
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
		'      eventLoopDelayP50Ms: b.eventLoopDelayP50Ms,',
		'      eventLoopDelayP75Ms: b.eventLoopDelayP75Ms,',
		'      eventLoopDelayP95Ms: b.eventLoopDelayP95Ms,',
		'      eventLoopDelayP99Ms: b.eventLoopDelayP99Ms,',
		'      eventLoopDelayHistogram: b.eventLoopDelayHistogram,',
		'      longAnimationFrameCount: b.longAnimationFrameCount,',
		'      maxLongAnimationFrameMs: b.maxLongAnimationFrameMs,',
		'      longTaskCount: b.longTaskCount,',
		'      maxLongTaskMs: b.maxLongTaskMs,',
		'      strictFlicker: b.strictFlicker,',
		'      strictIdleMs: b.strictIdleMs,',
		'      flickerFrameCount: b.flickerFrameCount,',
		'      maxFlickerRowCount: b.maxFlickerRowCount,',
		'      samples: b.samples ? b.samples.slice(-1).map((sample) => ({',
		'        firstRowId: sample.firstRowId,',
		'        lastRowId: sample.lastRowId,',
		'        firstVisibleIndex: sample.firstVisibleIndex,',
		'        lastVisibleIndex: sample.lastVisibleIndex,',
		'        totalEstimatedRows: sample.totalEstimatedRows,',
		'      })) : [],',
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
		[vaultArg(), 'eval', `code=${buildTargetPresenceCode(view)}`],
		{ printOutput: false },
	);
	return parseJsonFromOutput(result.stdout).present === true;
}

function vaultmanFrameAlreadyOpen() {
	const result = runChecked(
		'obsidian',
		[vaultArg(), 'eval', `code=${buildFramePresenceCode()}`],
		{ printOutput: false },
	);
	return parseJsonFromOutput(result.stdout).present === true;
}

function ensureExplorerSurfaceOpen(surface) {
	if (surface === 'current') return;
	if (!vaultmanFrameAlreadyOpen()) return;
	console.log(`Switching Vaultman Explorer to requested surface=${surface}.`);
	const result = runChecked(
		'obsidian',
		[vaultArg(), 'eval', `code=${buildExplorerSurfaceCode(surface)}`],
		{ printOutput: false },
	);
	const parsed = parseJsonFromOutput(result.stdout);
	if (parsed.present === true) return;
	fail(parsed.reason ?? `Could not switch Vaultman Explorer to surface=${surface}.`);
}

function ensureScrollTargetOpen(view) {
	if (view === 'auto' || scrollTargetAlreadyOpen(view)) return;
	if (!vaultmanFrameAlreadyOpen()) return;
	console.log(`Switching Vaultman Explorer to requested view=${view}.`);
	const result = runChecked(
		'obsidian',
		[vaultArg(), 'eval', `code=${buildViewSwitchCode(view)}`],
		{ printOutput: false },
	);
	const parsed = parseJsonFromOutput(result.stdout);
	if (parsed.present === true) return;
	fail(parsed.reason ?? `Could not switch Vaultman Explorer to view=${view}.`);
}

function runThumbDragSmoke({ view, jumps, visualDelayMs }) {
	const targetView = view === 'auto' ? 'tree' : view;
	if (!SCROLL_TARGET_SELECTORS[targetView]) {
		fail(`Thumb-drag smoke does not support view=${view}.`);
	}
	const durationMs = Math.max(1200, Math.floor(jumps * Math.max(8, visualDelayMs)));
	const startResult = runChecked(
		'obsidian',
		[
			vaultArg(),
			'eval',
			`code=${buildThumbSamplerStartCode(targetView, durationMs)}`,
		],
		{ printOutput: false },
	);
	const started = parseJsonFromOutput(startResult.stdout);
	if (started.present !== true) {
		fail(started.reason ?? `Thumb-drag scroll target not found for view=${targetView}.`);
	}

	dragNativeScrollbar(started.rect, jumps, Math.max(0, Math.floor(visualDelayMs)));
	sleep(durationMs + 300);

	const finishResult = runChecked(
		'obsidian',
		[vaultArg(), 'eval', `code=${buildThumbSamplerResultCode(targetView, jumps)}`],
		{ printOutput: false },
	);
	return parseJsonFromOutput(finishResult.stdout);
}

function dragNativeScrollbar(rect, jumps, visualDelayMs) {
	const stepCount = Math.max(8, Math.floor(jumps));
	const x = Math.max(1, Math.floor(rect.right - 4));
	const top = Math.floor(rect.top + Math.max(12, rect.height * 0.12));
	const bottom = Math.floor(rect.top + Math.max(24, rect.height * 0.88));
	const positions = [];
	for (let i = 0; i < stepCount; i += 1) {
		const phase = i / Math.max(1, stepCount - 1);
		const wave = i % 2 === 0 ? phase : 1 - phase;
		positions.push(Math.round(top + (bottom - top) * wave));
	}
	runCdp('Input.dispatchMouseEvent', {
		type: 'mousePressed',
		x,
		y: positions[0],
		button: 'left',
		clickCount: 1,
	});
	for (const y of positions) {
		runCdp('Input.dispatchMouseEvent', {
			type: 'mouseMoved',
			x,
			y,
			button: 'left',
			buttons: 1,
		});
		if (visualDelayMs > 0) sleep(visualDelayMs);
	}
	runCdp('Input.dispatchMouseEvent', {
		type: 'mouseReleased',
		x,
		y: positions.at(-1) ?? positions[0],
		button: 'left',
		clickCount: 1,
	});
}

function runCdp(method, params) {
	return runChecked(
		'obsidian',
		[vaultArg(), 'dev:cdp', `method=${method}`, `params=${JSON.stringify(params)}`],
		{ printOutput: false },
	);
}

function sleep(ms) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(0, ms));
}

function activeScrollTargetPresentCode() {
	return [
		'  const activeScrollTargetPresent = (el) => {',
		"    const tab = el.closest('.vaultman-filters-tab-pane, .vm-tab-content');",
		"    if (tab && !tab.classList.contains('is-active')) return false;",
		'    const rect = el.getBoundingClientRect();',
		'    return el.clientHeight > 0 || el.clientWidth > 0 || el.scrollHeight > el.clientHeight ||',
		'      rect.width !== 0 || rect.height !== 0 || rect.top !== 0 || rect.bottom !== 0 ||',
		'      rect.left !== 0 || rect.right !== 0;',
		'  };',
	].join('\n');
}

function buildThumbSamplerStartCode(view, durationMs) {
	const selector = SCROLL_TARGET_SELECTORS[view];
	const rowSelector = SCROLL_ROW_SELECTORS[view];
	const textSelector = SCROLL_TEXT_SELECTORS[view];
	return [
		'(() => {',
		activeScrollTargetPresentCode(),
		`  const selector = ${JSON.stringify(selector)};`,
		`  const rowSelector = ${JSON.stringify(rowSelector)};`,
		`  const textSelector = ${JSON.stringify(textSelector)};`,
		`  const deadlineMs = performance.now() + ${JSON.stringify(durationMs)};`,
		'  const target = [...document.querySelectorAll(selector)].find(activeScrollTargetPresent);',
		"  if (!target) return JSON.stringify({present:false, reason:'scroll target not found'});",
		'  const rect = target.getBoundingClientRect();',
		'  const state = { present:true, done:false, samples:[], start:performance.now(), last:performance.now(), target, rowSelector, textSelector };',
		'  window.__vaultmanThumbScrollSmoke = state;',
		'  const rowTextPresent = (rows) => rows.some((row) => {',
		'    const textTarget = row.matches(textSelector) ? row : row.querySelector(textSelector);',
		'    return Boolean(textTarget?.textContent?.trim());',
		'  });',
		'  const sample = (now) => {',
		'    const viewport = target.getBoundingClientRect();',
		'    const rows = [...target.querySelectorAll(rowSelector)];',
		'    const visibleRows = rows.filter((row) => {',
		'      const r = row.getBoundingClientRect();',
		'      return r.bottom > viewport.top + 1 && r.top < viewport.bottom - 1;',
		'    });',
		'    const textPresent = rowTextPresent(visibleRows);',
		'    const blank = visibleRows.length === 0 || !textPresent;',
		'    state.samples.push({',
		'      timeMs: now - state.start,',
		'      scrollTop: target.scrollTop,',
		'      scrollHeight: target.scrollHeight,',
		'      clientHeight: target.clientHeight,',
		'      renderedRowCount: rows.length,',
		'      visibleRowCount: visibleRows.length,',
		'      textPresent,',
		'      blank,',
		'      eventLoopDelayMs: Math.max(0, now - state.last),',
		'      firstRowId: visibleRows[0]?.dataset?.id,',
		'      lastRowId: visibleRows.at(-1)?.dataset?.id,',
		'      totalEstimatedRows: Math.round(target.scrollHeight / Math.max(1, visibleRows[0]?.getBoundingClientRect?.().height || 28)),',
		'    });',
		'    state.last = now;',
		'  };',
		'  const tick = (now) => {',
		'    sample(now);',
		'    if (now < deadlineMs) requestAnimationFrame(tick);',
		'    else state.done = true;',
		'  };',
		'  requestAnimationFrame(tick);',
		'  return JSON.stringify({present:true, rect:{left:rect.left, top:rect.top, right:rect.right, bottom:rect.bottom, width:rect.width, height:rect.height}});',
		'})()',
	].join('\n');
}

function buildThumbSamplerResultCode(view, jumps) {
	return [
		'(() => {',
		`  const view = ${JSON.stringify(view)};`,
		`  const jumpCount = ${JSON.stringify(jumps)};`,
		'  const state = window.__vaultmanThumbScrollSmoke;',
		"  if (!state) return JSON.stringify({scenario:'explorer-scroll-thumb-live', scrollBurst:{requestedView:view, view, pattern:'thumb', jumpCount, blankFrameCount:1, blankWindowOver100ms:1, blankWindowOver250ms:1, maxBlankDurationMs:1000, maxViewportGapPx:0, maxEventLoopDelayMs:0, eventLoopDelayP50Ms:0, eventLoopDelayP75Ms:0, eventLoopDelayP95Ms:0, eventLoopDelayP99Ms:0, eventLoopDelayHistogram:[], longAnimationFrameCount:0, maxLongAnimationFrameMs:0, longTaskCount:0, maxLongTaskMs:0, strictFlicker:false, strictIdleMs:0, flickerFrameCount:0, maxFlickerRowCount:0, samples:[], passed:false, reason:'thumb sampler missing'}});",
		'  const samples = state.samples ?? [];',
		'  let blankStart = null;',
		'  let maxBlank = 0;',
		'  let over100 = 0;',
		'  let over250 = 0;',
		'  let active100 = false;',
		'  let active250 = false;',
		'  for (const sample of samples) {',
		'    if (sample.blank) {',
		'      blankStart ??= sample.timeMs;',
		'      const duration = Math.max(0, sample.timeMs - blankStart);',
		'      maxBlank = Math.max(maxBlank, duration);',
		'      if (duration > 100 && !active100) { over100 += 1; active100 = true; }',
		'      if (duration > 250 && !active250) { over250 += 1; active250 = true; }',
		'    } else {',
		'      blankStart = null;',
		'      active100 = false;',
		'      active250 = false;',
		'    }',
		'  }',
		'  const delays = samples.map((sample) => sample.eventLoopDelayMs).sort((a, b) => a - b);',
		'  const percentile = (p) => delays.length ? delays[Math.min(delays.length - 1, Math.floor((delays.length - 1) * p))] : 0;',
		'  const histogram = [',
		"    {label:'<=16ms', maxMs:16, count:delays.filter((d)=>d<=16).length},",
		"    {label:'<=33ms', maxMs:33, count:delays.filter((d)=>d>16&&d<=33).length},",
		"    {label:'<=50ms', maxMs:50, count:delays.filter((d)=>d>33&&d<=50).length},",
		"    {label:'<=100ms', maxMs:100, count:delays.filter((d)=>d>50&&d<=100).length},",
		"    {label:'>100ms', maxMs:null, count:delays.filter((d)=>d>100).length},",
		'  ];',
		'  const blankFrameCount = samples.filter((sample) => sample.blank).length;',
		'  const latest = samples.at(-1);',
		'  const passed = blankFrameCount === 0 && maxBlank === 0;',
		"  return JSON.stringify({scenario:'explorer-scroll-thumb-live', scrollBurst:{requestedView:view, view, pattern:'thumb', jumpCount, blankFrameCount, blankWindowOver100ms:over100, blankWindowOver250ms:over250, maxBlankDurationMs:maxBlank, maxViewportGapPx:blankFrameCount > 0 ? (latest?.clientHeight ?? 0) : 0, maxEventLoopDelayMs:delays.at(-1) ?? 0, eventLoopDelayP50Ms:percentile(0.5), eventLoopDelayP75Ms:percentile(0.75), eventLoopDelayP95Ms:percentile(0.95), eventLoopDelayP99Ms:percentile(0.99), eventLoopDelayHistogram:histogram, longAnimationFrameCount:0, maxLongAnimationFrameMs:0, longTaskCount:0, maxLongTaskMs:0, strictFlicker:false, strictIdleMs:0, flickerFrameCount:0, maxFlickerRowCount:0, samples:latest?[latest]:[], passed, reason:passed?undefined:'visible row blank during thumb drag'}});",
		'})()',
	].join('\n');
}

function buildTargetPresenceCode(view) {
	const selectors =
		view === 'auto'
			? Object.values(SCROLL_TARGET_SELECTORS)
			: [SCROLL_TARGET_SELECTORS[view]].filter(Boolean);
	return [
		'(() => {',
		activeScrollTargetPresentCode(),
		`  const selectors = ${JSON.stringify(selectors)};`,
		'  return JSON.stringify({present: selectors.some((selector) => [...document.querySelectorAll(selector)].some(activeScrollTargetPresent))});',
		'})()',
	].join('\n');
}

function buildExplorerSurfaceCode(surface) {
	if (surface !== 'files') {
		return 'JSON.stringify({present: true, surface: "current"})';
	}
	return [
		'Promise.resolve().then(async () => {',
		"  const clickTab = (label) => {",
		"    const tabs = [...document.querySelectorAll('[role=\"tab\"]')];",
		"    const tab = tabs.find((el) => el.getAttribute('aria-label') === label || el.textContent?.trim() === label);",
		'    tab?.click();',
		'    return Boolean(tab);',
		'  };',
		"  const filtersClicked = clickTab('Filters');",
		'  await new Promise((resolve) => setTimeout(resolve, 120));',
		"  const filesClicked = clickTab('Files');",
		'  await new Promise((resolve) => setTimeout(resolve, 120));',
		"  const filesContent = document.querySelector('.vaultman-files-tab-content, .vm-files-tab-content');",
		"  const active = Boolean(filesContent?.closest('.vaultman-filters-tab-pane.is-active, .vm-tab-content.is-active'));",
		"  if (active) return JSON.stringify({present: true, surface: 'files', filtersClicked, filesClicked});",
		"  return JSON.stringify({present: false, surface: 'files', filtersClicked, filesClicked, reason: 'Files explorer tab is not active'});",
		'})',
	].join('\n');
}

function buildViewSwitchCode(view) {
	const selector = SCROLL_TARGET_SELECTORS[view];
	const label = VIEW_MODE_LABELS[view];
	return [
		'Promise.resolve().then(async () => {',
		activeScrollTargetPresentCode(),
		`  const selector = ${JSON.stringify(selector)};`,
		`  const label = ${JSON.stringify(label)};`,
		'  const targetPresent = () => [...document.querySelectorAll(selector)].some(activeScrollTargetPresent);',
		'  if (targetPresent()) return JSON.stringify({present: true, switched: false});',
		'  const plugin = app?.plugins?.plugins?.vaultman;',
		'  plugin?.openViewMenuHook?.();',
		'  await new Promise((resolve) => setTimeout(resolve, 150));',
		"  const button = [...document.querySelectorAll('.vm-view-menu-mode')].find((el) => el.getAttribute('aria-label') === label || el.textContent?.trim() === label);",
		"  if (!button) return JSON.stringify({present: targetPresent(), switched: false, reason: `View mode button missing: ${label}`});",
		'  button.click();',
		'  for (let i = 0; i < 20; i += 1) {',
		'    await new Promise((resolve) => setTimeout(resolve, 50));',
		'    if (targetPresent()) return JSON.stringify({present: true, switched: true});',
		'  }',
		"  return JSON.stringify({present: false, switched: true, reason: `Scroll target not found after switching to ${label}`});",
		'})',
	].join('\n');
}

function buildFramePresenceCode() {
	return 'JSON.stringify({present: Boolean(document.querySelector(\'.workspace-leaf-content[data-type="vaultman-frame"], .workspace-leaf-content[data-type="vm-frame"], .vaultman-frame, .vm-frame\'))})';
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
	const marker = text.lastIndexOf('=>');
	const candidate = marker >= 0 ? text.slice(marker + 2).trim() : text;
	const start = candidate.indexOf('{');
	const end = candidate.lastIndexOf('}');
	if (start < 0 || end < start) {
		fail(`Could not find JSON in Obsidian eval output:\n${text}`);
	}
	try {
		return JSON.parse(candidate.slice(start, end + 1));
	} catch (error) {
		fail(`Could not parse Obsidian eval JSON: ${error.message}\n${text}`);
	}
}

function formatSampleIndexRange(sample) {
	if (!sample || sample.firstVisibleIndex === undefined) return null;
	const first = sample.firstVisibleIndex + 1;
	const last = (sample.lastVisibleIndex ?? sample.firstVisibleIndex) + 1;
	const range = first === last ? `${first}` : `${first}-${last}`;
	const total =
		sample.totalEstimatedRows !== undefined && sample.totalEstimatedRows > 0
			? `/${Math.max(sample.totalEstimatedRows, last)}`
			: '';
	return `idx=${range}${total}`;
}

function printBurstSummary(snapshot, vault) {
	const burst = snapshot.scrollBurst;
	if (!burst) fail('Obsidian eval returned no scrollBurst report.');
	const status = burst.passed ? 'PASS' : 'FAIL';
	const latestSample = burst.samples?.at(-1);
	const indexRange = formatSampleIndexRange(latestSample);
	console.log(
		[
			`Explorer scroll smoke ${status}`,
			`vault=${vault}`,
			`view=${burst.view}`,
			`pattern=${burst.pattern ?? 'jump'}`,
			`jumps=${burst.jumpCount}`,
			...(indexRange ? [indexRange] : []),
			...(latestSample?.firstRowId ? [`first=${latestSample.firstRowId}`] : []),
			...(latestSample?.lastRowId ? [`last=${latestSample.lastRowId}`] : []),
			`blankFrames=${burst.blankFrameCount}`,
			`blank>100ms=${burst.blankWindowOver100ms}`,
			`blank>250ms=${burst.blankWindowOver250ms}`,
			`maxBlank=${Math.round(burst.maxBlankDurationMs)}ms`,
			`maxViewportGap=${Math.round(burst.maxViewportGapPx ?? 0)}px`,
			`maxDelay=${Math.round(burst.maxEventLoopDelayMs)}ms`,
			`p95Delay=${Math.round(burst.eventLoopDelayP95Ms ?? 0)}ms`,
			`p99Delay=${Math.round(burst.eventLoopDelayP99Ms ?? 0)}ms`,
			`delayHist=${formatDelayHistogram(burst.eventLoopDelayHistogram)}`,
			`LoAF=${burst.longAnimationFrameCount ?? 0}/${Math.round(
				burst.maxLongAnimationFrameMs ?? 0,
			)}ms`,
			`longtask=${burst.longTaskCount ?? 0}/${Math.round(burst.maxLongTaskMs ?? 0)}ms`,
			...(burst.strictFlicker
				? [
						`strictIdle=${burst.strictIdleMs ?? 0}ms`,
						`flickerFrames=${burst.flickerFrameCount}`,
						`maxFlickerRows=${burst.maxFlickerRowCount}`,
					]
				: []),
		].join(' '),
	);
}

function formatDelayHistogram(histogram) {
	if (!Array.isArray(histogram) || histogram.length === 0) return 'n/a';
	return histogram.map((bucket) => `${bucket.label}:${bucket.count}`).join(',');
}

function printHelp() {
	console.log(`Usage: node scripts/run-explorer-scroll-smoke.mjs [options]

Runs the live Vaultman Explorer scroll burst smoke against vault=${DEFAULT_VAULT} by default.

Options:
  --vault=VAULT                Obsidian vault name, defaults to plugin-dev
  --mode=smoke|stress          smoke defaults to 100 jumps, stress to 1000
  --view=auto|tree|list|table|grid|cards
  --surface=current|files      target current surface or switch to Files first, defaults to files
  --pattern=jump|smooth|monitor|thumb
                               jump uses ratios, smooth uses scrollTop steps,
                               monitor samples manual scroll, thumb drags the native scrollbar via CDP
  --jumps=N                    override jump count
  --scroll-step-px=N           smooth-mode scroll distance per sample
  --visual-delay-ms=N          delay between jumps so the movement is visible
  --strict-flicker             fail if node-element children disappear during active scroll
  --strict-idle-ms=N           stable wait before strict-flicker sampling; runner defaults to 0
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
  pnpm smoke:scroll -- --view=tree --pattern=thumb --jumps=80 --visual-delay-ms=8
  pnpm smoke:scroll:stress -- --view=list
`);
}

function fail(message) {
	console.error(message);
	process.exit(1);
}
