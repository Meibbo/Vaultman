import { describe, expect, it } from 'vitest';
import type {
	InEditorMountContract,
	NodeElementKind,
	NodeElementMask,
	NodeElementOverrides,
	NoteContextProvider,
	UniversalDndVocab,
	ViewHostMountContext,
} from '../../../src/types/typeViewHost';
import { UNIVERSAL_DND_VOCAB } from '../../../src/types/typeViewHost';

describe('typeViewHost compile-only contracts', () => {
	it('ViewHostMountContext narrows to panel | in-editor', () => {
		const a: ViewHostMountContext = 'panel';
		const b: ViewHostMountContext = 'in-editor';
		expect([a, b]).toEqual(['panel', 'in-editor']);
	});

	it('NoteContextProvider has 3 thunk fields', () => {
		const provider: NoteContextProvider = {
			activeFile: () => null,
			activeHeadingPath: () => [],
			cursorPosition: () => null,
		};
		expect(provider.activeFile()).toBeNull();
		expect(provider.activeHeadingPath()).toEqual([]);
		expect(provider.cursorPosition()).toBeNull();
	});

	it('InEditorMountContract has required fields', () => {
		const stub: InEditorMountContract = {
			hostElement: {} as HTMLElement,
			preset: {} as never,
			initialViewMode: 'tree',
			noteContextProvider: {
				activeFile: () => null,
				activeHeadingPath: () => [],
				cursorPosition: () => null,
			},
			unmount: () => {},
		};
		expect(typeof stub.unmount).toBe('function');
		expect(stub.initialViewMode).toBe('tree');
	});

	it('NodeElementMask has 6 top-level kinds + nested badges', () => {
		const mask: NodeElementMask = {
			icon: true,
			label: true,
			detail: true,
			media: false,
			badges: { ops: true, filters: true, warnings: true, inherited: true, counts: true },
			actions: true,
		};
		expect(Object.keys(mask).length).toBe(6);
		expect(Object.keys(mask.badges).length).toBe(5);
	});

	it('NodeElementOverrides allows partial badge sub-mask', () => {
		const ov: NodeElementOverrides = {
			media: true,
			badges: { warnings: false },
		};
		expect(ov.media).toBe(true);
		expect(ov.badges?.warnings).toBe(false);
	});

	it('NodeElementKind union covers all 6 kinds', () => {
		const kinds: readonly NodeElementKind[] = [
			'icon',
			'label',
			'detail',
			'media',
			'badges',
			'actions',
		];
		expect(kinds.length).toBe(6);
	});

	it('UniversalDndVocab const provides 9 canonical strings', () => {
		const v: UniversalDndVocab = UNIVERSAL_DND_VOCAB;
		expect(v.dragSource).toBe('is-being-dragged');
		expect(v.dragTarget).toBe('is-being-dragged-over');
		expect(v.dropIndicator).toBe('drop-indicator');
		expect(v.dropIndicatorActive).toBe('is-active');
		expect(v.bodyGrabbing).toBe('is-grabbing');
		expect(v.ghost).toBe('drag-ghost');
		expect(v.ghostSelf).toBe('drag-ghost-self');
		expect(v.ghostIcon).toBe('drag-ghost-icon');
		expect(v.ghostAction).toBe('drag-ghost-action');
	});
});
