---
'@lexical/y': patch
---

[fix] A link run another writer left open over a shadow-root quote's paragraph no longer makes a delete of the quote before it rewrite that paragraph

Verify: with a plain Yjs client, format the root sequence with a link from inside one shadow-root quote's paragraph to past the next quote's paragraph; delete the first quote while a collaborator types in the second: the collaborator's text stays, and every client shows the quotes' paragraphs as paragraphs.
