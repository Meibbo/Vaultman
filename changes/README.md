# Release-note fragments

Add one Markdown file per user-facing change under `changes/<major>.<minor>/`:

```markdown
---
type: Fixed
reviewed: true
---
Fixed the behavior users will notice.
```

Supported types are `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, and
`Security`. Alpha and beta releases render all reviewed fragments for their release
line cumulatively. A stable release compiles them into `CHANGELOG.md` and removes the
consumed fragments.
