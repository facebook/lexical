---
'@lexical/code-core': minor
'@lexical/code-shiki': minor
'@lexical/html': minor
'@lexical/link': minor
'@lexical/list': minor
'@lexical/mdast': minor
'@lexical/rich-text': minor
'@lexical/table': minor
---

[breaking] Remove the extensions deprecated in v0.52.0 and earlier
@etrepum
PR: #9316

The deprecated import and alias extensions are removed. The `*ImportRules`
arrays, including `HorizontalRuleImportRules`, stay.

Migration: replace each removed export with its successor.

| Removed | Use instead |
| --- | --- |
| `CodeImportExtension` (`@lexical/code-core`) | `CodeExtension` |
| `CodeHighlighterShikiExtension`, `CodeHighlighterShikiConfig` (`@lexical/code-shiki`) | `CodeShikiExtension` with `{tokenizer}` |
| `HorizontalRuleImportExtension` (`@lexical/html`) | `HorizontalRuleExtension` plus an extension that brings in `CoreImportExtension` |
| `LinkImportExtension` (`@lexical/link`) | `LinkExtension` |
| `ListImportExtension` (`@lexical/list`) | `ListExtension` |
| `RichTextImportExtension` (`@lexical/rich-text`) | `RichTextExtension` |
| `TableImportExtension` (`@lexical/table`) | `TableExtension` |
| `MdastImportExtension`, `MdastExportExtension` (`@lexical/mdast`) | `MdastExtension` |
| `MdastImportExtensionOutput`, `MdastExportExtensionOutput` (`@lexical/mdast`) | `MdastExtensionOutput` |

Detect: imports of any name in the table above.

Codemod: none; each is a rename of an import and its use.
