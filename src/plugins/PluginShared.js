import { useEffect } from "react";

const isBrowserFirefox =
  typeof navigator !== "undefined" &&
  /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);

const isBrowserSafari =
  typeof navigator !== "undefined" &&
  /Version\/[\d.]+.*Safari/.test(navigator.userAgent);

export function normalizeCursorSelectionOffsets(selection) {
  const [anchorOffset, focusOffset] = selection.getRangeOffsets();
  const selectionLeftToRight = focusOffset > anchorOffset;
  const startOffset = selectionLeftToRight ? anchorOffset : focusOffset;
  const endOffset = selectionLeftToRight ? focusOffset : anchorOffset;
  const offsetDifference = endOffset - startOffset;
  return [startOffset, offsetDifference];
}

export function normalizeRangeSelectionOffsets(selection) {
  const [anchorOffset, focusOffset] = selection.getRangeOffsets();
  const anchorNode = selection.getAnchorNode();
  const focusNode = selection.getFocusNode();
  if (anchorNode.isBefore(focusNode)) {
    return [anchorOffset, focusOffset];
  } else {
    return [focusOffset, anchorOffset];
  }
}

export function getParentBeforeBlock(startNode) {
  let node = startNode;
  while (node !== null) {
    const parent = node.getParent();
    if (parent.isBlock()) {
      return node;
    }
    node = parent;
  }
  return null;
}

export function getParentBlock(startNode) {
  let node = startNode;
  while (node !== null) {
    if (node.isBlock()) {
      return node;
    }
    node = node.getParent();
  }
  return null;
}

export function getNextSiblings(startNode) {
  const siblings = [];
  let node = startNode.getNextSibling();
  while (node !== null) {
    siblings.push(node);
    node = node.getNextSibling();
  }
  return siblings;
}

export function createTextWithStyling(text, view, state, targetToClone) {
  const textNode =
    targetToClone && !targetToClone.isImmutable()
      ? view.cloneText(targetToClone, text)
      : view.createText(text);
  if (state.isBoldMode) {
    textNode.makeBold();
  } else {
    textNode.makeNormal();
  }
  return textNode;
}

export function spliceTextAtCusor(
  selectedNode,
  caretOffset,
  delCount,
  text,
  view,
  state
) {
  if (selectedNode.isImmutable()) {
    const ancestor = getParentBeforeBlock(selectedNode);
    const currentBlock = ancestor.getParent();

    if (caretOffset === 0) {
      const textNode = createTextWithStyling(text, view, state, selectedNode);
      ancestor.insertBefore(textNode);
      textNode.select();
    } else {
      const nextSibling = ancestor.getNextSibling();
      if (nextSibling === null) {
        const textNode = createTextWithStyling(text, view, state, selectedNode);
        ancestor.insertAfter(textNode);
        textNode.select();
      } else {
        const textNode = createTextWithStyling(text, view, state, selectedNode);
        nextSibling.insertBefore(textNode);
        textNode.select();
      }
    }
    currentBlock.normalizeTextNodes(true);
  } else {
    const isBold = selectedNode.isBold();
    selectedNode.spliceText(caretOffset, delCount, text, true, false);

    if ((!isBold && state.isBoldMode) || (isBold && !state.isBoldMode)) {
      let textContent = selectedNode.getTextContent();
      let targetNode;

      if (caretOffset === 0) {
        targetNode = selectedNode;
      } else {
        [, targetNode] = selectedNode.splitText(
          caretOffset,
          textContent.length - 1
        );
        textContent = targetNode.getTextContent();
      }
      const replacementNode = createTextWithStyling(
        text,
        view,
        state,
        selectedNode
      );
      targetNode.replace(replacementNode);
      replacementNode.select();
    }
  }
}

function spliceTextAtRange(text, selection, selectedNodes, view, state) {
  const [firstNode, ...nodesToRemove] = selectedNodes;
  if (firstNode.isImmutable()) {
    const ancestor = getParentBeforeBlock(firstNode);
    const currentBlock = ancestor.getParent();
    const textNode = view.createText(text);
    ancestor.insertBefore(textNode);
    textNode.select();
    selectedNodes.forEach((node) => {
      if (!node.isParentOf(firstNode)) {
        node.remove();
      }
    });
    if (firstNode.isImmutable()) {
      ancestor.remove();
    }
    currentBlock.normalizeTextNodes(true);
  } else {
    const [startOffset, endOffset] = normalizeRangeSelectionOffsets(selection);
    nodesToRemove.forEach((node) => {
      if (!node.isParentOf(firstNode)) {
        node.remove();
      }
    });
    const delCount = firstNode.getTextContent().length - startOffset;
    const lastNode = selectedNodes[selectedNodes.length - 1];
    if (lastNode.isText()) {
      text += lastNode.getTextContent().slice(endOffset);
    }
    spliceTextAtCusor(firstNode, startOffset, delCount, text, view, state);
  }
}

export function insertText(text, view, state) {
  view.getSelection().insertText(text);
}

function removeBlock(blockToRemove, previousBlock, view) {
  const firstNode = blockToRemove.getFirstChild();
  const siblings = getNextSiblings(firstNode);
  siblings.unshift(firstNode);
  const textNode = view.createText("");
  previousBlock.getLastChild().insertAfter(textNode);
  textNode.select(0, 0);
  let nodeToInsertAfter = textNode;
  siblings.forEach((sibling) => {
    nodeToInsertAfter.insertAfter(sibling);
    nodeToInsertAfter = sibling;
  });
  blockToRemove.remove();
  previousBlock.normalizeTextNodes(true);
}

export function removeText(backward, view, state) {
  const selection = view.getSelection();
  const selectedNodes = selection.getNodes();

  if (selection.isCaret()) {
    const firstNode = selectedNodes[0];
    const caretOffset = selection.anchorOffset;
    const currentBlock = getParentBlock(firstNode);
    const previousBlock = currentBlock.getPreviousSibling();
    const nextBlock = currentBlock.getNextSibling();
    const ancestor = getParentBeforeBlock(firstNode);

    if (firstNode.isImmutable()) {
      if (caretOffset === 0 && previousBlock !== null) {
        removeBlock(currentBlock, previousBlock, view);
      } else {
        const textNode = view.createText("");
        ancestor.insertBefore(textNode);
        textNode.select();
        ancestor.remove();
        currentBlock.normalizeTextNodes(true);
      }
    } else {
      if (caretOffset > 0) {
        const offsetAtEnd =
          firstNode.isText() &&
          caretOffset === firstNode.getTextContent().length;
        if (backward || !offsetAtEnd) {
          const offset = backward ? caretOffset - 1 : caretOffset;
          spliceTextAtCusor(firstNode, offset, 1, "", view, state);
        } else {
          const nextSibling = firstNode.getNextSibling();
          if (nextSibling === null) {
            if (nextBlock !== null) {
              removeBlock(nextBlock, currentBlock, view);
            }
          } else {
            const textNode = view.createText("");
            nextSibling.insertAfter(textNode);
            textNode.select();
            if (nextSibling.isImmutable()) {
              nextSibling.remove();
            }
            currentBlock.normalizeTextNodes(true);
          }
        }
      } else if (backward) {
        const prevSibling = firstNode.getPreviousSibling();
        if (prevSibling === null) {
          if (previousBlock !== null) {
            removeBlock(currentBlock, previousBlock, view);
          }
        } else {
          const textNode = view.createText("");
          prevSibling.insertAfter(textNode);
          textNode.select();
          if (prevSibling.isImmutable()) {
            prevSibling.remove();
          }
          currentBlock.normalizeTextNodes(true);
        }
      } else {
        spliceTextAtCusor(firstNode, caretOffset, 1, "", view, state);
      }
    }
  } else {
    const [startOffset, offsetDifference] = normalizeCursorSelectionOffsets(
      selection
    );
    // We're selecting a single node treat it like a cursor
    if (selectedNodes.length === 1) {
      const firstNode = selectedNodes[0];
      if (firstNode.isImmutable()) {
        const ancestor = getParentBeforeBlock(firstNode);
        const textNode = view.createText("");
        ancestor.insertBefore(textNode);
        textNode.select();
        ancestor.remove();
      } else {
        spliceTextAtCusor(
          firstNode,
          startOffset,
          offsetDifference,
          "",
          view,
          state
        );
      }
    } else {
      spliceTextAtRange("", selection, selectedNodes, view, state);
    }
  }
}

export function onCompositionStart(event, view, state) {
  state.isComposing = true;
}

export function onCompositionEnd(event, view, state) {
  const data = event.data;
  // Only do this for Chrome
  state.isComposing = false;
  if (data && !isBrowserSafari && !isBrowserFirefox) {
    insertText(data, view, state, true);
  }
}

export function insertFromDataTransfer(event, view, state, editor) {
  const items = event.dataTransfer.items;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "string" && item.type === "text/plain") {
      item.getAsString((text) => {
        const viewModel = editor.createViewModel((viewModel) => {
          insertText(text, viewModel, state, false);
        });
        if (!editor.isUpdating()) {
          editor.update(viewModel);
        }
      });
      break;
    }
  }
}

export function onFocusIn(event, viewModel) {
  const body = viewModel.getBody();

  if (body.getFirstChild() === null) {
    const text = viewModel.createText();
    body.append(viewModel.createBlock('p').append(text));
    text.select();
  }
}

export function onKeyDown() {
  // TODO
}

export function onSelectionChange(event, helpers) {
  // TODO
}

export function useEvent(editor, eventName, handler, pluginStateRef) {
  useEffect(() => {
    const state = pluginStateRef?.current;
    if (state !== null && editor !== null) {
      const target =
        eventName === "selectionchange"
          ? document
          : editor.getEditorElement();
      const wrapper = (event) => {
        const viewModel = editor.createViewModel((editor) =>
          handler(event, editor, state, editor)
        );
        // Uncomment to see how diffs might work:
        // if (viewModel !== outlineEditor.getCurrentViewModel()) {
        //   const diff = outlineEditor.getDiffFromViewModel(viewModel);
        //   debugger;
        // }
        if (!editor.isUpdating()) {
          editor.update(viewModel);
        }
      };
      target.addEventListener(eventName, wrapper);
      return () => {
        target.removeEventListener(eventName, wrapper);
      };
    }
  }, [eventName, handler, editor, pluginStateRef]);
}
