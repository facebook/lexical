---
'@lexical/markdown': patch
---

[fix] Read a backslash escaped just before a link title's closing quote or parenthesis as a backslash, so the title ends there instead of running into the text after the link

Verify: Markdown import of links whose title, in any of its three spellings, ends in a backslash. As in CommonMark, a title whose closing delimiter is itself escaped, such as `"C:\"`, no longer closes, so that link now imports as plain text. A backslash before any character, a line terminator such as U+2028 or a carriage return included, no longer stops a parenthesized title from matching, and before U+2028 or U+2029 no longer stops a `<...>` destination. A carriage return in a `<...>` destination, escaped or not, now does, as CommonMark allows no line ending there.
