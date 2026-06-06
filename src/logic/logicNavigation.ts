const DEFAULT_DOCK_PAGE_ORDER = ['filters', 'statistics'] as const;
const VALID_DOCK_PAGES = new Set<string>(DEFAULT_DOCK_PAGE_ORDER);
const LEGACY_DEFAULT_PAGE_ORDERS = [
	['ops', 'statistics', 'filters'],
	['filters', 'ops', 'statistics'],
];

function matchesOrder(order: string[], expected: string[]): boolean {
	return (
		order.length === expected.length &&
		expected.every((page, index) => order[index] === page)
	);
}

export function resolveDockPageOrder(order: string[] | undefined): string[] {
	if (!Array.isArray(order)) return [...DEFAULT_DOCK_PAGE_ORDER];
	if (
		LEGACY_DEFAULT_PAGE_ORDERS.some((legacyOrder) =>
			matchesOrder(order, legacyOrder),
		)
	) {
		return [...DEFAULT_DOCK_PAGE_ORDER];
	}

	const normalized = order.filter((page) => VALID_DOCK_PAGES.has(page));
	for (const page of DEFAULT_DOCK_PAGE_ORDER) {
		if (!normalized.includes(page)) normalized.push(page);
	}

	return normalized.slice(0, DEFAULT_DOCK_PAGE_ORDER.length);
}
