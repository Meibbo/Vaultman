// High-level vault-scoped CDP operations. All transport is injected
// ({ listTargets, openSession }) so unit tests drive fakes and the CLI
// supplies the real fetch/WebSocket path. Nothing here touches the DOM
// except through bounded Runtime.evaluate / Input.* / Page.* calls.
import { listTargets, selectVaultTarget } from './cdp-target.mjs';
import { withCdpSession } from './cdp-client.mjs';
import { boundsExpression, buildClickEvents, buildKeyEvents, clickPointFromRect } from './cdp-input.mjs';

export async function resolveWsUrl({ endpoint, vault, fetchFn, timeoutMs, listFn = listTargets }) {
	const targets = await listFn(endpoint, { fetchFn, timeoutMs });
	const selected = selectVaultTarget(targets, vault);
	return { wsUrl: selected.webSocketDebuggerUrl, target: selected };
}

export function unwrapEvaluateResult(result, expressionPreview) {
	const preview = String(expressionPreview ?? '').slice(0, 80);
	if (result?.exceptionDetails) {
		const detail = result.exceptionDetails;
		const text = detail?.exception?.description ?? detail?.text ?? JSON.stringify(detail);
		throw new Error(`Runtime evaluation threw (${preview}): ${text}`);
	}
	if (result?.result?.subtype === 'error') {
		throw new Error(`Runtime evaluation returned error (${preview}): ${result.result.description ?? 'unknown error'}`);
	}
	return result?.result?.value;
}

// Physical inputs reuse the tmp drivers' Page.bringToFront first: with one
// vault per lane only one tab can be visible, and trusted Input.* must land
// on the activated page, not a backgrounded one.
function bringToFront(session, timeoutMs) {
	return session.send('Page.bringToFront', {}, { timeoutMs });
}

export async function census({ endpoint, vault, fetchFn, timeoutMs }) {
	const targets = await listTargets(endpoint, { fetchFn, timeoutMs });
	if (vault === undefined || vault === null || vault === '') {
		return { endpoint, count: targets.length, targets };
	}
	const selected = selectVaultTarget(targets, vault);
	return { endpoint, vault, count: 1, targets: [selected] };
}

export async function evaluate({ endpoint, vault, expression, fetchFn, WsClass, timeoutMs, openFn = withCdpSession }) {
	if (typeof expression !== 'string' || expression === '') throw new Error('eval expression must be a non-empty string');
	const { wsUrl, target } = await resolveWsUrl({ endpoint, vault, fetchFn, timeoutMs });
	return openFn(wsUrl, async (session) => {
		const result = await session.send('Runtime.evaluate', {
			expression,
			awaitPromise: true,
			returnByValue: true,
			includeCommandLineAPI: false,
		}, { timeoutMs });
		return { vault, targetId: target.id, value: unwrapEvaluateResult(result, expression) };
	}, { WsClass, timeoutMs });
}

export async function pressKey({ endpoint, vault, key, modifiers = 0, fetchFn, WsClass, timeoutMs, openFn = withCdpSession }) {
	const events = buildKeyEvents(key, modifiers);
	const { wsUrl, target } = await resolveWsUrl({ endpoint, vault, fetchFn, timeoutMs });
	return openFn(wsUrl, async (session) => {
		await bringToFront(session, timeoutMs);
		for (const event of events) await session.send(event.method, event.params, { timeoutMs });
		return { vault, targetId: target.id, key, modifiers: Number(modifiers ?? 0), dispatched: events.length };
	}, { WsClass, timeoutMs });
}

export async function insertType({ endpoint, vault, text, fetchFn, WsClass, timeoutMs, openFn = withCdpSession }) {
	if (typeof text !== 'string' || text === '') throw new Error('type text must be a non-empty string');
	const { wsUrl, target } = await resolveWsUrl({ endpoint, vault, fetchFn, timeoutMs });
	return openFn(wsUrl, async (session) => {
		await bringToFront(session, timeoutMs);
		await session.send('Input.insertText', { text }, { timeoutMs });
		return { vault, targetId: target.id, inserted: text.length };
	}, { WsClass, timeoutMs });
}

export async function clickSelector({ endpoint, vault, selector, button = 'left', fetchFn, WsClass, timeoutMs, openFn = withCdpSession }) {
	const { wsUrl, target } = await resolveWsUrl({ endpoint, vault, fetchFn, timeoutMs });
	return openFn(wsUrl, async (session) => {
		await bringToFront(session, timeoutMs);
		const raw = await session.send('Runtime.evaluate', {
			expression: boundsExpression(selector),
			awaitPromise: false,
			returnByValue: true,
		}, { timeoutMs });
		const point = clickPointFromRect(unwrapEvaluateResult(raw, selector));
		const events = buildClickEvents(point, { button });
		for (const event of events) await session.send(event.method, event.params, { timeoutMs });
		return { vault, targetId: target.id, selector, point, button, dispatched: events.length };
	}, { WsClass, timeoutMs });
}

export async function captureScreenshot({ endpoint, vault, fetchFn, WsClass, timeoutMs, openFn = withCdpSession }) {
	const { wsUrl, target } = await resolveWsUrl({ endpoint, vault, fetchFn, timeoutMs });
	return openFn(wsUrl, async (session) => {
		const result = await session.send('Page.captureScreenshot', { format: 'png' }, { timeoutMs });
		if (!result?.data) throw new Error('Page.captureScreenshot returned no image data');
		return { vault, targetId: target.id, bytes: Buffer.from(result.data, 'base64') };
	}, { WsClass, timeoutMs });
}
