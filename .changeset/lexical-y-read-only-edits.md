---
'@lexical/y': patch
---

[fix] Keep a read-only bound editor showing the document: what a local update changes while the binding is read only is read again, with an `UNSUPPORTED_EDIT_WARNING`

Code that edited a read-only bound editor (the binding writes nothing then)
left it showing content the document does not hold, and a remote change read
into it later could misplace blocks or hang the tab.

Verify: code that calls `editor.update()` while the binding's `status` is
`'readonly'` sees its change undone after the update, and `onWarn` receives
`UNSUPPORTED_EDIT_WARNING` (`reason: 'read-only'`), unless the binding went
read only to keep showing a change it cannot store
(`UNSUPPORTED_SLOTS_WARNING`). Code that handles every `YWarningCode`
handles the new one.
