# Vaultman v12 View Taxonomy Notes

## Goal

V12 separates the view contract into four axes:

- `engine`: the renderer family (`lineal`, `grid`, `matrix`, `canvas`)
- `mode`: the composition inside the engine
- `orientation`: node layout/navigation inside that mode
- `viewScope`: whether the ViewMenu applies globally, per level, or per focused parent

This keeps linear drill as an orientation while preventing it from being hardcoded as the same behavior for every engine.

## Implemented In V12

- Created `Vaultman Prototype v12.html` and `proto-v12/` from v11.
- Updated v12 HTML to load `proto-v12/*.jsx`.
- Lineal modes are now `tree`, `cascade`, and `master-detail`.
- Tree orientations are now `indent`, `flat`, `drill`, and `accordion`.
- Grid keeps `drill` as its own orientation alongside `columns` and `rows`.
- `Node size` moved below `Orientation` in the ViewMenu.
- `cascade` owns the former side/Miller behavior and adds `cascadeSide` plus `cascadeBreadcrumbs`.
- `master-detail` is Apple-style: parent-only tree on the left, leaf nodes on the right, with `direct` vs `recursive` scope.
- Tree indent guides now use CSS variables instead of duplicate left-offset arithmetic.
- `viewScope` supports `off`, `per-level`, and `per-parent`.

## Scope Behavior

- `per-level`: choose a target level and apply the current ViewMenu snapshot to that level.
- `per-parent`: focus a parent node in the explorer, then apply the current ViewMenu snapshot to that parent’s children.
- Parent focus is emitted with `vm-focused-parent`.
- Stored parent overrides live in `view.parentViews`.

## Cautions

- The existing lineal `DrillView` was preserved; it was not rewritten.
- V11 remains untouched except for files already created before v12.
- V12 is a first architecture pass. Visual tuning for `flat`, `accordion`, and `master-detail` should happen after preview review.
