/* global $state, $derived */
import type { ThemePreset } from '../types/typeThemePreset';
import type { ExplorerViewMode } from '../types/typeViews';
import type {
	BadgeKindMask,
	NodeElementKind,
	NodeElementMask,
	NodeElementOverrides,
	ViewHostMountContext,
} from '../types/typeViewHost';
import {
	EXPLORER_PLATFORM_VIEW_MODES,
	explorerViewContract,
	type ExplorerPlatformViewMode,
} from './serviceExplorerViewContract';
import { computeNodeElementMask } from './serviceNodeElementVisibility';

export interface ViewHostServiceArgs {
	preset: ThemePreset;
	mountContext: ViewHostMountContext;
	initialViewMode?: ExplorerViewMode;
}

export class ViewHostService {
	preset = $state<ThemePreset>() as ThemePreset;
	mountContext = $state<ViewHostMountContext>('panel');
	viewMode = $state<ExplorerViewMode>('tree');
	btnNodeElementsVisibility = $state<NodeElementOverrides>({});

	readonly selectableModes: readonly ExplorerPlatformViewMode[] = $derived(
		EXPLORER_PLATFORM_VIEW_MODES.filter((mode) =>
			(this.preset.viewModes as readonly string[]).includes(mode),
		),
	);

	readonly nodeElementMask: NodeElementMask = $derived(
		computeNodeElementMask(
			this.preset,
			this.preset.lockNodeElementVisibility ? null : this.btnNodeElementsVisibility,
		),
	);

	readonly multiSelectionAvailable: boolean = $derived(
		!this.preset.lockNodeElementVisibility &&
			this.isPlatformMode(this.viewMode) &&
			explorerViewContract(this.viewMode).features.nodeElementToggles,
	);

	constructor(args: ViewHostServiceArgs) {
		this.preset = args.preset;
		this.mountContext = args.mountContext;
		if (args.initialViewMode) this.viewMode = args.initialViewMode;
	}

	setViewMode(mode: ExplorerViewMode): void {
		this.viewMode = mode;
	}

	toggleElement(kind: NodeElementKind): void {
		if (this.preset.lockNodeElementVisibility) return;
		if (kind === 'badges') {
			this.toggleAllBadges();
			return;
		}
		this.btnNodeElementsVisibility = {
			...this.btnNodeElementsVisibility,
			[kind]: !this.nodeElementMask[kind],
		};
	}

	toggleBadgeKind(badgeKind: keyof BadgeKindMask): void {
		if (this.preset.lockNodeElementVisibility) return;
		const currentBadges = this.nodeElementMask.badges;
		this.btnNodeElementsVisibility = {
			...this.btnNodeElementsVisibility,
			badges: { ...currentBadges, [badgeKind]: !currentBadges[badgeKind] },
		};
	}

	resetOverrides(): void {
		this.btnNodeElementsVisibility = {};
	}

	private toggleAllBadges(): void {
		const currentBadges = this.nodeElementMask.badges;
		const allOn =
			currentBadges.ops &&
			currentBadges.filters &&
			currentBadges.warnings &&
			currentBadges.inherited &&
			currentBadges.counts;
		const newValue = !allOn;
		this.btnNodeElementsVisibility = {
			...this.btnNodeElementsVisibility,
			badges: {
				ops: newValue,
				filters: newValue,
				warnings: newValue,
				inherited: newValue,
				counts: newValue,
			},
		};
	}

	private isPlatformMode(mode: ExplorerViewMode): mode is ExplorerPlatformViewMode {
		return (EXPLORER_PLATFORM_VIEW_MODES as readonly string[]).includes(mode);
	}
}
