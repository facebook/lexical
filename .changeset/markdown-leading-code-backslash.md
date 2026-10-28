---
'@lexical/markdown': patch
---

[fix] Markdown import keeps backslashes in leading code spans and unescapes text only once
@WeAreResilience
PR: #9396

Verify: Markdown import of text with backslash escapes and inline code.
