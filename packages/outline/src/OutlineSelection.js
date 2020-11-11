// @flow

import type {Node, NodeKey} from './OutlineNode';
import type {TextNode} from './nodes/OutlineTextNode';
import type {BlockNode} from './nodes/OutlineBlockNode';

import {getActiveViewModel} from './OutlineView';
import {getNodeKeyFromDOM} from './OutlineReconciler';
import {getNodeByKey} from './OutlineNode';
import {createText, createParagraph} from '.';

function removeFirstSegment(node: TextNode): void {
  const currentBlock = ((node.getParentBlock(): any): BlockNode);
  const ancestor = ((node.getParentBefore(currentBlock): any): BlockNode);
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
  const currentBlock = ((node.getParentBlock(): any): BlockNode);
  const ancestor = ((node.getParentBefore(currentBlock): any): BlockNode);
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
    return ((getNodeByKey(anchorKey): any): TextNode | null);
  }
  getFocusNode(): null | TextNode {
    const focusKey = this.focusKey;
    if (focusKey === null) {
      return null;
    }
    return ((getNodeByKey(focusKey): any): TextNode | null);
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
    let firstNode = ((selectedNodes[0]: any): TextNode);
    let lastNode = ((selectedNodes[lastIndex]: any): TextNode);
    const firstNodeText = firstNode.getTextContent();
    const firstNodeTextLength = firstNodeText.length;
    const currentBlock = ((firstNode.getParentBlock(): any): BlockNode);
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
        currentBlock.normalizeTextNodes(true);
      }
      return;
    }

    if (selectedNodesLength === 1) {
      if (firstNode.isText()) {
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

      if (firstNode.isText()) {
        if (startOffset !== 0) {
          [, firstNode] = firstNode.splitText(startOffset);
          startOffset = 0;
        }
        firstNode.setFlags(firstNextFlags);
      }
      if (lastNode.isText()) {
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
      }

      for (let i = 1; i < lastIndex; i++) {
        const selectedNode = selectedNodes[i];
        if (selectedNode.isText() && !selectedNode.isImmutable()) {
          const selectedNextFlags = lastNode.getTextNodeFormatFlags(
            formatType,
            firstNextFlags,
          );
          selectedNode.setFlags(selectedNextFlags);
        }
      }
      this.setRange(
        ((firstNode.getKey(): any): NodeKey),
        startOffset,
        ((lastNode.getKey(): any): NodeKey),
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
    if (!anchorNode.isText()) {
      throw new Error('Should not be possible');
    }
    const currentBlock = ((anchorNode.getParentBlock(): any): BlockNode);
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
    let nextBlock = ((currentBlock.getNextSibling(): any): BlockNode | null);

    if (nextBlock === null) {
      nextBlock = createParagraph();
      currentBlock.insertAfter(nextBlock);
    }
    const nodesToMoveLength = nodesToMove.length;
    let firstChild = nextBlock.getFirstChild();

    for (let i = 0; i < nodesToMoveLength; i++) {
      const nodeToMove = nodesToMove[i];
      if (firstChild === null) {
        nextBlock.append(nodeToMove);
      } else {
        firstChild.insertBefore(nodeToMove);
      }
      firstChild = nodeToMove;
    }
    const nodeToSelect = nodesToMove[nodesToMoveLength - 1];
    if (nodeToSelect.isText()) {
      ((nodeToSelect: any): TextNode).select(anchorOffset, anchorOffset);
    }
    const blockFirstChild = currentBlock.getFirstChild();
    const blockLastChild = currentBlock.getLastChild();
    if (
      blockFirstChild === null ||
      blockLastChild === null ||
      blockLastChild.isImmutable() ||
      blockLastChild.isSegmented() ||
      !blockLastChild.isText()
    ) {
      const textNode = createText('');
      currentBlock.append(textNode);
    }
    currentBlock.normalizeTextNodes();
    nextBlock.normalizeTextNodes(true);
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
      if (node.isText()) {
        const textNode = ((node: any): TextNode);
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
          textNode.spliceText(indexOfNewLine, delCount, '', true);
          break;
        } else if (isAnchor) {
          textNode.spliceText(0, anchorOffset, '', true);
        } else {
          textNode.remove();
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
    const currentBlock = ((anchorNode.getParentBlock(): any): BlockNode);
    const ancestor = ((anchorNode.getParentBefore(
      currentBlock,
    ): any): BlockNode);
    const prevSibling = ancestor.getPreviousSibling();

    if (anchorOffset === 0) {
      if (prevSibling === null) {
        const prevBlock = ((currentBlock.getPreviousSibling(): any): BlockNode | null);
        if (prevBlock === null) {
          if (currentBlock.isHeader()) {
            const paragraph = createParagraph();
            const children = currentBlock.getChildren();
            children.forEach((child) => paragraph.append(child));
            currentBlock.replace(paragraph);
            return;
          }
        } else {
          const nodesToMove = [anchorNode, ...anchorNode.getNextSiblings()];
          let lastChild = prevBlock.getLastChild();
          if (lastChild === null) {
            throw new Error('This should not happen');
          }
          for (let i = 0; i < nodesToMove.length; i++) {
            const nodeToMove = nodesToMove[i];
            lastChild.insertAfter(nodeToMove);
            lastChild = nodeToMove;
          }
          const nodeToSelect = nodesToMove[0];
          if (nodeToSelect.isText()) {
            ((nodeToSelect: any): TextNode).select(0, 0);
          }
          currentBlock.remove();
          prevBlock.normalizeTextNodes(true);
        }
      } else if (prevSibling.isText()) {
        const textNode = ((prevSibling: any): TextNode);
        if (textNode.isImmutable()) {
          textNode.remove();
          currentBlock.normalizeTextNodes(true);
        } else if (textNode.isSegmented()) {
          removeLastSegment(textNode);
          currentBlock.normalizeTextNodes(true);
        } else {
          const textContent = textNode.getTextContent();
          const textContentLength = textContent.length;
          if (textContentLength !== 0) {
            textNode.spliceText(textContentLength - 1, 1, '', true);
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
    const currentBlock = ((anchorNode.getParentBlock(): any): BlockNode);
    const textContent = anchorNode.getTextContent();
    const textContentLength = textContent.length;
    const ancestor = ((anchorNode.getParentBefore(
      currentBlock,
    ): any): BlockNode);
    const nextSibling = ancestor.getNextSibling();

    if (anchorOffset === textContentLength) {
      if (nextSibling === null) {
        const nextBlock = ((currentBlock.getNextSibling(): any): BlockNode | null);
        if (nextBlock !== null) {
          const firstChild = nextBlock.getFirstChild();
          if (firstChild === null) {
            throw new Error('Should never happen');
          }
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
      } else if (nextSibling.isText()) {
        const textNode = ((nextSibling: any): TextNode);
        if (textNode.isImmutable()) {
          textNode.remove();
        } else if (textNode.isSegmented()) {
          removeFirstSegment(textNode);
        } else {
          textNode.spliceText(0, 1, '', true);
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
    const firstNode = ((selectedNodes[0]: any): TextNode);
    const firstNodeText = firstNode.getTextContent();
    const firstNodeTextLength = firstNodeText.length;
    const currentBlock = ((firstNode.getParentBlock(): any): BlockNode);
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
    const textContent = firstNode.getTextContent();
    const textContentLength = textContent.length;
    let prevSibling = firstNode.getPreviousSibling();
    let offset = isAnchorBefore ? anchorOffset : focusOffset;

    if (anchorNode === focusNode) {
      offset = focusOffset > anchorOffset ? anchorOffset : focusOffset;
    }
    const trimmedTextContentLength = textContent.trimStart().length;

    if (
      prevSibling !== null &&
      (offset === 0 || textContentLength - trimmedTextContentLength > offset)
    ) {
      while (prevSibling !== null) {
        if (
          prevSibling.isText() &&
          !prevSibling.isImmutable() &&
          !prevSibling.isSegmented()
        ) {
          break;
        }
        prevSibling = prevSibling.getPreviousSibling();
      }
      if (prevSibling !== null) {
        ((prevSibling: any): TextNode).select();
      }
    } else {
      const trimmedContent = textContent.slice(0, offset).trimEnd();
      let index = trimmedContent.lastIndexOf(' ');
      if (index === -1) {
        index = 0;
      } else {
        index++;
      }
      this.anchorOffset = index;
      this.focusOffset = index;
      this.markDirty();
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
    const textContent = lastNode.getTextContent();
    const textContentLength = textContent.length;
    let nextSibling = lastNode.getNextSibling();
    let offset = isAnchorBefore ? focusOffset : anchorOffset;

    if (anchorNode === focusNode) {
      offset = focusOffset > anchorOffset ? focusOffset : anchorOffset;
    }
    let trimmedTextContentLength = textContent.trimEnd().length;

    if (
      nextSibling !== null &&
      (offset === textContentLength || offset >= trimmedTextContentLength)
    ) {
      while (nextSibling !== null) {
        if (
          nextSibling.isText() &&
          !nextSibling.isImmutable() &&
          !nextSibling.isSegmented()
        ) {
          break;
        }
        nextSibling = nextSibling.getNextSibling();
      }
      if (nextSibling !== null) {
        ((nextSibling: any): TextNode).select(0, 0);
      }
    } else {
      const trimmedContent = textContent.slice(offset).trimStart();
      trimmedTextContentLength = trimmedContent.length;
      let index = trimmedContent.indexOf(' ');
      if (index === -1) {
        index = textContentLength;
      } else {
        index = textContentLength - trimmedTextContentLength + index;
      }
      this.anchorOffset = index;
      this.focusOffset = index;
      this.markDirty();
    }
  }
  moveBackward() {
    const anchorNode = this.getAnchorNode();
    const focusNode = this.getFocusNode();
    if (anchorNode === null || focusNode === null) {
      return;
    }
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
    if (!this.isCaret()) {
      if (anchorNode === focusNode) {
        const offset = focusOffset > anchorOffset ? anchorOffset : focusOffset;
        this.anchorOffset = offset;
        this.focusOffset = offset;
      } else {
        const isAnchorBefore = anchorNode.isBefore(focusNode);
        if (isAnchorBefore) {
          this.focusOffset = anchorOffset;
          this.focusKey = this.anchorKey;
        } else {
          this.anchorOffset = focusOffset;
          this.anchorKey = this.focusKey;
        }
      }
      this.markDirty();
      return;
    }
    if (anchorOffset === 0) {
      let prevSibling = anchorNode.getPreviousSibling();
      while (prevSibling !== null) {
        if (
          prevSibling.isText() &&
          !prevSibling.isImmutable() &&
          !prevSibling.isSegmented()
        ) {
          break;
        }
        prevSibling = prevSibling.getPreviousSibling();
      }
      if (prevSibling === null) {
        const currentBlock = ((anchorNode.getParentBlock(): any): BlockNode);
        const previousBlock = ((currentBlock.getPreviousSibling(): any): BlockNode | null);
        if (previousBlock !== null) {
          let lastChild = previousBlock.getLastChild();
          while (lastChild !== null) {
            if (
              lastChild.isText() &&
              !lastChild.isImmutable() &&
              !lastChild.isSegmented()
            ) {
              break;
            }
            lastChild = lastChild.getPreviousSibling();
          }
          if (lastChild !== null) {
            lastChild.select();
          }
        }
      } else {
        const textContentLength = prevSibling.getTextContent().length;
        ((prevSibling: any): TextNode).select(
          textContentLength,
          textContentLength,
        );
      }
    } else {
      const offset = anchorOffset - 1;
      this.anchorOffset = offset;
      this.focusOffset = offset;
      this.markDirty();
    }
  }
  moveForward() {
    const anchorNode = this.getAnchorNode();
    const focusNode = this.getFocusNode();
    if (anchorNode === null || focusNode === null) {
      return;
    }
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
    if (!this.isCaret()) {
      if (anchorNode === focusNode) {
        const offset = focusOffset > anchorOffset ? focusOffset : anchorOffset;
        this.anchorOffset = offset;
        this.focusOffset = offset;
      } else {
        const isAnchorBefore = anchorNode.isBefore(focusNode);
        if (isAnchorBefore) {
          this.anchorOffset = focusOffset;
          this.anchorKey = this.focusKey;
        } else {
          this.focusOffset = anchorOffset;
          this.focusKey = this.anchorKey;
        }
      }
      this.markDirty();
      return;
    }
    const textContentLength = anchorNode.getTextContent().length;
    if (anchorOffset === textContentLength) {
      let nextSibling = anchorNode.getNextSibling();
      while (nextSibling !== null) {
        if (
          nextSibling.isText() &&
          !nextSibling.isImmutable() &&
          !nextSibling.isSegmented()
        ) {
          break;
        }
        nextSibling = nextSibling.getNextSibling();
      }
      if (nextSibling === null) {
        const currentBlock = ((anchorNode.getParentBlock(): any): BlockNode);
        const nextBlock = ((currentBlock.getNextSibling(): any): BlockNode | null);
        if (nextBlock !== null) {
          let firstChild = nextBlock.getFirstChild();
          while (firstChild !== null) {
            if (
              firstChild.isText() &&
              !firstChild.isImmutable() &&
              !firstChild.isSegmented()
            ) {
              break;
            }
            firstChild = firstChild.getNextSibling();
          }
          if (firstChild !== null) {
            firstChild.select(0, 0);
          }
        }
      } else {
        ((nextSibling: any): TextNode).select(0, 0);
      }
    } else {
      const offset = anchorOffset + 1;
      this.anchorOffset = offset;
      this.focusOffset = offset;
      this.markDirty();
    }
  }
  setRange(
    anchorKey: string,
    anchorOffset: number,
    focusKey: string,
    focusOffset: number,
  ) {
    this.anchorOffset = anchorOffset;
    this.focusOffset = focusOffset;
    this.anchorKey = anchorKey;
    this.focusKey = focusKey;
  }
  getTextContent(): string {
    const viewModel = getActiveViewModel();
    return viewModel.body.getTextContent();
  }
}

function getFirstChildNode(body) {
  let node = body;
  while (node !== null) {
    if (node.isText()) {
      return node;
    }
    node = node.getFirstChild();
  }
  return null;
}

function getLastChildNode(body) {
  let node = body;
  while (node !== null) {
    if (node.isText()) {
      return node;
    }
    node = node.getLastChild();
  }
  return null;
}

export function getSelection(): Selection {
  const viewModel = getActiveViewModel();
  const editor = viewModel._editor;
  let selection = viewModel.selection;
  if (selection === null) {
    const nodeMap = viewModel.nodeMap;
    const windowSelection = window.getSelection();
    const isCollapsed = windowSelection.isCollapsed;
    const anchorDOM = windowSelection.anchorNode;
    const focusDOM = windowSelection.focusNode;
    let anchorOffset = windowSelection.anchorOffset;
    let focusOffset = windowSelection.focusOffset;
    let anchorNode;
    let focusNode;
    let anchorKey;
    let focusKey;
    let isDirty = false;

    if (editor === null) {
      throw new Error('Should never happen');
    }
    // When selecting all content in FF, it targets the contenteditable.
    // We need to resolve the first and last text DOM nodes
    if (anchorDOM === focusDOM && anchorDOM === editor.getEditorElement()) {
      const body = viewModel.body;
      anchorNode = getFirstChildNode(body);
      focusNode = getLastChildNode(body);
      if (anchorNode === null || focusNode === null) {
        throw new Error('Should never happen');
      }
      isDirty = true;
      anchorKey = ((anchorNode._key: any): string);
      focusKey = ((focusNode._key: any): string);
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
