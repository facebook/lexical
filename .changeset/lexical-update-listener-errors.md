---
'lexical': patch
---

[fix] Notify every update listener before rethrowing the first listener error

Updates queued by update listeners run after a listener error without waiting for another external update. An update listener's previous cleanup is not repeated when the cleanup throws, the listener throws on its next call, or the listener unregisters itself.

Verify: Register a throwing update listener before a history or collaboration listener. Later listeners must receive the same committed state, the first error must still reach the caller, and `onError` remains unused for listener errors. Queue an update from a later listener and verify it commits without another external update.
