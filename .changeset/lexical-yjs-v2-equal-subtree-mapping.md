---
'@lexical/yjs': patch
---

[fix] Collaboration v2: keep every table row's cells in that row after concurrent row and column inserts, when rows hold equal content

Verify: with the v2 binding, two or three collaborators insert table rows and columns at the same time in a table whose rows are empty or equal; once every change is delivered, each editor shows the same table as a fresh reader of its document, with no row left without cells.
