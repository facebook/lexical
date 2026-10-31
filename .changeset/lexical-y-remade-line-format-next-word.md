---
'@lexical/y': patch
---

[fix] Keep a collaborator's format on the word right after a formatted run when an update makes that run's line again with other text at the same time

Verify: a line whose first text node is bold (written by another client), made again as plain text with several words changed (an agent rewriting a block from its JSON), while a collaborator bolds the word right after that node: the word stays bold on every client, whatever the two clients' ids.
