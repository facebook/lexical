---
'@lexical/mdast': patch
---

[fix] Keep consecutive and leading line breaks in a Markdown round trip
@unknownhackerworld
PR: #9392

Such breaks now export as hard breaks (`\` and a newline) instead of plain newlines.

Verify: Markdown export of paragraphs with adjacent or leading line breaks.
