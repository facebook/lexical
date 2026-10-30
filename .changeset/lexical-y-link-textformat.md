---
'@lexical/y': patch
---

[fix] Keep a link a collaborator removes removed when another collaborator formats text covering it at the same time

A format change over a link also sets the link's textFormat (`RangeSelection#formatText`), and the binding stored a link's textFormat and textStyle in the value its text carries: the format change wrote the link's whole value again over its text, and that write brought a concurrently removed link back for everyone. A wrapper's textFormat and textStyle are now stored only while it has no text of its own, as Lexical serializes them; with text, they follow it.

Verify: with two clients on a paragraph that holds a link, remove the link on one while the other makes a range covering the whole link code, sync, and check that the link stays removed on both.
