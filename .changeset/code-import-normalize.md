---
'@lexical/code-core': patch
---

[fix] Normalize imported code block content to code lines, tabs and line breaks
@maximilliangrand
PR: #9272

Applies to the experimental HTML import pipeline; nested paragraphs, headings and links inside imported code no longer end up inside a `CodeNode`.

Verify: HTML import of code blocks that contain paragraphs, headings or links (snapshots of the imported tree change).
