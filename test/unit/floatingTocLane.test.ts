import { describe, expect, it } from 'vitest';

import { resolveFloatingTocLaneLayout } from '../../src/logic/logicFloatingTocLane';

describe('BT5-051 floating TOC lane projection', () => {
	it.each(['left', 'right'] as const)(
		'hides only the %s scrollbar and keeps one rail-sized gutter',
		(position) => {
			const hidden = resolveFloatingTocLaneLayout({
				visible: true,
				position,
				hideScrollbar: true,
				reserveLane: false,
				plainStyle: false,
				mobile: false,
			});

			expect(hidden).toEqual({
				hideScrollbar: true,
				gutterPosition: position,
				reserveExplicitLane: false,
				contentGutterPx: 22,
				railScrollbarOffsetPx: 0,
			});
		},
	);

	it('keeps explicit reserve behavior independent and gives Hide precedence', () => {
		const explicit = resolveFloatingTocLaneLayout({
			visible: true,
			position: 'right',
			hideScrollbar: false,
			reserveLane: true,
			plainStyle: false,
			mobile: false,
		});
		expect(explicit).toEqual({
			hideScrollbar: false,
			gutterPosition: 'right',
			reserveExplicitLane: true,
			contentGutterPx: 22,
			railScrollbarOffsetPx: 14,
		});

		expect(
			resolveFloatingTocLaneLayout({
				visible: true,
				position: 'right',
				hideScrollbar: true,
				reserveLane: true,
				plainStyle: false,
				mobile: false,
			}),
		).toEqual({
			hideScrollbar: true,
			gutterPosition: 'right',
			reserveExplicitLane: false,
			contentGutterPx: 22,
			railScrollbarOffsetPx: 0,
		});
	});

	it('uses the compact plain footprint without exaggerating the difference', () => {
		const desktopPlain = resolveFloatingTocLaneLayout({
			visible: true,
			position: 'left',
			hideScrollbar: true,
			reserveLane: false,
			plainStyle: true,
			mobile: false,
		});
		const mobilePlain = resolveFloatingTocLaneLayout({
			visible: true,
			position: 'left',
			hideScrollbar: true,
			reserveLane: false,
			plainStyle: true,
			mobile: true,
		});

		expect(desktopPlain.contentGutterPx).toBe(20);
		expect(mobilePlain.contentGutterPx).toBe(28);
		expect(
			resolveFloatingTocLaneLayout({
				visible: true,
				position: 'right',
				hideScrollbar: true,
				reserveLane: false,
				plainStyle: false,
				mobile: true,
			}).contentGutterPx,
		).toBe(30);
	});

	it.each(['top', 'bottom'] as const)(
		'never projects a vertical lane for a %s rail',
		(position) => {
			const layout = resolveFloatingTocLaneLayout({
				visible: true,
				position,
				hideScrollbar: true,
				reserveLane: true,
				plainStyle: false,
				mobile: false,
			});

			expect(layout).toEqual({
				hideScrollbar: true,
				gutterPosition: null,
				reserveExplicitLane: false,
				contentGutterPx: 0,
				railScrollbarOffsetPx: 0,
			});
		},
	);

	it('projects no geometry while hidden or in pure overlay mode', () => {
		for (const visible of [false, true]) {
			const layout = resolveFloatingTocLaneLayout({
				visible,
				position: 'right',
				hideScrollbar: false,
				reserveLane: visible ? false : true,
				plainStyle: false,
				mobile: false,
			});
			expect(layout.gutterPosition).toBeNull();
			expect(layout.contentGutterPx).toBe(0);
			expect(layout.railScrollbarOffsetPx).toBe(0);
			expect(layout.hideScrollbar).toBe(false);
		}
	});
});
