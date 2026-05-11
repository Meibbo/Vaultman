<script lang="ts">
	import { TFolder } from 'obsidian';
	import type { iVaultmanPlugin } from '../../types/typeSettings';
	import { translate } from '../../index/i18n/lang';
	import { serviceMessage } from '../../services/serviceMessage';
	import Toggle from '../primitives/Toggle.svelte';
	import Dropdown from '../primitives/Dropdown.svelte';
	import TextInput from '../primitives/TextInput.svelte';
	import { normalizeOperationScope } from '../../services/serviceOperationScope';
	import {
		resolveLayoutSettings,
		type LayoutDockDrawerDirection,
		type LayoutDockPresentationMode,
		type LayoutLabelPosition,
		type LayoutSurfaceContent,
	} from '../../services/serviceLayout';
	import { resolveNodeMouseActions, type NodeMouseAction } from '../../services/serviceMouse';
	import { LAYOUT_THEME_OPTIONS, normalizeLayoutTheme } from '../../services/serviceTheme';

	let { plugin }: { plugin: iVaultmanPlugin } = $props();

	function initState() {
		const src = plugin.settings;
		return {
			layoutTheme: normalizeLayoutTheme(src.layoutTheme),
			islandDismissOnOutsideClick: src.islandDismissOnOutsideClick,
			islandBackdropBlur: src.islandBackdropBlur,
			glassBlurIntensity: src.glassBlurIntensity,
			faintAccentsWhenWorkspaceFocused: src.faintAccentsWhenWorkspaceFocused === true,
			defaultPropertyType: src.defaultPropertyType,
			filterTemplates: src.filterTemplates,
			sessionFilePath: src.sessionFilePath,
			explorerCtrlClickSearch: src.explorerCtrlClickSearch,
			explorerShowQueuePreview: src.explorerShowQueuePreview,
			explorerShowMatchedFilterDecorations: src.explorerShowMatchedFilterDecorations === true,
			explorerNodeBackgrounds: src.explorerNodeBackgrounds !== false,
			explorerNodeBorders: src.explorerNodeBorders !== false,
			explorerContentSearch: src.explorerContentSearch,
			explorerOperationScope: normalizeOperationScope(src.explorerOperationScope),
			explorerFilesShowHidden: src.explorerFilesShowHidden,
			nodeMouseActions: resolveNodeMouseActions(src.nodeMouseActions),
			operationsPanelPosition: src.operationsPanelPosition,
			basesLastUsedPath: src.basesLastUsedPath,
			basesOpenMode: src.basesOpenMode,
			basesOpsPanelSide: src.basesOpsPanelSide,
			basesExplorerSide: src.basesExplorerSide,
			basesAutoAttach: src.basesAutoAttach,
			basesInjectCheckboxes: src.basesInjectCheckboxes,
			basesShowColumnSeparators: src.basesShowColumnSeparators,
			openMode: src.openMode,
			pageOrder: [...src.pageOrder],
			separatePanes: src.separatePanes,
			viewMode: src.viewMode,
			layout: resolveLayoutSettings(src.layout),
			filtersShowTabLabels: src.filtersShowTabLabels,
			filtersTabLabelsMigrated: src.filtersTabLabelsMigrated,
			gridRenderMode: (src.gridRenderMode ?? 'plain') as 'plain' | 'chunk' | 'all',
			gridHierarchyMode: (src.gridHierarchyMode ?? 'folder') as 'folder' | 'inline',
			gridEditableColumns: [...(src.gridEditableColumns ?? [])],
			gridLivePreviewColumns: [...(src.gridLivePreviewColumns ?? [])],
			gridColumns: [...(src.gridColumns ?? [])],
			gridRenderChunkSize: src.gridRenderChunkSize ?? 50,
			contextMenuShowInFileMenu: src.contextMenuShowInFileMenu,
			contextMenuShowInEditorMenu: src.contextMenuShowInEditorMenu,
			contextMenuShowInMoreOptions: src.contextMenuShowInMoreOptions,
			contextMenuHideRules: src.contextMenuHideRules,
			bindingNoteFolder: src.bindingNoteFolder ?? '',
			opsLogRetention: src.opsLogRetention ?? 1000,
			fnrRegexDefault: src.fnrRegexDefault === true,
		};
	}
	let s = $state(initState());

	function persistSettings(): void {
		Object.assign(plugin.settings, $state.snapshot(s));
		void plugin.saveSettings();
		plugin.updateGlassBlur();
	}

	$effect(() => {
		activeDocument.body.toggleClass('vm-bases-column-separators', s.basesShowColumnSeparators);
	});

	function arrToStr(arr: string[]): string {
		return arr.join(', ');
	}
	function strToArr(str: string): string[] {
		return str
			.split(',')
			.map((x) => x.trim())
			.filter(Boolean);
	}

	const PAGE_IDS = ['ops', 'statistics', 'filters'] as const;
	const PAGE_LABELS: Record<string, string> = {
		ops: translate('nav.ops'),
		statistics: translate('nav.statistics'),
		filters: translate('nav.filters'),
	};

	function setPageOrder(pos: number, value: string): void {
		const order = [...s.pageOrder];
		order[pos] = value;
		s.pageOrder = order;
		persistSettings();
	}

	function onBindingNoteFolderInput(v: string): void {
		s.bindingNoteFolder = v;
		persistSettings();
		const trimmed = v.trim();
		if (trimmed.length === 0) return;
		const file = plugin.app.vault.getAbstractFileByPath(trimmed);
		if (!(file instanceof TFolder)) {
			serviceMessage.warning(
				translate('settings.binding_note_folder.invalid').replace('{folder}', trimmed),
			);
		}
	}

	function onOpsLogRetentionInput(raw: string): void {
		const parsed = Number.parseInt(raw, 10);
		const clamped = Number.isFinite(parsed) ? Math.max(100, Math.min(10000, parsed)) : 1000;
		s.opsLogRetention = clamped;
		persistSettings();
	}

	function setLayoutContent(surface: 'dock' | 'tabs', content: LayoutSurfaceContent): void {
		s.layout = {
			...s.layout,
			[surface]: {
				...s.layout[surface],
				content,
			},
		};
		persistSettings();
	}

	function setLayoutLabelVisible(surface: 'dock' | 'tabs', visible: boolean): void {
		s.layout = {
			...s.layout,
			[surface]: {
				...s.layout[surface],
				labels: {
					...s.layout[surface].labels,
					visible,
				},
			},
		};
		persistSettings();
	}

	function setLayoutLabelPosition(surface: 'dock' | 'tabs', position: LayoutLabelPosition): void {
		s.layout = {
			...s.layout,
			[surface]: {
				...s.layout[surface],
				labels: {
					...s.layout[surface].labels,
					position,
				},
			},
		};
		persistSettings();
	}

	function setDockPresentationMode(mode: LayoutDockPresentationMode): void {
		s.layout = {
			...s.layout,
			dock: {
				...s.layout.dock,
				presentation: {
					...s.layout.dock.presentation,
					mode,
				},
			},
		};
		persistSettings();
	}

	function setDockDrawerDirection(direction: LayoutDockDrawerDirection): void {
		s.layout = {
			...s.layout,
			dock: {
				...s.layout.dock,
				presentation: {
					...s.layout.dock.presentation,
					drawerDirection: direction,
				},
			},
		};
		persistSettings();
	}

	function setNodeMouseAction(slot: 'primary' | 'secondary' | 'tertiary', action: NodeMouseAction): void {
		s.nodeMouseActions = {
			...s.nodeMouseActions,
			[slot]: action,
		};
		persistSettings();
	}
</script>

<div class="vm-settings">
	<!-- ── General ─────────────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">{translate('settings.default_type')}</h3>

	<Dropdown
		label={translate('settings.default_type')}
		bind:value={s.defaultPropertyType}
		onChange={persistSettings}
		options={[
			{ value: 'text', label: translate('prop.type.text') },
			{ value: 'number', label: translate('prop.type.number') },
			{ value: 'checkbox', label: translate('prop.type.checkbox') },
			{ value: 'list', label: translate('prop.type.list') },
			{ value: 'date', label: translate('prop.type.date') },
		]}
	/>

	<TextInput
		label="Session file path"
		placeholder="vaultman/session.md"
		value={s.sessionFilePath}
		onInput={(v) => {
			s.sessionFilePath = v;
			persistSettings();
		}}
	/>

	<!-- ── Explorer ──────────────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">Explorer</h3>

	<Toggle
		bind:checked={s.explorerCtrlClickSearch}
		label={translate('settings.ctrl_click_search')}
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.explorerShowQueuePreview}
		label={translate('settings.queue_preview')}
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.explorerShowMatchedFilterDecorations}
		label={translate('settings.explorer_matched_filter_decorations')}
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.explorerNodeBackgrounds}
		label={translate('settings.explorer_node_backgrounds')}
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.explorerNodeBorders}
		label={translate('settings.explorer_node_borders')}
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.explorerContentSearch}
		label={translate('settings.content_search')}
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.explorerFilesShowHidden}
		label={translate('settings.files_show_hidden')}
		onChange={persistSettings}
	/>
	<p class="vm-settings-desc">{translate('settings.files_show_hidden.desc')}</p>

	<Dropdown
		label={translate('settings.operation_scope')}
		bind:value={s.explorerOperationScope}
		onChange={persistSettings}
		options={[
			{ value: 'auto', label: translate('settings.scope.auto') },
			{ value: 'selected', label: translate('settings.scope.selected') },
			{ value: 'filtered', label: translate('settings.scope.filtered') },
		]}
	/>

	<Dropdown
		label="Primary node action"
		value={s.nodeMouseActions.primary}
		onChange={(value) => setNodeMouseAction('primary', value as NodeMouseAction)}
		options={[
			{ value: 'filter', label: 'Add to filters' },
			{ value: 'select', label: 'Select only' },
			{ value: 'open', label: 'Open / activate' },
			{ value: 'node-note', label: 'Create / open node-note' },
			{ value: 'delete', label: 'Delete' },
		]}
	/>
	<Dropdown
		label="Secondary node action"
		value={s.nodeMouseActions.secondary}
		onChange={(value) => setNodeMouseAction('secondary', value as NodeMouseAction)}
		options={[
			{ value: 'open', label: 'Open / activate' },
			{ value: 'filter', label: 'Add to filters' },
			{ value: 'select', label: 'Select only' },
			{ value: 'node-note', label: 'Create / open node-note' },
			{ value: 'delete', label: 'Delete' },
		]}
	/>
	<Dropdown
		label="Tertiary node action"
		value={s.nodeMouseActions.tertiary}
		onChange={(value) => setNodeMouseAction('tertiary', value as NodeMouseAction)}
		options={[
			{ value: 'delete', label: 'Delete' },
			{ value: 'node-note', label: 'Create / open node-note' },
			{ value: 'open', label: 'Open / activate' },
			{ value: 'filter', label: 'Add to filters' },
			{ value: 'select', label: 'Select only' },
		]}
	/>

	<!-- ── View ──────────────────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">{translate('settings.view_section')}</h3>

	<Dropdown
		label={translate('settings.open_mode')}
		bind:value={s.openMode}
		onChange={persistSettings}
		options={[
			{ value: 'sidebar', label: translate('settings.open_mode.sidebar') },
			{ value: 'main', label: translate('settings.open_mode.main') },
			{ value: 'both', label: translate('settings.open_mode.both') },
		]}
	/>

	<Dropdown
		label={translate('settings.ops_position')}
		bind:value={s.operationsPanelPosition}
		onChange={persistSettings}
		options={[
			{ value: 'right', label: translate('settings.ops_position.right') },
			{ value: 'bottom', label: translate('settings.ops_position.bottom') },
			{ value: 'replace', label: translate('settings.ops_position.replace') },
		]}
	/>

	<Dropdown
		label="File list view mode"
		bind:value={s.viewMode}
		onChange={persistSettings}
		options={[
			{ value: 'list', label: translate('view.mode.list') },
			{ value: 'selected', label: translate('view.mode.selected') },
		]}
	/>

	<Toggle
		bind:checked={s.separatePanes}
		label={translate('settings.layout.separate_panes')}
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.filtersShowTabLabels}
		label="Show tab labels in Filters"
		onChange={persistSettings}
	/>

	<div class="vm-settings-row">
		<span class="vm-settings-label">{translate('settings.page_order')}</span>
		<div class="vm-settings-page-order">
			{#each [0, 1, 2] as pos (pos)}
				<select
					value={s.pageOrder[pos]}
					onchange={(e) => setPageOrder(pos, (e.target as HTMLSelectElement).value)}
				>
					{#each PAGE_IDS as id (id)}
						<option value={id}>{PAGE_LABELS[id]}</option>
					{/each}
				</select>
			{/each}
		</div>
	</div>

	<!-- ── Appearance ────────────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">Appearance</h3>

	<Dropdown
		label={translate('settings.layout_theme')}
		bind:value={s.layoutTheme}
		onChange={persistSettings}
		options={LAYOUT_THEME_OPTIONS.map((option) => ({
			value: option.value,
			label: translate(option.labelKey),
			disabled: option.disabled,
		}))}
	/>

	<Toggle
		bind:checked={s.islandDismissOnOutsideClick}
		label={translate('settings.island_dismiss_outside')}
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.islandBackdropBlur}
		label={translate('settings.island_backdrop_blur')}
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.faintAccentsWhenWorkspaceFocused}
		label="Faint accents during workspace focus"
		onChange={persistSettings}
	/>

	<label class="vm-settings-slider">
		<span class="vm-settings-label">Background blur intensity</span>
		<input
			type="range"
			min="0"
			max="100"
			step="1"
			bind:value={s.glassBlurIntensity}
			oninput={persistSettings}
		/>
		<span class="vm-settings-slider-value">{s.glassBlurIntensity}</span>
	</label>

	<!-- ── Layout ────────────────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">{translate('settings.layout.title')}</h3>

	<Dropdown
		label="Dock content"
		value={s.layout.dock.content}
		onChange={(value) => setLayoutContent('dock', value as LayoutSurfaceContent)}
		options={[
			{ value: 'none', label: 'None' },
			{ value: 'filter-tabs', label: 'Filter tabs' },
			{ value: 'frame-pages', label: 'Pages' },
			{ value: 'tool-tabs', label: 'Tool tabs' },
		]}
	/>
	<Toggle
		checked={s.layout.dock.labels.visible}
		label="Show dock labels"
		onChange={(checked) => setLayoutLabelVisible('dock', checked)}
	/>
	<Dropdown
		label="Dock label position"
		value={s.layout.dock.labels.position}
		onChange={(value) => setLayoutLabelPosition('dock', value as LayoutLabelPosition)}
		options={[
			{ value: 'bottom', label: 'Below icon' },
			{ value: 'side', label: 'Beside icon' },
		]}
	/>
	<Dropdown
		label="Dock presentation"
		value={s.layout.dock.presentation.mode}
		onChange={(value) => setDockPresentationMode(value as LayoutDockPresentationMode)}
		options={[
			{ value: 'bar', label: 'Bottom bar' },
			{ value: 'drawer', label: 'FAB drawer' },
		]}
	/>
	<Dropdown
		label="Dock drawer direction"
		value={s.layout.dock.presentation.drawerDirection}
		onChange={(value) => setDockDrawerDirection(value as LayoutDockDrawerDirection)}
		options={[
			{ value: 'up', label: 'Up' },
			{ value: 'down', label: 'Down' },
			{ value: 'left', label: 'Left' },
			{ value: 'right', label: 'Right' },
		]}
	/>

	<Dropdown
		label="Top tabs content"
		value={s.layout.tabs.content}
		onChange={(value) => setLayoutContent('tabs', value as LayoutSurfaceContent)}
		options={[
			{ value: 'none', label: 'None' },
			{ value: 'frame-pages', label: 'Pages' },
			{ value: 'filter-tabs', label: 'Filter tabs' },
			{ value: 'tool-tabs', label: 'Tool tabs' },
		]}
	/>
	<Toggle
		checked={s.layout.tabs.labels.visible}
		label="Show top tab labels"
		onChange={(checked) => setLayoutLabelVisible('tabs', checked)}
	/>
	<Dropdown
		label="Top tab label position"
		value={s.layout.tabs.labels.position}
		onChange={(value) => setLayoutLabelPosition('tabs', value as LayoutLabelPosition)}
		options={[
			{ value: 'bottom', label: 'Below icon' },
			{ value: 'side', label: 'Beside icon' },
		]}
	/>

	<!-- ── Find & Replace / Binding notes / Ops log (multifacet wave 2) — -->
	<TextInput
		label={translate('settings.binding_note_folder')}
		placeholder=""
		value={s.bindingNoteFolder}
		onInput={onBindingNoteFolderInput}
	/>
	<p class="vm-settings-desc">{translate('settings.binding_note_folder.desc')}</p>

	<label class="vm-settings-row">
		<span class="vm-settings-label">{translate('settings.ops_log_retention')}</span>
		<input
			type="number"
			min="100"
			max="10000"
			step="100"
			value={s.opsLogRetention}
			oninput={(e) => onOpsLogRetentionInput((e.target as HTMLInputElement).value)}
		/>
	</label>
	<p class="vm-settings-desc">{translate('settings.ops_log_retention.desc')}</p>

	<Toggle
		bind:checked={s.fnrRegexDefault}
		label={translate('settings.fnr_regex_default')}
		onChange={persistSettings}
	/>
	<p class="vm-settings-desc">{translate('settings.fnr_regex_default.desc')}</p>

	<!-- ── Bases ─────────────────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">Bases</h3>

	<Dropdown
		label="Open mode"
		bind:value={s.basesOpenMode}
		onChange={persistSettings}
		options={[
			{ value: 'last-used', label: 'Reopen last used' },
			{ value: 'picker', label: 'Always show picker' },
		]}
	/>
	<Dropdown
		label="Operations panel side"
		bind:value={s.basesOpsPanelSide}
		onChange={persistSettings}
		options={[
			{ value: 'left', label: 'Left' },
			{ value: 'right', label: 'Right' },
		]}
	/>
	<Dropdown
		label="Properties explorer side"
		bind:value={s.basesExplorerSide}
		onChange={persistSettings}
		options={[
			{ value: 'left', label: 'Left' },
			{ value: 'right', label: 'Right' },
		]}
	/>
	<Toggle
		bind:checked={s.basesAutoAttach}
		label="Auto-attach to .base files"
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.basesInjectCheckboxes}
		label="Inject checkbox column"
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.basesShowColumnSeparators}
		label="Show column separators"
		onChange={persistSettings}
	/>

	<!-- ── Grid ──────────────────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">Grid</h3>

	<Dropdown
		label={translate('settings.grid_render_mode')}
		bind:value={s.gridRenderMode}
		onChange={persistSettings}
		options={[
			{ value: 'plain', label: translate('settings.grid_render_mode.plain') },
			{ value: 'chunk', label: translate('settings.grid_render_mode.chunk') },
			{ value: 'all', label: translate('settings.grid_render_mode.all') },
		]}
	/>
	<Dropdown
		label={translate('settings.grid_hierarchy_mode')}
		bind:value={s.gridHierarchyMode}
		onChange={persistSettings}
		options={[
			{ value: 'folder', label: translate('settings.grid_hierarchy_mode.folder') },
			{ value: 'inline', label: translate('settings.grid_hierarchy_mode.inline') },
		]}
	/>
	<TextInput
		label={translate('settings.grid_editable_columns')}
		placeholder="name, tags, status"
		value={arrToStr(s.gridEditableColumns)}
		onInput={(v) => {
			s.gridEditableColumns = strToArr(v);
			persistSettings();
		}}
	/>
	<TextInput
		label="Live preview columns"
		placeholder="content, notes"
		value={arrToStr(s.gridLivePreviewColumns)}
		onInput={(v) => {
			s.gridLivePreviewColumns = strToArr(v);
			persistSettings();
		}}
	/>
	<TextInput
		label="Visible columns"
		placeholder="name, tags, date"
		value={arrToStr(s.gridColumns)}
		onInput={(v) => {
			s.gridColumns = strToArr(v);
			persistSettings();
		}}
	/>

	<!-- ── Context menus ─────────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">Context menus</h3>

	<Toggle
		bind:checked={s.contextMenuShowInFileMenu}
		label="Show in file explorer menu"
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.contextMenuShowInEditorMenu}
		label="Show in editor menu"
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.contextMenuShowInMoreOptions}
		label="Show in more-options menu"
		onChange={persistSettings}
	/>

	<!-- ── Filter templates ──────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">{translate('settings.templates')}</h3>

	{#if s.filterTemplates.length === 0}
		<p class="vm-settings-desc">{translate('settings.templates.desc')}</p>
	{:else}
		{#each s.filterTemplates as tmpl (tmpl.name)}
			<div class="vm-settings-template-row">
				<span class="vm-settings-template-name">{tmpl.name}</span>
				<span class="vm-settings-template-count">{tmpl.root.children.length} filters</span>
				<button
					class="mod-warning"
					onclick={() => {
						s.filterTemplates = s.filterTemplates.filter((t) => t.name !== tmpl.name);
						persistSettings();
					}}
				>
					{translate('filter.template.delete')}
				</button>
			</div>
		{/each}
	{/if}
</div>
