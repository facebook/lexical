---
'lexical': patch
'@lexical/selection': patch
---

[fix] Preserve selected text and formatting at range boundaries; `$patchStyleText` styles the selection it is given
@etrepum
PR: #9261

Equivalent element and text endpoints now select, copy and extract the same text, and `$patchStyleText(selection, patch)` styles `selection` even when another selection is active.

Verify: code that calls `$patchStyleText` with a selection other than the active one, and tests that assert on text extracted or copied from element-boundary selections.
