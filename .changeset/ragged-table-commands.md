---
'@lexical/table': patch
---

[fix] Table commands repair a ragged table instead of throwing
@zurfyx
PR: #9375

Inserting or deleting rows and columns, merging and unmerging cells, and pasting a table into a table first pad short rows, the same repair the `TableNode` transform does. Collaborative edits applied with `skipTransforms` can leave a table ragged.
