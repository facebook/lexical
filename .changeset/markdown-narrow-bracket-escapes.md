---
'@lexical/markdown': patch
---

[fix] Markdown export escapes a literal bracket only where it would otherwise start a link, an image, a link reference definition or a check list item, so text such as `[1]`, `done [x]` or `array[0]` exports as typed again

Since v0.53.0 every literal `[` and `]` exported as `&#91;` and `&#93;`. Outside a link, a `]` is now escaped only when it is followed by `(`, when it closes a label followed by `:`, or when it closes a `[ ]`, `[x]` or `[]` followed by whitespace, where that label or marker starts a line or follows a block marker such as `- `, `1. ` or `> `. The text on either side of the bracket is read the way it is exported: across text nodes and inline elements such as comment marks, with links that are not written as `[text](url)` (autolinks, or every link when `LINK` is not among the transformers) read as their text, and a bracket next to a decorator, or next to a node a text match transformer writes in its own syntax, is escaped. Inside link text, matched brackets stay as typed and only unmatched brackets, or a pair followed by `(`, are escaped. Markdown written by v0.53.0 still imports unchanged.

Verify: Markdown export snapshots of text containing `[` or `]`.
