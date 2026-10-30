---
'@lexical/y': patch
---

[fix] An undo or redo press whose step changes nothing the document shows (a format on text a collaborator then deleted) also takes the next step, so every press changes what the document shows or empties its stack

Verify: undo after formatting text that a collaborator then deleted reverts your change before it in the same press; redo brings that change back, and the next redo takes the format's step and empties the redo stack.
