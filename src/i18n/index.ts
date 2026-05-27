import { getLanguage as getObsidianLanguage } from 'obsidian';
import type { Language } from '../types/typeSettings';
import { en } from './en';
import { es } from './es';

type ResolvedLanguage = 'en' | 'es';

const translations: Record<ResolvedLanguage, Record<string, string>> = { en, es };

let currentLang: ResolvedLanguage = 'en';

/**
 * Resolve 'auto' to a concrete language by checking Obsidian's locale.
 */
function resolveLanguage(lang: Language): ResolvedLanguage {
	if (lang === 'en' || lang === 'es') return lang;

	const obsidianLanguage = getObsidianLanguage();
	if (obsidianLanguage.startsWith('es')) return 'es';
	if (obsidianLanguage) return 'en';

	// Fallback: moment.js locale (Obsidian includes moment globally)
	try {
		const locale = (window as unknown as { moment?: { locale?: () => string } }).moment?.locale?.();
		if (locale?.startsWith('es')) return 'es';
	} catch { /* ignore */ }

	// Fallback: browser language
	if (typeof navigator !== 'undefined') {
		const nav = navigator.language?.slice(0, 2);
		if (nav === 'es') return 'es';
	}

	return 'en';
}

export function setLanguage(lang: Language): void {
	currentLang = resolveLanguage(lang);
}

export function getLanguage(): ResolvedLanguage {
	return currentLang;
}

/**
 * Translate a key, optionally interpolating {placeholder} values.
 * Falls back to English, then to the raw key.
 */
export function translate(key: string, vars?: Record<string, string | number>): string {
	let text =
		translations[currentLang]?.[key] ??
		translations['en']?.[key] ??
		key;

	if (vars) {
		for (const [k, v] of Object.entries(vars)) {
			text = text.replace(`{${k}}`, String(v));
		}
	}
	return text;
}
