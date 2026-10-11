// Reuses the vault-scoped targeting contract from the smoke runners
// (run-u130-ui-smoke.mjs execInVault, run-explorer-scroll-smoke.mjs
// vaultArg/runCdp): every DOM operation is directed at exactly one vault.
// Raw CDP transport here: GET {endpoint}/json/list over native fetch.
export function normalizeEndpoint(raw) {
	const endpoint = String(raw ?? '').trim().replace(/\/+$/, '');
	if (!endpoint) throw new Error('--endpoint must not be empty');
	if (!/^https?:\/\//i.test(endpoint)) throw new Error(`--endpoint must be http(s): ${endpoint}`);
	return endpoint;
}

export function extractVaultId(targetUrl) {
	if (typeof targetUrl !== 'string' || !targetUrl) return null;
	try {
		const parsed = new URL(targetUrl);
		const vault = parsed.searchParams.get('vault');
		return vault === null || vault === '' ? null : vault;
	} catch {
		const match = targetUrl.match(/[?&]vault=([^&#]*)/);
		if (!match) return null;
		try {
			const decoded = decodeURIComponent(match[1]);
			return decoded === '' ? null : decoded;
		} catch {
			return match[1] === '' ? null : match[1];
		}
	}
}

export async function listTargets(endpoint, { fetchFn = globalThis.fetch, timeoutMs = 8000 } = {}) {
	const url = `${normalizeEndpoint(endpoint)}/json/list`;
	const response = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
	if (!response.ok) throw new Error(`CDP census failed: HTTP ${response.status} from ${url}`);
	const data = await response.json();
	if (!Array.isArray(data)) throw new Error('CDP census failed: /json/list did not return an array');
	return data;
}

export function selectVaultTarget(targets, vaultId) {
	const vault = String(vaultId ?? '').trim();
	if (!vault) throw new Error('--vault must be an exact non-empty vault id');
	const matches = (Array.isArray(targets) ? targets : []).filter(
		(target) => extractVaultId(target?.url) === vault,
	);
	// Prefer real pages, like the tmp drivers' `type === 'page'` filter: a
	// service worker can share the vault URL, and physical input must land on
	// the page. Fall back to non-page matches rather than false absence.
	const pages = matches.filter((target) => target?.type === 'page');
	const candidates = pages.length > 0 ? pages : matches;
	if (candidates.length === 0) {
		const seen = (Array.isArray(targets) ? targets : [])
			.map((target) => extractVaultId(target?.url))
			.filter(Boolean);
		const hint = seen.length > 0 ? ` (seen vaults: ${[...new Set(seen)].join(', ')})` : '';
		throw new Error(`no CDP target with exact ?vault=${vault}${hint}`);
	}
	if (candidates.length > 1) {
		const ids = candidates.map((target) => target?.id ?? target?.title ?? '?').join(', ');
		throw new Error(`ambiguous CDP targets for ?vault=${vault}: ${candidates.length} matches (${ids}); refusing to guess`);
	}
	const selected = candidates[0];
	if (!selected.webSocketDebuggerUrl) throw new Error(`selected target for ?vault=${vault} has no webSocketDebuggerUrl`);
	return selected;
}
