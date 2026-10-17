---
'@lexical/clipboard': patch
---

[feature] Clipboard import middleware can pass replaced data and selection to `$next(data, selection)`
@etrepum
PR: #9312

`$next()` with no arguments behaves as before. Passing arguments replaces
the data and selection for the remaining handlers of that MIME type, for
example to clean up pasted HTML before Lexical imports it.
