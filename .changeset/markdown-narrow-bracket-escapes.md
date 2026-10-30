---
'@lexical/markdown': patch
---

[fix] Markdown export escapes a literal bracket only where it would otherwise start a link, so text such as `[1]`, `[x]` or `array[0]` exports as typed again

Since v0.53.0 every literal `[` and `]` exported as `&#91;` and `&#93;`. Outside a link, only a `]` followed by `(`, or by `:` when its label starts a line, is now escaped, which is enough to keep literal text from parsing as a link, image or link reference definition. Inside link text, matched brackets stay as typed and only unmatched brackets, or a pair followed by `(`, are escaped. Markdown written by v0.53.0 still imports unchanged.

Verify: Markdown export snapshots of text containing `[` or `]`.
