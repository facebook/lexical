---
'@lexical/y': patch
---

[fix] An undo of typing inside a comment or a format keeps the value ending where it did when a collaborator deleted the rest of the run, instead of letting it cover everything after it

Verify: comment or format a few words, type plain text inside them, let a collaborator delete the text after yours up to past the run's end, then undo your typing: the value ends where the deleted text began on every client.
