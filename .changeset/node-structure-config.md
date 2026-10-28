---
'lexical': patch
'@lexical/code-core': patch
'@lexical/extension': patch
'@lexical/link': patch
'@lexical/list': patch
'@lexical/mark': patch
'@lexical/mdast': patch
'@lexical/rich-text': patch
'@lexical/table': patch
---

[feature] Experimental node structure keys in `$config` (`inline`, `children`, `mergeAdjacent`, `derived`) and an opt-in `NodeStructureExtension`
@zurfyx
PR: #9452

Classes can declare what they may hold and when adjacent siblings are the same thing, so importers, serializers and storage layers can read rules that used to live only in transforms. `getDeclaredNodeStructure(klass)` reads the declarations, and `NodeStructureExtension` in `@lexical/extension` enforces them. The built-in nodes declare their structure; behavior without the extension is unchanged.
