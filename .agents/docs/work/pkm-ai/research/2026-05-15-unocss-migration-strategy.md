# UnoCSS Migration Strategy & Architectural Forecast
**Date:** 2026-05-15 **Status:** Research / Architectural Blueprint **Context:** Evaluation of migrating a ~6.9K LOC SCSS architecture to a UnoCSS utility-first model in Vaultman.

## 1. Executive Summary
Vaultman currently utilizes a highly structured ITCSS-based SCSS architecture totaling ~6.9K lines across 41 files. While organized, this results in a monolithic `styles.css` (~178KB), dead CSS accumulation, and architectural friction when implementing dynamic theming (Theme Builder). 

The proposed path forward is **"Utility-First with Semantic Escapes"**: transitioning 90% of styling (layout, spacing, colors) to UnoCSS utility classes within Svelte components, while reserving SCSS exclusively for complex state animations, third-party DOM interception, and deep mathematical color logic.

## 2. The Case for UnoCSS in Vaultman

### 2.1 Performance & "Dead Code"
- **Current State:** SCSS compiles all rules globally. If a Svelte component is deleted, its SCSS often remains, leading to "Dead CSS" (Vaultman currently has ~14 dead modules whose styles likely still compile).
- **UnoCSS Advantage:** UnoCSS is an atomic generator. It only generates CSS for classes actively found in `.svelte` files. Deleting a component automatically removes its CSS.
- **Estimated Build Impact:** The proprietary Vaultman CSS payload is projected to drop from ~60KB to ~12KB.

### 2.2 Dynamic Theming (Theme Builder)
- **SCSS Limitation:** SCSS functions (like `darken()`, `lighten()`) compute at build-time. Dynamic runtime theming requires complex CSS variable overrides that bypass SCSS's primary strengths.
- **UnoCSS Advantage:** UnoCSS natively supports CSS Variables. By defining tokens in `uno.config.ts`, the Theme Builder only needs to mutate the root CSS variables (`document.documentElement.style.setProperty`), and UnoCSS utilities (e.g., `bg-[var(--vm-accent)]/80`) react instantly at runtime.

### 2.3 Locality of Behavior (AI-Navigability)
- A developer or AI agent no longer needs to jump between `panelExplorer.svelte` and `_explorer-ui.scss` to understand a UI element. The intent (styling, state, markup) is co-located.

## 3. Impact on Svelte Components

A common concern is that HTML becomes "noisy" and Svelte files become bloated. Our audit reveals:

- **Byte Size:** Individual `.svelte` files will increase by 200 bytes to 1.5 KB purely due to longer `class="..."` strings.
- **Lines of Code (LOC):** The overall LOC of `.svelte` files will actually **decrease by 5% to 15%**. This is because utility classes are written inline, and existing internal `<style>` blocks (which average 30-40 lines per component) will be deleted.
- **Mitigation:** Use UnoCSS `shortcuts` in `uno.config.ts` (e.g., `vm-card`, `vm-btn-primary`) to abstract excessively long utility chains.

## 4. The "Gold Standard" Hybrid Architecture

We will not abandon SCSS entirely. The architecture will split responsibilities:

| Technology | Responsibility | Scope |
| :--- | :--- | :--- |
| **UnoCSS** | Layout, Spacing, Typography, Base Colors. | 90% (Inline HTML) |
| **SCSS** | Complex Keyframes, Obsidian DOM Interception (`:global`), Fallback logic. | 10% (`<style lang="scss">`) |

## 5. Migration Roadmap

1. **Phase 1: Token Bridge:** Migrate variables from `src/styles/_tokens.scss` into the `theme` configuration of `uno.config.ts`.
2. **Phase 2: Layout Demolition:** Systematically replace structural SCSS (`_layout.scss`, `_explorer-ui.scss`) with UnoCSS flex/grid utilities in the `.svelte` containers.
3. **Phase 3: Component Abstraction:** Convert repetitive UI elements (Badges, Buttons, Inputs) into UnoCSS `shortcuts`.
4. **Phase 4: Cleanup:** Purge the orphaned SCSS files and verify the reduction in `styles.css` output.