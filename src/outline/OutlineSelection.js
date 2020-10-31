import { getActiveViewModel } from "./OutlineView";
import {
  createTextNode,
  getNodeByKey,
  IS_BOLD,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_TEXT,
  IS_UNDERLINE,
} from "./OutlineNode";
import { getNodeKeyFromDOM } from "./OutlineReconciler";

function Selection(
  anchorKey,
  anchorOffset,
  anchorNode,
  focusKey,
  focusOffset,
  focusNode,
  isCollapsed
) {
  this.anchorKey = anchorKey;
  this.anchorNode = anchorNode;
  this.anchorOffset = anchorOffset;
  this.focusKey = focusKey;
  this.focusNode = focusNode;
  this.focusOffset = focusOffset;
  this.isCollapsed = isCollapsed;
}

Object.assign(Selection.prototype, {
  isCaret() {
    return (
      this.anchorKey === this.focusKey && this.anchorOffset === this.focusOffset
    );
  },
  getNodes() {
    const anchorNode = this.anchorNode;
    const focusNode = this.focusNode;
    if (anchorNode === focusNode) {
      return [anchorNode];
    }
    return anchorNode.getNodesBetween(focusNode);
  },
  getRangeOffsets() {
    return [this.anchorOffset, this.focusOffset];
  },
  formatText(options = {}) {
    const { bold, italic, underline, strikeThrough } = options;
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const lastIndex = selectedNodesLength - 1;
    const firstNode = selectedNodes[0];
    const lastNode = selectedNodes[lastIndex];

    if (selectedNodesLength === 1) {
    } else {
      const isBefore = firstNode.isBefore(lastNode);

      for (let i = 1; i < lastIndex; i++) {
        const selectedNode = selectedNodes[i];

        debugger;
      }
    }
  },
  insertText(text, options = {}) {
    const { bold, italic, underline, strikeThrough } = options;
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
    const nextFlags = calculateFlags(bold, italic, underline, strikeThrough);
    const firstNode = selectedNodes[0];
    const firstNodeText = firstNode.getTextContent();
    const firstNodeTextLength = firstNodeText.length;
    const currentBlock = firstNode.getParentBlock();
    const ancestor = firstNode.getParentBefore(currentBlock);
    let startOffset;
    let endOffset;
    let skipFormatting = false;

    if (selectedNodesLength === 1) {
      if (firstNode.isImmutable() || !firstNode.isText()) {
        const textNode = createTextNode(text);
        textNode._flags = nextFlags;

        if (focusOffset === 0) {
          ancestor.insertBefore(textNode);
        } else {
          ancestor.insertAfter(textNode);
        }
        if (!this.isCaret()) {
          firstNode.remove();
        }

        textNode.select();
        skipFormatting = true;
      } else {
        startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
        endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;
        const delCount = endOffset - startOffset;

        firstNode.spliceText(startOffset, delCount, text, true);
      }
    } else {
      const lastIndex = selectedNodesLength - 1;
      const lastNode = selectedNodes[lastIndex];
      const isBefore = firstNode === this.anchorNode;
      const endOffset = isBefore ? focusOffset : anchorOffset;
      let removeFirstNode = false;
      startOffset = isBefore ? anchorOffset : focusOffset;

      if (firstNode.isImmutable()) {
        removeFirstNode = true;
        skipFormatting = true;
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

    if (!skipFormatting && firstNode._flags !== nextFlags) {
      let targetNode = firstNode;

      if (anchorOffset > 0) {
        const textLength = text.length;
        [, targetNode] = firstNode.splitText(
          startOffset,
          startOffset + textLength
        );
      }
      if (bold) {
        targetNode.makeBold();
      } else {
        targetNode.makeNormal();
      }
      targetNode.select();
    }
    currentBlock.normalizeTextNodes(true);
  },
});

function calculateFlags(bold, italic, underline, strikeThrough) {
  let flags = IS_TEXT;
  if (bold) {
    flags |= IS_BOLD;
  }
  if (italic) {
    flags |= IS_ITALIC;
  }
  if (underline) {
    flags |= IS_UNDERLINE;
  }
  if (strikeThrough) {
    flags |= IS_STRIKETHROUGH;
  }
  return flags;
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
      anchorNode,
      focusKey,
      focusOffset,
      focusNode,
      isCollapsed
    );
  }
  return selection;
}
