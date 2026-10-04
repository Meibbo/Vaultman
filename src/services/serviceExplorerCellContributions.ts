/** Public contribution boundary. The engine knows cells and paths, not add-ons. */
export type ExplorerCellContribution =
	| { readonly id: string; readonly kind: 'icon'; readonly element: HTMLElement }
	| { readonly id: string; readonly kind: 'text'; readonly text: string; readonly replacesPseudo?: 'before' | 'after' };

export interface ExplorerCellContext {
	readonly path: string;
	readonly nativeRow: HTMLElement | null;
	readonly document: Document;
	/** Resolved native pseudo visibility, cached by native row profile off scroll. */
	readonly nativePseudos: Readonly<Record<'before' | 'after', boolean>>;
}

export interface ExplorerCellProvider {
	readonly id: string;
	readonly translate: (context: ExplorerCellContext) => readonly ExplorerCellContribution[];
	/** Optional selector translation, scoped to compatible Files by the bridge. */
	readonly cssAliases?: (selectorText: string) => readonly string[];
	readonly subscribe?: (invalidate: () => void) => () => void;
}

const documentRegistries = new WeakMap<Document, ExplorerCellContributions>();
export function explorerCellStyleAliases(doc: Document, selectorText: string): readonly string[] {
	return documentRegistries.get(doc)?.styleAliases(selectorText) ?? [];
}

export class ExplorerCellContributions {
	private readonly providers = new Map<string, ExplorerCellProvider>();
	private readonly cleanup = new Map<string, () => void>();
	private readonly listeners = new Set<() => void>();
	private readonly documents = new Map<Document, number>();

	register(provider: ExplorerCellProvider): () => void {
		if (this.providers.has(provider.id)) throw new Error(`Explorer cell provider already registered: ${provider.id}`);
		this.providers.set(provider.id, provider);
		const off = provider.subscribe?.(() => this.invalidate());
		if (off) this.cleanup.set(provider.id, off);
		this.invalidate();
		return () => {
			if (this.providers.get(provider.id) !== provider) return;
			this.cleanup.get(provider.id)?.();
			this.cleanup.delete(provider.id);
			this.providers.delete(provider.id);
			this.invalidate();
		};
	}

	read(context: ExplorerCellContext): readonly ExplorerCellContribution[] {
		return [...this.providers.values()].flatMap(provider => provider.translate(context));
	}

	styleAliases(selectorText: string): readonly string[] {
		return [...this.providers.values()].flatMap(provider => provider.cssAliases?.(selectorText) ?? []);
	}

	invalidate(): void { for (const listener of this.listeners) listener(); }
	onChange(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	attachDocument(doc: Document): () => void {
		this.documents.set(doc, (this.documents.get(doc) ?? 0) + 1);
		documentRegistries.set(doc, this);
		return () => {
			const count = (this.documents.get(doc) ?? 1) - 1;
			if (count > 0) this.documents.set(doc, count);
			else { this.documents.delete(doc); documentRegistries.delete(doc); }
		};
	}

	destroy(): void {
		for (const off of this.cleanup.values()) off();
		this.cleanup.clear(); this.providers.clear(); this.invalidate(); this.listeners.clear();
		for (const doc of this.documents.keys()) documentRegistries.delete(doc);
		this.documents.clear();
	}
}
