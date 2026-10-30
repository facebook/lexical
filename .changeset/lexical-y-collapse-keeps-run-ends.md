---
'@lexical/y': patch
---

[fix] A delete next to text deleted earlier keeps, of each format, link and comment, where its last run ended there, so a format or comment a collaborator restores after text they typed inside that run no longer runs on over the rest of the document

Verify: a document keeps one small format item (about 30 bytes with a short comment id) per comment whose text was deleted at a place, for good, where the next delete there used to remove it; a key used again at that place adds nothing. Typing and deleting with one client (or taking turns) shows the same as before. Text a collaborator types inside text deleted earlier can take the format of other text deleted there, as before.
