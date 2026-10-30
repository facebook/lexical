---
'lexical': patch
---

[fix] Notify every update listener before rethrowing the first listener error

Update-listener cleanups that throw, or whose next listener throws, are not called again on the next commit.

Verify: Register a throwing update listener before a history or collaboration listener. Later listeners must receive the same committed state, the first error must still reach the caller, and `onError` remains unused for listener errors.
