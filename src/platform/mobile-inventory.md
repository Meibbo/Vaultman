# Platform Adapter Mobile Inventory

Source of truth for runtime status is `PlatformAdapterRegistry.describe()`. This document records the human notes for the PA-5 `is-phone` / `isMobile` decision.

| Adapter | `mobile.supported` | Mobile notes | Desktop or hover assumptions |
|---|---|---|---|
| `native-search` | `degraded` | Obsidian Core Search exists on mobile, but results scraping depends on the search pane being mounted and keeping the `.search-result-*` DOM. Treat as available only when the pane is present. | Scrapes Core Search result rows from the active document. |
| `native-binding` | `degraded` | Native tag/folder selectors can exist on mobile, but modifier-click and hover-link interactions are desktop-first. Mobile needs an explicit tap/long-press subset before enabling fully. | Uses modifier/middle click, hover-link source registration, and native tag/folder selectors. |
| `file-menu-delegation` | `degraded` | Obsidian mobile exposes fewer file-menu surfaces and source strings may differ. Panel/editor Vaultman menus remain the fallback path. | Depends on `app.workspace.on('file-menu')` and desktop-style file-menu/more-options events. |
| `bases-multi-select` | `degraded` | Bases mobile row selection and native context menu mounting are not guaranteed. When native menu injection is unavailable, the adapter falls back to a Vaultman-only `Menu` after a valid contextmenu. | Reads `.bases-*` selected rows, injects items into native `.menu`, and assumes right-click/contextmenu timing. |

Decision input:

- `platformProfile.ts` exposes `isPhone(doc)` and `isMobile(doc)` using Obsidian body classes such as `is-phone`, `is-mobile`, `mod-mobile`, and `is-tablet`.
- No adapter is marked mobile `yes` yet. PA-5 should keep all four active through probe/fallback and let the dev decide whether `isDesktopOnly` becomes a global flip or a per-adapter subset.
- Hover-only behavior is concentrated in `native-binding`; menu/contextmenu behavior is concentrated in `file-menu-delegation` and `bases-multi-select`.
