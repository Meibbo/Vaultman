// Minimal JSON-RPC session over a native WebSocket. Every send is bounded
// by its own timer and every socket is closed by the caller path, so a
// hung page cannot leak timers or sockets into the coordinator process.
export class CdpSession {
	constructor(ws, { timeoutMs = 15000 } = {}) {
		this.ws = ws;
		this.timeoutMs = timeoutMs;
		this.nextId = 1;
		this.pending = new Map();
		this.closed = false;
		this.ws.addEventListener('message', (event) => this.onMessage(event));
		this.ws.addEventListener('close', () => this.onClose(new Error('CDP socket closed while requests were pending')));
		this.ws.addEventListener('error', () => this.onClose(new Error('CDP socket error while requests were pending')));
	}

	static open(wsUrl, { WsClass = globalThis.WebSocket, timeoutMs = 15000 } = {}) {
		if (!WsClass) throw new Error('no WebSocket implementation available (Node >=22 provides a global)');
		return new Promise((resolve, reject) => {
			let ws;
			try {
				ws = new WsClass(wsUrl);
			} catch (error) {
				reject(error);
				return;
			}
			let settled = false;
		const detach = () => {
			if (typeof ws.removeEventListener === 'function') {
				ws.removeEventListener('open', onOpen);
				ws.removeEventListener('error', onError);
			}
		};
			const onOpen = () => {
				// A late open after timeout/error already settled must not
				// leak a session: the socket was asked to close, say so again.
			if (settled) {
				ws.close();
				return;
			}
				settled = true;
				clearTimeout(timer);
				detach();
				resolve(new CdpSession(ws, { timeoutMs }));
			};
			const onError = () => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
			detach();
			ws.close();
			reject(new Error(`CDP connect failed: ${wsUrl}`));
			};
			const timer = setTimeout(() => {
				if (settled) return;
				settled = true;
			detach();
			ws.close();
			reject(new Error(`CDP connect timed out after ${timeoutMs}ms: ${wsUrl}`));
			}, timeoutMs);
			ws.addEventListener('open', onOpen, { once: true });
			ws.addEventListener('error', onError, { once: true });
		});
	}

	onMessage(event) {
		let payload;
		try {
			payload = JSON.parse(String(event.data ?? ''));
		} catch {
			return;
		}
		if (payload?.id === undefined) return;
		const entry = this.pending.get(payload.id);
		if (!entry) return;
		this.pending.delete(payload.id);
		clearTimeout(entry.timer);
		if (payload.error) entry.reject(new Error(`CDP ${entry.method} failed: ${payload.error.message ?? JSON.stringify(payload.error)}`));
		else entry.resolve(payload.result ?? {});
	}

	onClose(error) {
		this.remoteClose(error);
	}

	failPending(error) {
		for (const [, entry] of this.pending) {
			clearTimeout(entry.timer);
			entry.reject(error);
		}
		this.pending.clear();
	}

	remoteClose(error) {
		if (this.closed) return;
		this.closed = true;
		this.failPending(error);
	}

	send(method, params = {}, { timeoutMs = this.timeoutMs } = {}) {
		if (this.closed) return Promise.reject(new Error('CDP session is closed'));
		const id = this.nextId++;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(new Error(`CDP ${method} timed out after ${timeoutMs}ms`));
			}, timeoutMs);
			this.pending.set(id, { method, resolve, reject, timer });
			try {
				this.ws.send(JSON.stringify({ id, method, params }));
			} catch (error) {
				this.pending.delete(id);
				clearTimeout(timer);
				reject(error);
			}
		});
	}

	async close() {
		// Mark closed first so racing sends are rejected, then reject every
		// in-flight send via failPending: remoteClose returns early once
		// closed, so routing through it here would leak pending timers.
		// Spontaneous remote close marks closed itself, which is what makes
		// send-after-close correctly rejected.
		if (this.closed) return;
		this.closed = true;
		this.failPending(new Error('CDP session closed'));
		this.ws.close();
	}
}

// Convenience wrapper: open, run, always close. Guarantees socket cleanup
// even when fn throws or the per-call timer fires.
export async function withCdpSession(wsUrl, fn, { WsClass, timeoutMs } = {}) {
	const session = await CdpSession.open(wsUrl, { WsClass, timeoutMs });
	try {
		return await fn(session);
	} finally {
		await session.close();
	}
}
