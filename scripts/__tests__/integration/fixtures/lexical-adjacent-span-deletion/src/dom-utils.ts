export function isElement(node: unknown): node is Element {
  return node instanceof Element;
}

export function isText(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

export function nodeOrParentElement(
  node: Node | null | undefined
): Element | null {
  return node?.nodeType === Node.ELEMENT_NODE
    ? (node as Element)
    : node?.parentElement || null;
}

export function getEdgeTextNode({
  node,
  edge,
  requireSelectable,
}: {
  node: Node;
  edge: 'left' | 'right';
  requireSelectable: boolean;
}): Text | null {
  if (requireSelectable && !isNodeSelectable(node)) {
    return null;
  }

  if (isText(node)) {
    return node;
  }

  if (!isElement(node)) {
    return null;
  }

  const childNodes =
    edge === 'left' ? node.childNodes : [...node.childNodes].reverse();
  for (const child of childNodes) {
    const result = getEdgeTextNode({ node: child, edge, requireSelectable });
    if (result) {
      return result;
    }
  }

  return null;
}

function isNodeSelectable(node: Node): boolean {
  if (isText(node)) {
    return node.data.length > 0;
  }

  if (!isElement(node)) {
    return false;
  }

  return isElementSelectable(node);
}

/**
 * Checks whether a node is (broadly) selectable. Inspects only the input node
 * itself and does not consider computed style nor ancestry.
 */
function isElementSelectable(node: Element): boolean {
  return (
    !node.classList.contains('select-none') &&
    node instanceof HTMLElement &&
    node.isContentEditable
  );
}

/**
 * Given a Node, traverses along (and up, if necessary) the DOM hierarchy to
 * find the following node in Document order.
 *
 * Will not climb up to or beyond the root, if provided.
 */
export function getFollowingNode({
  node,
  direction,
  requireSelectable,
  root,
}: {
  node: Node;
  direction: 'next' | 'previous';
  requireSelectable: boolean;
  root?: Node | null;
}): Node | null {
  const sibling: Node | null =
    direction === 'next' ? node.nextSibling : node.previousSibling;
  const parentNode = node.parentNode === root ? null : node.parentNode;

  // If the present node doesn't meet the selection requirements, and there's no
  // sibling nor parentNode to pass over to, bail out.
  if (requireSelectable && !isNodeSelectable(node) && !sibling && !parentNode) {
    return null;
  }

  // If a sibling is available, check its eligibility.
  if (sibling) {
    // Return if eligible.
    if (!requireSelectable || isNodeSelectable(sibling)) {
      return sibling;
    }

    // If not, keep searching, starting with the next sibling.
    return getFollowingNode({
      node: sibling,
      direction,
      requireSelectable,
      root,
    });
  }

  // If no eligible sibling is found, climb up to the parent and continue along
  // from there.
  return parentNode
    ? getFollowingNode({ node: parentNode, direction, requireSelectable, root })
    : null;
}
