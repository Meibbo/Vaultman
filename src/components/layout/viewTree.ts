// src/components/UnifiedTreeView.ts
import { setIcon } from 'obsidian';
import type { TreeNode } from '../../types/typeTree';

export interface TreeViewOptions {
	nodes: TreeNode[];
	expandedIds: Set<string>;
	onToggle: (id: string) => void;
	onRowClick: (id: string) => void;
	onContextMenu: (id: string, e: MouseEvent) => void;
	activeFilterIds?: Set<string>;
	searchHighlightIds?: Set<string>;
	warningIds?: Set<string>;
	editingId?: string | null;
	onRename?: (id: string, newLabel: string) => void;
	onCancelRename?: () => void;
	onBadgeDoubleClick?: (queueIndex: number) => void;
	renderLimit?: number;
}

const RENDER_LIMIT = 200;

export class UnifiedTreeView {
	private containerEl: HTMLElement;
	private rowEls = new Map<string, HTMLElement>();
	private _pendingRaf: number | null = null;
	private _opts: TreeViewOptions | null = null;

	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
	}

	render(opts: TreeViewOptions): void {
		this._opts = opts;
		if (this._pendingRaf !== null) {
			cancelAnimationFrame(this._pendingRaf);
		}

		const scrollTop = this.containerEl.scrollTop;
		this.containerEl.empty();
		this.rowEls.clear();
		let rendered = 0;
		const limit = opts.renderLimit ?? RENDER_LIMIT;

		const renderNodes = (nodes: TreeNode[], parent: HTMLElement) => {
			for (const node of nodes) {
				if (rendered >= limit) break;
				this._renderRow(node, parent, opts);
				rendered++;
				if (node.children?.length && opts.expandedIds.has(node.id)) {
					const childWrap = parent.createDiv({ cls: 'vaultman-tree-children' });
					renderNodes(node.children, childWrap);
				}
			}
		};

		this._pendingRaf = window.requestAnimationFrame(() => {
			renderNodes(opts.nodes, this.containerEl);
			this.containerEl.scrollTop = scrollTop;
			this._pendingRaf = null;

			// Handle focus if editing
			if (opts.editingId) {
				const row = this.rowEls.get(opts.editingId);
				const input = row?.querySelector('input');
				if (input instanceof HTMLInputElement) {
					input.focus();
					input.select();
				}
			}

			if (opts.nodes.length > limit) {
				this._renderShowMore(opts);
			}
		});
	}

	/** Toggle visibility of rows matching/not matching filtered IDs — no DOM rebuild */
	updateVisibility(visibleIds: Set<string>): void {
		for (const [id, el] of this.rowEls) {
			el.toggleClass('is-hidden', !visibleIds.has(id));
		}
	}

	private _renderRow(node: TreeNode, parent: HTMLElement, opts: TreeViewOptions): void {
		const hasChildren = (node.children?.length ?? 0) > 0;
		const isExpanded = opts.expandedIds.has(node.id);
		const isActive = opts.activeFilterIds?.has(node.id) ?? false;
		const isWarning = opts.warningIds?.has(node.id) ?? false;
		const isEditing = opts.editingId === node.id;

		const row = parent.createDiv({ cls: 'vaultman-tree-row' });
		if (typeof node.cls === 'string' && node.cls.trim()) {
			for (const c of node.cls.trim().split(/\s+/)) row.addClass(c);
		}
		row.dataset.id = node.id;
		row.style.setProperty('--depth', String(node.depth));
		if (isActive) row.addClass('is-active-filter');
		if (isWarning) row.addClass('vaultman-badge-warning');
		if (opts.searchHighlightIds?.has(node.id)) row.addClass('vaultman-search-highlight');
		if (isEditing) row.addClass('is-editing');

		this.rowEls.set(node.id, row);

		// Chevron / spacer
		const toggleSpan = row.createSpan({ cls: 'vaultman-tree-toggle' });
		if (hasChildren) {
			setIcon(toggleSpan, isExpanded ? 'lucide-chevron-down' : 'lucide-chevron-right');
			toggleSpan.addEventListener('click', (e) => {
				e.stopPropagation();
				opts.onToggle(node.id);
			});
		}

		// Icon
		if (node.icon) {
			const iconSpan = row.createSpan({ cls: 'vaultman-tree-icon' });
			setIcon(iconSpan, node.icon);
		}

		// Label / Input
		if (isEditing) {
			const input = row.createEl('input', {
				cls: 'vaultman-tree-input',
				value: node.label,
			});
			input.addEventListener('click', (e) => e.stopPropagation());
			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					opts.onRename?.(node.id, input.value);
				} else if (e.key === 'Escape') {
					opts.onCancelRename?.();
				}
			});
			input.addEventListener('blur', () => {
				// Prevent blur from firing if we are already re-rendering
				if (this._opts?.editingId === node.id) {
					opts.onCancelRename?.();
				}
			});
		} else {
			row.createSpan({ cls: 'vaultman-tree-label', text: node.label });
		}

		// Multi-zone Badges container
		if ((node.count != null && node.count > 0) || (node.badges && node.badges.length > 0)) {
			const badgeZone = row.createDiv({ cls: 'vaultman-tree-badge-zone' });

			// Priority: Operations/Conflicts badges first
			if (node.badges) {
				for (const badge of node.badges) {
					const bEl = badgeZone.createSpan({ cls: 'vaultman-badge' });
					// Only apply color class for solid/inherited badges; default is --text-normal
					if (badge.solid && badge.color) bEl.addClass(`vaultman-badge--${badge.color}`);
					if (badge.solid) bEl.addClass('is-solid');
					if (badge.isInherited) bEl.addClass('is-inherited');
					if (badge.icon) {
						const iEl = bEl.createSpan({ cls: 'vaultman-badge-icon' });
						setIcon(iEl, badge.icon);
					}
					if (badge.text) {
						bEl.setAttribute('title', badge.text);
					}
					// Double-click to undo this specific queue operation
					if (badge.queueIndex !== undefined && opts.onBadgeDoubleClick) {
						bEl.addClass('is-undoable');
						bEl.setAttribute('title', `${badge.text ?? ''} — double-click to undo`);
						bEl.addEventListener('dblclick', (e) => {
							e.stopPropagation();
							opts.onBadgeDoubleClick!(badge.queueIndex!);
						});
					}
				}
			}

			// Frequency counter second
			if (node.count != null && node.count > 0) {
				badgeZone.createSpan({ cls: 'vaultman-tree-count', text: String(node.count) });
			}
		}

		// Click + context menu
		row.addEventListener('click', () => opts.onRowClick(node.id));
		row.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			e.stopPropagation();
			opts.onContextMenu(node.id, e);
		});
	}

	private _renderShowMore(opts: TreeViewOptions): void {
		const btn = this.containerEl.createEl('button', {
			cls: 'vaultman-btn-small vaultman-show-more',
			text: `Show all ${opts.nodes.length} items…`,
		});
		btn.addEventListener('click', () => {
			this.render({ ...opts, renderLimit: Infinity });
		});
	}
}
