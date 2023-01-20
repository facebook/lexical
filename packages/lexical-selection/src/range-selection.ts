/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getAdjacentNode,
  $getNodeByKey,
  $getPreviousSelection,
  $getRoot,
  $getSelection,
  $hasAncestor,
  $isDecoratorNode,
  $isElementNode,
  $isLeafNode,
  $isRangeSelection,
  $isRootNode,
  $isRootOrShadowRoot,
  $isTextNode,
  $setSelection,
  ElementNode,
  GridSelection,
  LexicalNode,
  NodeKey,
  Point,
  RangeSelection,
  TextNode,
} from 'lexical';

import {getStyleObjectFromCSS} from './utils';

interface SetBlocksTypeOptions_experimental {
  createParentBlock?: (
    nestedBlocks: ElementNode[] | LexicalNode[],
    selectedNodes: ElementNode[] | LexicalNode[],
  ) => ElementNode | LexicalNode;
  handleShadowRoot?: (node: ElementNode | LexicalNode) => void;
  collapseShadowRootNodes?: boolean;
}

/**
 * Converts selected nodes from one type to another, as defined by parameter function.
 *
 * Will optionally process shadowRoot nodes, and all their children, if any one of them is included
 * in the selected nodes. Finally, parentBlocks — AKA nested nodes — can be created by passing
 * the optional `createParentBlock` function.
 *
 * @param selection
 * @param createElement
 * @param SetBlocksTypeOptions_experimental
 * @returns (ElementNode | LexicalNode)[]
 */
export function $setBlocksType_experimental(
  selection: RangeSelection | GridSelection,
  createElement: (
    node?: ElementNode | LexicalNode,
    selectedNodes?: ElementNode[] | LexicalNode[],
  ) => ElementNode | LexicalNode,
  options?: SetBlocksTypeOptions_experimental,
) {
  // 1. special handling for root
  if (selection.anchor.key === 'root') {
    const element = createElement();
    const root = $getRoot();
    const firstChild = root.getFirstChild();
    if (firstChild) firstChild.replace(element, true);
    else root.append(element);
    return [element];
  }

  // 2. standard setup

  let nodes = selection.getNodes();
  const createElementTarget = (
    node: ElementNode | LexicalNode,
    selectedNodes: ElementNode[] | LexicalNode[],
  ) => {
    if (!isBlock(node)) return null;
    const targetElement = createElement(node, selectedNodes);
    targetElement.setFormat(node.getFormatType());
    targetElement.setIndent(node.getIndent());
    return targetElement;
  };

  // 3. special handling for anchor type text

  if (selection.anchor.type === 'text') {
    let firstBlock = selection.anchor.getNode().getParent() as LexicalNode;
    firstBlock = (
      firstBlock.isInline() ? firstBlock.getParent() : firstBlock
    ) as LexicalNode;
    if (nodes.indexOf(firstBlock) === -1) nodes.push(firstBlock);
  }

  // 4. optionally collapse shadowRoot nodes

  if (
    options &&
    (options.collapseShadowRootNodes || options.handleShadowRoot)
  ) {
    const nodesAfterShadowRootCollapse = collapseShadowRoots(
      nodes,
      options as SetBlocksTypeOptions_experimental,
    );

    if (nodesAfterShadowRootCollapse.length > 0) {
      nodes = nodesAfterShadowRootCollapse;
    }
  }

  // 5. standard node conversion path

  if (!options || !options.createParentBlock) {
    const targetElements = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const targetElement = createElementTarget(node, nodes);
      if (!targetElement) continue;
      targetElements.push(targetElement);
      node.replace(targetElement, true);
    }

    return targetElements;
  }

  // 6. advanced path for nested node creation

  if (options && options.createParentBlock) {
    const nestedBlocks = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const targetElement = createElementTarget(node, nodes);
      if (targetElement === null) continue;
      nestedBlocks.push(targetElement);
    }

    const skipIdx = nodes.findIndex((node) => isBlock(node));
    const parentBlock = options.createParentBlock(nestedBlocks, nodes);

    ((node) => node && node.replace(parentBlock))(nodes[skipIdx]);
    nodes.forEach((node, idx) => (idx !== skipIdx ? node.remove() : undefined));

    (() => {
      const selectionUpdate = $getSelection();

      // the selection can break if the initial selection was (a) backward,
      // (b) uncollapsed, and (c) is now being nested into a parentBlock.
      // this select will prevent the resulting 'no selection' error.
      // can reset via the caller: { onUpdate: editor.update() }

      if ($isRangeSelection(selectionUpdate)) {
        const anchorKey = selectionUpdate.anchor.key;
        const firstActiveChild = parentBlock.getFirstChild();
        const firstActiveGrandchild = firstActiveChild.getFirstChild();

        const isCorrectSelection = [
          parentBlock.getKey(),
          firstActiveChild.getKey(),
          firstActiveGrandchild.getKey(),
        ].includes((key: string | null) => {
          return key === anchorKey;
        });

        if (!isCorrectSelection) {
          firstActiveChild.select(0);
        }
      }
    })();

    return [parentBlock];
  }

  return [];
}

function collapseShadowRoots(
  nodes: ElementNode[] | LexicalNode[],
  options: SetBlocksTypeOptions_experimental,
) {
  const shadows = [];
  const shadowRootKeys = new Set<string>();
  const nodesAndShadowKeys: (ElementNode | LexicalNode | string)[] = [...nodes];
  const dirtyNodeSets: Record<string, Set<string>> = {};

  const getShadowKey = (key: string) => `shadowRoot-${key}`;
  const isShadow = (key: string, maybeKey: LexicalNode | string) => {
    return getShadowKey(key) === maybeKey;
  };

  // 1. collect shadowRoot and dirty node keys

  nodes.forEach((node) => {
    node.getParents().forEach((parent) => {
      const nodeKey = node.getKey();
      const parentKey = parent.getKey();

      if (parentKey !== 'root' && parent.isShadowRoot()) {
        const dirtyNodeSet = dirtyNodeSets[parentKey];

        // mark each selected node as dirty if it is a child of
        // shadowRoot. note: we assume selection.getNodes()
        // returns a stable sequence of shadow nodes

        if (!dirtyNodeSet) {
          dirtyNodeSets[parentKey] = new Set();
          dirtyNodeSets[parentKey].add(nodeKey);
        } else if (!dirtyNodeSet.has(nodeKey)) {
          dirtyNodeSet.add(nodeKey);
        }

        if (!shadowRootKeys.has(parentKey)) {
          shadowRootKeys.add(parentKey);
        }
      }
    });
  });

  // 2. handle the shadows in a consistent manner. default is to
  // collapse them at start, but custom handling is possible

  for (const shadowRootKey of shadowRootKeys) {
    const shadowRootNode = $getNodeByKey(shadowRootKey);

    if (shadowRootNode !== null) {
      const shadowRootIndex = shadowRootNode.getIndexWithinParent();
      const shadowRootLength = shadowRootNode.getChildrenSize();

      // shadow the shadow for slicing and splicing
      shadows.push([shadowRootKey, shadowRootIndex, shadowRootLength]);

      // make the shadow something else
      if (options.handleShadowRoot !== undefined) {
        options.handleShadowRoot(shadowRootNode);
      } else {
        shadowRootNode.collapseAtStart();
      }
    }
  }

  // 3. mark shadowRoot children for replacement

  Object.entries(dirtyNodeSets).forEach((keyAndSet) => {
    const [shadowKey, dirtyNodeSet] = keyAndSet;

    for (const nodeKey of dirtyNodeSet) {
      const nodeIndex = nodesAndShadowKeys.findIndex((maybeNode) => {
        return typeof maybeNode !== 'string' && maybeNode.getKey() === nodeKey;
      });

      if (nodeIndex > -1) {
        nodesAndShadowKeys[nodeIndex] = getShadowKey(shadowKey);
      }
    }
  });

  // 4. finally, replace the shadowRoot children

  shadows.forEach((shadow) => {
    const [shadowKey, shadowStart] = shadow;
    const shadowEnd = shadowStart + shadow[2];
    const allChildren = $getRoot().getChildren();
    const newChildren = allChildren.slice(shadowStart, shadowEnd);

    const spliceStart = nodesAndShadowKeys.findIndex((maybeKey) => {
      return isShadow(shadowKey, maybeKey);
    });
    const deleteCount = nodesAndShadowKeys.filter((maybeKey) => {
      return isShadow(shadowKey, maybeKey);
    }).length;

    nodesAndShadowKeys.splice(spliceStart, deleteCount, ...newChildren);
  });

  return nodesAndShadowKeys as (ElementNode | LexicalNode)[];
}

function isBlock(node: LexicalNode) {
  return $isElementNode(node) && !$isRootOrShadowRoot(node) && !node.isInline();
}

function isPointAttached(point: Point): boolean {
  return point.getNode().isAttached();
}

function $removeParentEmptyElements(startingNode: ElementNode): void {
  let node: ElementNode | null = startingNode;

  while (node !== null && !$isRootOrShadowRoot(node)) {
    const latest = node.getLatest();
    const parentNode: ElementNode | null = node.getParent<ElementNode>();

    if (latest.getChildrenSize() === 0) {
      node.remove(true);
    }

    node = parentNode;
  }
}

export function $wrapNodes(
  selection: RangeSelection | GridSelection,
  createElement: () => ElementNode,
  wrappingElement: null | ElementNode = null,
): void {
  const nodes = selection.getNodes();
  const nodesLength = nodes.length;
  const anchor = selection.anchor;

  if (
    nodesLength === 0 ||
    (nodesLength === 1 &&
      anchor.type === 'element' &&
      anchor.getNode().getChildrenSize() === 0)
  ) {
    const target =
      anchor.type === 'text'
        ? anchor.getNode().getParentOrThrow()
        : anchor.getNode();
    const children = target.getChildren();
    let element = createElement();
    element.setFormat(target.getFormatType());
    element.setIndent(target.getIndent());
    children.forEach((child) => element.append(child));

    if (wrappingElement) {
      element = wrappingElement.append(element);
    }

    target.replace(element);

    return;
  }

  let topLevelNode = null;
  let descendants: LexicalNode[] = [];
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    // Determine whether wrapping has to be broken down into multiple chunks. This can happen if the
    // user selected multiple Root-like nodes that have to be treated separately as if they are
    // their own branch. I.e. you don't want to wrap a whole table, but rather the contents of each
    // of each of the cell nodes.
    if ($isRootOrShadowRoot(node)) {
      $wrapNodesImpl(
        selection,
        descendants,
        descendants.length,
        createElement,
        wrappingElement,
      );
      descendants = [];
      topLevelNode = node;
    } else if (
      topLevelNode === null ||
      (topLevelNode !== null && $hasAncestor(node, topLevelNode))
    ) {
      descendants.push(node);
    } else {
      $wrapNodesImpl(
        selection,
        descendants,
        descendants.length,
        createElement,
        wrappingElement,
      );
      descendants = [node];
    }
  }
  $wrapNodesImpl(
    selection,
    descendants,
    descendants.length,
    createElement,
    wrappingElement,
  );
}

export function $wrapNodesImpl(
  selection: RangeSelection | GridSelection,
  nodes: LexicalNode[],
  nodesLength: number,
  createElement: () => ElementNode,
  wrappingElement: null | ElementNode = null,
): void {
  if (nodes.length === 0) {
    return;
  }

  const firstNode = nodes[0];
  const elementMapping: Map<NodeKey, ElementNode> = new Map();
  const elements = [];
  // The below logic is to find the right target for us to
  // either insertAfter/insertBefore/append the corresponding
  // elements to. This is made more complicated due to nested
  // structures.
  let target = $isElementNode(firstNode)
    ? firstNode
    : firstNode.getParentOrThrow();

  if (target.isInline()) {
    target = target.getParentOrThrow();
  }

  let targetIsPrevSibling = false;
  while (target !== null) {
    const prevSibling = target.getPreviousSibling<ElementNode>();

    if (prevSibling !== null) {
      target = prevSibling;
      targetIsPrevSibling = true;
      break;
    }

    target = target.getParentOrThrow();

    if ($isRootOrShadowRoot(target)) {
      break;
    }
  }

  const emptyElements = new Set();

  // Find any top level empty elements
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];

    if ($isElementNode(node) && node.getChildrenSize() === 0) {
      emptyElements.add(node.getKey());
    }
  }

  const movedNodes: Set<NodeKey> = new Set();

  // Move out all leaf nodes into our elements array.
  // If we find a top level empty element, also move make
  // an element for that.
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    let parent = node.getParent();

    if (parent !== null && parent.isInline()) {
      parent = parent.getParent();
    }

    if (
      parent !== null &&
      $isLeafNode(node) &&
      !movedNodes.has(node.getKey())
    ) {
      const parentKey = parent.getKey();

      if (elementMapping.get(parentKey) === undefined) {
        const targetElement = createElement();
        targetElement.setFormat(parent.getFormatType());
        targetElement.setIndent(parent.getIndent());
        elements.push(targetElement);
        elementMapping.set(parentKey, targetElement);
        // Move node and its siblings to the new
        // element.
        parent.getChildren().forEach((child) => {
          targetElement.append(child);
          movedNodes.add(child.getKey());
          if ($isElementNode(child)) {
            // Skip nested leaf nodes if the parent has already been moved
            child.getChildrenKeys().forEach((key) => movedNodes.add(key));
          }
        });
        $removeParentEmptyElements(parent);
      }
    } else if (emptyElements.has(node.getKey())) {
      const targetElement = createElement();
      targetElement.setFormat(node.getFormatType());
      targetElement.setIndent(node.getIndent());
      elements.push(targetElement);
      node.remove(true);
    }
  }

  if (wrappingElement !== null) {
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      wrappingElement.append(element);
    }
  }
  let lastElement = null;

  // If our target is Root-like, let's see if we can re-adjust
  // so that the target is the first child instead.
  if ($isRootOrShadowRoot(target)) {
    if (targetIsPrevSibling) {
      if (wrappingElement !== null) {
        target.insertAfter(wrappingElement);
      } else {
        for (let i = elements.length - 1; i >= 0; i--) {
          const element = elements[i];
          target.insertAfter(element);
        }
      }
    } else {
      const firstChild = target.getFirstChild();

      if ($isElementNode(firstChild)) {
        target = firstChild;
      }

      if (firstChild === null) {
        if (wrappingElement) {
          target.append(wrappingElement);
        } else {
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            target.append(element);
            lastElement = element;
          }
        }
      } else {
        if (wrappingElement !== null) {
          firstChild.insertBefore(wrappingElement);
        } else {
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            firstChild.insertBefore(element);
            lastElement = element;
          }
        }
      }
    }
  } else {
    if (wrappingElement) {
      target.insertAfter(wrappingElement);
    } else {
      for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        target.insertAfter(element);
        lastElement = element;
      }
    }
  }

  const prevSelection = $getPreviousSelection();

  if (
    $isRangeSelection(prevSelection) &&
    isPointAttached(prevSelection.anchor) &&
    isPointAttached(prevSelection.focus)
  ) {
    $setSelection(prevSelection.clone());
  } else if (lastElement !== null) {
    lastElement.selectEnd();
  } else {
    selection.dirty = true;
  }
}

export function $shouldOverrideDefaultCharacterSelection(
  selection: RangeSelection,
  isBackward: boolean,
): boolean {
  const possibleNode = $getAdjacentNode(selection.focus, isBackward);

  return (
    ($isDecoratorNode(possibleNode) && !possibleNode.isIsolated()) ||
    ($isElementNode(possibleNode) &&
      !possibleNode.isInline() &&
      !possibleNode.canBeEmpty())
  );
}

export function $moveCaretSelection(
  selection: RangeSelection,
  isHoldingShift: boolean,
  isBackward: boolean,
  granularity: 'character' | 'word' | 'lineboundary',
): void {
  selection.modify(isHoldingShift ? 'extend' : 'move', isBackward, granularity);
}

export function $isParentElementRTL(selection: RangeSelection): boolean {
  const anchorNode = selection.anchor.getNode();
  const parent = $isRootNode(anchorNode)
    ? anchorNode
    : anchorNode.getParentOrThrow();

  return parent.getDirection() === 'rtl';
}

export function $moveCharacter(
  selection: RangeSelection,
  isHoldingShift: boolean,
  isBackward: boolean,
): void {
  const isRTL = $isParentElementRTL(selection);
  $moveCaretSelection(
    selection,
    isHoldingShift,
    isBackward ? !isRTL : isRTL,
    'character',
  );
}

export function $selectAll(selection: RangeSelection): void {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const topParent = anchorNode.getTopLevelElementOrThrow();
  const root = topParent.getParentOrThrow();
  let firstNode = root.getFirstDescendant();
  let lastNode = root.getLastDescendant();
  let firstType: 'element' | 'text' = 'element';
  let lastType: 'element' | 'text' = 'element';
  let lastOffset = 0;

  if ($isTextNode(firstNode)) {
    firstType = 'text';
  } else if (!$isElementNode(firstNode) && firstNode !== null) {
    firstNode = firstNode.getParentOrThrow();
  }

  if ($isTextNode(lastNode)) {
    lastType = 'text';
    lastOffset = lastNode.getTextContentSize();
  } else if (!$isElementNode(lastNode) && lastNode !== null) {
    lastNode = lastNode.getParentOrThrow();
  }

  if (firstNode && lastNode) {
    anchor.set(firstNode.getKey(), 0, firstType);
    focus.set(lastNode.getKey(), lastOffset, lastType);
  }
}

function $getNodeStyleValueForProperty(
  node: TextNode,
  styleProperty: string,
  defaultValue: string,
): string {
  const css = node.getStyle();
  const styleObject = getStyleObjectFromCSS(css);

  if (styleObject !== null) {
    return styleObject[styleProperty] || defaultValue;
  }

  return defaultValue;
}

export function $getSelectionStyleValueForProperty(
  selection: RangeSelection,
  styleProperty: string,
  defaultValue = '',
): string {
  let styleValue = null;
  const nodes = selection.getNodes();
  const anchor = selection.anchor;
  const focus = selection.focus;
  const isBackward = selection.isBackward();
  const endOffset = isBackward ? focus.offset : anchor.offset;
  const endNode = isBackward ? focus.getNode() : anchor.getNode();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // if no actual characters in the end node are selected, we don't
    // include it in the selection for purposes of determining style
    // value
    if (i !== 0 && endOffset === 0 && node.is(endNode)) {
      continue;
    }

    if ($isTextNode(node)) {
      const nodeStyleValue = $getNodeStyleValueForProperty(
        node,
        styleProperty,
        defaultValue,
      );

      if (styleValue === null) {
        styleValue = nodeStyleValue;
      } else if (styleValue !== nodeStyleValue) {
        // multiple text nodes are in the selection and they don't all
        // have the same font size.
        styleValue = '';
        break;
      }
    }
  }

  return styleValue === null ? defaultValue : styleValue;
}
