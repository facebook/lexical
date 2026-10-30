---
'@lexical/y': patch
---

[fix] Keep a tab, a hashtag, a code highlight token or text in token or segmented mode what it is when it was written right next to a collaborator's node of the same kind and that collaborator undoes theirs

Verify: in a shared document, one person presses Tab right next to a tab another person added; when the other person undoes, the first person's tab is still a tab for everyone (not a tab character in the text before it). A link or format a collaborator removes around a tab at the same time stays removed. A stored line where two people's tabs were shown as one tab now shows both tabs.
