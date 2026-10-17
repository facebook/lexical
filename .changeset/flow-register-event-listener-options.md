---
'lexical': patch
---

[fix] The Flow types of `registerEventListener` and `registerEventListeners` no longer depend on a specific DOM libdef
@potatowagon
PR: #9258

Flow projects using the default DOM library definition of Flow 0.333 and later no longer get `cannot-resolve-name` errors.
