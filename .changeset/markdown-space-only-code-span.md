---
'@lexical/markdown': patch
---

[fix] Export an inline code span made only of spaces without padding, so it no longer gains two spaces when the Markdown is imported again, and keep its other formats such as bold

Verify: Markdown export of inline code whose text is only spaces, such as `` ` ` `` and `` **` `** ``.
