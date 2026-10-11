#!/usr/bin/env node
// One reusable CDP CLI for vault-scoped Obsidian DOM work (coordinator only).
// Raw CDP on {endpoint}/json/list + WebSocket; native fetch/WebSocket only.
// Usage: node scripts/cdp/obsidian-cdp.mjs [--endpoint URL] [--vault ID]
//   [--timeout MS] <census|eval|key|type|click|screenshot> [args...]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { census, evaluate, pressKey, insertType, clickSelector, captureScreenshot } from './cdp-commands.mjs';
import { normalizeEndpoint } from './cdp-target.mjs';

const DEFAULT_ENDPOINT = 'http://localhost:9222';
const DEFAULT_TIMEOUT_MS = 15000;

main().catch((error) => {
	process.stderr.write(JSON.stringify({ ok: false, error: String(error?.message ?? error) }) + '\n');
	process.exit(1);
});

async function main() {
	const { global, rest } = splitGlobal(process.argv.slice(2));
	const endpoint = normalizeEndpoint(global.endpoint ?? DEFAULT_ENDPOINT);
	const timeoutMs = parseTimeout(global.timeout ?? DEFAULT_TIMEOUT_MS);
	const [command, ...args] = rest;
	if (!command || global.help || command === 'help' || command === '--help') return printHelp();
	const vault = String(global.vault ?? '').trim();
	if (command !== 'census' && !vault) throw new Error('--vault <exact-id> is required (exact ?vault= match; fails on absence/ambiguity)');
	const result = await runCommand(command, args, { endpoint, vault, timeoutMs });
	process.stdout.write(JSON.stringify({ ok: true, command, ...result }) + '\n');
}

async function runCommand(command, args, ctx) {
	switch (command) {
		case 'census': return census({ endpoint: ctx.endpoint, vault: ctx.vault || undefined, timeoutMs: ctx.timeoutMs });
		case 'eval': return evaluate({ ...ctx, expression: await readPayload(args, 'eval') });
		case 'key': {
			const { key, modifiers } = parseKeyArgs(args);
			return pressKey({ ...ctx, key, modifiers });
		}
		case 'type': return insertType({ ...ctx, text: await readPayload(args, 'type') });
		case 'click': {
			const { selector, button } = parseClickArgs(args);
			return clickSelector({ ...ctx, selector, button });
		}
		case 'screenshot': {
			const outPath = args[0];
			if (!outPath) throw new Error('usage: screenshot <output-path>');
			const { bytes, ...rest } = await captureScreenshot(ctx);
			mkdirSync(dirname(outPath), { recursive: true });
			writeFileSync(outPath, bytes);
			return { ...rest, path: outPath, bytesWritten: bytes.length };
		}
		default: throw new Error(`unknown command: ${command} (see --help)`);
	}
}

function splitGlobal(argv) {
	const global = {};
	const rest = [];
	let i = 0;
	for (; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--help' || arg === '-h') global.help = true;
		else if (arg === '--endpoint' && i + 1 < argv.length) global.endpoint = argv[++i];
		else if (arg.startsWith('--endpoint=')) global.endpoint = arg.slice(11);
		else if (arg === '--vault' && i + 1 < argv.length) global.vault = argv[++i];
		else if (arg.startsWith('--vault=')) global.vault = arg.slice(8);
		else if (arg === '--timeout' && i + 1 < argv.length) global.timeout = argv[++i];
		else if (arg.startsWith('--timeout=')) global.timeout = arg.slice(10);
		else if (arg.startsWith('--') && rest.length === 0) throw new Error(`unknown option: ${arg}`);
		else { rest.push(...argv.slice(i)); break; }
	}
	return { global, rest };
}

function parseTimeout(raw) {
	const value = Number(raw);
	if (!Number.isFinite(value) || value <= 0 || value > 120000) throw new Error(`--timeout must be 1-120000ms, got: ${raw}`);
	return Math.floor(value);
}

async function readPayload(args, command) {
	const fileIndex = args.indexOf('--file');
	if (args.includes('--stdin')) return readStdin();
	if (fileIndex >= 0) {
		const path = args[fileIndex + 1];
		if (!path) throw new Error(`usage: ${command} --file <path>`);
		return readFileSync(path, 'utf8');
	}
	const text = args.join(' ');
	if (!text) throw new Error(`usage: ${command} <${command === 'eval' ? 'expression' : 'text'}> | --file <path> | --stdin`);
	return text;
}

function readStdin() {
	return new Promise((resolve, reject) => {
		let data = '';
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', (chunk) => { data += chunk; });
		process.stdin.on('end', () => resolve(data));
		process.stdin.on('error', reject);
	});
}

function parseKeyArgs(args) {
	const clean = args.filter((a) => a !== '--');
	let modifiers = 0;
	const keyParts = [];
	for (let i = 0; i < clean.length; i++) {
		if (clean[i] === '--modifiers' && i + 1 < clean.length) modifiers = clean[++i];
		else if (clean[i].startsWith('--modifiers=')) modifiers = clean[i].slice(12);
		else keyParts.push(clean[i]);
	}
	if (keyParts.length === 0) throw new Error('usage: key <KeyName> [--modifiers N]  (Alt=1 Ctrl=2 Meta=4 Shift=8; e.g. key Tab, key a --modifiers 2)');
	return { key: keyParts.join(' '), modifiers };
}

function parseClickArgs(args) {
	const clean = args.filter((a) => a !== '--');
	let button = 'left';
	const selectorParts = [];
	for (let i = 0; i < clean.length; i++) {
		if (clean[i] === '--button' && i + 1 < clean.length) button = clean[++i];
		else if (clean[i].startsWith('--button=')) button = clean[i].slice(9);
		else selectorParts.push(clean[i]);
	}
	const selector = selectorParts.join(' ');
	if (!selector) throw new Error('usage: click <css-selector> [--button left|right|middle]');
	return { selector, button };
}

function printHelp() {
	process.stdout.write(`obsidian-cdp: vault-scoped CDP helper (coordinator operates the real DOM)

Usage:
  node scripts/cdp/obsidian-cdp.mjs [--endpoint URL] [--vault ID] [--timeout MS] <command> [args]

Global options:
  --endpoint URL   CDP HTTP endpoint (default ${DEFAULT_ENDPOINT}; PC WSL forwards localhost:9222)
  --vault ID       exact ?vault= query value; eval/key/type/click/screenshot require it,
                   census filters when given; fails on absence or ambiguity
  --timeout MS     per-request bound in ms (default ${DEFAULT_TIMEOUT_MS})

Commands (JSON on stdout; errors as {"ok":false,"error"} on stderr):
  census                                list CDP targets (filtered to --vault when given)
  eval <expr>|--file P|--stdin          Runtime.evaluate (awaitPromise, surfaces exceptionDetails)
  key <Name> [--modifiers N]            trusted keyDown/keyUp after Page.bringToFront (unmodified printables carry text; Ctrl/Meta chords carry none)
  type <text>|--file P|--stdin          trusted text via Input.insertText after Page.bringToFront (inserts text, emits no key events)
  click <selector> [--button B]         real getBoundingClientRect center + mousePressed/Released
  screenshot <path>                     Page.captureScreenshot (png) written to path

Examples:
  node scripts/cdp/obsidian-cdp.mjs --vault 29fc30bf67881f99 census
  node scripts/cdp/obsidian-cdp.mjs --vault 29fc30bf67881f99 eval "document.title"
  echo "document.title" | node scripts/cdp/obsidian-cdp.mjs --vault 29fc30bf67881f99 eval --stdin
  node scripts/cdp/obsidian-cdp.mjs --vault eb439ca890157574 key Tab
  node scripts/cdp/obsidian-cdp.mjs --vault eb439ca890157574 key a --modifiers 2
  node scripts/cdp/obsidian-cdp.mjs --vault eb439ca890157574 type "reci"
  node scripts/cdp/obsidian-cdp.mjs --vault eb439ca890157574 click ".vaultman-tree-row"
  node scripts/cdp/obsidian-cdp.mjs --vault eb439ca890157574 screenshot /tmp/shot.png
`);
}
