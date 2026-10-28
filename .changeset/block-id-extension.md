---
'@lexical/extension': patch
'@lexical/html': patch
---

[feature] Experimental `BlockIdExtension` and `BlockIdHTMLExtension` for stable block ids
@zurfyx
PR: #9421

`BlockIdExtension` gives each block an id that survives serialization, reloads, undo/redo, the Lexical clipboard and collaboration, so code outside the editor (an agent, a server pipeline) can address blocks directly. The id is NodeState (`blockIdState`), serialized as `"$": {"blockId": "…"}`. `BlockIdHTMLExtension`, imported from its own entry point `@lexical/html/BlockIdHTMLExtension` (#9474) so that the rest of `@lexical/html` does not pull in the block id implementation, carries the ids through HTML export and import. Both are opt-in; editors that do not register them are unchanged.
