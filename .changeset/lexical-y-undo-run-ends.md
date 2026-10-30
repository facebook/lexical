---
'@lexical/y': patch
---

[fix] Keep a collaborator's text plain when the text typed next to it inside a bold or commented run is undone, and end a bold or comment where its undo ends it

An undo of text typed inside a run of another value (plain text typed into
bold text, or into a comment) deleted the run ends that text was written
with, and a collaborator's text typed right next to it, which relied on
them, took the value around it for everyone: plain text turned bold or
commented. The undo now keeps those run ends, as a delete of that text by
hand does, collapsed the same way. (Where a collaborator undoes that bold
at the same time, the kept restore gives the rest of the run bold again; a
known limit, #9593.) And where another write's run ends sat inside a
bold or comment that is then undone (a word typed inside it, kept or
deleted), the content after them kept the old value: the undo now ends it
there.

Verify: undo text you typed inside bold or commented text while a
collaborator types next to it, and undo a bold after a word was typed
inside it; no text that nobody formatted becomes bold or
commented.
