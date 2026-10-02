import type { LastOpenedRecord } from './logicLastOpened';

/** Bound main-thread work per turn instead of stringifying a large vault at once.
 * The service's dirty loop writes a fresh snapshot if mutations arrive while
 * this one yields; callers must discard a snapshot from a cleared generation.
 */
export async function serializeLastOpened(record: LastOpenedRecord): Promise<string> {
	const chunks: string[] = ['{'];
	let chunk = '';
	let separator = '';
	let deadline = performance.now() + 4;
	for (const path in record) {
		const at = record[path];
		if (at === undefined) continue;
		chunk += `${separator}${JSON.stringify(path)}:${at}`;
		separator = ',';
		if (performance.now() >= deadline) {
			chunks.push(chunk);
			chunk = '';
			await new Promise<void>((resolve) => setTimeout(resolve, 0));
			deadline = performance.now() + 4;
		}
	}
	chunks.push(chunk, '}');
	return chunks.join('');
}
