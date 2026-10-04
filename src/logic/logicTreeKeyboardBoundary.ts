const boundaries = new WeakMap<EventTarget, (event: KeyboardEvent) => boolean>();

/** Relays the active Obsidian view scope to the event's own tree only. */
export function bindTreeKeyboardBoundary(owner: EventTarget, handler: (event: KeyboardEvent) => boolean): () => void {
	boundaries.set(owner, handler);
	return () => { boundaries.delete(owner); };
}

export function routeTreeKeyboardEvent(event: KeyboardEvent): false | undefined {
	for (const target of event.composedPath()) {
		const handler = boundaries.get(target);
		if (!handler) continue;
		return handler(event) ? false : undefined;
	}
	return undefined;
}
