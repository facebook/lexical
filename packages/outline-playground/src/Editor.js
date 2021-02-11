// @flow
import type {OutlineEditor, ViewModel} from 'outline';

import * as React from 'react';
import {useEffect, useMemo, useRef} from 'react';
import {createEditor} from 'outline';
import useOutlineRichText from 'outline-react/useOutlineRichText';
import useEmojis from './useEmojis';
import useMentions from './useMentions';
import usePlainText from 'outline-react/useOutlinePlainText';
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

function useOutlineEditor(
  editorElementRef: {
    current: null | HTMLElement,
  },
  placeholder: string,
): OutlineEditor {
  const editor = useMemo(() => createEditor(), []);

  useEffect(() => {
    const editorElement = editorElementRef.current;
    // Clear editorElement if not done already
    if (editorElement !== null && editorElement.firstChild !== null) {
      editorElement.textContent = '';
    }
    editor.setEditorElement(editorElement);
    editor.addDOMCreationListener((type: string, element: HTMLElement) => {
      if (type === 'placeholder') {
        element.className = 'placeholder';
      }
    });
    editor.setPlaceholder(placeholder);
  }, [editorElementRef, editor, placeholder]);

  return editor;
}

function useOutlineOnChange(
  outlineEditor: OutlineEditor,
  onChange: (ViewModel | null) => void,
): void {
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
}

function ContentEditable({
  props,
  isReadOnly,
  editorElementRef,
}: {
  props: Object,
  isReadOnly?: boolean,
  editorElementRef: {current: null | HTMLElement},
}): React.MixedElement {
  return (
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
  );
}

export function RichTextEditor({
  onChange,
  isReadOnly,
}: Props): React.MixedElement {
  const editorElementRef = useRef(null);
  const outlineEditor = useOutlineEditor(
    editorElementRef,
    'Enter some rich text...',
  );
  const toolbar = useToolbar(outlineEditor);
  const mentionsTypeahead = useMentions(outlineEditor);
  const props = useOutlineRichText(outlineEditor, isReadOnly);
  useOutlineOnChange(outlineEditor, onChange);
  useEmojis(outlineEditor);
  useHashtags(outlineEditor);
  useOutlineAutoFormatter(outlineEditor);
  useOutlineHistory(outlineEditor);

  return (
    <>
      <ContentEditable
        props={props}
        isReadOnly={isReadOnly}
        editorElementRef={editorElementRef}
      />
      {mentionsTypeahead}
      {toolbar}
      <BlockControls editor={outlineEditor} />
    </>
  );
}

export function PlainTextEditor({
  onChange,
  isReadOnly,
}: Props): React.MixedElement {
  const editorElementRef = useRef(null);
  const outlineEditor = useOutlineEditor(
    editorElementRef,
    'Enter some plain text...',
  );
  const mentionsTypeahead = useMentions(outlineEditor);
  const props = usePlainText(outlineEditor, isReadOnly);
  useOutlineOnChange(outlineEditor, onChange);
  useEmojis(outlineEditor);
  useHashtags(outlineEditor);
  useOutlineHistory(outlineEditor);

  return (
    <>
      <ContentEditable
        props={props}
        isReadOnly={isReadOnly}
        editorElementRef={editorElementRef}
      />
      {mentionsTypeahead}
    </>
  );
}
