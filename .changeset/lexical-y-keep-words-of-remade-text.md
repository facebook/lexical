---
'@lexical/y': patch
---

[fix] Keep the unchanged words of text nodes made again with other text, so a collaborator's concurrent edit inside them stays there

Verify: where `Intl.Segmenter` is available, an update that removes a line's text nodes and makes them again with one word changed (an agent's rewrite of a block from its JSON) writes that word alone; a letter a collaborator types into another word of the line at the same time stays in that word, and a character a collaborator deletes there at the same time stays deleted.
