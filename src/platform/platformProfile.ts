export interface PlatformProfile {
	readonly isPhone: boolean;
	readonly isMobile: boolean;
}

const PHONE_CLASS = 'is-phone';
const MOBILE_DEVICE_CLASSES = [PHONE_CLASS, 'is-mobile', 'mod-mobile', 'is-tablet'] as const;

export function isPhone(doc: Document = activeDocument): boolean {
	return doc.body?.classList.contains(PHONE_CLASS) === true;
}

export function isMobile(doc: Document = activeDocument): boolean {
	const classes = doc.body?.classList;
	if (!classes) return false;
	return MOBILE_DEVICE_CLASSES.some((className) => classes.contains(className));
}

export function platformProfile(doc: Document = activeDocument): PlatformProfile {
	return {
		isPhone: isPhone(doc),
		isMobile: isMobile(doc),
	};
}
