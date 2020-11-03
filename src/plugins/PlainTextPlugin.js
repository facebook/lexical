import { useEffect, useRef } from "react";
import {
  onCompositionEnd,
  onCompositionStart,
  onFocusIn,
  insertFromDataTransfer,
  onKeyDown,
  onSelectionChange,
  useEvent,
} from "./PluginShared";

function onBeforeInput(event, view, state, editor) {
  const inputType = event.inputType;

  if (
    inputType !== "insertCompositionText" &&
    inputType !== "deleteCompositionText"
  ) {
    event.preventDefault();
  }
  const selection = view.getSelection()

  switch (inputType) {
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
      // NO-OP
    }
  }
}

export function usePlainTextPlugin(outlineEditor, isReadOnly = false) {
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
