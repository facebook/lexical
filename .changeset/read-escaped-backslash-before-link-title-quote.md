---
'@lexical/markdown': patch
---

[fix] Read a backslash escaped just before a link title's closing quote as a backslash, so the title ends there instead of running into the text after the link

Verify: Markdown import of links whose title ends in `\\"`; a title such as `"C:\"` whose closing quote is itself escaped no longer counts as closed, as in CommonMark.
