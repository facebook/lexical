---
'lexical': patch
'@lexical/yjs': patch
---

[perf] Re-create only the children that moved when syncing an element's children to Yjs
@adstep
PR: #9349

Siblings keep their Yjs identities, so concurrent edits to them are not lost, and moving one paragraph in a long document no longer re-creates every paragraph in between.
