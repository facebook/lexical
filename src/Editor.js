import * as React from "react";
import { useRef } from "react";
import { useOutlineEditor } from "./outline/OutlineEditor";
import { useEmojiPlugin } from "./plugins/EmojiPlugin";
import { usePlainTextPlugin } from "./plugins/PlainTextPlugin";
import { useRichTextPlugin } from "./plugins/RichTextPlugin";

const editorStyle = {
  outline: 0,
  overflowWrap: "break-word",
  padding: "10px",
  userSelect: "text",
  whiteSpace: "pre-wrap",
};

// An example of a custom editor using Outline.
export default function Editor({ onChange, isReadOnly }) {
  const editorElementRef = useRef(null);
  const outlineEditor = useOutlineEditor(editorElementRef, onChange);

  // usePlainTextPlugin(outlineEditor, isReadOnly);
  useRichTextPlugin(outlineEditor, isReadOnly);
  useEmojiPlugin(outlineEditor);

  return (
    <div
      className="editor"
      contentEditable={isReadOnly === true ? false : true}
      role="textbox"
      ref={editorElementRef}
      spellCheck={true}
      style={editorStyle}
      tabIndex={0}
    />
  );
}
