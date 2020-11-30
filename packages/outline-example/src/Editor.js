// @flow
import type {OutlineEditor, ViewModel} from 'outline';

import * as React from 'react';
import {useEffect, useMemo, useRef} from 'react';
import {createEditor} from 'outline';
import {useEmojiPlugin} from 'outline-emoji-plugin';
import {useMentionsPlugin} from 'outline-mentions-plugin';
// import {usePlainTextPlugin} from 'outline-plain-text-plugin';
import {useRichTextPlugin} from 'outline-rich-text-plugin';
import {useFormatPlugin} from 'outline-format-plugin';
import {useHistoryPlugin} from 'outline-history-plugin';
import {useToolbarPlugin} from 'outline-toolbar-plugin';

const editorStyle = {
  outline: 0,
  overflowWrap: 'break-word',
  padding: '10px',
  userSelect: 'text',
  whiteSpace: 'pre-wrap',
};

type Props = {
  onChange: (ViewModel | null) => void,
  isReadOnly?: boolean,
};

function useOutlineEditor(editorElementRef: {
  current: null | HTMLElement,
}): OutlineEditor {
  const editor = useMemo(() => createEditor(), []);

  useEffect(() => {
    const editorElement = editorElementRef.current;

    editor.setEditorElement(editorElement);
  }, [editorElementRef, editor]);

  return editor;
}

// An example of a custom editor using Outline.
export default function Editor({onChange, isReadOnly}: Props): React$Node {
  const editorElementRef = useRef(null);
  const outlineEditor = useOutlineEditor(editorElementRef);

  // Set the initial state
  useEffect(() => {
    if (outlineEditor !== null) {
      onChange(outlineEditor.getViewModel());
    }
  }, [outlineEditor, onChange]);

  // Subscribe to changes
  useEffect(() => {
    if (outlineEditor !== null) {
      return outlineEditor.addUpdateListener(onChange);
    }
  }, [onChange, outlineEditor]);

  // const props = usePlainTextPlugin(outlineEditor, isReadOnly);
  const mentionsTypeahead = useMentionsPlugin(outlineEditor);
  const props = useRichTextPlugin(outlineEditor, isReadOnly);
  const toolbar = useToolbarPlugin(outlineEditor);
  useEmojiPlugin(outlineEditor);
  useFormatPlugin(outlineEditor);
  useHistoryPlugin(outlineEditor);

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
      {toolbar}
    </>
  );
}
