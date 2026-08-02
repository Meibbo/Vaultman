export type SelectionIntent<T> =
	| { kind: 'replace'; id: T }
	| { kind: 'toggle'; id: T }
	| { kind: 'range'; id: T }
	| { kind: 'set'; id: T; selected: boolean }
	| { kind: 'clear' };

export type FileSelectionGesture = 'open' | 'range' | 'toggle';

export interface FileSelectionModifiers {
	altKey: boolean;
	shiftKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
}

export function fileSelectionGesture(
	event: FileSelectionModifiers | null | undefined,
	addMode: boolean,
): FileSelectionGesture {
	if (event?.shiftKey) return 'range';
	if (event?.altKey || (addMode && (event?.ctrlKey || event?.metaKey))) {
		return 'toggle';
	}
	return 'open';
}

export function updateFileSelection(
	state: { selectedPaths: ReadonlySet<string>; anchorPath: string | null },
	orderedPaths: readonly string[],
	targetPath: string,
	gesture: FileSelectionGesture,
): { selectedPaths: Set<string>; anchorPath: string | null } {
	if (gesture === 'open') {
		return { selectedPaths: new Set(), anchorPath: null };
	}
	if (gesture === 'toggle') {
		const selectedPaths = new Set(state.selectedPaths);
		if (selectedPaths.has(targetPath)) selectedPaths.delete(targetPath);
		else selectedPaths.add(targetPath);
		return {
			selectedPaths,
			anchorPath: selectedPaths.has(targetPath) ? targetPath : null,
		};
	}
	const targetIndex = orderedPaths.indexOf(targetPath);
	const anchorIndex = state.anchorPath
		? orderedPaths.indexOf(state.anchorPath)
		: -1;
	if (targetIndex < 0 || anchorIndex < 0) {
		return {
			selectedPaths: new Set([targetPath]),
			anchorPath: targetPath,
		};
	}
	const start = Math.min(anchorIndex, targetIndex);
	const end = Math.max(anchorIndex, targetIndex);
	return {
		selectedPaths: new Set(orderedPaths.slice(start, end + 1)),
		anchorPath: state.anchorPath,
	};
}

export interface SelectionSnapshot<T> {
	selected: ReadonlySet<T>;
	anchor: T | null;
}

export class NodeSelectionAxon<T> {
	private selectedSet = new Set<T>();
	private currentAnchor: T | null = null;
	private listeners = new Set<(snapshot: SelectionSnapshot<T>) => void>();

	snapshot(): SelectionSnapshot<T> {
		return {
			selected: new Set(this.selectedSet),
			anchor: this.currentAnchor,
		};
	}

	apply(intent: SelectionIntent<T>, orderedVisibleIds: readonly T[]): void {
		const prevSelected = new Set(this.selectedSet);
		const prevAnchor = this.currentAnchor;

		switch (intent.kind) {
			case 'replace': {
				this.selectedSet.clear();
				this.selectedSet.add(intent.id);
				this.currentAnchor = intent.id;
				break;
			}
			case 'toggle': {
				if (this.selectedSet.has(intent.id)) {
					this.selectedSet.delete(intent.id);
					if (this.currentAnchor === intent.id) {
						this.currentAnchor = null;
					}
				} else {
					this.selectedSet.add(intent.id);
					this.currentAnchor = intent.id;
				}
				break;
			}
			case 'range': {
				if (orderedVisibleIds.length === 0) break;
				const anchorIdx =
					this.currentAnchor !== null
						? orderedVisibleIds.indexOf(this.currentAnchor)
						: -1;
				const targetIdx = orderedVisibleIds.indexOf(intent.id);

				if (targetIdx !== -1) {
					const start =
						anchorIdx !== -1 ? Math.min(anchorIdx, targetIdx) : Math.min(0, targetIdx);
					const end =
						anchorIdx !== -1 ? Math.max(anchorIdx, targetIdx) : Math.max(0, targetIdx);

					this.selectedSet.clear();
					for (let i = start; i <= end; i++) {
						const item = orderedVisibleIds[i];
						if (item !== undefined) this.selectedSet.add(item);
					}
					if (this.currentAnchor === null) {
						this.currentAnchor = orderedVisibleIds[start] ?? null;
					}
				}
				break;
			}
			case 'set': {
				if (intent.selected) {
					this.selectedSet.add(intent.id);
					this.currentAnchor = intent.id;
				} else {
					this.selectedSet.delete(intent.id);
					if (this.currentAnchor === intent.id) {
						this.currentAnchor = null;
					}
				}
				break;
			}
			case 'clear': {
				this.selectedSet.clear();
				this.currentAnchor = null;
				break;
			}
		}

		if (this.hasChanged(prevSelected, prevAnchor)) {
			this.notify();
		}
	}

	reconcile(orderedVisibleIds: readonly T[], validIds?: ReadonlySet<T>): void {
		const validSet = validIds ?? new Set(orderedVisibleIds);
		const prevSelected = new Set(this.selectedSet);
		const prevAnchor = this.currentAnchor;

		for (const id of this.selectedSet) {
			if (!validSet.has(id)) {
				this.selectedSet.delete(id);
			}
		}

		if (this.currentAnchor !== null && !validSet.has(this.currentAnchor)) {
			this.currentAnchor = this.selectedSet.values().next().value ?? null;
		}

		if (this.hasChanged(prevSelected, prevAnchor)) {
			this.notify();
		}
	}

	subscribe(listener: (snapshot: SelectionSnapshot<T>) => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	private hasChanged(prevSelected: Set<T>, prevAnchor: T | null): boolean {
		if (this.currentAnchor !== prevAnchor) return true;
		if (this.selectedSet.size !== prevSelected.size) return true;
		for (const id of this.selectedSet) {
			if (!prevSelected.has(id)) return true;
		}
		return false;
	}

	private notify(): void {
		const snap = this.snapshot();
		for (const listener of this.listeners) {
			listener(snap);
		}
	}
}
