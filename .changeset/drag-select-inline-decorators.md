---
'lexical': minor
'@lexical/clipboard': minor
'@lexical/selection': minor
'@lexical/table': minor
---

[breaking] Let mouse drags select across inline decorators; `ElementNode.reconcileObservedMutation` restores the committed children's DOM
@vijayojha89
PR: #9329

A drag over an inline decorator (an image, equation or mention) now moves the selection past it, and clicks beside such a decorator at a line break land on the right line.

Migration: `ElementNode.reconcileObservedMutation` (`@internal`) puts back the DOM of the element's committed children, from the latest reconciled state, rather than the children of the update it is called in. Code that calls it inside an update to render that update's children must place those children's DOM itself, for example from `editor.getElementByKey()`.

Detect: calls to `reconcileObservedMutation`.

Codemod: none.
