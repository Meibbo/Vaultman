/** Content search scans file bodies; only text formats we index belong in
 * that scan. Binary/media files (mp4, images, …) froze large-vault searches
 * when they slipped into the scope (BT4-008 / D28). Extend deliberately. */
export const CONTENT_SEARCHABLE_EXTENSIONS: readonly string[] = ['md'];

export function isContentSearchableFile(file: {
	extension: string;
}): boolean {
	return CONTENT_SEARCHABLE_EXTENSIONS.includes(file.extension.toLowerCase());
}
