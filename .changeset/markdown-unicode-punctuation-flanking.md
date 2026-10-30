---
'@lexical/markdown': patch
---

[fix] Follow CommonMark's Unicode punctuation and whitespace when deciding whether `*`, `_` and `~~` markers open or close formatting

Markdown import and the typing shortcuts now count every character in the Unicode punctuation (P) and symbol (S) categories as punctuation, so an en dash, a curly quote, a currency sign or a symbol such as ✓ or 😀 next to a marker no longer reads as a letter, and `See –**[here](https://example.com)**` imports as a bold link. The backslash, which was missing from the ASCII list, counts too. Whitespace is the Zs category plus tab, line feed, form feed and carriage return, so U+FEFF no longer counts as whitespace.

Verify: Markdown with a marker between a letter and Unicode punctuation, such as `**“bar”**baz` or `**你好。**世界`, now imports with literal asterisks, as CommonMark readers show it, where it used to import as bold. Lexical exported this shape for such formatting before, so check stored Markdown that has it. Export of formatting that starts or ends with punctuation right beside a letter, such as plain `foo` then bold `“bar”`, now writes that letter as a numeric character reference (`fo&#111;**“bar”**&#98;az`), so that the formatting survives a round trip through a CommonMark reader. Characters that are neither punctuation nor whitespace count as letters here, including the variation selector that ends an emoji such as ❤️. A raw backslash that ends text right before a marker or such a reference (text exported with `shouldPreserveNewLines`, or decorator text) now goes out as `&#92;`, so that it does not escape it. No reference is written inside a bare URL, `www.` host, email or mention, so formatting right beside one is still lost there.
