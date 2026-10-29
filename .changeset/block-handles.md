---
'@lexical/extension': patch
'@lexical/html': patch
---

[feature] Block handles for showing blocks to a model: `$getBlockHandle(node)` gives a block the shortest prefix of its id that no other block's id starts with (at least 4 characters, like a short git hash), `$getBlockHandles()` gives every block's, and `$resolveBlockHandle(handle)` finds the block again, returning `found`, `not-found`, `ambiguous` (with the candidates' current handles) or `invalid` instead of throwing; `BlockIdHTMLExtension` takes `export: 'handle'` to write `data-block-handle` (`BLOCK_HANDLE_ATTRIBUTE`) instead of `data-block-id`

A handle costs about 3 to 4 o200k tokens where a 21-character id costs about 14. Handles are derived from the stored ids and never stored; ids, `$getBlockById`, `export: true` and HTML import are unchanged, and import never reads `data-block-handle`.
