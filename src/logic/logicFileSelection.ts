export type FileSelectionGesture = 'open' | 'range' | 'toggle';

export interface FileSelectionModifiers {
	altKey: boolean;
	shiftKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
}

export interface FileSelectionState {
	selectedPaths: ReadonlySet<string>;
	anchorPath: string | null;
}

export interface ResolvedFileSelectionState {
	selectedPaths: Set<string>;
	anchorPath: string | null;
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
	state: FileSelectionState,
	orderedPaths: readonly string[],
	targetPath: string,
	gesture: FileSelectionGesture,
): ResolvedFileSelectionState {
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
