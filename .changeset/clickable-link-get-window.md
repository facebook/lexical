---
'@lexical/link': patch
---

[feature] `ClickableLinkExtension` accepts `getWindow(editor)`, and a nested editor's links are handled only by that editor
@maximilliangrand
PR: #9360

`getWindow` lets an editor inside an iframe navigate in its own window, or return `null` to leave the click unhandled. The default is still the global window.

Verify: clicks on links inside nested editors, which no longer also run the parent editor's handler.
