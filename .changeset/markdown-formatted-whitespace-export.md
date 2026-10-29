---
'@lexical/markdown': patch
---

[fix] Markdown export keeps format markers balanced around a space whose formats differ from the text beside it

Closing markers such as `**`, `*` or `~~` were dropped, repeated or placed after the space, so `**_a_ [b](u)**` exported as `***a* [**b**](u)`. `$convertSelectionToMarkdownString` also closes every marker when the selection ends inside formatted text. Empty inline code, such as inline code a selection only touches, is left out.

Verify: Markdown export, including of selections, of text where a space carries different formatting than the words around it.
