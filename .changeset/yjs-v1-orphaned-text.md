---
'@lexical/yjs': patch
---

[fix] Keep a v1 collaboration editor showing what its document holds when text a collaborator typed lands where no text node is, such as inside nested marks marked concurrently

The v1 binding removes such text from the document, as before, but that removal was read back as a remote change and deleted the node at its index instead (a mark next to the text vanished from the editor while its document kept it), and a text node whose properties were deleted in a merge had its leftover text removed at an offset into the node rather than its index in the element, deleting other text. The text is now removed with the binding as the origin, at its index, and the element's children are read again from the document.

Verify: with three v1 clients on a paragraph whose middle word is commented, mark a letter of the word and type after it on one client, mark the next letter on another that saw only the first mark, deliver everything, and check that every editor matches a fresh read of its own document.
