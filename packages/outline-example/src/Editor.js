import * as React from 'react';
import {useMemo, useRef} from 'react';
import {useOutlineEditor} from 'outline';
import {useEmojiPlugin} from 'outline-emoji-plugin';
import {useMentionsPlugin} from 'outline-mentions-plugin';
// import {usePlainTextPlugin} from 'outline-plain-text-plugin';
import {useRichTextPlugin} from 'outline-rich-text-plugin';

const editorStyle = {
  outline: 0,
  overflowWrap: 'break-word',
  padding: '10px',
  userSelect: 'text',
  whiteSpace: 'pre-wrap',
};

// An example of a custom editor using Outline.
export default function Editor({onChange, isReadOnly}) {
  const editorElementRef = useRef(null);
  const outlineEditor = useOutlineEditor(editorElementRef, onChange);
  const portalTargetElement = useMemo(
    () => document.getElementById('portal'),
    [],
  );

  // const props = usePlainTextPlugin(outlineEditor, isReadOnly);
  const props = useRichTextPlugin(outlineEditor, isReadOnly);
  useEmojiPlugin(outlineEditor);
  const mentionsTypeahead = useMentionsPlugin(
    outlineEditor,
    portalTargetElement,
  );

  return (
    <>
      <div
        {...props}
        className="editor"
        contentEditable={isReadOnly !== true}
        role="textbox"
        ref={editorElementRef}
        spellCheck={true}
        style={editorStyle}
        tabIndex={0}
      />
      {mentionsTypeahead}
    </>
  );
}
