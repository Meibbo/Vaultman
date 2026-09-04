import { setIcon, type App } from 'obsidian';

import {
	LIST_WIDGETS,
	resolveCorePropertyWidget,
	type CorePropertyWidget,
} from '../logic/propertyValueCoercion';

const WIKILINK = /^\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]$/;
const HYPERLINK = /^https?:\/\/\S+$/i;
const MARKDOWN_LINK = /^\[([^\]]*)\]\(([^)]+)\)$/;

export type PropertyValueLinkType = 'hyperlink' | 'url_link' | 'wikilink' | 'plain';

/**
 * ISSUE 1: distingue la identidad de enlace de un valor crudo para que solo
 * el wikilink verdadero reciba formato/clase de node-note-link. El criterio
 * de wikilink espeja `_decorateNodeNotes` (`[[...]]`); el markdown `[t](u)`
 * gana sobre su contenido aunque la URL sea un wikilink.
 */
export function detectLinkType(rawValue: string): PropertyValueLinkType {
	const raw = (rawValue ?? '').trim();
	if (HYPERLINK.test(raw)) return 'hyperlink';
	if (MARKDOWN_LINK.test(raw)) return 'url_link';
	if (raw.startsWith('[[') && raw.endsWith(']]') && raw.length > 4) return 'wikilink';
	return 'plain';
}

/**
 * Texto visible de un wikilink (`alias` si hay, si no el destino), igual que
 * el panel nativo de frontmatter. `null` si no es wikilink.
 */
export function parseWikilink(rawValue: string): { target: string; display: string } | null {
	const match = (rawValue ?? '').trim().match(WIKILINK);
	if (!match) return null;
	const target = match[1].trim();
	const display = (match[2] || target).trim();
	if (!target || !display) return null;
	return { target, display };
}

export function parseWikilinkDisplay(rawValue: string): string | null {
	return parseWikilink(rawValue)?.display ?? null;
}

/**
 * How long a date field may keep changing before its value is treated as the
 * one the user meant. Long enough to type a full date segment by segment,
 * short enough that a picker selection feels immediate.
 */
const DATE_COMMIT_DELAY_MS = 700;

// The widget vocabulary moved to `logic/propertyValueCoercion`: the inline edit
// has to coerce a committed string back into the property's runtime type, and
// that decision must not depend on a module that imports `obsidian`. The
// renderer keeps re-exporting it so its own importers are unaffected.
export {
	resolveCorePropertyWidget,
	type CorePropertyWidget,
} from '../logic/propertyValueCoercion';

export interface PropertyValueRenderContext {
	container: HTMLElement;
	/**
	 * Core's file-properties layout stores the type variables on the enclosing
	 * `.metadata-property-value`; ordinary Cells store them on their own root.
	 */
	propertyAttributeContainer?: HTMLElement;
	propertyKey?: string;
	raw: string;
	type: string;
	app: App;
	/** Reports a removal gesture. The caller decides what removal means. */
	onRemoveValue?: () => void;
	/** Reports a committed inline edit. Absent means the value is not editable. */
	onRenameValue?: (next: string) => void;
}

type PropertyValueRenderer = (context: PropertyValueRenderContext) => void;

/**
 * The editable text node. It carries no styling of its own: in the projection
 * it must be indistinguishable from the value rendered with Format off, and
 * clicking it only raises a caret.
 */
export function renderEditableText(
	parent: HTMLElement,
	context: PropertyValueRenderContext,
): HTMLElement {
	const { raw, app, onRenameValue } = context;

	const wikilink = raw.trim().match(WIKILINK);
	if (wikilink) {
		const target = wikilink[1];
		const link = parent.createEl('a', {
			cls: 'internal-link vaultman-property-value-link',
			text: wikilink[2] || target,
			href: target,
		});
	 // Como el frontmatter de core: marca no resuelto cuando el destino no existe.
		const cache = app.metadataCache;
		if (cache && !cache.getFirstLinkpathDest?.(target, '')) {
			link.addClass('is-unresolved');
		}
		link.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			void app.workspace.openLinkText(target, '', false);
		});
		return link;
	}

	// ISSUE 1: los url_link [texto](url) tienen su propia decoración en vez
	// de texto plano. Con destino externo abren fuera (sin preventDefault);
	// con destino wikilink navegan como un internal-link de core.
	const mdLink = raw.trim().match(MARKDOWN_LINK);
	if (mdLink) {
		const text = mdLink[1].trim();
		const url = mdLink[2].trim();
		const inner = url.match(WIKILINK);
		if (inner) {
			const target = inner[1];
			const link = parent.createEl('a', {
				cls: 'internal-link vaultman-property-value-link',
				text: text || inner[2] || target,
				href: target,
			});
			link.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				void app.workspace.openLinkText(target, '', false);
			});
			return link;
		}
		const link = parent.createEl('a', {
			cls: 'external-link vaultman-property-value-link',
			text: text || url,
			href: url,
		});
		link.addEventListener('click', (event) => {
			event.stopPropagation();
		});
		return link;
	}

	// ISSUE 1: el hyperlink pelado es un anchor externo, no texto plano.
	if (HYPERLINK.test(raw.trim())) {
		const trimmed = raw.trim();
		const link = parent.createEl('a', {
			cls: 'external-link vaultman-property-value-link',
			text: trimmed,
			href: trimmed,
		});
		link.addEventListener('click', (event) => {
			event.stopPropagation();
		});
		return link;
	}

	const text = parent.createSpan({
		cls: 'vaultman-property-value-text',
		text: raw,
	});
	if (!onRenameValue) return text;

	text.addClass('vaultman-property-value-editable');
	// Editing is armed on pointerdown, before the browser resolves the click.
	// Focusing an already-editable element would drop the caret at offset 0;
	// letting the same gesture that armed it also place the caret is what puts
	// the cursor where the user actually clicked.
	text.addEventListener('mousedown', (event) => {
		event.stopPropagation();
		beginInlineEdit(text, raw, onRenameValue);
	});
	text.addEventListener('click', (event) => {
		event.stopPropagation();
	});
	return text;
}

/**
 * Turns the text node into a caret in place. `contenteditable` is used rather
 * than swapping in an input because an input brings a box, its own font and its
 * own height; the requirement is that editing changes nothing but the caret.
 */
function beginInlineEdit(
	text: HTMLElement,
	original: string,
	onRenameValue: (next: string) => void,
): void {
	if (text.contentEditable === 'true') return;
	text.contentEditable = 'true';

	let settled = false;
	const finish = (commit: boolean): void => {
		if (settled) return;
		settled = true;
		text.contentEditable = 'false';
		const next = (text.textContent ?? '').trim();
		if (!commit || next === original || !next) {
			text.setText(original);
			return;
		}
		onRenameValue(next);
	};

	text.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			finish(true);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			finish(false);
		}
	});
	text.addEventListener('blur', () => finish(true));
}

/** Core Bases renders strings and numbers with `setText`. No input, no box. */
function renderScalar(context: PropertyValueRenderContext): void {
	renderEditableText(context.container, context);
}

/**
 * Core's `unknown` widget (property.ts `LO`): a plain object or a value with
 * no registered widget renders read-only, as its raw JSON, painted with
 * `mod-unknown` — Core's own class, so the warning/orange color tracks the
 * active theme instead of a hardcoded one here.
 */
function renderUnknown(context: PropertyValueRenderContext): void {
	context.container.createSpan({
		cls: 'metadata-property-value-item mod-unknown',
		text: context.raw,
		attr: { tabindex: '0' },
	});
}

/**
 * Core Bases renders a list as `value-list-container` holding one
 * `value-list-element` per entry. One value node is one entry: `logicProps`
 * already expanded array frontmatter into separate nodes.
 *
 * This is also the anatomy third-party property plugins query, so emitting it
 * is what lets their decorations reach the explorer.
 */
function renderList(context: PropertyValueRenderContext): void {
	const list = context.container.createDiv({ cls: 'value-list-container' });
	const element = list.createSpan({ cls: 'value-list-element' });
	renderEditableText(element, context);
}

/** Core renders a tag value as an anchor, which inherits the theme's tag style. */
function renderTags(context: PropertyValueRenderContext): void {
	const list = context.container.createDiv({ cls: 'value-list-container' });
	const element = list.createSpan({ cls: 'value-list-element' });
	const name = context.raw.trim();
	const tag = element.createEl('a', {
		cls: 'tag',
		text: name.startsWith('#') ? name : `#${name}`,
		href: name.startsWith('#') ? name : `#${name}`,
	});
	tag.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
	});
}

function renderCheckbox(context: PropertyValueRenderContext): void {
	const { onRenameValue } = context;
	const checkbox = context.container.createEl('input', {
		type: 'checkbox',
		cls: 'metadata-input-checkbox',
	});
	const checked = !['', 'false', '0', 'no', 'none', 'null'].includes(
		context.raw.trim().toLowerCase(),
	);
	checkbox.checked = checked;

	if (!onRenameValue) {
		checkbox.tabIndex = -1;
		checkbox.setAttribute('aria-readonly', 'true');
		checkbox.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
		});
		return;
	}

	// A checkbox toggle is a value rename like any other: `true` becomes
	// `false`. The DOM state is not the source of truth — it is repainted from
	// the operation, so the box reverts if the rename is cancelled or rejected.
	checkbox.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		onRenameValue(checked ? 'false' : 'true');
	});
}

/**
 * Date and datetime keep a real control because the picker is the point of
 * them. The input stays enabled — a disabled input cannot open a picker — and
 * its geometry is collapsed by our own scoped rules instead, so it sits on the
 * row rather than filling it. Committing the picker is the inline edit for a
 * date: there is no second gesture to learn.
 */
function renderDateInput(
	context: PropertyValueRenderContext,
	kind: 'date' | 'datetime',
): void {
	const { container, raw, onRenameValue } = context;
	const value = kind === 'date' ? raw.slice(0, 10) : raw.slice(0, 16);
	const input = container.createEl('input', {
		type: kind === 'date' ? 'date' : 'datetime-local',
		cls: `metadata-input metadata-input-text mod-${kind}`,
		attr: {
			max: kind === 'date' ? '9999-12-31' : '9999-12-31T23:59',
			...(onRenameValue ? {} : { disabled: 'true' }),
		},
	});
	input.value = value;
	if (!onRenameValue) return;

	// A date input fires `change` every time its value becomes valid, so typing
	// a date segment by segment reports several complete dates on the way to the
	// intended one — one queued operation per keystroke. The commit waits until
	// the field settles; Enter and blur flush it immediately, so the picker still
	// commits as soon as it closes.
	// An input rendered into a popout window has to use that window's timer
	// queue, which is what Obsidian's `el.win` is for: the main window's timers
	// stop firing for a detached popout.
	const timers = input.win;
	let pending: number | null = null;
	const cancel = (): void => {
		if (pending === null) return;
		timers.clearTimeout(pending);
		pending = null;
	};
	const commit = (): void => {
		cancel();
		const next = input.value;
		// An emptied or unchanged field is not an edit.
		if (!next || next === value) {
			input.value = value;
			return;
		}
		// A recycled row can drop this input before the timer fires; a value from
		// a node that is no longer on screen must not reach the queue.
		if (!input.isConnected) return;
		onRenameValue(next);
	};

	input.addEventListener('click', (event) => event.stopPropagation());
	input.addEventListener('change', () => {
		cancel();
		pending = timers.setTimeout(commit, DATE_COMMIT_DELAY_MS);
	});
	input.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			commit();
		} else if (event.key === 'Escape') {
			cancel();
			input.value = value;
			input.blur();
		}
	});
	input.addEventListener('blur', commit);
}

function renderDate(context: PropertyValueRenderContext): void {
	const { container, raw, app } = context;
	if (Number.isNaN(Date.parse(raw))) {
		renderScalar(context);
		return;
	}
	renderDateInput(context, 'date');

	const day = raw.slice(0, 10);
	// Same treatment as the delete control: it belongs to the row, appears on
	// hover, and sits beside its value instead of across the cell.
	const dailyNote = container.createSpan({
		cls: 'clickable-icon vaultman-property-value-action',
		attr: { 'aria-label': `Open daily note ${day}` },
	});
	setIcon(dailyNote, 'lucide-link');
	dailyNote.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		void app.workspace.openLinkText(day, '', false);
	});
}

function renderDateTime(context: PropertyValueRenderContext): void {
	if (Number.isNaN(Date.parse(context.raw))) {
		renderScalar(context);
		return;
	}
	renderDateInput(context, 'datetime');
}

const RENDER_MAP: Readonly<Record<CorePropertyWidget, PropertyValueRenderer>> = {
	text: renderScalar,
	number: renderScalar,
	multitext: renderList,
	aliases: renderList,
	tags: renderTags,
	checkbox: renderCheckbox,
	date: renderDate,
	datetime: renderDateTime,
	unknown: renderUnknown,
};

export function renderPropertyValue(context: PropertyValueRenderContext): void {
	const widget = resolveCorePropertyWidget(context.type);
	const propertyAttributeContainer =
		context.propertyAttributeContainer ?? context.container;
	propertyAttributeContainer.setAttribute('data-property-type', widget);
	if (context.propertyKey) {
		propertyAttributeContainer.setAttribute('data-property-key', context.propertyKey);
	}
	RENDER_MAP[widget](context);

	if (!context.onRemoveValue) return;
	// Reveals on row hover: a delete affordance on every value at rest is the
	// visual noise this projection is supposed to avoid.
	const remove = context.container.createSpan({
		cls: 'vaultman-property-value-remove',
	});
	setIcon(remove, 'lucide-x');
	remove.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		context.onRemoveValue?.();
	});
}

export { LIST_WIDGETS };
