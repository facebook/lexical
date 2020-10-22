import { useEffect } from "react";
import { beginWork, processPlugins } from "./editor";
import { getDOMFromNodeKey } from "./reconcilation";

const beforeInputNameCache = new Map();

function createEventHandler(name, editorInstance) {
  return (event) => {
    beginWork(
      () => processPlugins(name, event, editorInstance),
      true,
      editorInstance
    );
  };
}

export function useEventHandlers(editorInstanceRef) {
  useEffect(() => {
    const editorInstance = editorInstanceRef.current;

    if (editorInstance !== null) {
      const beforeInputHandler = (event) => {
        const inputType = event.inputType;

        if (
          inputType !== "insertCompositionText" &&
          inputType !== "deleteCompositionText"
        ) {
          event.preventDefault();
        }

        let eventName = beforeInputNameCache.get(inputType);

        if (eventName === undefined) {
          eventName = "on" + inputType[0].toUpperCase() + inputType.slice(1);
          beforeInputNameCache.set(inputType, eventName);
        }
        beginWork(
          () => processPlugins(eventName, event),
          true,
          editorInstance
        );
      };

      const editorElem = getDOMFromNodeKey("body");
      const focusInHandler = createEventHandler("onFocusIn", editorInstance);
      const selectionChangeHandler = createEventHandler(
        "onSelectionChange",
        editorInstance
      );
      const compositionStartHandler = createEventHandler(
        "onCompositionStart",
        editorInstance
      );
      const compositionEndHandler = createEventHandler(
        "onCompositionEnd",
        editorInstance
      );
      const keyDownHandler = createEventHandler("onKeyDown", editorInstance);

      editorElem.addEventListener("beforeinput", beforeInputHandler);
      editorElem.addEventListener("focusin", focusInHandler);
      editorElem.addEventListener("compositionstart", compositionStartHandler);
      editorElem.addEventListener("compositionend", compositionEndHandler);
      editorElem.addEventListener("keydown", keyDownHandler);
      document.addEventListener("selectionchange", selectionChangeHandler);

      return () => {
        editorElem.removeEventListener("beforeinput", beforeInputHandler);
        editorElem.removeEventListener("focusin", focusInHandler);
        editorElem.removeEventListener("compositionstart", compositionStartHandler);
        editorElem.removeEventListener("compositionend", compositionEndHandler);
        editorElem.removeEventListener("keydown", keyDownHandler);
        document.removeEventListener("selectionchange", selectionChangeHandler);
      };
    }
  }, [editorInstanceRef]);
}
