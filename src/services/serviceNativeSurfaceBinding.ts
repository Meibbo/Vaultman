import { Component, type App, type Plugin, type TFile } from "obsidian";
import type { BindingNodeInput, NodeBindingService } from "./serviceNodeBinding";
import { computeAliasToken, findNotesByAlias, extractWikilinkTarget } from "./serviceNodeBinding";
import type { NativeSurfaceClickAction, VaultmanSettings } from "../types/typeSettings";

export const NATIVE_SURFACE_HOVER_SOURCE = "vaultman-native-surface";

export const NATIVE_TAG_SELECTORS = [
	".tag-pane-tag",
	"a.tag[href^=\"#\"]",
	".metadata-property[data-property-key=\"tags\"] .multi-select-pill",
	"span.cm-hashtag",
	".cm-hashtag",
] as const;

export const NATIVE_FOLDER_SELECTORS = [
	".nav-folder-title",
	"[data-path][data-type=\"folder\"]",
	".view-header-breadcrumb",
] as const;

const HOVER_PARENT_SELECTOR = [
	".workspace-leaf-content",
	".markdown-preview-view",
	".markdown-source-view",
	".metadata-properties",
	".nav-files-container",
	".view-header",
	".workspace-leaf",
].join(", ");

export interface NativeBindingTarget {
	element: HTMLElement;
	node: BindingNodeInput;
	hoverParent: HTMLElement;
	isBreadcrumb?: boolean;
}

export interface NativeBindingClickDeps {
	bindingService: Pick<NodeBindingService, "bindOrCreate">;
	settings: Pick<VaultmanSettings, "nativeSurfaceClickPrimary" | "nativeSurfaceClickAlt" | "nativeSurfaceClickMod">;
	revealInVaultman?(node: BindingNodeInput): Promise<boolean> | boolean;
	searchInVaultman?(query: string): void;
	app?: App;
}

export interface NativeBindingHoverDeps {
	app: App;
}

export interface NativeSurfaceBindingServiceDeps {
	plugin: Plugin & { settings: VaultmanSettings };
	app: App;
	bindingService: NodeBindingService;
	revealInVaultman?(node: BindingNodeInput): Promise<boolean> | boolean;
	searchInVaultman?(query: string): Promise<void> | void;
	doc?: Document;
}

type ClosableElement = HTMLElement & {
	closest(selector: string): HTMLElement | null;
	querySelectorAll?(selector: string): NodeListOf<Element>;
	querySelector?(selector: string): Element | null;
	getAttribute?(name: string): string | null;
	dataset?: DOMStringMap | Record<string, string | undefined>;
};

export function resolveBreadcrumbFolderPath(el: ClosableElement, app: App): string | null {
	const parentEl = el.closest(".view-header-title-parent");
	if (!parentEl || !parentEl.querySelectorAll) return el.getAttribute?.("data-path") ?? (el.dataset?.path as string) ?? el.textContent?.trim() ?? null;

	const breadcrumbs = Array.from(parentEl.querySelectorAll(".view-header-breadcrumb"));
	const idx = breadcrumbs.indexOf(el as Element);
	if (idx === -1) return el.getAttribute?.("data-path") ?? (el.dataset?.path as string) ?? el.textContent?.trim() ?? null;

	const activeFile = app?.workspace?.getActiveFile?.() ?? null;
	if (!activeFile || !activeFile.parent || activeFile.parent.path === "/") {
		return el.textContent?.trim() ?? null;
	}

	const segments = activeFile.parent.path.split("/");
	if (idx >= segments.length) return activeFile.parent.path;
	return segments.slice(0, idx + 1).join("/");
}

/**
 * ISSUE 2: verifica si un folder tiene nota bindeada (C-node
 * `folder/folder.md` o nota por alias del path), sin crear nada.
 */
export function hasBoundFolderNote(folderPath: string, app?: App): boolean {
	if (!app) return false;
	const clean = folderPath.replace(/^[/\\]+|[/\\]+$/g, "");
	if (!clean) return false;
	const folderName = clean.split("/").pop() ?? clean;
	const cNodePath = clean + "/" + folderName + ".md";
	const files = app.vault?.getMarkdownFiles?.() ?? [];
	if (files.some((f) => f?.path === cNodePath)) return true;
	return findNotesByAlias(app, clean).length > 0;
}

/**
 * ISSUE 2 (rediseño): decora proactivamente todos los breadcrumbs con nota
 * bindeada al render, sin esperar click/hover. El nn-link es referencia
 * visual permanente mientras node-notes está activo (sin toggle de apagado
 * general, siempre decora con el plugin cargado).
 */
export function decorateBoundBreadcrumbs(doc: Document | undefined, app?: App): void {
	if (!doc || !app) return;
	const crumbs = doc.querySelectorAll(".view-header-breadcrumb");
	crumbs.forEach((crumb) => {
		const el = crumb as HTMLElement;
		const folderPath = resolveBreadcrumbFolderPath(el as unknown as ClosableElement, app);
		if (folderPath && hasBoundFolderNote(folderPath, app)) {
			el.classList.add("vaultman-node-note-link");
		}
	});
}

export function resolveNativeBindingTarget(
	target: EventTarget | null,
	app?: App,
): NativeBindingTarget | null {
	const base = asElement(target);
	if (!base) return null;

	// Invariant: WIR is exclusively for native Obsidian surfaces; NEVER intercept internal Vaultman UI
	if (
		base.closest(
			'.vaultman-frame, .vaultman-view, .vaultman-pages-viewport, .vaultman-tree-row, .vaultman-node-table-row, .vaultman-file-row, .vaultman-files-grid-card, .workspace-leaf-content[data-type="vaultman-frame"], .workspace-leaf-content[data-type="vaultman-view"]',
		)
	) {
		return null;
	}

	// task_108 surface-guard (allowlist cerrada, deny-by-default): exclusion
	// expresa de superficies efimeras/documentales. Ningun clic dentro de
	// modales, menus o prompts activa el binding.
	if (base.closest(".modal-container, .menu, .prompt")) {
		return null;
	}

	// 1. Breadcrumbs
	const breadcrumb = base.closest<HTMLElement>(".view-header-breadcrumb");
	if (breadcrumb) {
		const resolvedApp = app ?? (typeof window !== "undefined" ? (window as any).app : undefined);
		const folderPath = resolveBreadcrumbFolderPath(breadcrumb, resolvedApp);
		if (folderPath) {
			// ISSUE 2: si el folder tiene nota bindeada, el breadcrumb lleva
			// la clase de node-note-link; sin binding no se decora.
			if (hasBoundFolderNote(folderPath, resolvedApp)) {
				breadcrumb.classList.add("vaultman-node-note-link");
			}
			return {
				element: breadcrumb,
				node: { kind: "folder", label: folderPath, path: folderPath },
				hoverParent: closestHoverParent(breadcrumb),
				isBreadcrumb: true,
			};
		}
	}

	// 2. Tags
	const tagElement = closestAny(base, NATIVE_TAG_SELECTORS);
	if (tagElement) return resolveTagTarget(tagElement);

	// 3. Other folder surfaces
	const folderElement = closestAny(base, [".nav-folder-title", "[data-path][data-type=\"folder\"]"]);
	if (folderElement) return resolveFolderTarget(folderElement);

	// 4-5. Snippet/plugin rows: EXCLUIDAS de la allowlist (task_108).
	// Las filas de settings ([data-plugin-id]) son el vector exacto del P1:
	// lo desconocido conserva nativo hasta contrato documental.
	if (base.closest<HTMLElement>("[data-snippet-name], [data-plugin-id]")) {
		return null;
	}

	return null;
}

export async function handleNativeBindingClick(
	event: MouseEvent,
	deps: NativeBindingClickDeps,
): Promise<boolean> {
	const target = resolveNativeBindingTarget(event.target, deps.app);
	if (!target) return false;

	const action = resolveActionForEvent(event, deps.settings, target);
	if (!action || action === "none") return false;

	event.preventDefault();
	event.stopImmediatePropagation();

	switch (action) {
		case "reveal-in-vaultman":
			if (deps.revealInVaultman) {
				await deps.revealInVaultman(target.node);
				return true;
			}
			return false;

		case "open-node-note-same-tab":
			await deps.bindingService.bindOrCreate(target.node, { newLeaf: false });
			return true;

		case "open-node-note-new-tab":
			await deps.bindingService.bindOrCreate(target.node, { newLeaf: true });
			return true;

		case "search-selection":
			deps.searchInVaultman?.(target.node.label);
			return true;
	}

	return false;
}

function resolveActionForEvent(
	event: MouseEvent,
	settings: Pick<VaultmanSettings, "nativeSurfaceClickPrimary" | "nativeSurfaceClickAlt" | "nativeSurfaceClickMod">,
	target: NativeBindingTarget,
): NativeSurfaceClickAction {
	if (event.ctrlKey || event.metaKey || event.button === 1) {
		return settings.nativeSurfaceClickMod ?? "open-node-note-new-tab";
	}
	if (event.altKey) {
		return settings.nativeSurfaceClickAlt ?? "open-node-note-same-tab";
	}
	// task_108 puerta de primario (B1): clic primario llano (boton 0 sin
	// modificadores) -> "none" por defecto para toda superficie. Ninguna
	// superficie documentada exige accion primaria ("without hijacking
	// normal clicks"). Antes de cualquier preventDefault.
	if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.altKey) {
		return "none";
	}
	// Primary click:
	if (target.isBreadcrumb) {
		return settings.nativeSurfaceClickPrimary ?? "reveal-in-vaultman";
	}
	return settings.nativeSurfaceClickPrimary ?? "open-node-note-same-tab";
}

export function handleNativeBindingHover(
	event: MouseEvent,
	deps: NativeBindingHoverDeps,
): boolean {
	// ISSUE 3: el preview solo dispara con ctrl (o meta) presionado para
	// node_files y node-note-links; mouseover llano no dispara.
	if (!event.ctrlKey && !event.metaKey) return false;

	// node_files del file explorer nativo: fuera de la allowlist de click a
	// propósito (cero riesgo P1); el hover sí los cubre por path directo.
	const fileTarget = resolveNativeFileHoverTarget(event.target, deps.app);
	if (fileTarget) {
		deps.app.workspace?.trigger?.("hover-link", {
			event,
			source: NATIVE_SURFACE_HOVER_SOURCE,
			targetEl: fileTarget.element,
			linktext: fileTarget.path,
			hoverParent: fileTarget.element,
		});
		return true;
	}

	const target = resolveNativeBindingTarget(event.target, deps.app);
	if (!target) return false;

	const app = deps.app;

	// Check for Folder C-Node or wikilink or alias note
	let targetFile: TFile | null = null;

	if (target.node.kind === "folder") {
		const folderPath = (target.node.path ?? target.node.label).replace(/^[/\\]+|[/\\]+$/g, "");
		const folderName = folderPath.split("/").pop() ?? folderPath;
		const cNodePath = folderPath ? folderPath + "/" + folderName + ".md" : folderName + ".md";
		const cNode = app.vault?.getAbstractFileByPath?.(cNodePath);
		if (cNode instanceof (app.vault?.getMarkdownFiles?.()[0]?.constructor ?? Object)) {
			targetFile = cNode as TFile;
		}
	} else if (target.node.kind === "value" || target.node.kind === "prop") {
		const wikilink = extractWikilinkTarget(target.node.label);
		if (wikilink) {
			const dest = app.metadataCache?.getFirstLinkpathDest?.(wikilink, "");
			if (dest) targetFile = dest;
		}
	}

	if (!targetFile) {
		const token = computeAliasToken(target.node);
		const matches = findNotesByAlias(app, token);
		if (matches.length === 1) targetFile = matches[0];
	}

	if (!targetFile) return false;

	app.workspace?.trigger?.("hover-link", {
		event,
		source: NATIVE_SURFACE_HOVER_SOURCE,
		targetEl: target.element,
		linktext: targetFile.path,
		hoverParent: target.hoverParent,
	});
	return true;
}

/**
 * ISSUE 3: resuelve la fila de archivo nativa (`.nav-file-title[data-path]`)
 * para preview por path directo. Solo se usa en el path de hover, nunca en
 * click: las superficies de archivo quedan fuera de la allowlist de binding.
 */
export function resolveNativeFileHoverTarget(
	target: EventTarget | null,
	app?: App,
): { element: HTMLElement; path: string } | null {
	const base = asElement(target);
	if (!base) return null;
	const fileEl = base.closest<HTMLElement>(".nav-file-title[data-path]");
	const rawPath = fileEl?.getAttribute?.("data-path") ?? (fileEl?.dataset?.path as string) ?? null;
	if (!fileEl || !rawPath) return null;
	const files = app?.vault?.getMarkdownFiles?.() ?? [];
	const match = files.find((f) => f?.path === rawPath);
	if (match?.path) return { element: fileEl, path: match.path };
	// Fallback sin índice de markdown (izenas con getMarkdownFiles vacío):
	// lookup directo, excluyendo carpetas por `children`.
	const direct = app?.vault?.getAbstractFileByPath?.(rawPath) as
		| { path?: string; children?: unknown }
		| null
		| undefined;
	if (direct && direct.path === rawPath && direct.children === undefined) {
		return { element: fileEl, path: direct.path };
	}
	return null;
}

export interface InternalNodeNoteHoverDeps {
	app?: App;
}

function triggerInternalHover(
	app: App | undefined,
	event: MouseEvent,
	targetEl: HTMLElement,
	linktext: string,
): void {
	app?.workspace?.trigger?.("hover-link", {
		event,
		source: NATIVE_SURFACE_HOVER_SOURCE,
		targetEl,
		linktext,
		hoverParent: targetEl,
	});
}

/**
 * Preview con ctrl/meta sobre nn-links INTERNOS de Vaultman (filas del
 * explorer). Solo dispara `hover-link`, jamás suprime ni intercepta: si el
 * target también resuelve como superficie nativa, el handler nativo manda.
 */
export function handleInternalNodeNoteHover(
	event: MouseEvent,
	deps: InternalNodeNoteHoverDeps,
): boolean {
	if (!event.ctrlKey && !event.metaKey) return false;
	const base = asElement(event.target);
	if (!base) return false;
	const link = base.closest?.(".vaultman-node-note-link") as HTMLElement | null;
	if (!link) return false;
	const app = deps.app;

	// Las superficies nativas las cubre el handler nativo (sin doble preview).
	if (resolveNativeBindingTarget(event.target, app)) return false;

	// 1. Anchor con href (valores wikilink/url renderizados).
	const href = link.getAttribute?.("href") ?? null;
	if (href) {
		const dest = app?.metadataCache?.getFirstLinkpathDest?.(href, "") as
			| { path?: string }
			| null
			| undefined;
		if (dest?.path) {
			triggerInternalHover(app, event, link, dest.path);
			return true;
		}
		return false;
	}

	if (!app) return false;

	// 2. Fila de archivo [data-path]: alias de path/filename/basename.
	const row = link.closest?.("[data-path]") as HTMLElement | null;
	const rowPath = row?.getAttribute?.("data-path") ?? (row?.dataset?.path as string) ?? null;
	if (rowPath) {
		const fileName = rowPath.split("/").pop() ?? rowPath;
		const basename = fileName.replace(/\.[^/.]+$/, "");
		for (const token of [rowPath, fileName, basename]) {
			const hits = findNotesByAlias(app, token);
			if (hits.length > 0 && hits[0]?.path) {
				triggerInternalHover(app, event, link, hits[0].path);
				return true;
			}
		}
		return false;
	}

	// 3. Texto del label: alias verbatim o [texto].
	const text = (link.textContent ?? "").trim();
	if (text) {
		for (const token of [text, "[" + text + "]"]) {
			const hits = findNotesByAlias(app, token);
			if (hits.length > 0 && hits[0]?.path) {
				triggerInternalHover(app, event, link, hits[0].path);
				return true;
			}
		}
	}
	return false;
}

export class NativeSurfaceBindingService extends Component {
	constructor(private readonly deps: NativeSurfaceBindingServiceDeps) {
		super();
	}

	onload(): void {
		const hoverPlugin = this.deps.plugin as typeof this.deps.plugin & {
			registerHoverLinkSource?: (
				source: string,
				info: { display: string; defaultMod: boolean },
			) => void;
		};
		hoverPlugin?.registerHoverLinkSource?.(NATIVE_SURFACE_HOVER_SOURCE, {
			display: "Vaultman native surfaces",
			defaultMod: true,
		});

		const doc = this.deps.doc ?? (typeof activeDocument !== "undefined" ? activeDocument : undefined);
		if (!doc) return;

		this.registerDomEvent(
			doc,
			"click",
			(event) => {
				void handleNativeBindingClick(event, {
					bindingService: this.deps.bindingService,
					settings: this.deps.plugin.settings,
					revealInVaultman: this.deps.revealInVaultman,
					searchInVaultman: this.deps.searchInVaultman,
					app: this.deps.app,
				});
			},
			{ capture: true },
		);
		this.registerDomEvent(
			doc,
			"auxclick",
			(event) => {
				void handleNativeBindingClick(event, {
					bindingService: this.deps.bindingService,
					settings: this.deps.plugin.settings,
					revealInVaultman: this.deps.revealInVaultman,
					app: this.deps.app,
				});
			},
			{ capture: true },
		);
		this.registerDomEvent(
			doc,
			"mouseover",
			(event) => {
				handleNativeBindingHover(event, { app: this.deps.app });
			},
			{ capture: false },
		);
		this.registerDomEvent(
			doc,
			"mouseover",
			(event) => {
				handleInternalNodeNoteHover(event, { app: this.deps.app });
			},
			{ capture: false },
		);

		// ISSUE 2 (rediseño): decoración proactiva permanente. Un
		// MutationObserver cubre todos los renders (inicial, cambio de tab,
		// misma tab, popouts) sin depender de qué eventos emita el host:
		// el nn-link es referencia visual constante mientras node-notes
		// está activo, no un efecto post-interacción.
		const decorate = (): void => {
			decorateBoundBreadcrumbs(doc, this.deps.app);
		};
		decorate();
		const crumbObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type !== "childList") continue;
				let hit = false;
				mutation.addedNodes.forEach((node) => {
					if (!(node instanceof Element)) return;
					if (
						node.matches(".view-header-breadcrumb") ||
						node.querySelector(".view-header-breadcrumb") !== null
					) {
						hit = true;
					}
				});
				if (hit) {
					decorate();
					break;
				}
			}
		});
		crumbObserver.observe(doc, { childList: true, subtree: true });
		this.register(() => crumbObserver.disconnect());
	}

	onunload(): void {
		const ws = this.deps.app?.workspace as typeof this.deps.app.workspace & {
			unregisterHoverLinkSource?: (source: string) => void;
		};
		ws?.unregisterHoverLinkSource?.(NATIVE_SURFACE_HOVER_SOURCE);
	}
}

export function resolveTagTarget(element: HTMLElement): NativeBindingTarget | null {
	const raw = tagText(element);
	const tagPath = raw.replace(/^#/, "").trim();
	if (!tagPath) return null;
	return {
		element,
		node: { kind: "tag", label: tagPath, tagPath },
		hoverParent: closestHoverParent(element),
	};
}

export function resolveFolderTarget(element: HTMLElement): NativeBindingTarget | null {
	const folderPath = folderPathFor(element);
	if (!folderPath) return null;
	return {
		element,
		node: { kind: "folder", label: folderPath, path: folderPath },
		hoverParent: closestHoverParent(element),
	};
}

export function tagText(element: HTMLElement): string {
	const attrHref = element.getAttribute?.("href");
	if (attrHref?.startsWith("#")) return decodeURIComponent(attrHref.slice(1));
	const inner = element.querySelector?.(
		".tag-pane-tag-text, .tree-item-inner-text, .multi-select-pill-content",
	);
	return (inner?.textContent ?? element.textContent ?? "").trim();
}

export function folderPathFor(element: HTMLElement): string {
	const datasetPath = element.dataset?.path;
	if (datasetPath) return datasetPath.trim();
	const attrPath = element.getAttribute?.("data-path");
	if (attrPath) return attrPath.trim();
	return (element.textContent ?? "").trim();
}

function closestHoverParent(element: HTMLElement): HTMLElement {
	return asHtmlElement(element.closest?.(HOVER_PARENT_SELECTOR)) ?? element;
}

function closestAny(
	element: ClosableElement,
	selectors: readonly string[],
): HTMLElement | null {
	for (const selector of selectors) {
		const match = asHtmlElement(element.closest(selector));
		if (match) return match;
	}
	return null;
}

function asElement(target: EventTarget | null): ClosableElement | null {
	if (!target || typeof (target as ClosableElement).closest !== "function") return null;
	return target as ClosableElement;
}

function asHtmlElement(value: unknown): HTMLElement | null {
	if (!value || typeof (value as { closest?: unknown }).closest !== "function") return null;
	return value as HTMLElement;
}
