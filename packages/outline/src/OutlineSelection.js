// @flow strict

import type {OutlineNode, NodeKey} from './OutlineNode';
import type {ViewModel} from './OutlineView';

import {getActiveViewModel} from './OutlineView';
import {getNodeKeyFromDOM} from './OutlineReconciler';
import {getNodeByKey, HAS_DIRECTION} from './OutlineNode';
import {
  createListItem,
  createText,
  createParagraph,
  BlockNode,
  ListItemNode,
  TextNode,
  RootNode,
  ParagraphNode,
} from '.';
import {invariant} from './OutlineUtils';
import {OutlineEditor} from './OutlineEditor';

function removeFirstSegment(node: TextNode): void {
  const currentBlock = node.getParentBlockOrThrow();
  const textContent = node.getTextContent();
  const lastSpaceIndex = textContent.indexOf(' ');
  if (lastSpaceIndex > -1) {
    node.spliceText(0, lastSpaceIndex + 1, '');
  } else {
    const textNode = createText('');
    node.insertAfter(textNode);
    node.remove();
    textNode.select();
    currentBlock.normalizeTextNodes(true);
  }
}

function removeLastSegment(node: TextNode): void {
  const currentBlock = node.getParentBlockOrThrow();
  const textContent = node.getTextContent();
  const lastSpaceIndex = textContent.lastIndexOf(' ');
  if (lastSpaceIndex > -1) {
    node.spliceText(lastSpaceIndex, textContent.length - lastSpaceIndex, '');
  } else {
    const textNode = createText('');
    node.insertAfter(textNode);
    node.remove();
    textNode.select();
    currentBlock.normalizeTextNodes(true);
  }
}

export class Selection {
  anchorKey: string;
  anchorOffset: number;
  focusKey: string;
  focusOffset: number;
  isDirty: boolean;

  constructor(
    anchorKey: string,
    anchorOffset: number,
    focusKey: string,
    focusOffset: number,
  ) {
    this.anchorKey = anchorKey;
    this.anchorOffset = anchorOffset;
    this.focusKey = focusKey;
    this.focusOffset = focusOffset;
    this.isDirty = false;
  }

  isCaret(): boolean {
    return (
      this.anchorKey === this.focusKey && this.anchorOffset === this.focusOffset
    );
  }
  getAnchorNode(): TextNode {
    const anchorKey = this.anchorKey;
    const anchorNode = getNodeByKey(anchorKey);
    invariant(
      anchorNode instanceof TextNode,
      'getAnchorNode: anchorNode not a text node',
    );
    return anchorNode;
  }
  getFocusNode(): TextNode {
    const focusKey = this.focusKey;
    const focusNode = getNodeByKey(focusKey);
    invariant(
      focusNode instanceof TextNode,
      'getFocusNode: focusNode not a text node',
    );
    return focusNode;
  }
  getNodes(): Array<OutlineNode> {
    const anchorNode = this.getAnchorNode();
    const focusNode = this.getFocusNode();
    if (anchorNode === focusNode) {
      return [anchorNode];
    }
    return anchorNode.getNodesBetween(focusNode);
  }
  getNodesInRange(): {range: Array<NodeKey>, nodeMap: {[NodeKey]: Node}} {
    const anchorNode = this.getAnchorNode();
    const focusNode = this.getFocusNode();
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
    let startOffset;
    let endOffset;

    if (anchorNode === focusNode) {
      const firstNode = anchorNode.getLatest().clone();
      invariant(firstNode instanceof TextNode, 'Should never happen');
      const isBefore = focusOffset > anchorOffset;
      startOffset = isBefore ? anchorOffset : focusOffset;
      endOffset = isBefore ? focusOffset : anchorOffset;
      firstNode._text = firstNode._text.slice(startOffset, endOffset);
      const key = firstNode._key;
      return {range: [key], nodeMap: {[key]: firstNode}};
    }
    const nodes = this.getNodes();
    const firstNode = nodes[0];
    const isBefore = firstNode === this.getAnchorNode();
    const nodeKeys = [];
    const nodeMap = {};
    startOffset = isBefore ? anchorOffset : focusOffset;
    endOffset = isBefore ? focusOffset : anchorOffset;

    const nodesLength = nodes.length;
    const sourceParent = firstNode.getParentOrThrow();
    const sourceParentKey = sourceParent._key;
    const topLevelNodeKeys = new Set();

    for (let i = 0; i < nodesLength; i++) {
      let node = nodes[i];
      const parent = node.getParent();
      const nodeKey = node._key;

      if (node instanceof TextNode) {
        const text = node.getTextContent();

        if (i === 0) {
          node = node.getLatest().clone();
          node._text = text.slice(startOffset, text.length);
        } else if (i === nodesLength - 1) {
          node = node.getLatest().clone();
          node._text = text.slice(0, endOffset);
        }
      }

      if (nodeMap[nodeKey] === undefined) {
        nodeMap[nodeKey] = node;
      }

      if (parent === sourceParent && parent !== null) {
        nodeKeys.push(nodeKey);

        const topLevelBlock = node.getTopParentBlock();
        invariant(topLevelBlock !== null, 'Should not happen');
        topLevelNodeKeys.add(topLevelBlock._key);
      } else {
        let includeTopLevelBlock = false;

        if (!(parent instanceof RootNode)) {
          let removeChildren = false;

          while (node !== null) {
            const currKey = node._key;
            if (currKey === sourceParentKey) {
              removeChildren = true;
            } else if (removeChildren) {
              // We need to remove any children before out last source
              // parent key.
              node = node.getLatest().clone();
              invariant(node instanceof BlockNode, 'Should not happen');
              const childrenKeys = node._children;
              const index = childrenKeys.indexOf(sourceParentKey);
              invariant(index !== -1, 'Should not happen');
              childrenKeys.splice(0, index + 1);
              includeTopLevelBlock = true;
            }
            if (nodeMap[currKey] === undefined) {
              nodeMap[currKey] = node;
            }

            const nextParent = node.getParent();
            if (nextParent instanceof RootNode) {
              break;
            }
            node = nextParent;
          }
        }
        if (node !== null) {
          const key = node._key;
          if (!topLevelNodeKeys.has(key) || includeTopLevelBlock) {
            topLevelNodeKeys.add(key);
            nodeKeys.push(key);
          }
        }
      }
    }
    return {range: nodeKeys, nodeMap};
  }
  formatText(formatType: 0 | 1 | 2 | 3 | 4 | 5, forceFormat?: boolean): void {
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
    const currentBlock = firstNode.getParentBlockOrThrow();
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
    const firstNextFlags = firstNode.getTextNodeFormatFlags(
      formatType,
      null,
      forceFormat,
    );
    let startOffset;
    let endOffset;

    if (this.isCaret()) {
      if (firstNodeTextLength === 0) {
        firstNode.setFlags(firstNextFlags);
        this.isDirty = true;
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
        forceFormat,
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
            forceFormat,
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
    const textContent = anchorNode.getTextContent();
    const textContentLength = textContent.length;
    const nodesToMove = anchorNode.getNextSiblings().reverse();
    const currentBlock = anchorNode.getParentBlockOrThrow();
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
    let newBlock;

    if (currentBlock instanceof ListItemNode) {
      const nextSibling = currentBlock.getNextSibling();
      const prevSibling = currentBlock.getPreviousSibling();
      const list = currentBlock.getParent();

      if (
        list instanceof BlockNode &&
        nodesToMove.length === 1 &&
        currentBlock.getTextContent() === '' &&
        (prevSibling === null || nextSibling === null)
      ) {
        if (nextSibling === null) {
          newBlock = createParagraph();
          currentBlock.remove();
          list.insertAfter(newBlock);
        } else {
          newBlock = createParagraph();
          currentBlock.remove();
          list.insertBefore(newBlock);
        }
        if (list.getChildren().length === 0) {
          list.remove();
        }
      } else {
        newBlock = createListItem();
        currentBlock.insertAfter(newBlock);
      }
    } else {
      newBlock = createParagraph();
      currentBlock.insertAfter(newBlock);
    }

    const nodesToMoveLength = nodesToMove.length;
    let firstChild = null;

    for (let i = 0; i < nodesToMoveLength; i++) {
      const nodeToMove = nodesToMove[i];
      if (firstChild === null) {
        newBlock.append(nodeToMove);
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
    const currentBlock = anchorNode.getParentBlockOrThrow();
    const prevSibling = anchorNode.getPreviousSibling();

    if (anchorOffset === 0) {
      if (prevSibling === null) {
        let prevBlock = currentBlock.getPreviousSibling();
        if (prevBlock === null) {
          if (currentBlock instanceof ListItemNode) {
            const listNode = currentBlock.getParentOrThrow();
            const paragraph = createParagraph();
            const children = currentBlock.getChildren();
            children.forEach((child) => paragraph.append(child));

            if (listNode.getChildren().length === 1) {
              listNode.replace(paragraph);
            } else {
              listNode.insertBefore(paragraph);
              currentBlock.remove();
            }
            anchorNode.select(0, 0);
            return;
          } else if (!(currentBlock instanceof ParagraphNode)) {
            const paragraph = createParagraph();
            const children = currentBlock.getChildren();
            children.forEach((child) => paragraph.append(child));
            currentBlock.replace(paragraph);
            return;
          } else if (anchorNode.getFlags() !== HAS_DIRECTION) {
            // Otherwise just reset the text node flags
            anchorNode.setFlags(HAS_DIRECTION);
          }
        } else if (prevBlock instanceof BlockNode) {
          let lastChild = prevBlock.getLastChild();
          if (lastChild instanceof BlockNode) {
            prevBlock = lastChild;
          }
          const nodesToMove = [anchorNode, ...anchorNode.getNextSiblings()];
          lastChild = prevBlock.getLastChild();
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
    const currentBlock = anchorNode.getParentBlockOrThrow();
    const textContent = anchorNode.getTextContent();
    const textContentLength = textContent.length;
    const nextSibling = anchorNode.getNextSibling();

    if (anchorOffset === textContentLength) {
      if (nextSibling === null) {
        const nextBlock = currentBlock.getNextSibling();
        if (nextBlock instanceof BlockNode) {
          let firstChild = nextBlock.getFirstChild();
          if (firstChild instanceof ListItemNode) {
            firstChild = firstChild.getFirstChild();
          }
          invariant(firstChild !== null, 'deleteForward: lastChild not found');
          const nodesToMove = [firstChild, ...firstChild.getNextSiblings()];
          let target = anchorNode;
          for (let i = 0; i < nodesToMove.length; i++) {
            const nodeToMove = nodesToMove[i];
            target.insertAfter(nodeToMove);
            target = nodeToMove;
          }
          if (firstChild instanceof ListItemNode) {
            firstChild.remove();
            if (nextBlock.getChildren().length === 0) {
              nextBlock.remove();
            }
          } else {
            nextBlock.remove();
          }
          currentBlock.normalizeTextNodes(true);
        } else if (anchorNode.getFlags() !== HAS_DIRECTION) {
          // Otherwise just reset the text node flags
          anchorNode.setFlags(HAS_DIRECTION);
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
  insertNodes(nodes: Array<OutlineNode>): void {
    if (!this.isCaret()) {
      this.removeText();
    }
    const anchorOffset = this.anchorOffset;
    const anchorNode = this.getAnchorNode();
    const textContent = anchorNode.getTextContent();
    const textContentLength = textContent.length;
    const siblings = [];
    let target;

    if (anchorOffset === 0) {
      target = createText('');
      anchorNode.insertBefore(target);
      siblings.push(anchorNode);
    } else if (
      anchorOffset === textContentLength ||
      anchorNode.isImmutable() ||
      anchorNode.isSegmented()
    ) {
      target = anchorNode;
    } else {
      let danglingText;
      [target, danglingText] = anchorNode.splitText(anchorOffset);
      siblings.push(danglingText);
    }
    const nextSiblings = anchorNode.getNextSiblings();
    siblings.push(...nextSiblings);
    const topLevelBlock = anchorNode.getTopParentBlock();
    invariant(target !== null && topLevelBlock !== null, 'Should never occur');

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (node instanceof TextNode) {
        target.insertAfter(node);
        target = node;
      } else {
        if (target instanceof TextNode) {
          target = topLevelBlock;
        }
        target.insertAfter(node);
        target = node;
      }
    }
    if (target instanceof BlockNode) {
      const lastChild = target.getLastTextNode();
      invariant(lastChild instanceof TextNode, 'Should never happen');
      lastChild.select();
      if (siblings.length !== 0) {
        let prevSibling = lastChild;
        for (let i = 0; i < siblings.length; i++) {
          const sibling = siblings[i];
          prevSibling.insertAfter(sibling);
          prevSibling = sibling;
        }
      }
    } else if (target instanceof TextNode) {
      target.select();
    }
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
    const currentBlock = firstNode.getParentBlockOrThrow();
    let startOffset;
    let endOffset;

    if (selectedNodesLength === 1) {
      startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
      endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;
      if (
        firstNode.isLink() &&
        this.isCaret() &&
        (startOffset === 0 || endOffset === firstNodeTextLength)
      ) {
        const textNode = createText(text);
        if (startOffset === 0) {
          firstNode.insertBefore(textNode);
        } else {
          firstNode.insertAfter(textNode);
        }
        textNode.select();
        currentBlock.normalizeTextNodes(true);
        return;
      }
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
      const lastNodeTextLength = lastNode.getTextContent().length;
      let lastNodeRemove = false;
      let firstNodeRemove = false;

      if (!lastNode.isParentOf(firstNode)) {
        if (endOffset === lastNodeTextLength) {
          lastNodeRemove = true;
          lastNode.remove();
        } else if (lastNode instanceof TextNode) {
          lastNode.spliceText(0, endOffset, '', false);
          if (firstNode.getTextContent() === '') {
            firstNodeRemove = true;
            firstNode.remove();
            lastNode.select(0, 0);
          } else {
            firstNode.insertAfter(lastNode);
          }
        }
      }
      for (let i = 1; i < lastIndex; i++) {
        const selectedNode = selectedNodes[i];
        if (
          (firstNodeRemove || !selectedNode.isParentOf(firstNode)) &&
          (lastNodeRemove || !selectedNode.isParentOf(lastNode))
        ) {
          selectedNode.remove();
        }
      }
      currentBlock.normalizeTextNodes(true);
    }
  }
  moveWordBackward() {
    const anchorNode = this.getAnchorNode();
    const focusNode = this.getFocusNode();
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
          const currentBlock = node.getParentBlockOrThrow();
          const prevBlock = currentBlock.getPreviousSibling();
          if (prevBlock instanceof BlockNode) {
            let lastChild = prevBlock.getLastChild();
            if (lastChild instanceof ListItemNode) {
              lastChild = lastChild.getFirstChild();
            }
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
        if (
          textContentLength !== 0 &&
          (hasSpace || offset === textContentLength)
        ) {
          lookAhead = true;
        }
        node.select();
      }
      const sibling = node.getNextSibling();
      if (sibling !== null) {
        node = sibling;
      } else {
        if (offset === textContentLength) {
          const currentBlock = node.getParentBlockOrThrow();
          let nextBlock = currentBlock.getNextSibling();
          if (nextBlock === null && currentBlock instanceof ListItemNode) {
            const list = currentBlock.getParentOrThrow();
            nextBlock = list.getNextSibling();
          }
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
        const textContent = node.getTextContent();
        if (node === firstNode) {
          if (offset !== 0) {
            const nextOffset = offset - 1;
            node.select(nextOffset, nextOffset);
            return;
          }
        } else if (
          textContent !== '' ||
          node.getPreviousSibling() === null ||
          notAdjacent
        ) {
          const textContentLength = textContent.length;
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
        const currentBlock = node.getParentBlockOrThrow();
        const prevBlock = currentBlock.getPreviousSibling();
        if (prevBlock instanceof BlockNode) {
          let lastChild = prevBlock.getLastChild();
          if (lastChild instanceof ListItemNode) {
            lastChild = lastChild.getFirstChild();
          }
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
      const textContent = node.getTextContent();
      if (
        !(node instanceof TextNode) ||
        node.isImmutable() ||
        node.isSegmented()
      ) {
        notAdjacent = true;
      } else if (
        textContent !== '' ||
        node.getNextSibling() === null ||
        notAdjacent
      ) {
        if (node === lastNode) {
          if (offset !== textContent.length) {
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
        const currentBlock = node.getParentBlockOrThrow();
        let nextBlock = currentBlock.getNextSibling();
        if (nextBlock === null && currentBlock instanceof ListItemNode) {
          const list = currentBlock.getParentOrThrow();
          nextBlock = list.getNextSibling();
        }
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
  ): void {
    this.anchorOffset = anchorOffset;
    this.focusOffset = focusOffset;
    this.anchorKey = anchorKey;
    this.focusKey = focusKey;
    this.isDirty = true;
  }
  getTextContent(): string {
    const nodes = this.getNodes();
    let textContent = '';
    nodes.forEach((node) => {
      if (node instanceof TextNode) {
        textContent += node.getTextContent();
      }
    });
    return textContent;
  }
  applyDOMRange(domRange: {
    collapsed: boolean,
    startContainer: Node,
    endContainer: Node,
    startOffset: number,
    endOffset: number,
  }): void {
    const anchorKey = getNodeKeyFromDOM(domRange.startContainer);
    const focusKey = getNodeKeyFromDOM(domRange.endContainer);
    if (anchorKey === null || focusKey === null) {
      throw new Error('Should never happen');
    }
    const [anchorNode, focusNode] = resolveSelectionNodes(anchorKey, focusKey);
    invariant(
      anchorNode instanceof TextNode && focusNode instanceof TextNode,
      'Should never happen',
    );
    this.anchorKey = anchorNode._key;
    this.focusKey = focusNode._key;
    this.anchorOffset =
      anchorNode.getTextContent() === '' ? 0 : domRange.startOffset;
    this.focusOffset =
      focusNode.getTextContent() === '' ? 0 : domRange.endOffset;
  }
}

function resolveSelectionNodes(
  anchorKey: NodeKey,
  focusKey: NodeKey,
): [TextNode | null, TextNode | null] {
  const viewModel = getActiveViewModel();
  const nodeMap = viewModel.nodeMap;
  let anchorNode = nodeMap[anchorKey];
  let focusNode = nodeMap[focusKey];
  if (anchorNode === undefined || focusNode === undefined) {
    return [null, null];
  }
  if (anchorNode instanceof BlockNode) {
    anchorNode = anchorNode.getFirstTextNode();
  }
  if (focusNode instanceof BlockNode) {
    focusNode = focusNode.getLastTextNode();
  }
  // $FlowFixMe: not sure why this doesn't work
  return [anchorNode, focusNode];
}

// This is used to make a selection when the existing
// selection is null, i.e. forcing selection on the editor
// when it current exists outside the editor.
export function makeSelection(
  anchorKey: NodeKey,
  anchorOffset: number,
  focusKey: NodeKey,
  focusOffset: number,
): Selection {
  const viewModel = getActiveViewModel();
  const selection = new Selection(
    anchorKey,
    anchorOffset,
    focusKey,
    focusOffset,
  );
  selection.isDirty = true;
  viewModel.selection = selection;
  return selection;
}

export function createSelection(
  viewModel: ViewModel,
  editor: OutlineEditor,
): null | Selection {
  const domSelection: WindowSelection = window.getSelection();
  const anchorDOM = domSelection.anchorNode;
  const focusDOM = domSelection.focusNode;
  let anchorOffset = domSelection.anchorOffset;
  let focusOffset = domSelection.focusOffset;
  let anchorNode: OutlineNode | null = null;
  let focusNode: OutlineNode | null = null;
  let anchorKey: NodeKey | null = null;
  let focusKey: NodeKey | null = null;

  if (editor === null || anchorDOM === null || focusDOM === null) {
    return null;
  }
  const editorElement = editor.getEditorElement();
  if (
    editorElement === null ||
    !editorElement.contains(anchorDOM) ||
    !editorElement.contains(focusDOM)
  ) {
    return null;
  }
  // When selecting all content in FF, it targets the contenteditable.
  // We need to resolve the first and last text DOM nodes
  if (anchorDOM === focusDOM && anchorDOM === editorElement) {
    const root = viewModel.root;
    anchorNode = root.getFirstTextNode();
    focusNode = root.getLastTextNode();
    if (anchorNode === null || focusNode === null) {
      return null;
    }
    anchorKey = anchorNode._key;
    focusKey = focusNode._key;
    anchorOffset = 0;
    focusOffset = focusNode.getTextContent().length;
  } else {
    // We try and find the relevant text nodes from the selection.
    // If we can't do this, we return null.
    anchorKey = getNodeKeyFromDOM(anchorDOM);
    focusKey = getNodeKeyFromDOM(focusDOM);
    if (anchorKey === null || focusKey === null) {
      return null;
    }
    [anchorNode, focusNode] = resolveSelectionNodes(anchorKey, focusKey);
    if (anchorNode === null || focusNode === null) {
      return null;
    }
    anchorKey = anchorNode._key;
    focusKey = focusNode._key;
  }
  // Because we use a special character for whitespace,
  // we need to adjust offsets to 0 when the text is
  // really empty.
  if (anchorNode._text === '') {
    anchorOffset = 0;
  }
  if (focusNode._text === '') {
    focusOffset = 0;
  }

  const selection = new Selection(
    anchorKey,
    anchorOffset,
    focusKey,
    focusOffset,
  );
  const currentViewModel = editor.getViewModel();
  const currentSelection = currentViewModel.selection;
  if (
    currentSelection !== null &&
    !editor.isComposing() &&
    (currentSelection.focusKey !== selection.focusKey ||
      currentSelection.anchorKey !== selection.anchorKey ||
      currentSelection.anchorOffset !== selection.anchorOffset ||
      currentSelection.focusOffset !== selection.focusOffset)
  ) {
    selection.isDirty = true;
  }
  return selection;
}

export function getSelection(): null | Selection {
  const viewModel = getActiveViewModel();
  return viewModel.selection;
}
