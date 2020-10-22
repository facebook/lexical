const isBrowserFirefox =
  typeof navigator !== "undefined" &&
  /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);

const isBrowserSafari =
  typeof navigator !== "undefined" &&
  /Version\/[\d.]+.*Safari/.test(navigator.userAgent);

function normalizeCursorSelectionOffsets(selection) {
  const [anchorOffset, focusOffset] = selection.getRangeOffsets();
  const selectionLeftToRight = focusOffset > anchorOffset;
  const startOffset = selectionLeftToRight ? anchorOffset : focusOffset;
  const endOffset = selectionLeftToRight ? focusOffset : anchorOffset;
  const offsetDifference = endOffset - startOffset;
  return [startOffset, offsetDifference];
}

function normalizeRangeSelectionOffsets(selection) {
  const [anchorOffset, focusOffset] = selection.getRangeOffsets();
  const anchorNode = selection.getAnchorNode();
  const focusNode = selection.getFocusNode();
  if (anchorNode.isBefore(focusNode)) {
    return [anchorOffset, focusOffset];
  } else {
    return [focusOffset, anchorOffset];
  }
}

function getParentBeforeBlock(startNode) {
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

function spliceTextAtCusor(
  selectedNode,
  caretOffset,
  delCount,
  text,
  fromComposition,
  editor
) {
  if (selectedNode.isImmutable()) {
    const ancestor = getParentBeforeBlock(selectedNode);

    if (caretOffset === 0) {
      const textNode = editor.createText(text);
      ancestor.insertBefore(textNode);
      textNode.select();
    } else {
      const nextSibling = ancestor.getNextSibling();
      if (nextSibling === null) {
        const textNode = editor.createText(text);
        ancestor.insertAfter(textNode);
        textNode.select();
      } else {
        const textNode = editor.createText(text);
        nextSibling.insertBefore(textNode);
        textNode.select();
      }
    }
  } else {
    selectedNode.spliceText(caretOffset, delCount, text, true, fromComposition);
  }
}

function spliceTextAtRange(
  text,
  selection,
  selectedNodes,
  fromComposition,
  editor
) {
  const [firstNode, ...nodesToRemove] = selectedNodes;
  if (firstNode.isImmutable()) {
    const ancestor = getParentBeforeBlock(firstNode);
    const textNode = editor.createText(text);
    ancestor.insertBefore(textNode);
    textNode.select();
    selectedNodes.forEach((node) => node.remove());
  } else {
    const [startOffset, endOffset] = normalizeRangeSelectionOffsets(selection);
    nodesToRemove.forEach((node) => node.remove());
    const delCount = firstNode.getTextContent().length - startOffset;
    const lastNode = selectedNodes[selectedNodes.length - 1];
    if (lastNode.isText()) {
      text += lastNode.getTextContent().slice(endOffset);
    }
    spliceTextAtCusor(
      firstNode,
      startOffset,
      delCount,
      text,
      fromComposition,
      editor
    );
  }
}

function insertText(text, editor, fromComposition) {
  const selection = editor.getSelection();
  const selectedNodes = selection.getNodes();

  if (selection.isCaret()) {
    const caretOffset = selection.getCaretOffset();
    spliceTextAtCusor(
      selectedNodes[0],
      caretOffset,
      0,
      text,
      fromComposition,
      editor
    );
  } else {
    const [startOffset, offsetDifference] = normalizeCursorSelectionOffsets(
      selection
    );
    // We're selecting a single node treat it like a cursor
    if (selectedNodes.length === 1) {
      const firstNode = selectedNodes[0];
      spliceTextAtCusor(
        firstNode,
        startOffset,
        offsetDifference,
        text,
        fromComposition,
        editor
      );
      if (firstNode.isImmutable()) {
        const ancestor = getParentBeforeBlock(firstNode);
        ancestor.remove();
      }
    } else {
      spliceTextAtRange(
        text,
        selection,
        selectedNodes,
        fromComposition,
        editor
      );
    }
  }
}

function removeText(offsetDiff, editor) {
  const selection = editor.getSelection();
  const selectedNodes = selection.getNodes();

  if (selection.isCaret()) {
    const firstNode = selectedNodes[0];
    const caretOffset = selection.getCaretOffset();

    if (firstNode.isImmutable()) {
      const ancestor = getParentBeforeBlock(firstNode);
      const textNode = editor.createText("");
      ancestor.insertBefore(textNode);
      textNode.select();
      ancestor.remove();
    } else {
      if (caretOffset > 0) {
        spliceTextAtCusor(
          firstNode,
          caretOffset + offsetDiff,
          1,
          "",
          false,
          editor
        );
      } else {
        const prevSibling = firstNode.getPreviousSibling();
        if (prevSibling !== null) {
          const textNode = editor.createText("");
          prevSibling.insertBefore(textNode);
          textNode.select();
          if (prevSibling.isImmutable()) {
            prevSibling.remove();
          }
        }
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
        const textNode = editor.createText("");
        ancestor.insertBefore(textNode);
        textNode.select();
        ancestor.remove();
      } else {
        spliceTextAtCusor(
          firstNode,
          startOffset,
          offsetDifference,
          "",
          false,
          editor
        );
      }
    } else {
      spliceTextAtRange("", selection, selectedNodes, false, editor);
    }
  }
}

function onInsertFromComposition(event, editor, state) {
  const data = event.data;
  if (data) {
    insertText(event.data, editor, true);
  }
}

function onCompositionStart(event, editor, state) {
  state.isComposing = true
}

function onCompositionEnd(event, editor, state) {
  const data = event.data;
  // Only do this for Chrome
  if (data && !isBrowserSafari && !isBrowserFirefox) {
    insertText(data, editor, true);
  }
}

function onInsertText(event, editor, state) {
  insertText(event.data, editor);
}

function onInsertLineBreak(event, editor, state) {
  insertText("\n", editor);
}

function onInsertParagraph(event, editor, state) {
  // const selection = editor.getSelection();
  // const { anchorOffset, focusOffset, type } = selection;
  // if (type === "Caret") {
  //   const anchorNode = selection.getAnchorNode();
  //   const children = anchorNode.getChildren();
  //   let nextParagraphContent = "";
  //   if (anchorNode.getNextSibling() === null) {
  //     const [startOffset] = getNormalizedSelectionOffsets(
  //       focusOffset,
  //       anchorOffset
  //     );
  //     const currentContent = children.slice(0, startOffset);
  //     nextParagraphContent = children.slice(startOffset);
  //     anchorNode.replace(createTextSpanNode(editor, currentContent));
  //   }
  //   const parent = anchorNode.getParent();
  //   const parentSibling = parent.getNextSibling();
  //   const span = createTextSpanNode(editor, nextParagraphContent);
  //   const paragraph = editor.createNode("div", null).append(span);
  //   if (parentSibling === null) {
  //     const body = editor.getBody();
  //     body.append(paragraph);
  //     if (nextParagraphContent === "") {
  //       span.select();
  //     } else {
  //       span.select(0, 0);
  //     }
  //   } else {
  //     parent.insertAfter(paragraph)
  //   }
  // }
}

function onInsertFromPaste(event, editor, state) {
  const items = event.dataTransfer.items;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "string" && item.type === "text/plain") {
      const func = editor.async((text) => insertText(text, editor));
      item.getAsString(func);
      break;
    }
  }
}

function onDeleteContentBackward(event, editor, state) {
  removeText(-1, editor);
}

function onDeleteContentForward(event, editor, state) {
  removeText(0, editor);
}

function onFocusIn(event, editor, state) {
  const body = editor.getBody();

  if (body.getFirstChild() === null) {
    const text = editor.createText();
    body.append(editor.createBlock().append(text));
    text.select();
  }
}

function onSelectionChange(event, editor, state) {
  // TODO
}

function createInitialState() {
  return {
    isComposing: false,
  };
}

const PlainTextPlugin = {
  createInitialState,
  onCompositionEnd,
  onCompositionStart,
  onDeleteContentBackward,
  onDeleteContentForward,
  onFocusIn,
  onInsertFromComposition,
  onInsertFromPaste,
  onInsertLineBreak,
  onInsertParagraph,
  onInsertText,
  onSelectionChange,
};

export default PlainTextPlugin;
