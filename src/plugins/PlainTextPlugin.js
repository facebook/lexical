import { useEffect, useRef } from "react";
import {
  insertText,
  onCompositionEnd,
  onCompositionStart,
  onFocusIn,
  onInsertFromPaste,
  onKeyDown,
  onSelectionChange,
  removeText,
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

  switch (inputType) {
    case "insertFromComposition": {
      const data = event.data;
      if (data) {
        insertText(event.data, view, state);
      }
      break;
    }
    case "insertFromPaste": {
      onInsertFromPaste(event, view, state, editor);
      break;
    }
    case "insertLineBreak": {
      insertText("\n", view, state);
      break;
    }
    case "insertText": {
      insertText(event.data, view, state);
      break;
    }
    case "deleteContentBackward": {
      removeText(true, view, state);
      break;
    }
    case "deleteContentForward": {
      removeText(false, view, state);
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
