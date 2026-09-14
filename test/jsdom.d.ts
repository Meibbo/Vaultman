// Minimal structural typing for the JSDOM surface this suite uses (the
// `jsdom` package ships no declaration file and `@types/jsdom` is not a
// dependency). Kept narrow on purpose: only what the cascade tests need.
declare module 'jsdom' {
	export class JSDOM {
		constructor(html: string, options?: { pretendToBeVisual?: boolean });
		window: Window & { document: Document };
	}
}
