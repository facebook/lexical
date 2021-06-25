/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor} from 'outline';

import * as React from 'react';
import {useMemo} from 'react';
import useOutlineRichText from 'outline-react/useOutlineRichText';
import useEmojis from './useEmojis';
import useMentions from './useMentions';
import useOutlineEditor from 'outline-react/useOutlineEditor';
import usePlainText from 'outline-react/useOutlinePlainText';
import useOutlineAutoFormatter from 'outline-react/useOutlineAutoFormatter';
import useOutlineDecorators from 'outline-react/useOutlineDecorators';
import useToolbar from './useToolbar';
import useHashtags from './useHashtags';
import useKeywords from './useKeywords';
import BlockControls from './BlockControls';
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
  onError: (Error) => void,
  isReadOnly?: boolean,
  isCharLimit?: boolean,
  isAutocomplete?: boolean,
};

const editorThemeClasses = {
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
  link: 'editor-text-link',
};

function ContentEditable({
  props,
  isReadOnly,
  editorElementRef,
}: {
  props: {...},
  isReadOnly?: boolean,
  editorElementRef: (null | HTMLElement) => void,
}): React$Node {
  return (
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
  );
}

export const useRichTextEditor = ({
  onError,
  isReadOnly,
  isCharLimit,
  isAutocomplete,
}: Props): [OutlineEditor, React.MixedElement] => {
  const [editor, editorElementRef] = useOutlineEditor(
    'Enter some rich text...',
    onError,
    editorThemeClasses,
  );
  const mentionsTypeahead = useMentions(editor);
  const props = useOutlineRichText(editor, isReadOnly);
  const toolbar = useToolbar(editor);
  const decorators = useOutlineDecorators(editor);
  useEmojis(editor);
  useHashtags(editor);
  useOutlineAutoFormatter(editor);
  useKeywords(editor);

  const element = useMemo(() => {
    return (
      <>
        <ContentEditable
          props={props}
          isReadOnly={isReadOnly}
          editorElementRef={editorElementRef}
        />
        {decorators}
        {mentionsTypeahead}
        {toolbar}
        <BlockControls editor={editor} />
        {isCharLimit && <CharacterLimit editor={editor} />}
        {isAutocomplete && <Typeahead editor={editor} />}
      </>
    );
  }, [
    props,
    isReadOnly,
    editorElementRef,
    decorators,
    mentionsTypeahead,
    toolbar,
    editor,
    isCharLimit,
    isAutocomplete,
  ]);

  return [editor, element];
};

export const usePlainTextEditor = ({
  onError,
  isReadOnly,
  isCharLimit,
  isAutocomplete,
}: Props): [OutlineEditor, React.MixedElement] => {
  const [editor, editorElementRef] = useOutlineEditor(
    'Enter some plain text...',
    onError,
    editorThemeClasses,
  );
  const mentionsTypeahead = useMentions(editor);
  const props = usePlainText(editor, isReadOnly);
  const decorators = useOutlineDecorators(editor);
  useEmojis(editor);
  useHashtags(editor);
  useKeywords(editor);

  const element = useMemo(
    () => (
      <>
        <ContentEditable
          props={props}
          isReadOnly={isReadOnly}
          editorElementRef={editorElementRef}
        />
        {decorators}
        {mentionsTypeahead}
        {isCharLimit && <CharacterLimit editor={editor} />}
        {isAutocomplete && <Typeahead editor={editor} />}
      </>
    ),
    [
      props,
      isReadOnly,
      editorElementRef,
      decorators,
      mentionsTypeahead,
      isCharLimit,
      editor,
      isAutocomplete,
    ],
  );

  return [editor, element];
};
