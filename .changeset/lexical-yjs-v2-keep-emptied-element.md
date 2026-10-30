---
'@lexical/yjs': patch
---

[fix] Collaboration v2: a list (or another element that cannot be empty) that collaborators' removals leave with no children stays in an editor that has a selection, as the document keeps it, instead of being dropped and making a later change to it fail with "Lexical node does not exist"

Verify: with the v2 binding, two collaborators each remove one item of a two-item list at the same time while a third has a caret in the document; that third editor shows the same document as a fresh reader of it, and an item one of them adds to the list later reaches it.
