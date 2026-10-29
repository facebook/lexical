---
'@lexical/code-core': patch
'@lexical/code': patch
---

[feature] Add a word wrap flag to `CodeNode` (`setWordWrap`/`getWordWrap`) and an experimental `CodeLineNumbersExtension` that marks where each logical line of a code block starts, so a theme can draw line numbers that follow wrapped lines

A code block with word wrap on writes `"wordWrap": true` to its JSON and `data-lexical-code-word-wrap="true"` to its DOM and exported HTML, and HTML import reads the attribute back; the key and the attribute are left out while it is off. The package adds no CSS: the theme wraps the lines under the attribute.

`CodeLineNumbersExtension` sets `data-lexical-code-line-numbers` on each code block and wraps the `<br>` of each of its line breaks in a `<span data-lexical-code-line-break>`, so a theme can draw the numbers with a CSS counter. Exported and copied HTML is unchanged. Set `onlyWordWrapped` to limit this to blocks with word wrap on. The `@lexical/code-core` README has the CSS recipe.

The Flow types of `CodeNode` now match TypeScript for the neighbouring accessors too: `setLanguage` takes a nullable language and returns the node, and `getTheme`/`setTheme` are declared.
