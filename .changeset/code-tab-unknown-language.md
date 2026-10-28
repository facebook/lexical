---
'@lexical/code-prism': patch
'@lexical/code-shiki': patch
---

[fix] Tab no longer throws in a code block whose language the highlighter does not know
@zurfyx
PR: #9472

The highlighters now split such a block into the flat `CodeHighlightNode`, `TabNode` and `LineBreakNode` structure the indentation handlers expect.
