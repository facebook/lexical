---
'lexical': minor
---

[breaking] Remove the deprecated unchecked type arguments from node traversal and key lookup
@etrepum
PR: #9479

The generic overloads that let callers claim an arbitrary node subclass without checking it are removed from TypeScript and Flow. The methods themselves and their runtime behavior are unchanged, and safe generics whose inputs establish the result type remain.

Migration: remove the explicit type argument and narrow the result with a node guard before using subclass-specific methods.

```ts
// Before
const parent = node.getParentOrThrow<ListItemNode>();
// After
const parent = node.getParentOrThrow();
if (!$isListItemNode(parent)) {
  return;
}
```

Detect: an explicit type argument on `getParent`, `getParentOrThrow`, `getPreviousSibling`, `getPreviousSiblings`, `getNextSibling`, `getNextSiblings`, `getChildren`, `getFirstChild`, `getFirstChildOrThrow`, `getLastChild`, `getLastChildOrThrow`, `getChildAtIndex`, `getFirstDescendant`, `getLastDescendant`, `getDescendantByIndex`, `$getNodeByKey` or `$getNodeByKeyOrThrow`; TypeScript reports these as errors after upgrading.

Codemod: none; each call site needs a guard that fits its context.
