---
'lexical': patch
'@lexical/react': patch
---

[fix] Do not read `Math.random()` while rendering on the server
@etrepum
PR: #9319

Without a DOM, editor keys and namespaces come from a counter, and `LexicalCollaboration` uses a fixed name and color, so server prerenders (such as Next.js with `cacheComponents`) no longer need a `Suspense` boundary around the composer. Browser behavior is unchanged.

Verify: server-rendering code that reads `editor.getKey()` or the default namespace, which are now `s1`, `s2`, ... without a DOM.
