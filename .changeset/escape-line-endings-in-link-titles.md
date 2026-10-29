---
'@lexical/markdown': patch
---

[fix] Write line endings in a link title as character references in Markdown export, so the link and its paragraph read back intact

Verify: Markdown export of links whose title contains a line ending; it now writes `&#10;` or `&#13;` in its place.
