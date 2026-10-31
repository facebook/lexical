---
'@lexical/y': patch
---

[fix] Keep text a collaborator types right before or after a word out of that word when another person makes it token or segmented text (a mention) at the same time

Verify: in a shared document, one person turns a word into a mention (token text) while another types right after or right before it. The mention holds just the word for everyone, in either order, and the typed text is plain text next to it.
