---
'@lexical/rich-text': patch
---

[fix] Allow native iOS text drops that arrive as `text/plain` files
@etrepum
PR: #9320

`DRAG_DROP_PASTE` handlers still get the first chance to handle the drop.
