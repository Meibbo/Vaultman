// Built-in unit tests: node --test scripts/cdp/obsidian-cdp.test.mjs
// All transport is injected (fake fetch / fake session / FakeWs); no browser,
// no network, no Obsidian. Covers selection, errors, timeout cleanup, input.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractVaultId, listTargets, selectVaultTarget } from './cdp-target.mjs';
import { CdpSession, withCdpSession } from './cdp-client.mjs';
import { boundsExpression, buildClickEvents, buildKeyEvents, clickPointFromRect, resolveKeyDefinition, validateModifiers } from './cdp-input.mjs';
import { captureScreenshot, clickSelector, evaluate, insertType, pressKey, unwrapEvaluateResult } from './cdp-commands.mjs';

const VAULT_A = '29fc30bf67881f99';
const VAULT_B = 'eb439ca890157574';
const target = (vault, id, type = 'page') => ({ id, type, url: `http://localhost:3000/?vault=${vault}`, webSocketDebuggerUrl: `ws://localhost:9222/devtools/page/${id}` });

describe('vault target selection', () => {
	it('extracts exact ?vault= from URL and decodes encoding', () => {
		assert.equal(extractVaultId('http://x/?vault=abc123'), 'abc123');
		assert.equal(extractVaultId('http://x/?foo=1&vault=abc%20123'), 'abc 123');
		assert.equal(extractVaultId('http://x/?foo=1'), null);
		assert.equal(extractVaultId('not a url?vault=zzz'), 'zzz');
		assert.equal(extractVaultId('http://x/?vault='), null);
	});
	it('selects the single exact match', () => {
		const selected = selectVaultTarget([target(VAULT_A, 'a'), target(VAULT_B, 'b')], VAULT_A);
		assert.equal(selected.id, 'a');
	});
	it('fails on absence with seen-vault hint', () => {
		assert.throws(() => selectVaultTarget([target(VAULT_A, 'a')], VAULT_B), /no CDP target.*seen vaults/);
	});
	it('fails on ambiguity instead of guessing', () => {
		assert.throws(() => selectVaultTarget([target(VAULT_A, 'a'), target(VAULT_A, 'b')], VAULT_A), /ambiguous/);
	});
	it('rejects empty vault and targets without sockets', () => {
		assert.throws(() => selectVaultTarget([target(VAULT_A, 'a')], '  '), /--vault/);
		assert.throws(() => selectVaultTarget([{ id: 'x', type: 'page', url: `http://h/?vault=${VAULT_A}` }], VAULT_A), /webSocketDebuggerUrl/);
	});
	it('prefers page targets over non-page targets with the same vault', () => {
		const selected = selectVaultTarget(
			[target(VAULT_A, 'worker', 'service_worker'), target(VAULT_A, 'page', 'page')],
			VAULT_A,
		);
		assert.equal(selected.id, 'page');
	});
	it('still selects a non-page target when no page matches (no false absence)', () => {
		const selected = selectVaultTarget([target(VAULT_A, 'worker', 'service_worker')], VAULT_A);
		assert.equal(selected.id, 'worker');
	});
	it('listTargets surfaces HTTP and shape errors', async () => {
		await assert.rejects(listTargets('http://e', { fetchFn: async () => ({ ok: false, status: 500 }) }), /HTTP 500/);
		await assert.rejects(listTargets('http://e', { fetchFn: async () => ({ ok: true, json: async () => ({}) }) }), /did not return an array/);
	});
});

describe('evaluation errors', () => {
	it('surfaces exceptionDetails instead of swallowing them', () => {
		assert.throws(() => unwrapEvaluateResult({ exceptionDetails: { text: 'boom', exception: { description: 'Error: boom' } } }, '1+1'), /boom/);
		assert.throws(() => unwrapEvaluateResult({ result: { subtype: 'error', description: 'TypeError: x' } }, 'x'), /TypeError/);
		assert.equal(unwrapEvaluateResult({ result: { value: 42 } }, '1'), 42);
	});
	it('evaluate() propagates page exceptions through injected session', async () => {
		const openFn = async (_url, fn) => fn({ send: async () => ({ exceptionDetails: { text: 'page blew up' } }) });
		await assert.rejects(evaluate({ endpoint: 'http://e', vault: VAULT_A, expression: 'throw 1', fetchFn: async () => ({ ok: true, json: async () => [target(VAULT_A, 'a')] }), openFn }), /page blew up/);
	});
});

describe('input mapping', () => {
	it('maps Tab/Space/Home/End/Ctrl with modifier bitmask', () => {
		assert.equal(resolveKeyDefinition('Tab').windowsVirtualKeyCode, 9);
		assert.equal(resolveKeyDefinition('Space').text, ' ');
		assert.equal(resolveKeyDefinition(' ').code, 'Space');
		assert.equal(resolveKeyDefinition('Home').windowsVirtualKeyCode, 36);
		assert.equal(resolveKeyDefinition('End').windowsVirtualKeyCode, 35);
		assert.equal(resolveKeyDefinition('Control').key, 'Control');
		assert.equal(resolveKeyDefinition('a').text, 'a');
		assert.equal(validateModifiers(2), 2);
		assert.throws(() => validateModifiers(16), /bitmask/);
		assert.throws(() => resolveKeyDefinition('FancyKey'), /unknown key/);
	});
	it('gives unmodified lowercase keys text, strips text under Ctrl/Meta, never emits char', () => {
		const plain = buildKeyEvents('a', 0);
		assert.equal(plain.length, 2);
		assert.equal(plain[0].params.type, 'keyDown');
		assert.equal(plain[0].params.text, 'a');
		assert.ok(!('text' in plain[1].params));
		assert.ok(plain.every((e) => e.params.type !== 'char'));
		for (const mods of [2, 4, 6]) {
			const chord = buildKeyEvents('a', mods);
			assert.equal(chord.length, 2, `modifiers=${mods}`);
			assert.ok(chord.every((e) => !('text' in e.params) && e.params.type !== 'char'), `modifiers=${mods}`);
		}
		const shifted = buildKeyEvents('a', 8);
		assert.equal(shifted[0].params.text, 'a');
	});
	it('emits Space text exactly once (keyDown only, no duplicate char)', () => {
		for (const name of ['Space', ' ']) {
			const events = buildKeyEvents(name, 0);
			assert.equal(events.length, 2, name);
			assert.equal(events[0].params.text, ' ', name);
			assert.ok(events.every((e) => e.params.type !== 'char'), name);
			const texts = events.filter((e) => 'text' in e.params);
			assert.equal(texts.length, 1, name);
		}
	});
	it('computes click center from real bounds and rejects bad rects', () => {
		assert.deepEqual(clickPointFromRect({ x: 10, y: 20, width: 100, height: 40 }), { x: 60, y: 40 });
		assert.throws(() => clickPointFromRect(null), /matched nothing/);
		assert.throws(() => clickPointFromRect({ x: 0, y: 0, width: 0, height: 5 }), /zero bounds/);
		assert.throws(() => buildClickEvents({ x: 1, y: 2 }, { button: 'side' }), /--button/);
		assert.throws(() => boundsExpression('  '), /non-empty/);
	});
	it('clickSelector brings the page to front, then resolves bounds and clicks (injected)', async () => {
		const sent = [];
		const openFn = async (_url, fn) => fn({ send: async (method, params) => {
			sent.push(method);
			if (method === 'Runtime.evaluate') return { result: { value: { x: 0, y: 0, width: 20, height: 20 } } };
			return {};
		} });
		const out = await clickSelector({ endpoint: 'http://e', vault: VAULT_A, selector: '.row', fetchFn: async () => ({ ok: true, json: async () => [target(VAULT_A, 'a')] }), openFn });
		assert.deepEqual(out.point, { x: 10, y: 10 });
		assert.deepEqual(sent, ['Page.bringToFront', 'Runtime.evaluate', 'Input.dispatchMouseEvent', 'Input.dispatchMouseEvent', 'Input.dispatchMouseEvent']);
	});
	it('type rejects empty text; type brings the page to front before insertText (injected)', async () => {
		await assert.rejects(insertType({ endpoint: 'http://e', vault: VAULT_A, text: '' }), /non-empty/);
		const sent = [];
		const openFn = async (_url, fn) => fn({ send: async (method) => { sent.push(method); return {}; } });
		const out = await insertType({ endpoint: 'http://e', vault: VAULT_A, text: 'reci', fetchFn: async () => ({ ok: true, json: async () => [target(VAULT_A, 'a')] }), openFn });
		assert.deepEqual(sent, ['Page.bringToFront', 'Input.insertText']);
		assert.equal(out.inserted, 4);
		const openShot = async (_url, fn) => fn({ send: async () => ({}) });
		await assert.rejects(captureScreenshot({ endpoint: 'http://e', vault: VAULT_A, fetchFn: async () => ({ ok: true, json: async () => [target(VAULT_A, 'a')] }), openFn: openShot }), /no image data/);
	});
	it('pressKey brings the page to front then dispatches keyDown/keyUp (injected)', async () => {
		const calls = [];
		const openFn = async (_url, fn) => fn({ send: async (method, p) => { calls.push([method, p.type]); return {}; } });
		const out = await pressKey({ endpoint: 'http://e', vault: VAULT_A, key: 'Home', modifiers: 0, fetchFn: async () => ({ ok: true, json: async () => [target(VAULT_A, 'a')] }), openFn });
		assert.deepEqual(calls, [['Page.bringToFront', undefined], ['Input.dispatchKeyEvent', 'keyDown'], ['Input.dispatchKeyEvent', 'keyUp']]);
		assert.equal(out.dispatched, 2);
	});
});

class FakeWs {
	constructor() { this.listeners = new Map(); this.sent = []; this.closed = false; }
	addEventListener(name, fn) {
		this.listeners.set(name, [...(this.listeners.get(name) ?? []), fn]);
	}
	removeEventListener(name, fn) {
		this.listeners.set(name, (this.listeners.get(name) ?? []).filter((listener) => listener !== fn));
	}
	listenerCount(name) { return (this.listeners.get(name) ?? []).length; }
	emit(name, payload) { for (const fn of [...(this.listeners.get(name) ?? [])]) fn(payload); }
	send(text) { this.sent.push(text); }
	close() { this.closed = true; }
}

// Instance registry: socket classes record every construction here, so tests
// observe the socket CdpSession.open built without aliasing `this`.
const observedSockets = [];
class ObservedWs extends FakeWs {
	constructor() {
		super();
		observedSockets.push(this);
	}
}

describe('timeout and socket cleanup', () => {
	it('send() times out and clears its timer (no leak, no hang)', async () => {
		const ws = new FakeWs();
		const session = new CdpSession(ws, { timeoutMs: 20 });
		await assert.rejects(session.send('Runtime.evaluate', {}), /timed out after 20ms/);
		assert.equal(session.pending.size, 0);
		await session.close();
		assert.equal(ws.closed, true);
	});
	it('a late reply after timeout does not resolve or crash', async () => {
		const ws = new FakeWs();
		const session = new CdpSession(ws, { timeoutMs: 20 });
		const pending = session.send('Page.captureScreenshot', {}).catch((e) => e);
		await pending;
		ws.emit('message', { data: JSON.stringify({ id: 1, result: { data: 'late' } }) });
		assert.equal(session.pending.size, 0);
		await session.close();
	});
	it('close() rejects in-flight sends and clears their timers (pending-close)', async () => {
		const ws = new FakeWs();
		const session = new CdpSession(ws, { timeoutMs: 5000 });
		const first = session.send('Runtime.evaluate', {});
		const second = session.send('Page.captureScreenshot', {});
		const firstResult = first.then(() => 'resolved', (error) => String(error.message));
		const secondResult = second.then(() => 'resolved', (error) => String(error.message));
		await session.close();
		assert.match(await firstResult, /session closed/);
		assert.match(await secondResult, /session closed/);
		assert.equal(session.pending.size, 0);
		assert.equal(ws.closed, true);
	});
	it('remote close rejects in-flight sends and admits no further sends', async () => {
		const ws = new FakeWs();
		const session = new CdpSession(ws, { timeoutMs: 5000 });
		const inflight = session.send('Runtime.evaluate', {}).then(() => 'resolved', (error) => String(error.message));
		ws.emit('close', {});
		assert.match(await inflight, /closed while requests were pending/);
		assert.equal(session.closed, true);
		assert.equal(session.pending.size, 0);
		await assert.rejects(session.send('Runtime.evaluate', {}), /session is closed/);
		assert.equal(ws.sent.length, 1);
	});
	it('send-after-close is rejected without touching the socket', async () => {
		const ws = new FakeWs();
		const session = new CdpSession(ws, { timeoutMs: 5000 });
		await session.close();
		await assert.rejects(session.send('Input.dispatchKeyEvent', {}), /session is closed/);
		assert.equal(ws.sent.length, 0);
	});
	it('connect timeout closes the socket, detaches, and late open leaks no session', async () => {
		observedSockets.length = 0;
		await assert.rejects(CdpSession.open('ws://x', { WsClass: ObservedWs, timeoutMs: 20 }), /timed out/);
		const ws = observedSockets.at(-1);
		assert.equal(ws.closed, true);
		assert.equal(ws.listenerCount('open'), 0);
		assert.equal(ws.listenerCount('error'), 0);
		ws.emit('open', {});
		assert.equal(ws.listenerCount('message'), 0);
		assert.equal(ws.sent.length, 0);
	});
	it('connect error closes the socket, detaches, and late open is a no-op', async () => {
		observedSockets.length = 0;
		class FailingWs extends ObservedWs {
			constructor() { super(); queueMicrotask(() => this.emit('error', {})); }
		}
		await assert.rejects(CdpSession.open('ws://x', { WsClass: FailingWs, timeoutMs: 500 }), /connect failed/);
		const ws = observedSockets.at(-1);
		assert.equal(ws.closed, true);
		assert.equal(ws.listenerCount('open'), 0);
		assert.equal(ws.listenerCount('error'), 0);
		ws.emit('open', {});
		assert.equal(ws.listenerCount('message'), 0);
	});
	it('withCdpSession always closes the socket, even when the command throws', async () => {
		observedSockets.length = 0;
		class TrackingWs extends ObservedWs {
			constructor() { super(); queueMicrotask(() => this.emit('open', {})); }
		}
		await assert.rejects(withCdpSession('ws://x', async () => { throw new Error('command blew up'); }, { WsClass: TrackingWs, timeoutMs: 500 }), /command blew up/);
		const ws = observedSockets.at(-1);
		assert.equal(ws.closed, true);
	});
});
