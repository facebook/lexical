---
'@lexical/markdown': patch
---

[fix] Treat Unicode punctuation and symbols as punctuation when deciding whether `*`, `_` and `~~` markers open or close formatting

Markdown import and the typing shortcuts now follow CommonMark here: an en dash, a curly quote, a currency sign or an emoji next to a marker counts as punctuation, not as a letter, so `See –**[here](https://example.com)**` imports as a bold link. The backslash, which was missing from the ASCII list, counts too.

Verify: export of formatting that starts or ends with punctuation right beside a letter, such as plain `foo` then bold `“bar”`, now writes that letter as a numeric character reference (`fo&#111;**“bar”**&#98;az`), so that the formatting survives a round trip through any CommonMark reader.
