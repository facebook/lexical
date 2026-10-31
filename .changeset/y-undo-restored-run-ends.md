---
'@lexical/y': patch
---

[fix] An undo that brings back a comment, format, link, style or NodeState value ends it where it ended before, also when the change that wrote that end was undone before it or is undone at the same time

Verify: undo a collaborator's removal of a comment (or a format) after its author undid it, or while the author undoes it: the value comes back on its own text only, or not at all, instead of covering everything after it. Each such undo writes one format item of its own.
