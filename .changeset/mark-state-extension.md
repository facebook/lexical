---
'lexical': patch
'@lexical/mark': patch
'@lexical/compiler': patch
'@lexical/fast-check': patch
---

[feature] Experimental set-valued NodeState (`arraySetValue`) and `MarkStateExtension`
@zurfyx
PR: #9380

`arraySetValue(item)` declares a state whose value is a frozen, sorted, deduplicated array of strings, and `$setState` keeps such values canonical. `MarkStateExtension` in `@lexical/mark` uses it to store mark ids on the leaves they cover instead of in `MarkNode` wrappers, so overlapping marks need no tree restructuring and ids travel with the text. Existing states and `MarkNode` are unchanged.
