import type { App } from 'obsidian';
import type { ContentMatch, ContentSearchStatus, IContentIndex } from '../types/typeContracts';
import { getActivePerfProbe } from '../dev/perfProbe';

const IDLE_STATUS: ContentSearchStatus = {
	query: '',
	phase: 'idle',
	scanned: 0,
	total: 0,
	resultCount: 0,
};

export function createContentIndex(app: App): IContentIndex {
	let query = '';
	let nodes: ContentMatch[] = [];
	let byId = new Map<string, ContentMatch>();
	let status: ContentSearchStatus = { ...IDLE_STATUS };
	let refreshVersion = 0;
	let publishedRevision = 0;
	const subs = new Set<() => void>();

	const fire = (): void => {
		for (const cb of subs) cb();
	};

	const publish = (nextNodes: ContentMatch[], nextStatus: ContentSearchStatus): void => {
		nodes = nextNodes;
		byId = new Map(nextNodes.map((node) => [node.id, node]));
		status = nextStatus;
		publishedRevision += 1;
		const probe = getActivePerfProbe();
		if (probe) {
			probe.measure('index.content.fire', { nodes: nextNodes.length }, fire);
		} else {
			fire();
		}
	};

	const index: IContentIndex = {
		get nodes(): readonly ContentMatch[] {
			return nodes;
		},
		get status(): ContentSearchStatus {
			return status;
		},
		get revision(): number {
			return publishedRevision;
		},
		async refresh(): Promise<void> {
			const currentVersion = ++refreshVersion;
			const currentQuery = query;
			const trimmed = currentQuery.trim();
			if (!trimmed) {
				publish([], { ...IDLE_STATUS });
				return;
			}

			const files = app.vault.getMarkdownFiles();
			const out: ContentMatch[] = [];
			publish([], {
				query: currentQuery,
				phase: 'scanning',
				scanned: 0,
				total: files.length,
				resultCount: 0,
			});

			const build = async (): Promise<void> => {
				const searchQuery = currentQuery.toLowerCase();
				const batchSize = 100;
				let lastPublish = Date.now();

				// Process in chunks to balance parallelism and main thread responsiveness
				const chunkSize = 20;
				for (let i = 0; i < files.length; i += chunkSize) {
					if (refreshVersion !== currentVersion) return;

					const chunk = files.slice(i, i + chunkSize);
					await Promise.all(
						chunk.map(async (file) => {
							const content = await app.vault.cachedRead(file);
							if (refreshVersion !== currentVersion) return;

							const lines = content.split('\n');
							for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
								const line = lines[lineIdx];
								const searchLine = line.toLowerCase();
								let start = 0;
								while (true) {
									const matchIdx = searchLine.indexOf(searchQuery, start);
									if (matchIdx === -1) break;
									const match = line.slice(matchIdx, matchIdx + currentQuery.length);
									out.push({
										id: `${file.path}:${lineIdx}:${matchIdx}`,
										filePath: file.path,
										line: lineIdx,
										before: line.slice(Math.max(0, matchIdx - 30), matchIdx),
										match,
										after: line.slice(
											matchIdx + currentQuery.length,
											matchIdx + currentQuery.length + 30,
										),
									});
									start = matchIdx + currentQuery.length;
									if (start >= line.length) break;
								}
							}
						}),
					);

					// Batch UI updates: every batchSize files OR every 250ms
					const now = Date.now();
					const scanned = Math.min(i + chunkSize, files.length);
					if (scanned === files.length || scanned % batchSize === 0 || now - lastPublish > 250) {
						lastPublish = now;
						publish([...out], {
							query: currentQuery,
							phase: 'scanning',
							scanned,
							total: files.length,
							resultCount: out.length,
						});
						// Allow UI to breathe
						await new Promise<void>((resolve) => activeWindow.setTimeout(resolve, 0));
					}
				}
			};

			const probe = getActivePerfProbe();
			if (probe) {
				await probe.measureAsync('index.content.build', { files: files.length }, build);
			} else {
				await build();
			}

			if (refreshVersion !== currentVersion) return;
			publish([...out], {
				query: currentQuery,
				phase: 'done',
				scanned: files.length,
				total: files.length,
				resultCount: out.length,
			});
		},
		subscribe(cb: () => void): () => void {
			subs.add(cb);
			return () => subs.delete(cb);
		},
		byId(id: string): ContentMatch | undefined {
			return byId.get(id);
		},
		setQuery(q: string): void {
			if (query === q) return;
			query = q;
			void index.refresh();
		},
	};

	return index;
}
