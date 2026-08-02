import { setIcon, type App } from 'obsidian';

const WIKILINK = /^\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]$/;

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
	text.addEventListener('click', (event) => {
		event.stopPropagation();
		beginInlineEdit(text, raw, onRenameValue);
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
	text.focus();

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
	const checkbox = context.container.createEl('input', {
		type: 'checkbox',
		cls: 'metadata-input-checkbox',
	});
	checkbox.checked = !['', 'false', '0', 'no', 'none', 'null'].includes(
		context.raw.trim().toLowerCase(),
	);
	checkbox.tabIndex = -1;
	checkbox.setAttribute('aria-readonly', 'true');
	checkbox.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
	});
}

/**
 * Date and datetime keep a real control because the picker and the daily-note
 * shortcut are the point of them. `disabled="true"` is the literal attribute
 * Core's own `.bases-rendered-value input[disabled=true]` rules select, which is
 * what collapses the input to `min-height: 0` and `width: auto` instead of
 * leaving a full-width box on the row. Task 5.2 removes it when these become
 * interactive.
 */
function renderDate(context: PropertyValueRenderContext): void {
	const { container, raw, app } = context;
	if (Number.isNaN(Date.parse(raw))) {
		renderScalar(context);
		return;
	}
	const day = raw.slice(0, 10);
	const dateInput = container.createEl('input', {
		type: 'date',
		cls: 'metadata-input metadata-input-text mod-date',
		attr: { max: '9999-12-31', disabled: 'true' },
	});
	dateInput.value = day;

	const dailyNote = container.createDiv({
		cls: 'clickable-icon',
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
	const { container, raw } = context;
	if (Number.isNaN(Date.parse(raw))) {
		renderScalar(context);
		return;
	}
	const dateTimeInput = container.createEl('input', {
		type: 'datetime-local',
		cls: 'metadata-input metadata-input-text mod-datetime',
		attr: { max: '9999-12-31T23:59', disabled: 'true' },
	});
	dateTimeInput.value = raw.slice(0, 16);
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
