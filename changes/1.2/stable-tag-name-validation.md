---
type: Fixed
reviewed: true
---
Fixed renaming a tag to a name with spaces or other invalid characters writing the broken name into every file's frontmatter, which left the tag unreachable until reload; invalid names are now rejected with the inline editor kept open.
