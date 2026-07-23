---
type: Fixed
reviewed: true
---
Fixed a deleted file's node lingering in the Files explorer after the file was already gone, and newly created files not appearing until another refresh, by recomputing the filtered set whenever the vault gains or loses a file.
