import { useEffect, useRef } from "react";
import {
  insertText,
  onCompositionEnd,
  onCompositionStart,
  onFocusIn,
  insertFromDataTransfer,
  onKeyDown,
  onSelectionChange,
  useEvent,
} from "./PluginShared";

const FORMAT_BOLD = 0;
const FORMAT_ITALIC = 1;
const FORMAT_STRIKETHROUGH = 2;
const FORMAT_UNDERLINE = 3;

// function onInsertParagraph(event, view, state) {
//   const selection = view.getSelection();

//   if (selection.isCaret()) {
//     const [startOffset] = normalizeCursorSelectionOffsets(selection);
//     const anchorNode = selection.getAnchorNode();
//     let text = "";

//     if (anchorNode.isText()) {
//       const currentText = anchorNode.getTextContent();
//       text = currentText.slice(startOffset);
//       spliceTextAtCusor(
//         anchorNode,
//         startOffset,
//         currentText.length - startOffset,
//         "",
//         view,
//         state
//       );
//     }
//     const currentBlock = getParentBlock(anchorNode);
//     const ancestor = getParentBeforeBlock(anchorNode);
//     const siblings = getNextSiblings(ancestor);
//     const textNode = anchorNode.isImmutable()
//       ? view.createText(text)
//       : view.cloneText(anchorNode, text);
//     const paragraph = view.createBlock('p').append(textNode);
//     currentBlock.insertAfter(paragraph);
//     let nodeToInsertAfter = textNode;
//     siblings.forEach((sibling) => {
//       nodeToInsertAfter.insertAfter(sibling);
//       nodeToInsertAfter = sibling;
//     });
//     textNode.select(0, 0);
//   } else {
//     console.log("TODO");
//   }
// }

function onBeforeInput(event, view, state, editor) {
  const inputType = event.inputType;

  if (
    inputType !== "insertCompositionText" &&
    inputType !== "deleteCompositionText"
  ) {
    event.preventDefault();
  }
  const selection = view.getSelection();

  switch (inputType) {
    case "formatBold": {
      selection.formatText(FORMAT_BOLD);
      break;
    }
    case "formatItalic": {
      selection.formatText(FORMAT_ITALIC);
      break;
    }
    case "formatStrikeThrough": {
      selection.formatText(FORMAT_STRIKETHROUGH);
      break;
    }
    case "formatUnderline": {
      selection.formatText(FORMAT_UNDERLINE);
      break;
    }
    case "insertFromComposition": {
      const data = event.data;
      if (data) {
        selection.insertText(data);
      }
      break;
    }
    case "insertFromPaste": {
      insertFromDataTransfer(event, editor);
      break;
    }
    case "insertLineBreak": {
      selection.insertText('\n');
      break;
    }
    case "insertParagraph": {
      selection.insertParagraph();
      break;
    }
    case "insertText": {
      selection.insertText(event.data);
      break;
    }
    case "deleteByCut": {
      selection.removeText();
      break;
    }
    case "deleteContentBackward": {
      selection.deleteBackward();
      break;
    }
    case "deleteContentForward": {
      selection.deleteForward();
      break;
    }
    case "insertFromDrop": {
      insertFromDataTransfer(event, editor);
      break;
    }
    default: {
      console.log("TODO?", inputType);
    }
  }
}

export function useRichTextPlugin(outlineEditor, isReadOnly = false) {
  const pluginStateRef = useRef(null);

  // Handle event plugin state
  useEffect(() => {
    const pluginsState = pluginStateRef.current;

    if (pluginsState === null) {
      pluginStateRef.current = {
        isComposing: false,
        isReadOnly,
      };
    } else {
      pluginsState.isReadOnly = isReadOnly;
    }
  }, [isReadOnly]);

  useEvent(outlineEditor, "beforeinput", onBeforeInput, pluginStateRef);
  useEvent(outlineEditor, "focusin", onFocusIn, pluginStateRef);
  useEvent(
    outlineEditor,
    "compositionstart",
    onCompositionStart,
    pluginStateRef
  );
  useEvent(outlineEditor, "compositionend", onCompositionEnd, pluginStateRef);
  useEvent(outlineEditor, "keydown", onKeyDown, pluginStateRef);
  useEvent(outlineEditor, "selectionchange", onSelectionChange, pluginStateRef);
}
