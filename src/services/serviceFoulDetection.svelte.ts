import type { PortalFoulKind } from './servicePortalResolver';

export type FoulKind = PortalFoulKind | 'snippet-drift' | 'dom-mimicry';

export interface FoulEntry {
	kind: FoulKind;
	detail: string;
	timestamp: number;
}

export class FoulDetectionService {
	enabled = $state(false);
	fouls = $state<FoulEntry[]>([]);

	recordPortalFoul(kind: PortalFoulKind, detail = ''): void {
		if (!this.enabled) return;
		this.fouls = [...this.fouls, { kind, detail, timestamp: Date.now() }];
		console.warn(`[vaultman:foul:${kind}] ${detail}`);
	}

	checkSnippetDrift(input: {
		root: HTMLElement;
		mirrorClass: string;
		expectedProperty: string;
	}): void {
		if (!this.enabled) return;
		const el = input.root.querySelector(`.${input.mirrorClass}`);
		if (!el) return;
		const value = getComputedStyle(el as HTMLElement).getPropertyValue(input.expectedProperty);
		const looksUnstyled = value === '' || value === 'rgba(0, 0, 0, 0)' || value === 'transparent';
		if (looksUnstyled) {
			(el as HTMLElement).dataset.vmFoul = 'snippet-drift';
			this.fouls = [
				...this.fouls,
				{
					kind: 'snippet-drift',
					detail: `.${input.mirrorClass} on ${input.expectedProperty}`,
					timestamp: Date.now(),
				},
			];
		}
	}

	checkDomMimicry(root: HTMLElement): void {
		if (!this.enabled) return;
		if (!root.classList.contains('vm-mode-thin')) return;
		if (!root.classList.contains('vm-id-native')) return;
		const explorers = root.querySelectorAll('[data-vm-explorer="files"]');
		for (const explorer of explorers) {
			if (!explorer.querySelector('.nav-file')) {
				this.fouls = [
					...this.fouls,
					{
						kind: 'dom-mimicry',
						detail: 'files explorer missing .nav-file',
						timestamp: Date.now(),
					},
				];
			}
		}
	}

	reset(): void {
		this.fouls = [];
	}
}
