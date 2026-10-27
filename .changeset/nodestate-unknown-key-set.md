---
'lexical': patch
---

[fix] Setting a NodeState key that is still in `unknownState` drops its JSON copy, so removing the value takes effect
@zurfyx
PR: #9468
