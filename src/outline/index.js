import * as React from "react";
import { useRef } from "react";
import { useEditorInstanceRef } from "./editor";
import { useEventHandlers } from "./handlers";

const editorStyle = {
  outline: 0,
  overflowWrap: "break-word",
  padding: "10px",
  userSelect: "text",
  whiteSpace: "pre-wrap",
};

export function Editor({
  onChange,
  plugins,
  isReadOnly,
  viewModel,
}) {
  const editorNodeRef = useRef(null);
  const editorInstanceRef = useEditorInstanceRef(
    editorNodeRef,
    isReadOnly,
    onChange,
    plugins,
    viewModel,
  );
  useEventHandlers(editorInstanceRef);

  return (
    <div
      className="outline-editor"
      contentEditable={isReadOnly === true ? false : true}
      role="textbox"
      ref={editorNodeRef}
      spellCheck={true}
      style={editorStyle}
      tabIndex={0}
    />
  );
}
