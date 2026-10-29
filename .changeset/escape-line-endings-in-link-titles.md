---
'@lexical/markdown': patch
---

[fix] In Markdown export, write line endings in a link title as character references, escape backticks in link titles and destinations, and put a URL with a control character between `<` and `>`, so the link and its paragraph read back intact

Verify: Markdown export of links whose title contains a line ending (now `&#10;` or `&#13;`), whose title or URL contains a backtick (now `` \` ``), or whose URL contains an ASCII control character (now written between `<` and `>`).
