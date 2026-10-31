---
'@lexical/y': patch
---

[fix] Keep list numbering right on an editor after several follow-up updates in a row that the binding reads again

A follow-up update (BlockIdExtension's naming, the update that runs a newly registered transform) may only set attributes or delete; anything else it changes is read again, and the read refreshes the derived fields of the lists it rebuilds. After the fourth such re-read in a row without a user's edit, the binding stopped refreshing, to cut off a loop: the editor then showed a list item's value differently from a fresh reader of its document. The last re-read now refreshes in its own update, with no refresh after it, so the loop is still cut off and the numbering is right.
