---
'@lexical/y': patch
---

[fix] Keep the line being composed with an IME unchanged while collaborators add to it, and show every held change once the composition ends, also after Enter or a paste made while composing

Verify: IME composition (Chinese, Japanese or Korean input) in a paragraph a collaborator edits at the same time: the composition is not interrupted, and what they typed, formatted, split or pasted there shows when it ends.
