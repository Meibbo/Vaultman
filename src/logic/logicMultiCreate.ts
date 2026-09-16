/**
 * U130 A12: multi-create across selected folders.
 *
 * Each destination is attempted independently in input order (callers pass
 * visible order from `resolveSelectionTargets`). A later failure never rolls
 * back earlier successes. The report keeps per-destination success/failure so
 * a partial run cannot be mistaken for a full success.
 */

export interface MultiCreateSuccess {
	/** Folder path the creation was attempted in. */
	destinationPath: string;
	/** Vault path that was actually created (already unique per folder). */
	createdPath: string;
}

export interface MultiCreateFailure {
	destinationPath: string;
	error: string;
}

export interface MultiCreateReport {
	succeeded: MultiCreateSuccess[];
	failed: MultiCreateFailure[];
}

export function toErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) return error.message;
	return String(error);
}

/**
 * Run `createOne` once per destination, sequentially and independently.
 * Never throws for per-destination failures; they land in `failed`.
 */
export async function runMultiCreate(
	destinationPaths: readonly string[],
	createOne: (destinationPath: string, index: number) => Promise<string>,
): Promise<MultiCreateReport> {
	const succeeded: MultiCreateSuccess[] = [];
	const failed: MultiCreateFailure[] = [];
	for (let index = 0; index < destinationPaths.length; index += 1) {
		const destinationPath = destinationPaths[index];
		try {
			const createdPath = await createOne(destinationPath, index);
			succeeded.push({ destinationPath, createdPath });
		} catch (error) {
			failed.push({ destinationPath, error: toErrorMessage(error) });
		}
	}
	return { succeeded, failed };
}
