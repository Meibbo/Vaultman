import type { App, TFile, WorkspaceLeaf } from 'obsidian';

import {
	planCoreResultUpdate,
	type CoreSearchResult,
} from '../logic/logicCoreResultDom';
import type { NativeSearchInput } from './serviceNativeSearchAdapter';

/**
 * U121-019 #51 — render the Text results through Obsidian's own result DOM.
 *
 * Core's `SearchResultDOM` owns an `infinityScroll`: it holds the entire result
 * set and renders only a window of it. That is the virtualisation our
 * `MAX_FILES = 200` / `MAX_SNIPPETS = 3` caps were standing in for, and this
 * branch (1.2.0 stable) has no virtualiser of its own to reach for.
 *
 * The class is not exported by the API, so it is taken from a live core search
 * view's prototype and instantiated against **our** container:
 *
 *     new SearchResultDOM(app, el, emptyStateText, scrollEl)
 *
 * Verified by construction on Obsidian 1.12.3 — three results rendered into a
 * Vaultman pane with a working `infinityScroll`. Signature read from
 * `Desktop/obsidian-web-lab/obsidian/app.js`; result shape (`{ content:
 * [[from, to], ...] }`) probed on a live result item.
 *
 * If the Search core plugin is disabled there is no class to borrow, so
 * `isCoreResultDomAvailable` is false and the caller keeps its own list.
 */

interface CoreSearchResultItem {
	file: TFile;
	el: HTMLElement;
	selfEl: HTMLElement;
	collapsed: boolean;
	setCollapse(collapsed: boolean, animate?: boolean): void;
}

interface CoreSearchResultDom {
	el: HTMLElement;
	childrenEl: HTMLElement;
	resultDomLookup: Map<TFile, CoreSearchResultItem>;
	addResult(
		file: TFile,
		result: CoreSearchResult,
		content: string,
		showTitle?: boolean,
	): CoreSearchResultItem | undefined;
	removeResult(file: TFile): CoreSearchResultItem | undefined;
	emptyResults(): void;
	setExtraContext(value: boolean): void;
	setCollapseAll(value: boolean): void;
	startLoader(): void;
	stopLoader(): void;
	onResize?(): void;
	getFiles(): TFile[];
	getMatchCount?(): number;
	working: boolean;
}

type CoreSearchResultDomCtor = new (
	app: App,
	el: HTMLElement,
	emptyStateText: string,
	scrollEl?: HTMLElement,
) => CoreSearchResultDom;

interface SearchLeafApp extends App {
	workspace: App['workspace'] & {
		getLeavesOfType(type: string): WorkspaceLeaf[];
	};
}

function findCoreResultDomCtor(app: App): CoreSearchResultDomCtor | null {
	const leaf = (app as SearchLeafApp).workspace.getLeavesOfType('search')?.[0];
	const dom = (leaf?.view as { dom?: object } | undefined)?.dom;
	if (!dom) return null;
	const ctor = (Object.getPrototypeOf(dom) as { constructor?: unknown })
		.constructor;
	if (typeof ctor !== 'function') return null;
	return ctor as CoreSearchResultDomCtor;
}

/** True when a core search view exists to borrow the result DOM class from. */
export function isCoreResultDomAvailable(app: App): boolean {
	return findCoreResultDomCtor(app) !== null;
}

export interface CoreResultDomOptions {
	/** Called after each published update, with the rows core currently holds. */
	onRendered?: (items: CoreSearchResultItem[]) => void;
}

export class CoreResultDomBridge {
	private dom: CoreSearchResultDom | null = null;
	private published: NativeSearchInput[] = [];

	constructor(
		private readonly app: App,
		private readonly options: CoreResultDomOptions = {},
	) {}

	get mounted(): boolean {
		return this.dom !== null;
	}

	/**
	 * Build core's result DOM inside `el`, scrolling `scrollEl`. Returns false
	 * when core search is unavailable, so the caller can fall back rather than
	 * render nothing.
	 */
	mount(el: HTMLElement, emptyStateText: string, scrollEl?: HTMLElement): boolean {
		this.destroy();
		const Ctor = findCoreResultDomCtor(this.app);
		if (!Ctor) return false;
		this.dom = new Ctor(this.app, el, emptyStateText, scrollEl ?? el);
		this.published = [];
		return true;
	}

	/**
	 * Publish a snapshot. Only what changed is handed to core, because
	 * `addResult` replaces an item and a scan publishes many times a second — a
	 * rebuilt row would snap shut the expansion the user just opened.
	 */
	render(inputs: NativeSearchInput[]): void {
		const dom = this.dom;
		if (!dom) return;
		const plan = planCoreResultUpdate(this.published, inputs);
		for (const file of plan.remove) dom.removeResult(file);
		for (const entry of plan.add) {
			dom.addResult(entry.file, entry.result, entry.content, true);
		}
		this.published = inputs.filter((input) => input.offsets.length > 0);
		this.options.onRendered?.([...dom.resultDomLookup.values()]);
	}

	/** Core's own "show more context" state — not a reimplementation over a slice. */
	setExtraContext(value: boolean): void {
		this.dom?.setExtraContext(value);
	}

	setCollapseAll(value: boolean): void {
		this.dom?.setCollapseAll(value);
	}

	setLoading(loading: boolean): void {
		if (!this.dom) return;
		if (loading) this.dom.startLoader();
		else this.dom.stopLoader();
	}

	/** The row core rendered for a file, when it currently holds one. */
	itemFor(file: TFile): CoreSearchResultItem | undefined {
		return this.dom?.resultDomLookup.get(file);
	}

	clear(): void {
		this.dom?.emptyResults();
		this.published = [];
	}

	destroy(): void {
		if (!this.dom) return;
		this.dom.emptyResults();
		this.dom = null;
		this.published = [];
	}
}
