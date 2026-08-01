export interface FilterProjectionSnapshot {
	paths: readonly string[];
	stateSignature: string;
}

export interface FilterProjectionDelta {
	entered: string[];
	exited: string[];
	retained: string[];
	orderChanged: boolean;
	stateOnly: boolean;
	safe: boolean;
}

export function reconcileFilterProjectionItems<T>(
	nextPaths: readonly string[],
	retainedByPath: ReadonlyMap<string, T>,
	enteredByPath: ReadonlyMap<string, T>,
): T[] | null {
	const reconciled: T[] = [];
	for (const path of nextPaths) {
		const item = retainedByPath.get(path) ?? enteredByPath.get(path);
		if (item === undefined) return null;
		reconciled.push(item);
	}
	return reconciled;
}

function uniquePathSet(paths: readonly string[]): Set<string> | null {
	const unique = new Set(paths);
	return unique.size === paths.length ? unique : null;
}

export function resolveFilterProjectionDelta(
	previous: FilterProjectionSnapshot,
	next: FilterProjectionSnapshot,
): FilterProjectionDelta {
	const previousSet = uniquePathSet(previous.paths);
	const nextSet = uniquePathSet(next.paths);
	if (!previousSet || !nextSet) {
		return {
			entered: [],
			exited: [],
			retained: [],
			orderChanged: false,
			stateOnly: false,
			safe: false,
		};
	}

	const entered = next.paths.filter((path) => !previousSet.has(path));
	const exited = previous.paths.filter((path) => !nextSet.has(path));
	const retained = next.paths.filter((path) => previousSet.has(path));
	const previousRetained = previous.paths.filter((path) => nextSet.has(path));
	const orderChanged = previousRetained.some(
		(path, index) => path !== retained[index],
	);
	const stateOnly =
		entered.length === 0 &&
		exited.length === 0 &&
		!orderChanged &&
		previous.stateSignature !== next.stateSignature;

	return {
		entered,
		exited,
		retained,
		orderChanged,
		stateOnly,
		safe: true,
	};
}
