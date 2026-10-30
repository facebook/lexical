---
'@lexical/code-core': patch
'@lexical/code-prism': patch
'@lexical/code-shiki': patch
---

[fix] Highlighting a code block keeps the NodeState of every character (comment ids, suggestions or other annotations an app keeps in NodeState): a token whose text has more than one state is split where it changes, instead of the highlighter dropping the state of every token it replaced

Verify: annotate a word of a highlighted code block with NodeState, then type a quote before it or edit on both sides of it in one update, and check that the word keeps its state.
