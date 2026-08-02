import { setIcon, type App } from 'obsidian';

const WIKILINK = /^\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]$/;

/**
 * How long a date field may keep changing before its value is treated as the
 * one the user meant. Long enough to type a full date segment by segment,
 * short enough that a picker selection feels immediate.
 */
const DATE_COMMIT_DELAY_MS = 700;

/**
 * The eight property widget types Obsidian Core ships. Core's own `property:set`
 * handler declares `text|list|number|checkbox|date|datetime` as assignable, and
 * `tags`/`aliases` are the derived kinds it renders separately.
 */
export type CorePropertyWidget =
	| 'text'
	| 'multitext'
	| 'number'
	| 'checkbox'
	| 'date'
	| 'datetime'
	| 'tags'
	| 'aliases';

export interface PropertyValueRenderContext {
	container: HTMLElement;
	raw: string;
	type: string;
	app: App;
	/** Reports a removal gesture. The caller decides what removal means. */
	onRemoveValue?: () => void;
	/** Reports a committed inline edit. Absent means the value is not editable. */
	onRenameValue?: (next: string) => void;
}

type PropertyValueRenderer = (context: PropertyValueRenderContext) => void;

const LIST_WIDGETS: ReadonlySet<CorePropertyWidget> = new Set([
	'tags',
	'aliases',
	'multitext',
]);

const WIDGET_ALIASES: Readonly<Record<string, CorePropertyWidget>> = {
	list: 'multitext',
	multitext: 'multitext',
	boolean: 'checkbox',
	toggle: 'checkbox',
	numeric: 'number',
	'date-time': 'datetime',
	date_time: 'datetime',
	cssclasses: 'multitext',
};

const KNOWN_WIDGETS: ReadonlySet<string> = new Set<CorePropertyWidget>([
	'text',
	'multitext',
	'number',
	'checkbox',
	'date',
	'datetime',
	'tags',
	'aliases',
]);

/**
 * Resolves whatever `PropertyInfo.widget`/`type` reported into one of the eight
 * Core kinds. An unrecognized type renders as text rather than disappearing,
 * because a value the plugin cannot classify is still a value the user wrote.
 */
export function resolveCorePropertyWidget(
	propType: string | undefined,
): CorePropertyWidget {
	const normalized = (propType ?? '').trim().toLowerCase();
	const aliased = WIDGET_ALIASES[normalized];
	if (aliased) return aliased;
	if (KNOWN_WIDGETS.has(normalized)) return normalized as CorePropertyWidget;
	return 'text';
}

/**
 * The editable text node. It carries no styling of its own: in the projection
 * it must be indistinguishable from the value rendered with Format off, and
 * clicking it only raises a caret.
 */
function renderEditableText(
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
		link.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			void app.workspace.openLinkText(target, '', false);
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
	let pending: ReturnType<typeof setTimeout> | null = null;
	const cancel = (): void => {
		if (pending === null) return;
		clearTimeout(pending);
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
		pending = setTimeout(commit, DATE_COMMIT_DELAY_MS);
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
};

export function renderPropertyValue(context: PropertyValueRenderContext): void {
	const widget = resolveCorePropertyWidget(context.type);
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
