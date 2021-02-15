// @flow
import type {OutlineEditor, ViewModel} from 'outline';

import * as React from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';
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
import useStepRecorder from './useStepRecorder';

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
  isCharLimit?: boolean,
};

const CHARACTER_LIMIT = 10;

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
}): React$Node {
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

function EditorCharacterLimit({editor}: {editor: OutlineEditor}): React$Node {
  const [charactersOver, setCharactersOver] = useState(0);

  useEffect(() => {
    return editor.addUpdateListener((viewModel: ViewModel) => {
      const characters = editor.getTextContent().length;
      if (characters > CHARACTER_LIMIT) {
        const diff = characters - CHARACTER_LIMIT;
        setCharactersOver(diff);
      } else if (charactersOver > 0) {
        setCharactersOver(0);
      }
    });
  }, [charactersOver, editor]);

  return charactersOver > 0 ? (
    <span className="characters-over">Character Limit: <span>-{charactersOver}</span></span>
  ) : null;
}

export function RichTextEditor({
  onChange,
  isReadOnly,
  isCharLimit,
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
  const stepRecorder = useStepRecorder(outlineEditor);
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
      {stepRecorder}
      <BlockControls editor={outlineEditor} />
      {isCharLimit && <EditorCharacterLimit editor={outlineEditor} />}
    </>
  );
}

export function PlainTextEditor({
  onChange,
  isReadOnly,
  isCharLimit,
}: Props): React$Node {
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
  const stepRecorder = useStepRecorder(outlineEditor);

  return (
    <>
      <ContentEditable
        props={props}
        isReadOnly={isReadOnly}
        editorElementRef={editorElementRef}
      />
      {mentionsTypeahead}
      {stepRecorder}
      {isCharLimit && <EditorCharacterLimit editor={outlineEditor} />}
    </>
  );
}
