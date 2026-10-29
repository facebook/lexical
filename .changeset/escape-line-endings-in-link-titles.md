---
'@lexical/markdown': patch
---

[fix] Write line endings in a link title as character references and escape backticks in link titles and destinations in Markdown export, so the link and its paragraph read back intact

Verify: Markdown export of links whose title contains a line ending (now `&#10;` or `&#13;`), or whose title or URL contains a backtick (now `` \` ``).
