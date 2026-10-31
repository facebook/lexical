---
'@lexical/y': patch
---

[fix] A format or comment brought back by undoing its removal never runs on past where it was, and a delete keeps every format item it leaves (proposed, DECISIONS D85 and D86)

Verify: comment or format a word, let a collaborator remove it, undo yours, then let the collaborator undo the removal: nothing comes back, and nothing after the word gets the comment or format. Typing and deleting plain text at one place adds no format items; a formatted word typed and deleted leaves its two.
