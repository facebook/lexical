/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  GridSelection,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  NodeSelection,
  ParsedNodeMap,
  RangeSelection,
} from 'lexical';

import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {
  $cloneWithProperties,
  $sliceSelectedTextNodeContent,
} from '@lexical/selection';
import {$findMatchingParent} from '@lexical/utils';
import {
  $createGridSelection,
  $createNodeFromParse,
  $createParagraphNode,
  $getNodeByKey,
  $getNodeByKeyOrThrow,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isGridCellNode,
  $isGridNode,
  $isGridRowNode,
  $isGridSelection,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  GridNode,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import invariant from 'shared/invariant';

export function $getHtmlContent(editor: LexicalEditor): string | null {
  const selection = $getSelection();

  if (selection == null) {
    throw new Error('Expected valid LexicalSelection');
  }

  // If we haven't selected anything
  if (
    ($isRangeSelection(selection) && selection.isCollapsed()) ||
    selection.getNodes().length === 0
  ) {
    return null;
  }

  return $generateHtmlFromNodes(editor, selection);
}

export function $appendSelectedNodesToClone(
  editor: LexicalEditor,
  selection: RangeSelection | NodeSelection | GridSelection,
  currentNode: LexicalNode,
  nodeMap: Map<NodeKey, LexicalNode>,
  range: Array<NodeKey>,
  shouldIncludeInRange = true,
): Array<NodeKey> {
  let shouldInclude = currentNode.isSelected();
  const shouldExclude =
    $isElementNode(currentNode) && currentNode.excludeFromCopy('clone');
  let clone = $cloneWithProperties<LexicalNode>(currentNode);
  clone = $isTextNode(clone)
    ? $sliceSelectedTextNodeContent(selection, clone)
    : clone;
  const children = $isElementNode(clone) ? clone.getChildren() : [];
  const nodeKeys = [];
  let shouldIncludeChildrenInRange = shouldIncludeInRange;

  if (shouldInclude && !shouldExclude) {
    nodeMap.set(clone.getKey(), clone);

    if (shouldIncludeInRange) {
      shouldIncludeChildrenInRange = false;
    }
  }

  for (let i = 0; i < children.length; i++) {
    const childNode = children[i];
    const childNodeKeys = $appendSelectedNodesToClone(
      editor,
      selection,
      childNode,
      nodeMap,
      range,
      shouldIncludeChildrenInRange,
    );

    for (let j = 0; j < childNodeKeys.length; j++) {
      const childNodeKey = childNodeKeys[j];
      nodeKeys.push(childNodeKey);
    }

    if (
      !shouldInclude &&
      $isElementNode(currentNode) &&
      nodeKeys.includes(childNode.getKey()) &&
      currentNode.extractWithChild(childNode, selection, 'clone')
    ) {
      shouldInclude = true;
    }
  }

  // The tree is later built using $generateNodes which works
  // by going through the nodes specified in the "range" & their children
  // while filtering out nodes not found in the "nodeMap".
  // This gets complicated when we want to "exclude" a node but
  // keep it's children i.e. a MarkNode and it's Text children.
  // The solution is to check if there's a cloned parent already in our map and
  // splice the current node's children into the nearest parent.
  // If there is no parent in the map already, the children will be added to the
  // top level range by default.
  if ($isElementNode(clone) && shouldExclude && shouldInclude) {
    let nearestClonedParent: LexicalNode;
    let idxWithinClonedParent: number;
    let prev = clone;
    let curr = clone.getParent();
    const root = $getRoot();

    while (curr != null && !curr.is(root)) {
      if (
        nodeMap.has(curr.getKey()) ||
        curr.extractWithChild(currentNode, selection, 'clone')
      ) {
        nearestClonedParent = $cloneWithProperties<LexicalNode>(curr);
        idxWithinClonedParent = prev.getIndexWithinParent();
        nodeMap.set(nearestClonedParent.getKey(), nearestClonedParent);
        break;
      }

      prev = curr;
      curr = curr.getParent();
    }

    // Add children to nearest cloned parent at the correct position.
    if ($isElementNode(nearestClonedParent) && idxWithinClonedParent != null) {
      const childrenToSplice = clone.getChildren();
      const childrenToSpliceLength = childrenToSplice.length;
      const firstNode = childrenToSplice[0];
      const lastNode = childrenToSplice[childrenToSpliceLength - 1];
      // insert the first node at the target index
      prev.insertBefore(firstNode);
      // insert all other nodes after it
      let target = firstNode;
      for (let i = 1; i < childrenToSpliceLength; i++) {
        target = target.insertAfter(childrenToSplice[i]);
      }
      const endNode = prev.getNextSibling();
      prev.remove();
      if (endNode !== null) {
        lastNode.setNext(endNode.__key);
        endNode.setPrev(lastNode.__key);
      } else {
        nearestClonedParent.getWritable().__last = lastNode.__key;
      }
    }
  }

  if (shouldInclude && !shouldExclude) {
    if (!nodeMap.has(clone.getKey())) {
      nodeMap.set(clone.getKey(), clone);
    }

    if (shouldIncludeInRange) {
      return [clone.getKey()];
    }
  }

  return shouldIncludeChildrenInRange ? nodeKeys : [];
}

// When we serialize selected content, we can end up with a nodeMap that doesn't
// contain the nodes in the __first and __last properties of the parents. This breaks
// the parsing logic, as it's impossible to traverse the linked list without these references.
// For a given node, this function goes through the nodeMap and checks to if each of the
// children are present, adjusting the __first and __last references accordingly.
function sanitizeClonedNodeLinks(
  key: NodeKey,
  nodeMap: Map<NodeKey, LexicalNode>,
) {
  const currentNode = $getNodeByKeyOrThrow(key);
  const currentNodeMapEntry = nodeMap.get(key);
  if (
    currentNodeMapEntry !== undefined &&
    $isElementNode(currentNodeMapEntry)
  ) {
    currentNodeMapEntry.__first = null;
    currentNodeMapEntry.__last = null;
    let next = $getNodeByKey(currentNode.__first);
    while (next !== null) {
      if (nodeMap.has(next.__key)) {
        if (currentNodeMapEntry.__first === null) {
          currentNodeMapEntry.__first = next.__key;
        }
        if (
          !nodeMap.has(next.__next) &&
          currentNodeMapEntry.__first !== null &&
          currentNodeMapEntry.__last === null
        ) {
          currentNodeMapEntry.__last = next.__key;
          break;
        }
      }
      sanitizeClonedNodeLinks(next.__key, nodeMap);
      next = next.getNextSibling();
    }
  }
}

export function $cloneSelectedContent<
  TKey extends NodeKey,
  TNode extends LexicalNode,
>(
  editor: LexicalEditor,
  selection: RangeSelection | NodeSelection | GridSelection,
): {
  nodeMap: Array<[TKey, TNode]>;
  range: Array<NodeKey>;
} {
  const root = $getRoot();
  const nodeMap = new Map<TKey, TNode>();
  const range = [];
  const topLevelChildren = root.getChildren();

  for (let i = 0; i < topLevelChildren.length; i++) {
    const topLevelNode = topLevelChildren[i];
    const childNodeKeys = $appendSelectedNodesToClone(
      editor,
      selection,
      topLevelNode,
      nodeMap,
      range,
      true,
    );

    for (let j = 0; j < childNodeKeys.length; j++) {
      const childNodeKey = childNodeKeys[j];
      range.push(childNodeKey);
    }
  }
  range.forEach((key) => {
    sanitizeClonedNodeLinks(key, nodeMap);
  });
  return {nodeMap: Array.from(nodeMap), range};
}

export function $getLexicalContent(editor: LexicalEditor): string | null {
  const selection = $getSelection();

  if (selection !== null) {
    const namespace = editor._config.namespace;
    const state = $cloneSelectedContent(editor, selection);
    return JSON.stringify({
      namespace,
      state,
    });
  }

  return null;
}

export function $insertDataTransferForPlainText(
  dataTransfer: DataTransfer,
  selection: RangeSelection,
): void {
  const text = dataTransfer.getData('text/plain');

  if (text != null) {
    selection.insertRawText(text);
  }
}
export function $insertDataTransferForRichText(
  dataTransfer: DataTransfer,
  selection: RangeSelection,
  editor: LexicalEditor,
): void {
  const lexicalNodesString = dataTransfer.getData(
    'application/x-lexical-editor',
  );
  const isSelectionInsideOfGrid =
    $isGridSelection(selection) ||
    ($findMatchingParent(selection.anchor.getNode(), (n) =>
      $isGridCellNode(n),
    ) !== null &&
      $findMatchingParent(selection.focus.getNode(), (n) =>
        $isGridCellNode(n),
      ) !== null);

  if (lexicalNodesString) {
    const namespace = editor._config.namespace;

    try {
      const lexicalClipboardData = JSON.parse(lexicalNodesString);

      if (lexicalClipboardData.namespace === namespace) {
        const nodeRange = lexicalClipboardData.state;
        const nodes = $generateNodes(nodeRange);

        if (
          isSelectionInsideOfGrid &&
          nodes.length === 1 &&
          $isGridNode(nodes[0])
        ) {
          $mergeGridNodesStrategy(nodes, selection, false, editor);
          return;
        }

        $basicInsertStrategy(nodes, selection, true);
        return;
      }
    } catch (e) {
      // Malformed, missing nodes..
    }
  }

  const textHtmlMimeType = 'text/html';
  const htmlString = dataTransfer.getData(textHtmlMimeType);

  if (htmlString) {
    const parser = new DOMParser();
    const dom = parser.parseFromString(htmlString, textHtmlMimeType);
    const nodes = $generateNodesFromDOM(editor, dom);

    if (
      isSelectionInsideOfGrid &&
      nodes.length === 1 &&
      $isGridNode(nodes[0])
    ) {
      $mergeGridNodesStrategy(nodes, selection, false, editor);
      return;
    }

    $basicInsertStrategy(nodes, selection, false);
    return;
  }

  $insertDataTransferForPlainText(dataTransfer, selection);
}

function $basicInsertStrategy(
  nodes: LexicalNode[],
  selection: RangeSelection | GridSelection,
  isFromLexical: boolean,
) {
  let nodesToInsert;

  if (!isFromLexical) {
    // Wrap text and inline nodes in paragraph nodes so we have all blocks at the top-level
    const topLevelBlocks = [];
    let currentBlock = null;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (
        ($isDecoratorNode(node) && !node.isTopLevel()) ||
        ($isElementNode(node) && node.isInline()) ||
        $isTextNode(node) ||
        $isLineBreakNode(node)
      ) {
        if (currentBlock === null) {
          currentBlock = $createParagraphNode();
          topLevelBlocks.push(currentBlock);
        }

        if (currentBlock !== null) {
          currentBlock.append(node);
        }
      } else {
        topLevelBlocks.push(node);
        currentBlock = null;
      }
    }

    nodesToInsert = topLevelBlocks;
  } else {
    nodesToInsert = nodes;
  }

  if ($isRangeSelection(selection)) {
    selection.insertNodes(nodesToInsert);
  } else if ($isGridSelection(selection)) {
    // If there's an active grid selection and a non grid is pasted, add to the anchor.
    const anchorCell = selection.anchor.getNode();

    if (!$isGridCellNode(anchorCell)) {
      invariant(false, 'Expected Grid Cell in Grid Selection');
    }

    anchorCell.append(...nodesToInsert);
  }
}

function $mergeGridNodesStrategy(
  nodes: LexicalNode[],
  selection: RangeSelection | GridSelection,
  isFromLexical: boolean,
  editor: LexicalEditor,
) {
  if (nodes.length !== 1 || !$isGridNode(nodes[0])) {
    invariant(false, '$mergeGridNodesStrategy: Expected Grid insertion.');
  }

  const newGrid = nodes[0];
  const newGridRows = newGrid.getChildren();
  const newColumnCount = newGrid
    .getFirstChildOrThrow<GridNode>()
    .getChildrenSize();
  const newRowCount = newGrid.getChildrenSize();
  const gridCellNode = $findMatchingParent(selection.anchor.getNode(), (n) =>
    $isGridCellNode(n),
  );
  const gridRowNode =
    gridCellNode && $findMatchingParent(gridCellNode, (n) => $isGridRowNode(n));
  const gridNode =
    gridRowNode && $findMatchingParent(gridRowNode, (n) => $isGridNode(n));

  if (
    !$isGridCellNode(gridCellNode) ||
    !$isGridRowNode(gridRowNode) ||
    !$isGridNode(gridNode)
  ) {
    invariant(
      false,
      '$mergeGridNodesStrategy: Expected selection to be inside of a Grid.',
    );
  }

  const startY = gridRowNode.getIndexWithinParent();
  const stopY = Math.min(
    gridNode.getChildrenSize() - 1,
    startY + newRowCount - 1,
  );
  const startX = gridCellNode.getIndexWithinParent();
  const stopX = Math.min(
    gridRowNode.getChildrenSize() - 1,
    startX + newColumnCount - 1,
  );
  const fromX = Math.min(startX, stopX);
  const fromY = Math.min(startY, stopY);
  const toX = Math.max(startX, stopX);
  const toY = Math.max(startY, stopY);
  const gridRowNodes = gridNode.getChildren();
  let newRowIdx = 0;
  let newAnchorCellKey;
  let newFocusCellKey;

  for (let r = fromY; r <= toY; r++) {
    const currentGridRowNode = gridRowNodes[r];

    if (!$isGridRowNode(currentGridRowNode)) {
      invariant(false, 'getNodes: expected to find GridRowNode');
    }

    const newGridRowNode = newGridRows[newRowIdx];

    if (!$isGridRowNode(newGridRowNode)) {
      invariant(false, 'getNodes: expected to find GridRowNode');
    }

    const gridCellNodes = currentGridRowNode.getChildren();
    const newGridCellNodes = newGridRowNode.getChildren();
    let newColumnIdx = 0;

    for (let c = fromX; c <= toX; c++) {
      const currentGridCellNode = gridCellNodes[c];

      if (!$isGridCellNode(currentGridCellNode)) {
        invariant(false, 'getNodes: expected to find GridCellNode');
      }

      const newGridCellNode = newGridCellNodes[newColumnIdx];

      if (!$isGridCellNode(newGridCellNode)) {
        invariant(false, 'getNodes: expected to find GridCellNode');
      }

      if (r === fromY && c === fromX) {
        newAnchorCellKey = currentGridCellNode.getKey();
      } else if (r === toY && c === toX) {
        newFocusCellKey = currentGridCellNode.getKey();
      }

      const originalChildren = currentGridCellNode.getChildren();
      newGridCellNode.getChildren().forEach((child) => {
        if ($isTextNode(child)) {
          const paragraphNode = $createParagraphNode();
          paragraphNode.append(child);
          currentGridCellNode.append(child);
        } else {
          currentGridCellNode.append(child);
        }
      });
      originalChildren.forEach((n) => n.remove());
      newColumnIdx++;
    }

    newRowIdx++;
  }

  if (newAnchorCellKey && newFocusCellKey) {
    const newGridSelection = $createGridSelection();
    newGridSelection.set(gridNode.getKey(), newAnchorCellKey, newFocusCellKey);
    $setSelection(newGridSelection);
    editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
  }
}

export function $generateNodes(nodeRange: {
  nodeMap: ParsedNodeMap;
  range: Array<NodeKey>;
}): Array<LexicalNode> {
  const {range, nodeMap} = nodeRange;
  const parsedNodeMap: ParsedNodeMap = new Map(nodeMap);
  const nodes = [];

  for (let i = 0; i < range.length; i++) {
    const key = range[i];
    const parsedNode = parsedNodeMap.get(key);

    if (parsedNode !== undefined) {
      const node = $createNodeFromParse(parsedNode, parsedNodeMap);
      nodes.push(node);
    }
  }

  return nodes;
}
