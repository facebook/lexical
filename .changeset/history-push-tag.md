---
'@lexical/history': patch
---

[fix] An update tagged `HISTORY_PUSH_TAG` always pushes its own undo entry, even when its only dirty leaf is an unchanged `TextNode`
@ump45nose
PR: #9218
