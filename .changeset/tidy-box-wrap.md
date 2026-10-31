---
'@lexical/selection': patch
---

[fix] Keep nested content in order when wrapping blocks that also hold text directly

Verify: Wrap a selection across text and nested blocks in a custom element without a declared structure. The update should finish, keep the content in its original order, and leave the selection attached.
