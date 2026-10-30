---
'@lexical/markdown': patch
---

[fix] Markdown export escapes a literal bracket only where it would otherwise start a link, an image, a link reference definition or a check list item, so text such as `[1]`, `done [x]` or `array[0]` exports as typed again

Since v0.53.0 every literal `[` and `]` exported as `&#91;` and `&#93;`. Outside a link, a `]` is now escaped only when it is followed by `(`, when it closes a label that starts a line followed by `:`, or when it closes a `[ ]`, `[x]` or `[]` at the start of a line followed by whitespace. The text on either side of the bracket is read across text nodes and inline elements such as comment marks, and a bracket next to a decorator is escaped. Inside link text, matched brackets stay as typed and only unmatched brackets, or a pair followed by `(`, are escaped. Markdown written by v0.53.0 still imports unchanged.

Verify: Markdown export snapshots of text containing `[` or `]`.
