// @flow strict-local

import type {Node, NodeKey} from './OutlineNode';

import {getActiveViewModel} from './OutlineView';
import {getNodeKeyFromDOM} from './OutlineReconciler';
import {getNodeByKey} from './OutlineNode';
import {createText, createParagraph, BlockNode, HeaderNode, TextNode} from '.';
import {invariant} from './OutlineUtils';

function removeFirstSegment(node: TextNode): void {
  const currentBlock = node.getParentBlock();
  invariant(
    currentBlock !== null,
    'removeFirstSegment: currentBlock not found',
  );
  const ancestor = node.getParentBefore(currentBlock);
  invariant(ancestor !== null, 'removeFirstSegment: ancestor not found');
  const textContent = node.getTextContent();
  const lastSpaceIndex = textContent.indexOf(' ');
  if (lastSpaceIndex > -1) {
    node.spliceText(0, lastSpaceIndex + 1, '');
  } else {
    const textNode = createText('');
    ancestor.insertAfter(textNode);
    node.remove();
    textNode.select();
    currentBlock.normalizeTextNodes(true);
  }
}

function removeLastSegment(node: TextNode): void {
  const currentBlock = node.getParentBlock();
  invariant(currentBlock !== null, 'removeLastSegment: currentBlock not found');
  const ancestor = node.getParentBefore(currentBlock);
  invariant(ancestor !== null, 'removeLastSegment: ancestor not found');
  const textContent = node.getTextContent();
  const lastSpaceIndex = textContent.lastIndexOf(' ');
  if (lastSpaceIndex > -1) {
    node.spliceText(lastSpaceIndex, textContent.length - lastSpaceIndex, '');
  } else {
    const textNode = createText('');
    ancestor.insertAfter(textNode);
    node.remove();
    textNode.select();
    currentBlock.normalizeTextNodes(true);
  }
}

export class Selection {
  anchorKey: string | null;
  anchorOffset: number;
  focusKey: string | null;
  focusOffset: number;
  isCollapsed: boolean;
  _isDirty: boolean;

  constructor(
    anchorKey: string | null,
    anchorOffset: number,
    focusKey: string | null,
    focusOffset: number,
    isCollapsed: boolean,
  ) {
    this.anchorKey = anchorKey;
    this.anchorOffset = anchorOffset;
    this.focusKey = focusKey;
    this.focusOffset = focusOffset;
    this.isCollapsed = isCollapsed;
    this._isDirty = false;
  }

  isCaret(): boolean {
    return (
      this.anchorKey === this.focusKey && this.anchorOffset === this.focusOffset
    );
  }
  getAnchorNode(): null | TextNode {
    const anchorKey = this.anchorKey;
    if (anchorKey === null) {
      return null;
    }
    const anchorNode = getNodeByKey(anchorKey);
    invariant(
      anchorNode === null || anchorNode instanceof TextNode,
      'getAnchorNode: anchorNode not a text node',
    );
    return anchorNode;
  }
  getFocusNode(): null | TextNode {
    const focusKey = this.focusKey;
    if (focusKey === null) {
      return null;
    }
    const focusNode = getNodeByKey(focusKey);
    invariant(
      focusNode === null || focusNode instanceof TextNode,
      'getFocusNode: focusNode not a text node',
    );
    return focusNode;
  }
  markDirty() {
    this._isDirty = true;
  }
  getNodes(): Array<Node> {
    const anchorNode = this.getAnchorNode();
    const focusNode = this.getFocusNode();
    if (anchorNode === null || focusNode === null) {
      return [];
    }
    if (anchorNode === focusNode) {
      return [anchorNode];
    }
    return anchorNode.getNodesBetween(focusNode);
  }
  formatText(formatType: 0 | 1 | 2 | 3): void {
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const lastIndex = selectedNodesLength - 1;
    let firstNode = selectedNodes[0];
    let lastNode = selectedNodes[lastIndex];

    invariant(
      firstNode instanceof TextNode && lastNode instanceof TextNode,
      'formatText: firstNode/lastNode not a text node',
    );
    const firstNodeText = firstNode.getTextContent();
    const firstNodeTextLength = firstNodeText.length;
    const currentBlock = firstNode.getParentBlock();
    invariant(currentBlock !== null, 'formatText: currentBlock not found');
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
    const firstNextFlags = firstNode.getTextNodeFormatFlags(formatType, null);
    let startOffset;
    let endOffset;

    if (this.isCaret()) {
      if (firstNodeTextLength === 0) {
        firstNode.setFlags(firstNextFlags);
      } else {
        const textNode = createText('');
        textNode.setFlags(firstNextFlags);
        if (anchorOffset === 0) {
          firstNode.insertBefore(textNode);
        } else if (anchorOffset === firstNodeTextLength) {
          firstNode.insertAfter(textNode);
        } else {
          const [, beforeNode] = firstNode.splitText(anchorOffset);
          beforeNode.insertBefore(textNode);
        }
        textNode.select();
        invariant(
          currentBlock !== null,
          'formatText: currentBlock not be found',
        );
        currentBlock.normalizeTextNodes(true);
      }
      return;
    }

    if (selectedNodesLength === 1) {
      if (firstNode instanceof TextNode) {
        startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
        endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;

        if (startOffset === endOffset) {
          return;
        }
        if (startOffset === 0 && endOffset === firstNodeTextLength) {
          firstNode.setFlags(firstNextFlags);
          firstNode.select(startOffset, endOffset);
        } else {
          const splitNodes = firstNode.splitText(startOffset, endOffset);
          const replacement = startOffset === 0 ? splitNodes[0] : splitNodes[1];
          replacement.setFlags(firstNextFlags);
          replacement.select(0, endOffset - startOffset);
        }
        currentBlock.normalizeTextNodes(true);
      }
    } else {
      const isBefore = firstNode === this.getAnchorNode();
      startOffset = isBefore ? anchorOffset : focusOffset;
      endOffset = isBefore ? focusOffset : anchorOffset;

      if (startOffset !== 0) {
        [, firstNode] = firstNode.splitText(startOffset);
        startOffset = 0;
      }
      firstNode.setFlags(firstNextFlags);

      const lastNextFlags = lastNode.getTextNodeFormatFlags(
        formatType,
        firstNextFlags,
      );
      const lastNodeText = lastNode.getTextContent();
      const lastNodeTextLength = lastNodeText.length;
      if (endOffset !== lastNodeTextLength) {
        [lastNode] = lastNode.splitText(endOffset);
      }
      lastNode.setFlags(lastNextFlags);

      for (let i = 1; i < lastIndex; i++) {
        const selectedNode = selectedNodes[i];
        if (selectedNode instanceof TextNode && !selectedNode.isImmutable()) {
          const selectedNextFlags = selectedNode.getTextNodeFormatFlags(
            formatType,
            firstNextFlags,
          );
          selectedNode.setFlags(selectedNextFlags);
        }
      }
      this.setRange(
        firstNode.getKey(),
        startOffset,
        lastNode.getKey(),
        endOffset,
      );
      currentBlock.normalizeTextNodes(true);
    }
  }
  insertParagraph(): void {
    if (!this.isCaret()) {
      this.removeText();
    }
    const anchorNode = this.getAnchorNode();
    if (anchorNode === null) {
      return;
    }
    const currentBlock = anchorNode.getParentBlock();
    const textContent = anchorNode.getTextContent();
    const textContentLength = textContent.length;
    const nodesToMove = anchorNode.getNextSiblings().reverse();
    let anchorOffset = this.anchorOffset;

    if (anchorOffset === 0) {
      nodesToMove.push(anchorNode);
    } else if (anchorOffset === textContentLength) {
      const clonedNode = createText('');
      clonedNode.setFlags(anchorNode.getFlags());
      nodesToMove.push(clonedNode);
      anchorOffset = 0;
    } else {
      const [, splitNode] = anchorNode.splitText(anchorOffset);
      nodesToMove.push(splitNode);
      anchorOffset = 0;
    }
    invariant(currentBlock !== null, 'insertParagraph: currentBlock not found');
    const paragraph = createParagraph();
    currentBlock.insertAfter(paragraph);

    const nodesToMoveLength = nodesToMove.length;
    let firstChild = null;

    for (let i = 0; i < nodesToMoveLength; i++) {
      const nodeToMove = nodesToMove[i];
      if (firstChild === null) {
        paragraph.append(nodeToMove);
      } else {
        firstChild.insertBefore(nodeToMove);
      }
      firstChild = nodeToMove;
    }
    const nodeToSelect = nodesToMove[nodesToMoveLength - 1];
    if (nodeToSelect instanceof TextNode) {
      nodeToSelect.select(anchorOffset, anchorOffset);
    }
    const blockFirstChild = currentBlock.getFirstChild();
    const blockLastChild = currentBlock.getLastChild();
    if (
      blockFirstChild === null ||
      blockLastChild === null ||
      blockLastChild.isImmutable() ||
      blockLastChild.isSegmented() ||
      !(blockLastChild instanceof TextNode)
    ) {
      const textNode = createText('');
      currentBlock.append(textNode);
    }
    currentBlock.normalizeTextNodes();
  }
  deleteLineBackward(): void {
    const anchorNode = this.getAnchorNode();
    if (anchorNode === null) {
      return;
    }
    const anchorOffset = this.anchorOffset;
    const nodesToSearch = anchorNode.getPreviousSiblings();
    nodesToSearch.push(anchorNode);

    for (let i = nodesToSearch.length - 1; i >= 0; i--) {
      const node = nodesToSearch[i];
      if (node instanceof TextNode) {
        const isAnchor = node === anchorNode;
        const textContent = node.getTextContent();
        const indexOfNewLine = textContent.lastIndexOf('\n');

        if (indexOfNewLine > -1) {
          let delCount;

          if (isAnchor && indexOfNewLine < anchorOffset) {
            delCount = anchorOffset - indexOfNewLine;
          } else {
            delCount = textContent.length - indexOfNewLine;
          }
          node.spliceText(indexOfNewLine, delCount, '', true);
          break;
        } else if (isAnchor) {
          node.spliceText(0, anchorOffset, '', true);
        } else {
          node.remove();
        }
      } else {
        node.remove();
      }
    }
  }
  deleteBackward(): void {
    if (!this.isCaret()) {
      this.removeText();
      return;
    }
    const anchorOffset = this.anchorOffset;
    const anchorNode = this.getAnchorNode();
    if (anchorNode === null) {
      return;
    }
    const currentBlock = anchorNode.getParentBlock();
    invariant(currentBlock !== null, 'deleteBackward: currentBlock not found');
    const ancestor = anchorNode.getParentBefore(currentBlock);
    invariant(ancestor !== null, 'deleteBackward: ancestor not found');
    const prevSibling = ancestor.getPreviousSibling();

    if (anchorOffset === 0) {
      if (prevSibling === null) {
        const prevBlock = currentBlock.getPreviousSibling();
        if (prevBlock === null) {
          if (currentBlock instanceof HeaderNode) {
            const paragraph = createParagraph();
            const children = currentBlock.getChildren();
            children.forEach((child) => paragraph.append(child));
            currentBlock.replace(paragraph);
            return;
          }
        } else if (prevBlock instanceof BlockNode) {
          const nodesToMove = [anchorNode, ...anchorNode.getNextSiblings()];
          let lastChild = prevBlock.getLastChild();
          invariant(lastChild !== null, 'deleteBackward: lastChild not found');
          for (let i = 0; i < nodesToMove.length; i++) {
            const nodeToMove = nodesToMove[i];
            lastChild.insertAfter(nodeToMove);
            lastChild = nodeToMove;
          }
          const nodeToSelect = nodesToMove[0];
          if (nodeToSelect instanceof TextNode) {
            nodeToSelect.select(0, 0);
          }
          currentBlock.remove();
          prevBlock.normalizeTextNodes(true);
        }
      } else if (prevSibling instanceof TextNode) {
        if (prevSibling.isImmutable()) {
          prevSibling.remove();
          currentBlock.normalizeTextNodes(true);
        } else if (prevSibling.isSegmented()) {
          removeLastSegment(prevSibling);
          currentBlock.normalizeTextNodes(true);
        } else {
          const textContent = prevSibling.getTextContent();
          const textContentLength = textContent.length;
          if (textContentLength !== 0) {
            prevSibling.spliceText(textContentLength - 1, 1, '', true);
          }
        }
      } else {
        throw new Error('TODO');
      }
    } else {
      anchorNode.spliceText(anchorOffset - 1, 1, '', true);
    }
  }
  deleteForward(): void {
    if (!this.isCaret()) {
      this.removeText();
      return;
    }
    const anchorOffset = this.anchorOffset;
    const anchorNode = this.getAnchorNode();
    if (anchorNode === null) {
      return;
    }
    const currentBlock = anchorNode.getParentBlock();
    invariant(currentBlock !== null, 'deleteForward: currentBlock not found');
    const textContent = anchorNode.getTextContent();
    const textContentLength = textContent.length;
    const ancestor = anchorNode.getParentBefore(currentBlock);
    invariant(ancestor !== null, 'deleteForward: ancestor not found');
    const nextSibling = ancestor.getNextSibling();

    if (anchorOffset === textContentLength) {
      if (nextSibling === null) {
        const nextBlock = currentBlock.getNextSibling();
        if (nextBlock instanceof BlockNode) {
          const firstChild = nextBlock.getFirstChild();
          invariant(firstChild !== null, 'deleteForward: lastChild not found');
          const nodesToMove = [firstChild, ...firstChild.getNextSiblings()];
          let target = ancestor;
          for (let i = 0; i < nodesToMove.length; i++) {
            const nodeToMove = nodesToMove[i];
            target.insertAfter(nodeToMove);
            target = nodeToMove;
          }
          nextBlock.remove();
          currentBlock.normalizeTextNodes(true);
        }
      } else if (nextSibling instanceof TextNode) {
        if (nextSibling.isImmutable()) {
          nextSibling.remove();
        } else if (nextSibling.isSegmented()) {
          removeFirstSegment(nextSibling);
        } else {
          nextSibling.spliceText(0, 1, '', true);
        }
      } else {
        throw new Error('TODO');
      }
    } else {
      anchorNode.spliceText(anchorOffset, 1, '', true);
    }
  }
  removeText(): void {
    this.insertText('');
  }
  insertText(text: string): void {
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
    const firstNode = selectedNodes[0];
    invariant(
      firstNode instanceof TextNode,
      'insertText: firstNode not a a text node',
    );
    const firstNodeText = firstNode.getTextContent();
    const firstNodeTextLength = firstNodeText.length;
    const currentBlock = firstNode.getParentBlock();
    invariant(currentBlock !== null, 'insertText: currentBlock not found');
    let startOffset;
    let endOffset;

    if (selectedNodesLength === 1) {
      startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
      endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;
      const delCount = endOffset - startOffset;

      firstNode.spliceText(startOffset, delCount, text, true);
    } else {
      const lastIndex = selectedNodesLength - 1;
      const lastNode = selectedNodes[lastIndex];
      const isBefore = firstNode === this.getAnchorNode();
      startOffset = isBefore ? anchorOffset : focusOffset;
      endOffset = isBefore ? focusOffset : anchorOffset;

      firstNode.spliceText(
        startOffset,
        firstNodeTextLength - startOffset,
        text,
        true,
      );

      if (!lastNode.isParentOf(firstNode)) {
        lastNode.remove();
      }
      for (let i = 1; i < lastIndex; i++) {
        const selectedNode = selectedNodes[i];
        if (!selectedNode.isParentOf(firstNode)) {
          selectedNode.remove();
        }
      }
      currentBlock.normalizeTextNodes(true);
    }
  }
  moveWordBackward() {
    const anchorNode = this.getAnchorNode();
    const focusNode = this.getFocusNode();
    if (anchorNode === null || focusNode === null) {
      return;
    }
    const isAnchorBefore = anchorNode.isBefore(focusNode);
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
    const firstNode = isAnchorBefore ? anchorNode : focusNode;
    const offset = isAnchorBefore ? anchorOffset : focusOffset;
    let lookAhead = false;
    let hasChars = false;
    let hasSpace = false;
    let hasNewLine = false;

    let node = firstNode;
    while (true) {
      if (
        !(node instanceof TextNode) ||
        node.isImmutable() ||
        node.isSegmented()
      ) {
        if (!lookAhead) {
          break;
        }
      } else {
        const textContent = node.getTextContent();
        const endIndex = node === firstNode ? offset : textContent.length;

        for (let s = endIndex - 1; s >= 0; s--) {
          const char = textContent[s];
          const nextOffset = s + 1;
          const isSpace = char === ' ';

          if (isSpace) {
            if (hasChars || lookAhead) {
              node.select(nextOffset, nextOffset);
              return;
            }
            hasSpace = true;
          } else if (char === '\n') {
            if (hasChars) {
              node.select(nextOffset, nextOffset);
              return;
            }
            hasNewLine = true;
          } else {
            if (hasNewLine || lookAhead) {
              node.select(nextOffset, nextOffset);
              return;
            }
            hasChars = true;
          }
        }
        if (hasSpace || offset === 0) {
          lookAhead = true;
        }
        node.select(0, 0);
      }
      const sibling = node.getPreviousSibling();
      if (sibling !== null) {
        node = sibling;
      } else {
        if (offset === 0) {
          const currentBlock = node.getParentBlock();
          invariant(currentBlock !== null, 'currentBlock not found');
          const prevBlock = currentBlock.getPreviousSibling();
          if (prevBlock instanceof BlockNode) {
            const lastChild = prevBlock.getLastChild();
            if (lastChild !== null) {
              node = lastChild;
              continue;
            }
          }
        }
        return;
      }
    }
  }
  moveWordForward() {
    const anchorNode = this.getAnchorNode();
    const focusNode = this.getFocusNode();
    if (anchorNode === null || focusNode === null) {
      return;
    }
    const isAnchorBefore = anchorNode.isBefore(focusNode);
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
    const lastNode = isAnchorBefore ? focusNode : anchorNode;
    const offset = isAnchorBefore ? focusOffset : anchorOffset;
    let lookAhead = false;
    let hasChars = false;
    let hasSpace = false;
    let hasNewLine = false;

    let node = lastNode;
    while (true) {
      const textContent = node.getTextContent();
      const textContentLength = textContent.length;
      if (
        !(node instanceof TextNode) ||
        node.isImmutable() ||
        node.isSegmented()
      ) {
        if (!lookAhead) {
          break;
        }
      } else {
        const startIndex = node === lastNode ? offset + 1 : 0;

        for (let s = startIndex; s < textContentLength; s++) {
          const char = textContent[s];
          const isSpace = char === ' ';

          if (isSpace) {
            if (hasChars || lookAhead) {
              node.select(s, s);
              return;
            }
            hasSpace = true;
          } else if (char === '\n') {
            if (hasChars) {
              node.select(s, s);
              return;
            }
            hasNewLine = true;
          } else {
            if (hasNewLine || lookAhead) {
              node.select(s, s);
              return;
            }
            hasChars = true;
          }
        }
        if (hasSpace || offset === textContentLength) {
          lookAhead = true;
        }
        node.select();
      }
      const sibling = node.getNextSibling();
      if (sibling !== null) {
        node = sibling;
      } else {
        if (offset === textContentLength) {
          const currentBlock = node.getParentBlock();
          invariant(currentBlock !== null, 'currentBlock not found');
          const nextBlock = currentBlock.getNextSibling();
          if (nextBlock instanceof BlockNode) {
            const firstChild = nextBlock.getFirstChild();
            if (firstChild !== null) {
              node = firstChild;
              continue;
            }
          }
        }
        return;
      }
    }
  }
  moveBackward() {
    const anchorNode = this.getAnchorNode();
    const focusNode = this.getFocusNode();
    if (anchorNode === null || focusNode === null) {
      return;
    }
    const isAnchorBefore = anchorNode.isBefore(focusNode);
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
    const firstNode = isAnchorBefore ? anchorNode : focusNode;

    if (!this.isCaret()) {
      const offset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
      firstNode.select(offset, offset);
      return;
    }
    const offset = isAnchorBefore ? anchorOffset : focusOffset;

    let node = firstNode;
    let notAdjacent = false;
    while (true) {
      if (
        !(node instanceof TextNode) ||
        node.isImmutable() ||
        node.isSegmented()
      ) {
        notAdjacent = true;
      } else {
        if (node === firstNode) {
          if (offset !== 0) {
            const nextOffset = offset - 1;
            node.select(nextOffset, nextOffset);
            return;
          }
        } else {
          const textContentLength = node.getTextContent().length;
          const nextOffset = notAdjacent
            ? textContentLength
            : textContentLength - 1;
          node.select(nextOffset, nextOffset);
          return;
        }
      }
      const sibling = node.getPreviousSibling();
      if (sibling !== null) {
        node = sibling;
      } else {
        const currentBlock = node.getParentBlock();
        invariant(currentBlock !== null, 'currentBlock not found');
        const prevBlock = currentBlock.getPreviousSibling();
        if (prevBlock instanceof BlockNode) {
          const lastChild = prevBlock.getLastChild();
          if (lastChild !== null) {
            node = lastChild;
            notAdjacent = true;
            continue;
          }
        }
        return;
      }
    }
  }
  moveForward() {
    const anchorNode = this.getAnchorNode();
    const focusNode = this.getFocusNode();
    if (anchorNode === null || focusNode === null) {
      return;
    }
    const isAnchorBefore = anchorNode.isBefore(focusNode);
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
    const lastNode = isAnchorBefore ? focusNode : anchorNode;

    if (!this.isCaret()) {
      const offset = anchorOffset > focusOffset ? anchorOffset : focusOffset;
      lastNode.select(offset, offset);
      return;
    }
    const offset = isAnchorBefore ? focusOffset : anchorOffset;

    let node = lastNode;
    let notAdjacent = false;
    while (true) {
      if (
        !(node instanceof TextNode) ||
        node.isImmutable() ||
        node.isSegmented()
      ) {
        notAdjacent = true;
      } else {
        if (node === lastNode) {
          if (offset !== node.getTextContent().length) {
            const nextOffset = offset + 1;
            node.select(nextOffset, nextOffset);
            return;
          }
        } else {
          const nextOffset = notAdjacent ? 0 : 1;
          node.select(nextOffset, nextOffset);
          return;
        }
      }
      const sibling = node.getNextSibling();
      if (sibling !== null) {
        node = sibling;
      } else {
        const currentBlock = node.getParentBlock();
        invariant(currentBlock !== null, 'currentBlock not found');
        const nextBlock = currentBlock.getNextSibling();
        if (nextBlock instanceof BlockNode) {
          const firstChild = nextBlock.getFirstChild();
          if (firstChild !== null) {
            node = firstChild;
            notAdjacent = true;
            continue;
          }
        }
        return;
      }
    }
  }
  setRange(
    anchorKey: NodeKey,
    anchorOffset: number,
    focusKey: NodeKey,
    focusOffset: number,
  ) {
    this.anchorOffset = anchorOffset;
    this.focusOffset = focusOffset;
    this.anchorKey = anchorKey;
    this.focusKey = focusKey;
    this.markDirty();
  }
  getTextContent(): string {
    const viewModel = getActiveViewModel();
    return viewModel.body.getTextContent();
  }
}

function getFirstChildNode(body) {
  let node = body;
  while (node !== null) {
    if (node instanceof TextNode) {
      return node;
    } else if (node instanceof BlockNode) {
      node = node.getFirstChild();
    } else {
      break;
    }
  }
  return null;
}

function getLastChildNode(body) {
  let node = body;
  while (node !== null) {
    if (node instanceof TextNode) {
      return node;
    } else if (node instanceof BlockNode) {
      node = node.getLastChild();
    } else {
      break;
    }
  }
  return null;
}

export function getSelection(): Selection {
  const viewModel = getActiveViewModel();
  const editor = viewModel._editor;
  let selection = viewModel.selection;
  if (selection === null) {
    const nodeMap = viewModel.nodeMap;
    const windowSelection: WindowSelection = window.getSelection();
    const isCollapsed = windowSelection.isCollapsed;
    const anchorDOM = windowSelection.anchorNode;
    const focusDOM = windowSelection.focusNode;
    let anchorOffset = windowSelection.anchorOffset;
    let focusOffset = windowSelection.focusOffset;
    let anchorNode: Node | null = null;
    let focusNode: Node | null = null;
    let anchorKey: NodeKey | null = null;
    let focusKey: NodeKey | null = null;
    let isDirty = false;

    invariant(editor !== null, 'getSelection: editor not found');
    // When selecting all content in FF, it targets the contenteditable.
    // We need to resolve the first and last text DOM nodes
    if (anchorDOM === focusDOM && anchorDOM === editor.getEditorElement()) {
      const body = viewModel.body;
      anchorNode = getFirstChildNode(body);
      focusNode = getLastChildNode(body);
      invariant(
        anchorNode !== null && focusNode !== null,
        'getSelection: anchorNode/focusNode not found',
      );
      isDirty = true;
      anchorKey = anchorNode._key;
      focusKey = focusNode._key;
      anchorOffset = 0;
      focusOffset = focusNode.getTextContent().length;
    } else {
      anchorKey =
        anchorDOM !== null ? getNodeKeyFromDOM(anchorDOM, nodeMap) : null;
      focusKey =
        focusDOM !== null ? getNodeKeyFromDOM(focusDOM, nodeMap) : null;
      anchorNode = anchorKey !== null ? getNodeByKey(anchorKey) : null;
      focusNode = focusKey !== null ? getNodeByKey(focusKey) : null;
    }

    if (anchorNode !== null && anchorNode._text === '') {
      isDirty = true;
      anchorOffset = 0;
    }
    if (focusNode !== null && focusNode._text === '') {
      isDirty = true;
      focusOffset = 0;
    }

    selection = viewModel.selection = new Selection(
      anchorKey,
      anchorOffset,
      focusKey,
      focusOffset,
      isCollapsed,
    );
    if (isDirty) {
      selection.markDirty();
    }
  }
  return selection;
}
