---
'@lexical/markdown': patch
---

[fix] Read a backslash escaped just before a link title's closing quote as a backslash, so the title ends there instead of running into the text after the link

Verify: Markdown import of links whose title ends in a backslash. As in CommonMark, a title whose closing quote is itself escaped, such as `"C:\"`, no longer closes, so that link now imports as plain text. A backslash before a line terminator such as U+2028 in a parenthesized title or a `<...>` destination no longer stops the link from matching.
