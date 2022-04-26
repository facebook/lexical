/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */
import type {
  DOMChildConversion,
  DOMConversion,
  DOMConversionFn,
  GridSelection,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  NodeSelection,
  ParsedNodeMap,
  RangeSelection,
} from 'lexical';

import {$cloneContents} from '@lexical/selection';
import {$findMatchingParent} from '@lexical/utils';
import {
  $createGridSelection,
  $createNodeFromParse,
  $createParagraphNode,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isGridCellNode,
  $isGridNode,
  $isGridRowNode,
  $isGridSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import invariant from 'shared/invariant';

const IGNORE_TAGS = new Set(['STYLE']);

export function getHtmlContent(editor: LexicalEditor): string | null {
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

  const state = $cloneContents(selection);
  return $convertSelectedLexicalContentToHtml(editor, selection, state);
}

export function $convertSelectedLexicalNodeToHTMLElement(
  editor: LexicalEditor,
  selection: RangeSelection | NodeSelection | GridSelection,
  node: LexicalNode,
): ?HTMLElement {
  let nodeToConvert = node;

  if ($isRangeSelection(selection) || $isGridSelection(selection)) {
    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();
    const isAnchor = node.is(anchorNode);
    const isFocus = node.is(focusNode);

    if ($isTextNode(node) && (isAnchor || isFocus)) {
      const [anchorOffset, focusOffset] = selection.getCharacterOffsets();
      const isBackward = selection.isBackward();

      const isSame = anchorNode.is(focusNode);
      const isFirst = node.is(isBackward ? focusNode : anchorNode);
      const isLast = node.is(isBackward ? anchorNode : focusNode);

      if (isSame) {
        const startOffset =
          anchorOffset > focusOffset ? focusOffset : anchorOffset;
        const endOffset =
          anchorOffset > focusOffset ? anchorOffset : focusOffset;
        const splitNodes = node.splitText(startOffset, endOffset);
        nodeToConvert = startOffset === 0 ? splitNodes[0] : splitNodes[1];
      } else if (isFirst) {
        const offset = isBackward ? focusOffset : anchorOffset;
        const splitNodes = node.splitText(offset);
        nodeToConvert = offset === 0 ? splitNodes[0] : splitNodes[1];
      } else if (isLast) {
        const offset = isBackward ? anchorOffset : focusOffset;
        const splitNodes = node.splitText(offset);
        nodeToConvert = splitNodes[0];
      }
    }
  }

  const {element, after} = nodeToConvert.exportDOM(editor);
  if (!element) return null;
  const children = $isElementNode(nodeToConvert)
    ? nodeToConvert.getChildren()
    : [];
  for (let i = 0; i < children.length; i++) {
    const childNode = children[i];

    if (childNode.isSelected()) {
      const newElement = $convertSelectedLexicalNodeToHTMLElement(
        editor,
        selection,
        childNode,
      );
      if (newElement) element.append(newElement);
    }
  }

  return after ? after.call(nodeToConvert, element) : element;
}

export function $convertSelectedLexicalContentToHtml(
  editor: LexicalEditor,
  selection: RangeSelection | NodeSelection | GridSelection,
  state: {
    nodeMap: Array<[NodeKey, LexicalNode]>,
    range: Array<NodeKey>,
  },
): string {
  const container = document.createElement('div');
  for (let i = 0; i < state.range.length; i++) {
    const nodeKey = state.range[i];
    const node = $getNodeByKey(nodeKey);
    if (node) {
      const element = $convertSelectedLexicalNodeToHTMLElement(
        editor,
        selection,
        node,
      );
      if (element) {
        // It might be the case that the node is an element node
        // and we're not directly selecting it, but we are selecting
        // some of its children. So we'll need to extract that out
        // separately.
        if (node.isSelected()) {
          container.append(element);
        } else {
          let childNode = element.firstChild;
          while (childNode != null) {
            const nextSibling = childNode.nextSibling;
            container.append(childNode);
            childNode = nextSibling;
          }
        }
      }
    }
  }
  return container.innerHTML;
}

export function $getLexicalContent(editor: LexicalEditor): string | null {
  const selection = $getSelection();
  if (selection !== null) {
    const namespace = editor._config.namespace;
    const state = $cloneContents(selection);
    return JSON.stringify({namespace, state});
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
    const nodes = $generateNodesFromDOM(dom, editor);

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
      if (!$isElementNode(node) || node.isInline()) {
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
  const newColumnCount = newGrid.getFirstChildOrThrow().getChildrenSize();
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
      originalChildren.forEachChild((n) => n.remove());
      newColumnIdx++;
    }
    newRowIdx++;
  }
  if (newAnchorCellKey && newFocusCellKey) {
    const newGridSelection = $createGridSelection();
    newGridSelection.set(gridNode.getKey(), newAnchorCellKey, newFocusCellKey);
    $setSelection(newGridSelection);
    editor.dispatchCommand(SELECTION_CHANGE_COMMAND);
  }
}

function $generateNodes(nodeRange: {
  nodeMap: ParsedNodeMap,
  range: Array<NodeKey>,
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

function getConversionFunction(
  domNode: Node,
  editor: LexicalEditor,
): DOMConversionFn | null {
  const {nodeName} = domNode;
  const cachedConversions = editor._htmlConversions.get(nodeName.toLowerCase());
  let currentConversion: DOMConversion | null = null;
  if (cachedConversions !== undefined) {
    cachedConversions.forEach((cachedConversion) => {
      const domConversion = cachedConversion(domNode);
      if (domConversion !== null) {
        if (
          currentConversion === null ||
          currentConversion.priority < domConversion.priority
        ) {
          currentConversion = domConversion;
        }
      }
    });
  }
  return currentConversion !== null ? currentConversion.conversion : null;
}

function $createNodesFromDOM(
  node: Node,
  editor: LexicalEditor,
  forChildMap: Map<string, DOMChildConversion> = new Map(),
  parentLexicalNode: ?LexicalNode | null,
): Array<LexicalNode> {
  let lexicalNodes: Array<LexicalNode> = [];

  if (IGNORE_TAGS.has(node.nodeName)) {
    return lexicalNodes;
  }

  let currentLexicalNode = null;
  const transformFunction = getConversionFunction(node, editor);
  const transformOutput = transformFunction ? transformFunction(node) : null;
  let postTransform = null;

  if (transformOutput !== null) {
    postTransform = transformOutput.after;
    currentLexicalNode = transformOutput.node;
    if (currentLexicalNode !== null) {
      for (const [, forChildFunction] of forChildMap) {
        currentLexicalNode = forChildFunction(
          currentLexicalNode,
          parentLexicalNode,
        );

        if (!currentLexicalNode) {
          break;
        }
      }

      if (currentLexicalNode) {
        lexicalNodes.push(currentLexicalNode);
      }
    }

    if (transformOutput.forChild != null) {
      forChildMap.set(node.nodeName, transformOutput.forChild);
    }
  }

  // If the DOM node doesn't have a transformer, we don't know what
  // to do with it but we still need to process any childNodes.
  const children = node.childNodes;
  let childLexicalNodes = [];
  for (let i = 0; i < children.length; i++) {
    childLexicalNodes.push(
      ...$createNodesFromDOM(
        children[i],
        editor,
        forChildMap,
        currentLexicalNode,
      ),
    );
  }
  if (postTransform != null) {
    childLexicalNodes = postTransform(childLexicalNodes);
  }
  if (currentLexicalNode == null) {
    // If it hasn't been converted to a LexicalNode, we hoist its children
    // up to the same level as it.
    lexicalNodes = lexicalNodes.concat(childLexicalNodes);
  } else {
    if ($isElementNode(currentLexicalNode)) {
      // If the current node is a ElementNode after conversion,
      // we can append all the children to it.
      currentLexicalNode.append(...childLexicalNodes);
    }
  }
  return lexicalNodes;
}

function $generateNodesFromDOM(
  dom: Document,
  editor: LexicalEditor,
): Array<LexicalNode> {
  let lexicalNodes = [];
  const elements: Array<Node> = dom.body ? Array.from(dom.body.childNodes) : [];
  const elementsLength = elements.length;
  for (let i = 0; i < elementsLength; i++) {
    const element = elements[i];
    if (!IGNORE_TAGS.has(element.nodeName)) {
      const lexicalNode = $createNodesFromDOM(element, editor);
      if (lexicalNode !== null) {
        lexicalNodes = lexicalNodes.concat(lexicalNode);
      }
    }
  }
  return lexicalNodes;
}
