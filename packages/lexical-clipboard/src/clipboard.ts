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
  NodeSelection,
  RangeSelection,
  SerializedTextNode,
} from 'lexical';

import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {$createListNode, $isListItemNode} from '@lexical/list';
import {
  $addNodeStyle,
  $cloneWithProperties,
  $sliceSelectedTextNodeContent,
} from '@lexical/selection';
import {$findMatchingParent} from '@lexical/utils';
import {
  $createGridSelection,
  $createParagraphNode,
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
  $parseSerializedNode,
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

export function $getLexicalContent(editor: LexicalEditor): string | null {
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

  return JSON.stringify($generateJSONFromSelectedNodes(editor, selection));
}

export function $insertDataTransferForPlainText(
  dataTransfer: DataTransfer,
  selection: RangeSelection | GridSelection,
): void {
  const text = dataTransfer.getData('text/plain');

  if (text != null) {
    selection.insertRawText(text);
  }
}
export function $insertDataTransferForRichText(
  dataTransfer: DataTransfer,
  selection: RangeSelection | GridSelection,
  editor: LexicalEditor,
): void {
  const lexicalString = dataTransfer.getData('application/x-lexical-editor');

  if (lexicalString) {
    try {
      const payload = JSON.parse(lexicalString);
      if (
        payload.namespace === editor._config.namespace &&
        Array.isArray(payload.nodes)
      ) {
        const nodes = $generateNodesFromSerializedNodes(payload.nodes);
        return $insertGeneratedNodes(editor, nodes, selection);
      }
      // eslint-disable-next-line no-empty
    } catch {}
  }

  const htmlString = dataTransfer.getData('text/html');
  if (htmlString) {
    try {
      const parser = new DOMParser();
      const dom = parser.parseFromString(htmlString, 'text/html');
      return $insertGeneratedNodes(
        editor,
        $generateNodesFromDOM(editor, dom),
        selection,
      );
      // eslint-disable-next-line no-empty
    } catch {}
  }

  // Multi-line plain text in rich text mode pasted as separate paragrahs
  // instead of single paragraph with linebreaks.
  const text = dataTransfer.getData('text/plain');
  if (text != null) {
    if ($isRangeSelection(selection)) {
      const lines = text.split(/\r?\n/);
      const linesLength = lines.length;

      for (let i = 0; i < linesLength; i++) {
        selection.insertText(lines[i]);
        if (i < linesLength - 1) {
          selection.insertParagraph();
        }
      }
    } else {
      selection.insertRawText(text);
    }
  }
}

function $insertGeneratedNodes(
  editor: LexicalEditor,
  nodes: Array<LexicalNode>,
  selection: RangeSelection | GridSelection,
) {
  const isSelectionInsideOfGrid =
    $isGridSelection(selection) ||
    ($findMatchingParent(selection.anchor.getNode(), (n) =>
      $isGridCellNode(n),
    ) !== null &&
      $findMatchingParent(selection.focus.getNode(), (n) =>
        $isGridCellNode(n),
      ) !== null);

  if (isSelectionInsideOfGrid && nodes.length === 1 && $isGridNode(nodes[0])) {
    $mergeGridNodesStrategy(nodes, selection, false, editor);
    return;
  }

  $basicInsertStrategy(nodes, selection);
  return;
}

function $basicInsertStrategy(
  nodes: LexicalNode[],
  selection: RangeSelection | GridSelection,
) {
  // Wrap text and inline nodes in paragraph nodes so we have all blocks at the top-level
  const topLevelBlocks = [];
  let currentBlock = null;
  let list = null;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    /**
     * There's no good way to add this to importDOM or importJSON directly,
     * so this is here in order to safely correct faulty clipboard data
     * that we can't control and avoid crashing the app.
     * https://github.com/facebook/lexical/issues/2405
     */
    if ($isListItemNode(node)) {
      if (list == null) {
        list = $createListNode('bullet');
        topLevelBlocks.push(list);
      }
      list.append(node);
      continue;
    } else if (list != null) {
      list = null;
    }

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

  if ($isRangeSelection(selection)) {
    selection.insertNodes(topLevelBlocks);
  } else if ($isGridSelection(selection)) {
    // If there's an active grid selection and a non grid is pasted, add to the anchor.
    const anchorCell = selection.anchor.getNode();

    if (!$isGridCellNode(anchorCell)) {
      invariant(false, 'Expected Grid Cell in Grid Selection');
    }

    anchorCell.append(...topLevelBlocks);
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

interface BaseSerializedNode {
  children?: Array<BaseSerializedNode>;
  type: string;
  version: number;
}

function exportNodeToJSON<T extends LexicalNode>(node: T): BaseSerializedNode {
  const serializedNode = node.exportJSON();
  const nodeClass = node.constructor;

  // @ts-expect-error TODO Replace Class utility type with InstanceType
  if (serializedNode.type !== nodeClass.getType()) {
    invariant(
      false,
      'LexicalNode: Node %s does not implement .exportJSON().',
      nodeClass.name,
    );
  }

  // @ts-expect-error TODO Replace Class utility type with InstanceType
  const serializedChildren = serializedNode.children;

  if ($isElementNode(node)) {
    if (!Array.isArray(serializedChildren)) {
      invariant(
        false,
        'LexicalNode: Node %s is an element but .exportJSON() does not have a children array.',
        nodeClass.name,
      );
    }
  }

  return serializedNode;
}

function $appendNodesToJSON(
  editor: LexicalEditor,
  selection: RangeSelection | NodeSelection | GridSelection | null,
  currentNode: LexicalNode,
  targetArray: Array<BaseSerializedNode> = [],
): boolean {
  let shouldInclude = selection != null ? currentNode.isSelected() : true;
  const shouldExclude =
    $isElementNode(currentNode) && currentNode.excludeFromCopy('html');
  let clone = $cloneWithProperties<LexicalNode>(currentNode);
  clone =
    $isTextNode(clone) && selection != null
      ? $sliceSelectedTextNodeContent(selection, clone)
      : clone;
  const children = $isElementNode(clone) ? clone.getChildren() : [];

  const serializedNode = exportNodeToJSON(clone);

  // TODO: TextNode calls getTextContent() (NOT node.__text) within it's exportJSON method
  // which uses getLatest() to get the text from the original node with the same key.
  // This is a deeper issue with the word "clone" here, it's still a reference to the
  // same node as far as the LexicalEditor is concerned since it shares a key.
  // We need a way to create a clone of a Node in memory with it's own key, but
  // until then this hack will work for the selected text extract use case.
  if ($isTextNode(clone)) {
    (serializedNode as SerializedTextNode).text = clone.__text;
  }

  for (let i = 0; i < children.length; i++) {
    const childNode = children[i];
    const shouldIncludeChild = $appendNodesToJSON(
      editor,
      selection,
      childNode,
      serializedNode.children,
    );

    if (
      !shouldInclude &&
      $isElementNode(currentNode) &&
      shouldIncludeChild &&
      currentNode.extractWithChild(childNode, selection, 'clone')
    ) {
      shouldInclude = true;
    }
  }

  if (shouldInclude && !shouldExclude) {
    targetArray.push(serializedNode);
  } else if (Array.isArray(serializedNode.children)) {
    for (let i = 0; i < serializedNode.children.length; i++) {
      const serializedChildNode = serializedNode.children[i];
      targetArray.push(serializedChildNode);
    }
  }

  return shouldInclude;
}

export function $generateJSONFromSelectedNodes<
  SerializedNode extends BaseSerializedNode,
>(
  editor: LexicalEditor,
  selection: RangeSelection | NodeSelection | GridSelection | null,
): {
  namespace: string;
  nodes: Array<SerializedNode>;
} {
  const nodes: Array<SerializedNode> = [];
  const root = $getRoot();
  const topLevelChildren = root.getChildren();
  for (let i = 0; i < topLevelChildren.length; i++) {
    const topLevelNode = topLevelChildren[i];
    $appendNodesToJSON(editor, selection, topLevelNode, nodes);
  }
  return {
    namespace: editor._config.namespace,
    nodes,
  };
}

export function $generateNodesFromSerializedNodes(
  serializedNodes: Array<BaseSerializedNode>,
): Array<LexicalNode> {
  const nodes = [];
  for (let i = 0; i < serializedNodes.length; i++) {
    const serializedNode = serializedNodes[i];
    const node = $parseSerializedNode(serializedNode);
    if ($isTextNode(node)) {
      $addNodeStyle(node);
    }
    nodes.push(node);
  }
  return nodes;
}
