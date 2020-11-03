import { getActiveViewModel } from "./OutlineView";
import {
  createTextNode,
  FORMAT_BOLD,
  FORMAT_ITALIC,
  FORMAT_STRIKETHROUGH,
  FORMAT_UNDERLINE,
  getNodeByKey,
  IS_BOLD,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
} from "./OutlineNode";
import { getNodeKeyFromDOM } from "./OutlineReconciler";

function Selection(
  anchorKey,
  anchorOffset,
  focusKey,
  focusOffset,
  isCollapsed
) {
  this.anchorKey = anchorKey;
  this.anchorOffset = anchorOffset;
  this.focusKey = focusKey;
  this.focusOffset = focusOffset;
  this.isCollapsed = isCollapsed;
}

Object.assign(Selection.prototype, {
  isCaret() {
    return (
      this.anchorKey === this.focusKey && this.anchorOffset === this.focusOffset
    );
  },
  getAnchorNode() {
    return getNodeByKey(this.anchorKey);
  },
  getFocusNode() {
    return getNodeByKey(this.focusKey);
  },
  getNodes() {
    const anchorNode = this.getAnchorNode();
    const focusNode = this.getFocusNode();
    if (anchorNode === focusNode) {
      return [anchorNode];
    }
    return anchorNode.getNodesBetween(focusNode);
  },
  getRangeOffsets() {
    return [this.anchorOffset, this.focusOffset];
  },
  formatText(formatType) {
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const lastIndex = selectedNodesLength - 1;
    let firstNode = selectedNodes[0];
    let lastNode = selectedNodes[lastIndex];
    const firstNodeText = firstNode.getTextContent();
    const firstNodeTextLength = firstNodeText.length;
    const currentBlock = firstNode.getParentBlock();
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
    const firstNextFlags = getTextNodeFormatFlags(firstNode, formatType, null);
    let startOffset;
    let endOffset;

    if (this.isCaret()) {
      if (firstNodeTextLength === 0) {
        firstNode.setFlags(firstNextFlags);
      } else {
        const textNode = createTextNode("");
        textNode.setFlags(firstNextFlags);
        firstNode.insertAfter(textNode);
        textNode.select();
      }
      return;
    }

    if (selectedNodesLength === 1) {
      if (firstNode.isText() && !firstNode.isImmutable()) {
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

      if (firstNode.isText() && !firstNode.isImmutable()) {
        if (startOffset !== 0) {
          [, firstNode] = firstNode.splitText(startOffset);
          startOffset = 0;
        }
        firstNode.setFlags(firstNextFlags);
      }
      if (lastNode.isText() && !lastNode.isImmutable()) {
        const lastNextFlags = getTextNodeFormatFlags(
          lastNode,
          formatType,
          firstNextFlags
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
          const selectedNextFlags = getTextNodeFormatFlags(
            lastNode,
            formatType,
            firstNextFlags
          );
          selectedNode.setFlags(selectedNextFlags);
        }
      }
      this.setRange(
        firstNode.getKey(),
        startOffset,
        lastNode.getKey(),
        endOffset
      );
      currentBlock.normalizeTextNodes(true);
    }
  },
  insertText(text) {
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
    const firstNode = selectedNodes[0];
    const firstNodeText = firstNode.getTextContent();
    const firstNodeTextLength = firstNodeText.length;
    const currentBlock = firstNode.getParentBlock();
    const ancestor = firstNode.getParentBefore(currentBlock);
    let startOffset;
    let endOffset;

    if (selectedNodesLength === 1) {
      if (firstNode.isImmutable() || firstNode.isSegmented() || !firstNode.isText()) {
        const textNode = createTextNode(text);

        if (focusOffset === 0) {
          ancestor.insertBefore(textNode);
        } else {
          ancestor.insertAfter(textNode);
        }
        if (!this.isCaret()) {
          firstNode.remove();
        }

        textNode.select();
      } else {
        startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
        endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;
        const delCount = endOffset - startOffset;

        firstNode.spliceText(startOffset, delCount, text, true);
      }
    } else {
      const lastIndex = selectedNodesLength - 1;
      const lastNode = selectedNodes[lastIndex];
      const isBefore = firstNode === this.getAnchorNode();
      const endOffset = isBefore ? focusOffset : anchorOffset;
      startOffset = isBefore ? anchorOffset : focusOffset;
      let removeFirstNode = false;

      if (firstNode.isImmutable()) {
        removeFirstNode = true;
      } else {
        firstNode.spliceText(
          startOffset,
          firstNodeTextLength - startOffset,
          text,
          true
        );
      }
      if (!firstNode.isImmutable() && lastNode.isText()) {
        lastNode.spliceText(0, endOffset, "", false);
        firstNode.insertAfter(lastNode);
      } else if (!lastNode.isParentOf(firstNode)) {
        lastNode.remove();
      }

      for (let i = 1; i < lastIndex; i++) {
        const selectedNode = selectedNodes[i];
        if (!selectedNode.isParentOf(firstNode)) {
          selectedNode.remove();
        }
      }
      if (removeFirstNode) {
        const textNode = createTextNode(text);
        ancestor.insertBefore(textNode);
        firstNode.remove();
        textNode.select();
      }
    }
    currentBlock.normalizeTextNodes(true);
  },
  setRange(anchorKey, anchorOffset, focusKey, focusOffset) {
    this.anchorOffset = anchorOffset;
    this.focusOffset = focusOffset;
    this.anchorKey = anchorKey;
    this.focusKey = focusKey;
  },
});

function getTextNodeFormatFlags(node, type, alignWithFlags) {
  const nodeFlags = node._flags;
  let newFlags = nodeFlags;

  switch (type) {
    case FORMAT_BOLD:
      if (nodeFlags & IS_BOLD) {
        if (alignWithFlags === null || (alignWithFlags & IS_BOLD) === 0) {
          newFlags ^= IS_BOLD;
        }
      } else {
        if (alignWithFlags === null || alignWithFlags & IS_BOLD) {
          newFlags |= IS_BOLD;
        }
      }
      break;
    case FORMAT_ITALIC:
      if (nodeFlags & IS_ITALIC) {
        if (alignWithFlags === null || (alignWithFlags & IS_ITALIC) === 0) {
          newFlags ^= IS_ITALIC;
        }
      } else {
        if (alignWithFlags === null || alignWithFlags & IS_ITALIC) {
          newFlags |= IS_ITALIC;
        }
      }
      break;
    case FORMAT_STRIKETHROUGH:
      if (nodeFlags & IS_STRIKETHROUGH) {
        if (alignWithFlags === null || (alignWithFlags & IS_STRIKETHROUGH) === 0) {
          newFlags ^= IS_STRIKETHROUGH;
        }
      } else {
        if (alignWithFlags === null || alignWithFlags & IS_STRIKETHROUGH) {
          newFlags |= IS_STRIKETHROUGH;
        }
      }
      break;
    case FORMAT_UNDERLINE:
      if (nodeFlags & IS_UNDERLINE) {
        if (alignWithFlags === null || (alignWithFlags & IS_UNDERLINE) === 0) {
          newFlags ^= IS_UNDERLINE;
        }
      } else {
        if (alignWithFlags === null || alignWithFlags & IS_UNDERLINE) {
          newFlags |= IS_UNDERLINE;
        }
      }
      break;
    default:
  }

  return newFlags;
}

export function getSelection() {
  const viewModel = getActiveViewModel();
  let selection = viewModel.selection;
  if (selection === null) {
    let nodeMap = viewModel.nodeMap;
    let {
      anchorNode: anchorDOM,
      anchorOffset,
      focusNode: focusDOM,
      focusOffset,
      isCollapsed,
    } = window.getSelection();
    const anchorKey =
      anchorDOM !== null ? getNodeKeyFromDOM(anchorDOM, nodeMap) : null;
    const focusKey =
      focusDOM !== null ? getNodeKeyFromDOM(focusDOM, nodeMap) : null;
    const anchorNode = getNodeByKey(anchorKey);
    const focusNode = getNodeByKey(focusKey);

    if (anchorNode !== null && anchorNode._children === "") {
      anchorOffset = 0;
    }
    if (focusNode !== null && focusNode._children === "") {
      focusOffset = 0;
    }

    selection = viewModel.selection = new Selection(
      anchorKey,
      anchorOffset,
      focusKey,
      focusOffset,
      isCollapsed
    );
  }
  return selection;
}
