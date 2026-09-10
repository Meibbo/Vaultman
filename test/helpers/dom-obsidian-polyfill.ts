// Obsidian augments Element/Document with helpers that jsdom lacks.
// Polyfill the minimal surface used by Vaultman components mounted in tests.

type ObsEl = Element & {
	addClass(cls: string): void;
	removeClass(cls: string): void;
	toggleClass(cls: string, force?: boolean): void;
	empty(): void;
	createDiv(opts?: { cls?: string; text?: string }): HTMLElement;
	createEl(tag: string, opts?: { cls?: string; text?: string }): HTMLElement;
	createSpan(opts?: { cls?: string; text?: string }): HTMLElement;
	setText(text: string): void;
};

export function installObsidianDomPolyfill(): void {
	if (typeof Element === 'undefined') return;
	const nodeSlot = Node.prototype as unknown as Record<string, unknown>;
	if (!('instanceOf' in nodeSlot)) {
		nodeSlot.instanceOf = function <T>(
			this: Node,
			type: { new (): T; prototype: object },
		): boolean {
			return Object.prototype.isPrototypeOf.call(type.prototype, this);
		};
	}
	// Obsidian YA declara `createEl`/`createDiv` sobre Element con firmas
	// genericas (`<K extends keyof HTMLElementTagNameMap>`), asi que asignar
	// nuestra version simplificada directamente sobre el prototipo tipado no
	// compila: TS intenta casarlas y reduce el retorno a `never`. Se asigna
	// sobre una vista laxa y se LEE por `ObsEl`, que es lo que usan los helpers.
	const proto = Element.prototype as unknown as ObsEl;
	const slot = Element.prototype as unknown as Record<string, unknown>;
	if (!proto.addClass) {
		proto.addClass = function (cls: string) {
			(this).classList.add(cls);
		};
	}
	if (!proto.removeClass) {
		proto.removeClass = function (cls: string) {
			(this).classList.remove(cls);
		};
	}
	if (!proto.toggleClass) {
		proto.toggleClass = function (cls: string, force?: boolean) {
			(this).classList.toggle(cls, force);
		};
	}
	if (!proto.empty) {
		proto.empty = function (this: Element) {
			while (this.firstChild) this.removeChild(this.firstChild);
		};
	}
	if (!proto.createEl) {
		slot.createEl = function (
			this: Element,
			tag: string,
			opts?: { cls?: string; text?: string },
		) {
			const child = document.createElement(tag);
			if (opts?.cls) child.className = opts.cls;
			if (opts?.text) child.textContent = opts.text;
			this.appendChild(child);
			return child;
		};
	}
	if (!proto.createDiv) {
		slot.createDiv = function (
			this: ObsEl,
			opts?: { cls?: string; text?: string },
		) {
			return this.createEl('div', opts);
		};
	}
	if (!proto.createSpan) {
		slot.createSpan = function (
			this: ObsEl,
			opts?: { cls?: string; text?: string },
		) {
			return this.createEl('span', opts);
		};
	}
	if (!proto.setText) {
		proto.setText = function (text: string) {
			(this).textContent = text;
		};
	}
}
