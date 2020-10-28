import { getActiveViewModel } from "./OutlineView";
import { getNodeByKey, IS_BOLD, IS_ITALIC, IS_STRIKETHROUGH, IS_TEXT, IS_UNDERLINE } from "./OutlineNode";
import { getNodeKeyFromDOM } from "./OutlineReconciler";

function Selection(
  anchorKey,
  anchorOffset,
  focusKey,
  focusOffset,
  isCollapsed
) {
  this._anchorKey = anchorKey;
  this._anchorOffset = anchorOffset;
  this._focusKey = focusKey;
  this._focusOffset = focusOffset;
  this._isCollapsed = isCollapsed;
}

Object.assign(Selection.prototype, {
  isCaret() {
    return (
      this._anchorKey === this._focusKey &&
      this._anchorOffset === this._focusOffset
    );
  },
  isCollapsed() {
    return this._isCollapsed;
  },
  getNodes() {
    const anchorNode = getNodeByKey(this._anchorKey);
    const focusNode = getNodeByKey(this._focusKey);
    if (anchorNode === focusNode) {
      return [anchorNode];
    }
    return anchorNode.getNodesBetween(focusNode);
  },
  getCaretOffset() {
    return this._anchorOffset;
  },
  getRangeOffsets() {
    return [this._anchorOffset, this._focusOffset];
  },
  getAnchorNode() {
    return getNodeByKey(this._anchorKey);
  },
  getFocusNode() {
    return getNodeByKey(this._focusKey);
  },
  insertText(text, options = {}) {
    const { bold, italic, underline, strikeThrough, fromComposition } = options;
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const anchorOffset = this._anchorOffset;
    const focusOffset = this._focusOffset;
    const nextFlags = calculateFlags(bold, italic, underline, strikeThrough);
    const firstNode = selectedNodes[0];
    const firstNodeText = firstNode.getTextContent();
    const firstNodeTextLength = firstNodeText.length;
    const currentBlock = firstNode.getParentBlock();
    let startOffset;

    if (selectedNodesLength === 1) {
      startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
      firstNode.spliceText(
        startOffset,
        firstNodeTextLength - startOffset,
        text,
        true,
        fromComposition
      );
    } else {
      const lastIndex = selectedNodesLength - 1;
      const lastNode = selectedNodes[lastIndex];
      const isBefore = firstNode.isBefore(lastNode);
      const endOffset = isBefore ? focusOffset : anchorOffset;
      startOffset = isBefore ? anchorOffset : focusOffset;

      firstNode.spliceText(
        startOffset,
        firstNodeTextLength - startOffset,
        text,
        true,
        fromComposition
      );
      lastNode.spliceText(0, endOffset, "", false);
      firstNode.insertAfter(lastNode);

      for (let i = 1; i < lastIndex; i++) {
        const selectedNode = selectedNodes[i];
        if (!selectedNode.isParentOf(firstNode)) {
          selectedNode.remove();
        }
      }
    }

    if (firstNode._flags !== nextFlags) {
      let targetNode = firstNode;

      if (anchorOffset > 0) {
        const textLength = text.length;
        [, targetNode] = firstNode.splitText(startOffset, startOffset + textLength);
      }
      if (bold) {
        targetNode.makeBold();
      } else {
        targetNode.makeNormal();
      }
      targetNode.select();
    }
    currentBlock.normalizeTextNodes();
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
    const {
      anchorNode,
      anchorOffset,
      focusNode,
      focusOffset,
      isCollapsed,
    } = window.getSelection();
    const anchorKey =
      anchorNode !== null ? getNodeKeyFromDOM(anchorNode, nodeMap) : null;
    const focusKey =
      focusNode !== null ? getNodeKeyFromDOM(focusNode, nodeMap) : null;
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
