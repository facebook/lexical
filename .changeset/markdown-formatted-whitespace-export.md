---
'@lexical/markdown': patch
---

[fix] Markdown export no longer drops, repeats or misplaces the closing `**` or `*` around a whitespace-only text node whose formats differ from its neighbours, such as a bold space after bold italic text and before a link (`**_a_ [b](u)**` used to export as `***a* [**b**](u)`)

Verify: Markdown export of text where a space carries different formatting than the words around it.
