/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $isElementNode,
  $isRangeSelection,
  $isRootNode,
  $isRootOrShadowRoot,
  $isTextNode,
  DEPRECATED_$isGridSelection,
  ElementNode,
  GridSelection,
  LexicalNode,
  NodeKey,
  NodeSelection,
  Point,
  RangeSelection,
  TextNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {$cloneWithProperties, getStyleObjectFromCSS} from '.';

export const cssToStyles: Map<string, Record<string, string>> = new Map();

export function $getIndexFromPossibleClone(
  node: LexicalNode,
  parent: ElementNode,
  nodeMap: Map<NodeKey, LexicalNode>,
): number {
  const parentClone = nodeMap.get(parent.getKey());

  if ($isElementNode(parentClone)) {
    return parentClone.__children.indexOf(node.getKey());
  }

  return node.getIndexWithinParent();
}

export function $getParentAvoidingExcludedElements(
  node: LexicalNode,
): ElementNode | null {
  let parent = node.getParent();

  while (parent !== null && parent.excludeFromCopy('clone')) {
    parent = parent.getParent();
  }

  return parent;
}

export function $copyLeafNodeBranchToRoot(
  leaf: LexicalNode,
  startingOffset: number | undefined,
  endingOffset: number | undefined,
  isLeftSide: boolean,
  range: Array<NodeKey>,
  nodeMap: Map<NodeKey, LexicalNode>,
): void {
  let node = leaf;
  let offset = startingOffset;

  while (node !== null) {
    const parent = $getParentAvoidingExcludedElements(node);

    if (parent === null) {
      break;
    }

    if (!$isElementNode(node) || !node.excludeFromCopy('clone')) {
      const key = node.getKey();
      let clone = nodeMap.get(key);
      const needsClone = clone === undefined;

      if (needsClone) {
        clone = $cloneWithProperties<LexicalNode>(node);
        nodeMap.set(key, clone);
      }

      if ($isTextNode(clone) && !clone.isSegmented() && !clone.isToken()) {
        clone.__text = clone.__text.slice(
          isLeftSide ? offset : 0,
          isLeftSide ? endingOffset : offset,
        );
      } else if ($isElementNode(clone)) {
        clone.__children = clone.__children.slice(
          isLeftSide ? offset : 0,
          isLeftSide ? undefined : (offset || 0) + 1,
        );
      }

      if ($isRootNode(parent)) {
        if (needsClone) {
          // We only want to collect a range of top level nodes.
          // So if the parent is the root, we know this is a top level.
          range.push(key);
        }

        break;
      }
    }

    offset = $getIndexFromPossibleClone(node, parent, nodeMap);
    node = parent;
  }
}

export function errGetLatestOnClone(): void {
  invariant(false, 'getLatest() on clone node');
}

export function $cloneContentsImpl(
  selection: RangeSelection | NodeSelection | GridSelection,
): {
  nodeMap: Array<[NodeKey, LexicalNode]>;
  range: Array<NodeKey>;
} {
  if ($isRangeSelection(selection)) {
    const anchor = selection.anchor;
    const focus = selection.focus;
    const [anchorOffset, focusOffset] = selection.getCharacterOffsets();
    const nodes = selection.getNodes();

    if (nodes.length === 0) {
      return {
        nodeMap: [],
        range: [],
      };
    }

    // Check if we can use the parent of the nodes, if the
    // parent can't be empty, then it's important that we
    // also copy that element node along with its children.
    let nodesLength = nodes.length;
    const firstNode = nodes[0];
    const firstNodeParent = firstNode.getParent();

    if (
      firstNodeParent !== null &&
      (!firstNodeParent.canBeEmpty() || $isRootNode(firstNodeParent))
    ) {
      const parentChildren = firstNodeParent.__children;
      const parentChildrenLength = parentChildren.length;

      if (parentChildrenLength === nodesLength) {
        let areTheSame = true;

        for (let i = 0; i < parentChildren.length; i++) {
          if (parentChildren[i] !== nodes[i].__key) {
            areTheSame = false;
            break;
          }
        }

        if (areTheSame) {
          nodesLength++;
          nodes.push(firstNodeParent);
        }
      }
    }

    const lastNode = nodes[nodesLength - 1];
    const isBefore = anchor.isBefore(focus);
    const nodeMap = new Map();
    const range: Array<NodeKey> = [];
    const isOnlyText = $isTextNode(firstNode) && nodesLength === 1;

    // Do first node to root
    $copyLeafNodeBranchToRoot(
      firstNode,
      isBefore ? anchorOffset : focusOffset,
      isOnlyText ? (isBefore ? focusOffset : anchorOffset) : undefined,
      true,
      range,
      nodeMap,
    );

    // Copy all nodes between
    for (let i = 0; i < nodesLength; i++) {
      const node = nodes[i];
      const key = node.getKey();

      if (
        !nodeMap.has(key) &&
        (!$isElementNode(node) || !node.excludeFromCopy('clone'))
      ) {
        const clone = $cloneWithProperties<LexicalNode>(node);

        if ($isRootNode(node.getParent())) {
          range.push(node.getKey());
        }

        if (key !== 'root') {
          nodeMap.set(key, clone);
        }
      }
    }

    // Do last node to root
    $copyLeafNodeBranchToRoot(
      lastNode,
      isOnlyText ? undefined : isBefore ? focusOffset : anchorOffset,
      undefined,
      false,
      range,
      nodeMap,
    );

    return {
      nodeMap: Array.from(nodeMap.entries()),
      range,
    };
  } else if (DEPRECATED_$isGridSelection(selection)) {
    const nodeMap = selection.getNodes().map<[NodeKey, LexicalNode]>((node) => {
      const nodeKey = node.getKey();

      const clone = $cloneWithProperties<LexicalNode>(node);

      return [nodeKey, clone];
    });

    return {
      nodeMap,
      range: [selection.gridKey],
    };
  }

  invariant(false, 'TODO');
}

export function getStyleObjectFromRawCSS(css: string): Record<string, string> {
  const styleObject: Record<string, string> = {};
  const styles = css.split(';');

  for (const style of styles) {
    if (style !== '') {
      const [key, value] = style.split(/:([^]+)/); // split on first colon
      styleObject[key.trim()] = value.trim();
    }
  }

  return styleObject;
}

export function getCSSFromStyleObject(styles: Record<string, string>): string {
  let css = '';

  for (const style in styles) {
    if (style) {
      css += `${style}: ${styles[style]};`;
    }
  }

  return css;
}

export function $patchNodeStyle(
  node: TextNode,
  patch: Record<string, string>,
): void {
  const prevStyles = getStyleObjectFromCSS(node.getStyle());
  const newStyles = prevStyles ? {...prevStyles, ...patch} : patch;
  const newCSSText = getCSSFromStyleObject(newStyles);
  node.setStyle(newCSSText);
  cssToStyles.set(newCSSText, newStyles);
}

export function $getNodeStyleValueForProperty(
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

export function $removeParentEmptyElements(startingNode: ElementNode): void {
  let node: ElementNode | null = startingNode;

  while (node !== null && !$isRootOrShadowRoot(node)) {
    const latest = node.getLatest();
    const parentNode: ElementNode | null = node.getParent<ElementNode>();

    if (latest.__children.length === 0) {
      node.remove(true);
    }

    node = parentNode;
  }
}

export function isPointAttached(point: Point): boolean {
  return point.getNode().isAttached();
}

export function getDOMTextNode(element: Node | null): Text | null {
  let node = element;

  while (node != null) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node as Text;
    }

    node = node.firstChild;
  }

  return null;
}

export function getDOMIndexWithinParent(node: ChildNode): [ParentNode, number] {
  const parent = node.parentNode;

  if (parent == null) {
    throw new Error('Should never happen');
  }

  return [parent, Array.from(parent.childNodes).indexOf(node)];
}
