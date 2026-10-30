---
'@lexical/y': patch
---

[fix] A comment (or format) no longer spreads over the rest of the document when its author types unformatted text inside it while a collaborator's delete drops the comment's end

Verify: comment a word, then, offline, type uncommented text inside it while a collaborator deletes the word and text next to it; after the client reconnects, the words after it stay uncommented on every client.
