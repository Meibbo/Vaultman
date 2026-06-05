export const TYPE_ICON_MAP: Record<string, string> = {
	tags: 'lucide-tags',
	list: 'lucide-list',
	text: 'lucide-text',
	number: 'lucide-binary',
	date: 'lucide-calendar',
	datetime: 'lucide-calendar',
	checkbox: 'lucide-check-square',
	unknown: 'lucide-file-question',
	aliases: 'lucide-forward',
	cssclasses: 'lucide-palette',
};

export interface NativePropWidget {
	widget?: unknown;
	type?: unknown;
	name?: unknown;
	id?: unknown;
	icon?: unknown;
}

export interface MetadataTypeManagerLike {
	getWidget?(propName: string): NativePropWidget | string | undefined | null;
	getAssignedWidget?(propName: string): string | undefined | null;
	getTypeInfo?(propName: string): {
		expected?: NativePropWidget | string;
		inferred?: NativePropWidget | string;
	} | undefined | null;
	getPropertyInfo?(propName: string): {
		widget?: NativePropWidget | string;
		type?: NativePropWidget | string;
		icon?: string;
	} | undefined | null;
}

export interface ResolvedPropType {
	type: string;
	icon: string;
}

function objectTypeName(value: object): string {
	const record = value as Record<string, unknown>;
	for (const key of ['widget', 'type', 'id']) {
		const candidate = record[key];
		if (typeof candidate === 'string') return candidate;
	}
	return 'unknown';
}

export function normalizePropType(propType: unknown, propName?: string): string {
	const normalizedName = propName?.toLowerCase();
	if (normalizedName === 'tags') return 'tags';
	if (normalizedName === 'aliases') return 'aliases';
	if (normalizedName === 'cssclasses') return 'cssclasses';

	const rawType =
		typeof propType === 'string'
			? propType
			: propType && typeof propType === 'object'
				? objectTypeName(propType)
				: 'unknown';
	const normalizedType = rawType.toLowerCase();
	if (normalizedType === 'toggle') return 'checkbox';
	if (normalizedType === 'boolean') return 'checkbox';
	if (normalizedType === 'numeric') return 'number';
	if (normalizedType === 'multitext') return 'list';
	if (normalizedType === 'list') return 'list';
	if (normalizedType in TYPE_ICON_MAP) return normalizedType;
	return 'unknown';
}

export function toNativePropType(type: string): string {
	if (type === 'list') return 'multitext';
	if (type === 'number') return 'number';
	if (type === 'checkbox') return 'checkbox';
	return type;
}

function iconFrom(value: unknown): string | null {
	if (value && typeof value === 'object') {
		const icon = (value as NativePropWidget).icon;
		if (typeof icon === 'string' && icon) return icon;
	}
	return null;
}

function resolvedFrom(
	propName: string,
	value: unknown,
	explicitIcon?: string,
): ResolvedPropType | null {
	const type = normalizePropType(value, propName);
	if (type === 'unknown') return null;
	return {
		type,
		icon: explicitIcon || iconFrom(value) || TYPE_ICON_MAP[type],
	};
}

export function resolveNativePropType(
	propName: string,
	fallbackType: unknown,
	manager: MetadataTypeManagerLike | null | undefined,
): ResolvedPropType {
	const normalizedName = propName.toLowerCase();
	if (
		normalizedName === 'tags' ||
		normalizedName === 'aliases' ||
		normalizedName === 'cssclasses'
	) {
		const type = normalizePropType(normalizedName, propName);
		return { type, icon: TYPE_ICON_MAP[type] };
	}

	const typeInfo = manager?.getTypeInfo?.(propName);
	const propertyInfo = manager?.getPropertyInfo?.(propName);

	return (
		resolvedFrom(propName, typeInfo?.expected) ??
		resolvedFrom(propName, typeInfo?.inferred) ??
		resolvedFrom(propName, propertyInfo?.widget, propertyInfo?.icon) ??
		resolvedFrom(propName, propertyInfo?.type, propertyInfo?.icon) ??
		resolvedFrom(propName, manager?.getAssignedWidget?.(propName)) ??
		resolvedFrom(propName, manager?.getWidget?.(propName)) ??
		resolvedFrom(propName, fallbackType) ?? {
			type: 'unknown',
			icon: TYPE_ICON_MAP.unknown,
		}
	);
}
