import { $isElementNode, type LexicalNode } from 'lexical';

export function $getClosest<T extends LexicalNode>(
  node: LexicalNode,
  predicate: (node: LexicalNode) => node is T
): T | null {
  let current: LexicalNode | null = node;
  do {
    if (predicate(current)) {
      return current;
    }
    current = current.getParent();
  } while (current);

  return null;
}

export function $removeDescendantsInclusive(node: LexicalNode): void {
  if ($isElementNode(node)) {
    for (const child of node.getChildren()) {
      $removeDescendantsInclusive(child);
    }
  }
  node.remove();
}