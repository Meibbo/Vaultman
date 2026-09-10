import type { SasiRegistry } from './logicSasiRegistry';

/**
 * U130-01: entrada de una invocacion. Es SERIALIZABLE a proposito: si un macro
 * o un script externo puede disparar esto, el argumento tiene que poder
 * escribirse. Nada de eventos, nodos hovereados ni handles de DOM.
 */
export interface SasiPayload {
	origins?: readonly string[];
	destinations?: readonly string[];
	write?: 'append' | 'replace';
	/**
	 * Afirmacion explicita de consentimiento para una operation con
	 * `mutatesVault`. NO es un bypass: sin ella la invocacion se rechaza, no se
	 * ejecuta a ciegas. Existe para que una llamada desatendida no levante un
	 * modal que dejaria Obsidian bloqueado esperando a nadie.
	 */
	confirmed?: boolean;
	[key: string]: unknown;
}

export type SasiHandler = (payload: SasiPayload) => Promise<unknown>;

export function createSasiInvoker(
	registry: SasiRegistry,
	handlers: Record<string, SasiHandler>,
) {
	return async function invoke(
		id: string,
		payload: SasiPayload,
	): Promise<unknown> {
		const resolved = registry.resolve(id);
		if (!resolved.available || !resolved.def) {
			throw new Error(`SASI: id no registrado: ${id}`);
		}
		if (resolved.def.mutatesVault && payload.confirmed !== true) {
			throw new Error(`SASI: confirmation-required: ${id}`);
		}
		const handler = handlers[id];
		if (!handler) throw new Error(`SASI: no-handler: ${id}`);
		return handler(payload);
	};
}
