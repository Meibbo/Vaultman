import { setIcon } from 'obsidian';
import type { OperationQueueService } from '../../services/serviceOperationQueue';
import { translate } from '../../i18n/index';
import type { VaultmanPlugin } from '../../main';
import { openQueueTemplateMenu } from '../../utils/queueTemplateMenu';
import { warningsForQueuedChange } from '../../logic/logicQueueWarnings';

/**
 * In-frame floating island showing the pending operation queue.
 * Rendered above the bottom nav bar, slides up from below.
 *
 * Structure (top → bottom inside island):
 *   header ("N pending changes")
 *   squircle buttons: Execute ▶ · Clear ✕ · Details ☰
 *   scrollable item list
 *
 * Height grows with content up to 70vh, then scrolls internally.
 */
export class QueueIslandComponent {
	private containerEl: HTMLElement;
	private plugin: VaultmanPlugin;
	private queueService: OperationQueueService;
	private onClose: () => void;
	private onOpenDetails: () => void;

	private islandEl: HTMLElement | null = null;
	private listEl: HTMLElement | null = null;
	private headerEl: HTMLElement | null = null;

	constructor(
		containerEl: HTMLElement,
		plugin: VaultmanPlugin,
		onClose: () => void,
		onOpenDetails: () => void,
	) {
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.queueService = plugin.queueService;
		this.onClose = onClose;
		this.onOpenDetails = onOpenDetails;
	}

	mount(): void {
		this.islandEl = this.containerEl.createDiv({ cls: 'vaultman-queue-island' });

		// 1. Squircle action buttons (Now first, floating above body via CSS)
		const btnRow = this.islandEl.createDiv({
			cls: 'vaultman-squircle-row vaultman-queue-island-btns',
		});

		const clearBtn = btnRow.createDiv({
			cls: 'vaultman-squircle',
			attr: {
				'aria-label': translate('ops.clear'),
				role: 'button',
				tabindex: '0',
			},
		});
		setIcon(clearBtn, 'lucide-trash'); // Changed from x to trash for "Clear queue"
		clearBtn.addEventListener('click', () => {
			this.queueService.clear();
			this.onClose();
		});

		const detailsBtn = btnRow.createDiv({
			cls: 'vaultman-squircle',
			attr: {
				'aria-label': translate('ops.details'),
				role: 'button',
				tabindex: '0',
			},
		});
		setIcon(detailsBtn, 'lucide-list');
		detailsBtn.addEventListener('click', () => {
			this.onOpenDetails();
		});

		const templateBtn = btnRow.createDiv({
			cls: 'vaultman-squircle',
			attr: {
				'aria-label': translate('queue.template.templates'),
				role: 'button',
				tabindex: '0',
			},
		});
		setIcon(templateBtn, 'lucide-bookmark');
		templateBtn.addEventListener('click', (event) => {
			openQueueTemplateMenu(this.plugin, event, this.onClose);
		});

		const executeBtn = btnRow.createDiv({
			cls: 'vaultman-squircle',
			attr: {
				'aria-label': translate('ops.apply'),
				role: 'button',
				tabindex: '0',
			},
		});
		setIcon(executeBtn, 'lucide-play');
		executeBtn.addEventListener('click', () => {
			void this.queueService.execute();
			this.onClose();
		});

		// 2. Header — count label (Now below squircles)
		this.headerEl = this.islandEl.createDiv({
			cls: 'vaultman-queue-island-header',
		});

		// 3. Scrollable item list
		this.listEl = this.islandEl.createDiv({
			cls: 'vaultman-queue-island-list',
		});

		this.render();

		// Slide in after next frame so CSS transition fires
		window.requestAnimationFrame(() => {
			this.islandEl?.addClass('is-open');
		});
	}

	render(): void {
		if (!this.listEl || !this.headerEl) return;
		const queue = this.queueService.queue;

		const pendingLabel = translate('queue.island.pending');
		this.headerEl.setText(`${queue.length} ${pendingLabel}`);

		this.listEl.empty();
		if (queue.length === 0) {
			this.listEl.createDiv({
				cls: 'vaultman-queue-island-empty',
				text: translate('queue.island.empty'),
			});
			return;
		}

		const threshold = this.plugin.settings.bulkOperationWarningThreshold ?? 400;
		for (const change of queue) {
			const rowWrap = this.listEl.createDiv({
				cls: 'vaultman-queue-island-node',
			});
			const rowEl = rowWrap.createDiv({ cls: 'vaultman-queue-island-row' });
			const fileCount = change.files.length;
			rowEl.createSpan({
				cls: 'vaultman-queue-island-row-files',
				text: `${fileCount} file${fileCount !== 1 ? 's' : ''}`,
			});
			rowEl.createSpan({
				cls: 'vaultman-queue-island-row-detail',
				text: change.details,
			});
			for (const warning of warningsForQueuedChange(change, threshold)) {
				const warningEl = rowWrap.createDiv({
					cls: `vaultman-queue-island-warning is-${warning.severity}`,
				});
				const iconEl = warningEl.createSpan({
					cls: 'vaultman-queue-island-warning-icon',
				});
				setIcon(
					iconEl,
					warning.severity === 'error'
						? 'lucide-circle-alert'
						: 'lucide-alert-triangle',
				);
				warningEl.createSpan({
					cls: 'vaultman-queue-island-warning-text',
					text:
						warning.kind === 'empty-target'
							? translate('queue.warning.empty_target')
							: translate('queue.warning.large_target', {
									count: warning.targetCount,
									threshold: warning.threshold ?? threshold,
								}),
				});
			}
		}
	}

	destroy(): void {
		this.islandEl?.remove();
		this.islandEl = null;
		this.listEl = null;
		this.headerEl = null;
	}
}
