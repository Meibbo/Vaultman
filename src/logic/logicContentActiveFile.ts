export interface FilePathLike {
	readonly path: string;
}

export interface ActiveContentFileEvents {
	current(): FilePathLike | null | undefined;
	onFileOpen(listener: (file: FilePathLike | null) => void): () => void;
	onRename(listener: (file: FilePathLike, oldPath: string) => void): () => void;
	onDelete(listener: (file: FilePathLike) => void): () => void;
}

export function activeContentFilePath(
	file: FilePathLike | null | undefined,
): string | null {
	return file?.path ?? null;
}

export function observeActiveContentFile(
	events: ActiveContentFileEvents,
	onChange: (path: string | null) => void,
): () => void {
	let initialized = false;
	let currentPath: string | null = null;
	const publish = (path: string | null): void => {
		if (initialized && currentPath === path) return;
		initialized = true;
		currentPath = path;
		onChange(path);
	};
	const sync = (file: FilePathLike | null | undefined): void => {
		publish(activeContentFilePath(file));
	};

	sync(events.current());
	const stopFileOpen = events.onFileOpen(sync);
	const stopRename = events.onRename((file, oldPath) => {
		if (currentPath === oldPath) {
			sync(file);
			return;
		}
		sync(events.current());
	});
	const stopDelete = events.onDelete((file) => {
		if (currentPath === file.path) {
			publish(null);
			return;
		}
		sync(events.current());
	});

	return () => {
		stopFileOpen();
		stopRename();
		stopDelete();
	};
}
