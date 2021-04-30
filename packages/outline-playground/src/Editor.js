// @flow strict-local

import type {OutlineEditor, ViewModel} from 'outline';

import * as React from 'react';
import {useEffect, useMemo, useRef} from 'react';
import {createEditor} from 'outline';
import useOutlineRichText from 'outline-react/useOutlineRichText';
import useEmojis from './useEmojis';
import useMentions from './useMentions';
import usePlainText from 'outline-react/useOutlinePlainText';
import useOutlineAutoFormatter from 'outline-react/useOutlineAutoFormatter';
import useToolbar from './useToolbar';
import useHashtags from './useHashtags';
import BlockControls from './BlockControls';
import useStepRecorder from './useStepRecorder';
import CharacterLimit from './CharacterLimit';
import {Typeahead} from './Typeahead';

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
  isAutocomplete?: boolean,
};

function useOutlineEditor(
  editorElementRef: {
    current: null | HTMLElement,
  },
  placeholder: string,
): OutlineEditor {
  const editor = useMemo(
    () =>
      createEditor({
        placeholder: 'editor-placeholder',
        paragraph: 'editor-paragraph',
        quote: 'editor-quote',
        heading: {
          h1: 'editor-heading-h1',
          h2: 'editor-heading-h2',
          h3: 'editor-heading-h3',
          h4: 'editor-heading-h4',
          h5: 'editor-heading-h5',
        },
        list: {
          ol: 'editor-list-ol',
          ul: 'editor-list-ul',
        },
        listitem: 'editor-listitem',
        image: 'editor-image',
        text: {
          bold: 'editor-text-bold',
          link: 'editor-text-link',
          italic: 'editor-text-italic',
          overflowed: 'editor-text-overflowed',
          hashtag: 'editor-text-hashtag',
          underline: 'editor-text-underline',
          strikethrough: 'editor-text-strikethrough',
          underlineStrikethrough: 'editor-text-underlineStrikethrough',
          code: 'editor-text-code',
        },
        code: 'editor-code',
      }),
    [],
  );

  useEffect(() => {
    const editorElement = editorElementRef.current;
    // Clear editorElement if not done already
    if (editorElement !== null && editorElement.firstChild !== null) {
      editorElement.textContent = '';
    }
    editor.setEditorElement(editorElement);
    editor.setPlaceholder(placeholder);
  }, [editorElementRef, editor, placeholder]);

  return editor;
}

function useOutlineOnChange(
  editor: OutlineEditor,
  onChange: (ViewModel | null) => void,
): void {
  // Set the initial state
  useEffect(() => {
    if (editor !== null) {
      onChange(editor.getViewModel());
    }
  }, [editor, onChange]);

  // Subscribe to changes
  useEffect(() => {
    if (editor !== null) {
      return editor.addUpdateListener(onChange);
    }
  }, [onChange, editor]);
  // Subscribe to errors
  useEffect(() => {
    if (editor !== null) {
      return editor.addErrorListener((e) => {
        throw e;
      });
    }
  }, [editor]);
}

function ContentEditable({
  props,
  isReadOnly,
  editorElementRef,
}: {
  props: {...},
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

export function RichTextEditor({
  onChange,
  isReadOnly,
  isCharLimit,
  isAutocomplete,
}: Props): React.MixedElement {
  const editorElementRef = useRef(null);
  const editor = useOutlineEditor(editorElementRef, 'Enter some rich text...');
  const toolbar = useToolbar(editor);
  const mentionsTypeahead = useMentions(editor);
  const props = useOutlineRichText(editor, isReadOnly);
  useOutlineOnChange(editor, onChange);
  const stepRecorder = useStepRecorder(editor);
  useEmojis(editor);
  useHashtags(editor);
  useOutlineAutoFormatter(editor);

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
      <BlockControls editor={editor} />
      {isCharLimit && <CharacterLimit editor={editor} />}
      {isAutocomplete && <Typeahead editor={editor} />}
    </>
  );
}

export function PlainTextEditor({
  onChange,
  isReadOnly,
  isCharLimit,
  isAutocomplete,
}: Props): React$Node {
  const editorElementRef = useRef(null);
  const editor = useOutlineEditor(editorElementRef, 'Enter some plain text...');
  const mentionsTypeahead = useMentions(editor);
  const props = usePlainText(editor, isReadOnly);
  useOutlineOnChange(editor, onChange);
  useEmojis(editor);
  useHashtags(editor);
  const stepRecorder = useStepRecorder(editor);

  return (
    <>
      <ContentEditable
        props={props}
        isReadOnly={isReadOnly}
        editorElementRef={editorElementRef}
      />
      {mentionsTypeahead}
      {stepRecorder}
      {isCharLimit && <CharacterLimit editor={editor} />}
      {isAutocomplete && <Typeahead editor={editor} />}
    </>
  );
}
