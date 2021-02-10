// @flow
import type {OutlineEditor, ViewModel} from 'outline';

import * as React from 'react';
import {useEffect, useMemo, useRef} from 'react';
import {createEditor} from 'outline';
import useOutlineRichText from 'outline-react/useOutlineRichText';
import useEmojis from './useEmojis';
import useMentions from './useMentions';
// import usePlainText from 'outline-react/useOutlinePlainText';
import useOutlineAutoFormatter from 'outline-react/useOutlineAutoFormatter';
import useOutlineHistory from 'outline-react/useOutlineHistory';
import useToolbar from './useToolbar';
import useHashtags from './useHashtags';
import BlockControls from './BlockControls';

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
    // Clear editorElement if not done already
    if (editorElement !== null && editorElement.firstChild !== null) {
      editorElement.textContent = '';
    }
    editor.setEditorElement(editorElement);
    editor.setPlaceholder('Enter some text...');
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
  const toolbar = useToolbar(outlineEditor);
  const mentionsTypeahead = useMentions(outlineEditor);
  const props = useOutlineRichText(outlineEditor, isReadOnly);
  useEmojis(outlineEditor);
  useHashtags(outlineEditor);
  useOutlineAutoFormatter(outlineEditor);
  useOutlineHistory(outlineEditor);

  return (
    <>
      <div
        {...props}
        className="editor"
        contentEditable={isReadOnly !== true}
        // We use data-slate-editor so Grammarly works with Outline.
        // Ideally, Grammarly should add support for detecting Outline.
        data-slate-editor={true}
        role="textbox"
        ref={editorElementRef}
        spellCheck={true}
        style={editorStyle}
        tabIndex={0}
      />
      {mentionsTypeahead}
      {toolbar}
      <BlockControls editor={outlineEditor} />
    </>
  );
}
