import { setIcon, type App } from 'obsidian';

const WIKILINK = /^\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]$/;

/**
 * The eight property widget types Obsidian Core ships. Core's own `property:set`
 * handler declares `text|list|number|checkbox|date|datetime` as assignable, and
 * `tags`/`aliases` are the derived kinds it renders as pills.
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

type PropertyValueRenderer = (
	container: HTMLElement,
	raw: string,
	app: App,
	onRemoveValue?: () => void,
) => void;

/** Kinds Core renders through its multi-select pill component. */
const PILL_WIDGETS: ReadonlySet<CorePropertyWidget> = new Set([
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

function appendWikilink(
	container: HTMLElement,
	match: RegExpMatchArray,
	app: App,
): void {
	const target = match[1];
	const link = container.createEl('a', {
		cls: 'internal-link vaultman-property-value-link',
		text: match[2] || target,
		href: target,
	});
	link.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		void app.workspace.openLinkText(target, '', false);
	});
}

function renderText(container: HTMLElement, raw: string): void {
	// Core builds this as a contenteditable div. The read projection reuses the
	// class for spacing and typography but never the editing affordance; task
	// 5.2 owns interactivity, and only for checkbox/date/datetime.
	container.createDiv({ cls: 'metadata-input-longtext', text: raw });
}

function renderNumber(container: HTMLElement, raw: string): void {
	const input = container.createEl('input', {
		type: 'text',
		cls: 'metadata-input metadata-input-number',
	});
	input.value = raw;
	input.readOnly = true;
	input.tabIndex = -1;
}

function renderCheckbox(container: HTMLElement, raw: string): void {
	const checkbox = container.createEl('input', {
		type: 'checkbox',
		cls: 'metadata-input-checkbox',
	});
	checkbox.checked = !['', 'false', '0', 'no', 'none', 'null'].includes(
		raw.trim().toLowerCase(),
	);
	checkbox.tabIndex = -1;
	checkbox.setAttribute('aria-readonly', 'true');
	checkbox.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
	});
}

function renderDate(container: HTMLElement, raw: string, app: App): void {
	if (Number.isNaN(Date.parse(raw))) {
		renderText(container, raw);
		return;
	}
	const day = raw.slice(0, 10);
	const dateInput = container.createEl('input', {
		type: 'date',
		cls: 'metadata-input metadata-input-text mod-date',
		attr: { max: '9999-12-31' },
	});
	dateInput.value = day;
	dateInput.readOnly = true;
	dateInput.tabIndex = -1;

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

function renderDateTime(container: HTMLElement, raw: string): void {
	if (Number.isNaN(Date.parse(raw))) {
		renderText(container, raw);
		return;
	}
	const dateTimeInput = container.createEl('input', {
		type: 'datetime-local',
		cls: 'metadata-input metadata-input-text mod-datetime',
		attr: { max: '9999-12-31T23:59' },
	});
	dateTimeInput.value = raw.slice(0, 16);
	dateTimeInput.readOnly = true;
	dateTimeInput.tabIndex = -1;
}

/**
 * One value node is one pill. `logicProps` already expands array frontmatter
 * into a node per entry, so splitting here would multiply values that the
 * projection has already separated.
 */
function renderPill(
	container: HTMLElement,
	raw: string,
	app: App,
	onRemoveValue?: () => void,
): void {
	const pillContainer = container.createDiv({ cls: 'multi-select-container' });
	const pill = pillContainer.createDiv({
		cls: 'multi-select-pill',
		attr: { tabIndex: 0 },
	});
	const wikilink = raw.trim().match(WIKILINK);
	const content = pill.createDiv({
		cls: 'multi-select-pill-content',
		...(wikilink ? {} : { text: raw }),
	});
	if (wikilink) appendWikilink(content, wikilink, app);

	if (!onRemoveValue) return;
	// The caller decides what removal means; this renderer only reports the
	// gesture. Keeping the decision outside is what stops a second deletion
	// path from existing beside the registered `value.delete` action.
	const remove = pill.createDiv({ cls: 'multi-select-pill-remove-button' });
	setIcon(remove, 'lucide-x');
	remove.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		onRemoveValue();
	});
}

const RENDER_MAP: Readonly<Record<CorePropertyWidget, PropertyValueRenderer>> = {
	text: (container, raw) => renderText(container, raw),
	multitext: renderPill,
	number: (container, raw) => renderNumber(container, raw),
	checkbox: (container, raw) => renderCheckbox(container, raw),
	date: renderDate,
	datetime: (container, raw) => renderDateTime(container, raw),
	tags: renderPill,
	aliases: renderPill,
};

export function renderPropertyValue(
	container: HTMLElement,
	raw: string,
	type: string,
	app: App,
	onRemoveValue?: () => void,
): void {
	const widget = resolveCorePropertyWidget(type);

	// Checkbox reads the raw value itself, and pills carry their own link
	// handling, so only the scalar widgets hand a wikilink value to the link
	// renderer. This preserves the precedence the 1.2.1 renderer already had.
	if (widget !== 'checkbox' && !PILL_WIDGETS.has(widget)) {
		const wikilink = raw.trim().match(WIKILINK);
		if (wikilink) {
			appendWikilink(container, wikilink, app);
			return;
		}
	}

	RENDER_MAP[widget](container, raw, app, onRemoveValue);
}
