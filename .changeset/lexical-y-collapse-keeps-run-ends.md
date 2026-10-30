---
'@lexical/y': patch
---

[fix] A delete next to text deleted earlier keeps, of each format, link and comment, where its last run ended there, so a format or comment a collaborator restores after text they typed inside that run no longer runs on over the rest of the document

Verify: a document keeps one small format item (20 to 30 bytes with a short comment id) per comment whose text was deleted at a place, for good, where the next delete there used to remove it, and up to two more for a comment that also covers the text after that place; a key used again at that place adds nothing. Without undo, typing and deleting with one client (or taking turns) shows the same as before; text an undo brings back next to a later delete can show other formats than before (those the kept items give it). Text a collaborator types inside text deleted earlier can take the format of other text deleted there, as before.
