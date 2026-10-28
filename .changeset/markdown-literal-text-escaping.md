---
'@lexical/markdown': patch
---

[fix] Markdown export escapes literal text so it does not become HTML, character references or links when parsed again
@etrepum
PR: #9481

Literal brackets and significant `<` and `&` characters are escaped, using numeric references where that keeps adjacent emphasis intact; ordinary text such as `AT&T` and `a < b` is unchanged. Import decodes backslash escapes and decimal or hexadecimal character references in one pass, and link labels respect escaped brackets and code spans.

Verify: Markdown export snapshots of text containing `[`, `]`, `<` or `&`.
