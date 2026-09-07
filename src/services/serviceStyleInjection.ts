// Servicio de hojas de estilo por id — domicilio del CSS de chrome.
//
// Antes de esto, vaultman no tenia donde vivir el CSS que inyecta en caliente
// (`ls src/services | grep -i style` estaba vacio). Cada PlatformAdapter que
// necesite estilos los da de alta aqui con SU id, y el `revert` del adapter los
// retira. La garantia que ofrece este servicio es "sin residuo": tras `remove`,
// el documento queda como si nunca se hubiese inyectado.
//
// Toma el `Document` por parametro y NO usa el global: Obsidian abre ventanas
// emergentes con su propio documento, y un servicio que asuma `document` deja
// esas ventanas sin estilo (o se lo pone a la ventana equivocada).

/** Atributo que marca nuestras hojas, para poder barrer huerfanas. */
export const STYLE_OWNER_ATTR = "data-vaultman-style";

export class StyleInjectionService {
	private readonly sheets = new Map<string, HTMLStyleElement>();

	constructor(private readonly doc: Document) {}

	/**
	 * Da de alta (o actualiza) la hoja de `id`. Idempotente por id: llamarlo dos
	 * veces NO crea un segundo `<style>`, reescribe el contenido del existente.
	 */
	inject(id: string, css: string): void {
		const existing = this.sheets.get(id);
		if (existing) {
			if (existing.textContent !== css) existing.textContent = css;
			return;
		}
		const el = this.doc.createElement("style");
		el.setAttribute(STYLE_OWNER_ATTR, id);
		el.textContent = css;
		this.doc.head.appendChild(el);
		this.sheets.set(id, el);
	}

	/** Retira la hoja de `id`. Seguro si no existe. */
	remove(id: string): void {
		const el = this.sheets.get(id);
		if (!el) return;
		el.remove();
		this.sheets.delete(id);
	}

	has(id: string): boolean {
		return this.sheets.has(id);
	}

	/** Retira todas las hojas dadas de alta por este servicio. */
	removeAll(): void {
		for (const id of [...this.sheets.keys()]) this.remove(id);
	}

	/**
	 * Barre hojas nuestras que hayan quedado en el documento sin estar en el
	 * mapa. Ocurre cuando el plugin se recarga sin pasar por `remove` (el caso
	 * del hot-reload y el del dev refrescando la pestana del web-lab).
	 */
	sweepOrphans(): number {
		let removed = 0;
		const nodes = this.doc.head.querySelectorAll(`style[${STYLE_OWNER_ATTR}]`);
		nodes.forEach((node) => {
			const id = node.getAttribute(STYLE_OWNER_ATTR);
			if (id !== null && this.sheets.get(id) === node) return;
			node.remove();
			removed++;
		});
		return removed;
	}

	/** Numero de hojas vivas dadas de alta aqui. */
	get size(): number {
		return this.sheets.size;
	}
}
