---
'lexical': patch
---

[fix] Keep Chromium spellcheck underlines when the reconciler changes a text node's text
@badcuban
PR: #9354

The reconciler writes only the changed part of the text to the DOM instead of replacing the whole string.
