---
'@lexical/markdown': patch
---

[fix] Markdown export no longer drops, repeats or misplaces the closing `**` or `*` around a space whose formats differ from the text beside it, such as a bold space after bold italic text and before a link (`**_a_ [b](u)**` used to export as `***a* [**b**](u)`), and `$convertSelectionToMarkdownString` closes every tag when the selection ends inside formatted text and leaves out inline code the selection only touches

Verify: Markdown export, including of selections, of text where a space carries different formatting than the words around it.
