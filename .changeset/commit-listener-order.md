---
'lexical': patch
---

[fix] Keep update listeners in commit order when `editor.read()` runs during listener dispatch
@Vedthakar
PR: #9335

Collaboration (Yjs) and history no longer receive commits out of order, which could drop content from the shared document.
