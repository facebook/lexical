---
'@lexical/markdown': patch
---

[fix] Follow CommonMark's Unicode punctuation and whitespace when deciding whether `*`, `_` and `~~` markers open or close formatting

Markdown import and the typing shortcuts now count every character in the Unicode punctuation (P) and symbol (S) categories as punctuation, so an en dash, a curly quote, a currency sign or a symbol such as ✓ or 😀 next to a marker no longer reads as a letter, and `See –**[here](https://example.com)**` imports as a bold link. The backslash, which was missing from the ASCII list, counts too. Whitespace is the Zs category plus tab, line feed, form feed and carriage return, so U+FEFF no longer counts as whitespace.

Verify: export of formatting that starts or ends with punctuation right beside a letter, such as plain `foo` then bold `“bar”`, now writes that letter as a numeric character reference (`fo&#111;**“bar”**&#98;az`), so that the formatting survives a round trip through a CommonMark reader. Characters that are neither punctuation nor whitespace count as letters here, including the variation selector that ends an emoji such as ❤️.
