---
'@lexical/code-core': patch
'@lexical/code': patch
'@lexical/code-prism': patch
'@lexical/code-shiki': patch
---

[feature] Add a word wrap flag to `CodeNode` (`setWordWrap`/`getWordWrap`) and an experimental `CodeLineNumbersExtension` that marks where each logical line of a code block starts, so a theme can draw line numbers that follow wrapped lines

A code block with word wrap on writes `"wordWrap": true` to its JSON and `data-lexical-code-word-wrap="true"` to its DOM and exported HTML, and HTML import reads the attribute back; the key and the attribute are left out while it is off. The package adds no CSS: the theme wraps the lines under the attribute.

`CodeLineNumbersExtension` sets `data-lexical-code-line-numbers` on each code block and wraps the `<br>` of each of its line breaks in a `<span data-lexical-code-line-break>`, so a theme can draw the numbers with a CSS counter. Exported and copied HTML is unchanged. Set `onlyWordWrapped` to limit this to blocks with word wrap on. The `@lexical/code-core` README has the CSS recipe.

The Flow types now declare the theme next to the language as TypeScript does: `CodeNode.getTheme`/`setTheme`, the `theme` argument of `$createCodeNode` and the `theme` key of `SerializedCodeNode`. `CodeNode.setLanguage` takes a nullable language and returns the node.

The Prism and Shiki highlighters no longer move a caret that sits right after a line break into an earlier line when they split that line into more tokens (for example when Shiki's grammar finishes loading just after Enter), so the next characters typed land on the right line, and a caret at the start of a code block no longer moves by the length of the text before the block when it is retokenized.

Verify: `CodeNode.exportJSON()` now has an own `wordWrap` key on every code block, `undefined` while word wrap is off, as it already has for `theme`. Serialized JSON is unchanged, but a test that compares the returned object with `toStrictEqual` needs the key. After Prism or Shiki retokenizes a block, a caret that was an element point next to a line break may come back as a text point at the same position in the text.
