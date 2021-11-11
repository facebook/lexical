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
import {useEffect, useMemo, useState} from 'react';
import useOutlineRichText from 'outline-react/useOutlineRichText';
import useOutlineRichTextWithCollab from 'outline-react/useOutlineRichTextWithCollab';
import {useEmojis} from './useEmojis';
import useMentions from './useMentions';
import useOutlineEditor from 'outline-react/useOutlineEditor';
import usePlainText from 'outline-react/useOutlinePlainText';
import useOutlineAutoFormatter from 'outline-react/useOutlineAutoFormatter';
import useOutlineDecorators from 'outline-react/useOutlineDecorators';
import useOutlineNestedList from 'outline-react/useOutlineNestedList';
import {ImageNode, createImageNode} from './ImageNode';
import {insertNodes} from 'outline/selection';
import useFloatingToolbar from './useFloatingToolbar';
import useHashtags from './useHashtags';
import useKeywords from './useKeywords';
import BlockControls from './BlockControls';
import CharacterLimit from './CharacterLimit';
import {Typeahead} from './Typeahead';
import yellowFlowerImage from './images/image/yellow-flower.jpg';
import {log} from 'outline';

const editorStyle = {
  outline: 0,
  overflowWrap: 'break-word',
  padding: '10px',
  userSelect: 'text',
  whiteSpace: 'pre-wrap',
};

type Props = {
  isCharLimit?: boolean,
  isCharLimitUtf8?: boolean,
  isAutocomplete?: boolean,
};

const editorConfig = {
  theme: {
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
    nestedList: {
      listitem: 'editor-nested-list-listitem',
    },
    listitem: 'editor-listitem',
    image: 'editor-image',
    text: {
      bold: 'editor-text-bold',
      link: 'editor-text-link',
      italic: 'editor-text-italic',
      underline: 'editor-text-underline',
      strikethrough: 'editor-text-strikethrough',
      underlineStrikethrough: 'editor-text-underlineStrikethrough',
      code: 'editor-text-code',
    },
    hashtag: 'editor-text-hashtag',
    code: 'editor-code',
    link: 'editor-text-link',
    characterLimit: 'editor-character-limit',
  },
};

function ContentEditable({
  isReadOnly,
  rootElementRef,
}: {
  isReadOnly?: boolean,
  rootElementRef: (null | HTMLElement) => void,
}): React$Node {
  return (
    <div
      className="editor"
      contentEditable={isReadOnly !== true}
      role="textbox"
      ref={rootElementRef}
      spellCheck={true}
      style={editorStyle}
      tabIndex={0}
    />
  );
}

function useRichTextEditorImpl({
  editor,
  isCharLimit,
  isCharLimitUtf8,
  isAutocomplete,
  clear,
  rootElementRef,
  showPlaceholder,
  mentionsTypeahead,
}): [OutlineEditor, React.MixedElement] {
  const [isReadOnly, setIsReadyOnly] = useState(false);
  const floatingToolbar = useFloatingToolbar(editor);
  const decorators = useOutlineDecorators(editor);
  const [indent, outdent] = useOutlineNestedList(editor);
  useEmojis(editor);
  useHashtags(editor);
  useOutlineAutoFormatter(editor);
  useKeywords(editor);
  useEffect(() => {
    editor.registerNodeType('image', ImageNode);
  }, [editor]);

  const element = useMemo(() => {
    const handleAddImage = () => {
      editor.update((state) => {
        log('handleAddImage');
        const selection = state.getSelection();
        if (selection !== null) {
          const imageNode = createImageNode(
            yellowFlowerImage,
            'Yellow flower in tilt shift lens',
          );
          insertNodes(selection, [imageNode]);
        }
      });
    };

    return (
      <>
        <ContentEditable
          isReadOnly={isReadOnly}
          rootElementRef={rootElementRef}
        />
        {showPlaceholder && <Placeholder>Enter some rich text...</Placeholder>}
        {decorators}
        {mentionsTypeahead}
        {floatingToolbar}
        <BlockControls editor={editor} />
        {(isCharLimit || isCharLimitUtf8) && (
          <CharacterLimit
            editor={editor}
            charset={isCharLimit ? 'UTF-16' : 'UTF-8'}
          />
        )}
        {isAutocomplete && <Typeahead editor={editor} />}
        <div className="actions">
          <button className="action-button outdent" onClick={outdent}>
            <i className="outdent" />
          </button>
          <button className="action-button indent" onClick={indent}>
            <i className="indent" />
          </button>
          <button
            className="action-button insert-image"
            onClick={handleAddImage}>
            Insert Image
          </button>
          <button
            className="action-button clear"
            onClick={() => {
              clear();
              editor.focus();
            }}>
            Clear
          </button>
          <button
            className="action-button lock"
            onClick={() => setIsReadyOnly(!isReadOnly)}>
            <i className={isReadOnly ? 'unlock' : 'lock'} />
          </button>
        </div>
      </>
    );
  }, [
    isReadOnly,
    rootElementRef,
    showPlaceholder,
    decorators,
    mentionsTypeahead,
    floatingToolbar,
    editor,
    isCharLimit,
    isCharLimitUtf8,
    isAutocomplete,
    outdent,
    indent,
    clear,
  ]);

  return [editor, element];
}

export function useRichTextEditor(
  props: Props,
): [OutlineEditor, React.MixedElement] {
  const [editor, rootElementRef, showPlaceholder] =
    useOutlineEditor(editorConfig);
  const mentionsTypeahead = useMentions(editor);
  const clear = useOutlineRichText(editor);
  return useRichTextEditorImpl({
    ...props,
    editor,
    clear,
    rootElementRef,
    showPlaceholder,
    mentionsTypeahead,
  });
}

export function useRichTextEditorWithCollab(
  props: Props,
): [OutlineEditor, React.MixedElement] {
  const [editor, rootElementRef, showPlaceholder] =
    useOutlineEditor(editorConfig);
  const mentionsTypeahead = useMentions(editor);
  const clear = useOutlineRichTextWithCollab(editor);
  return useRichTextEditorImpl({
    ...props,
    editor,
    clear,
    rootElementRef,
    showPlaceholder,
    mentionsTypeahead,
  });
}

function Placeholder({children}: {children: string}): React.Node {
  return <div className="editor-placeholder">{children}</div>;
}

export const usePlainTextEditor = ({
  isCharLimit,
  isCharLimitUtf8,
  isAutocomplete,
}: Props): [OutlineEditor, React.MixedElement] => {
  const [editor, rootElementRef, showPlaceholder] =
    useOutlineEditor(editorConfig);
  const mentionsTypeahead = useMentions(editor);
  const [isReadOnly, setIsReadyOnly] = useState(false);
  const clear = usePlainText(editor);
  const decorators = useOutlineDecorators(editor);
  useEmojis(editor);
  useHashtags(editor);
  useKeywords(editor);

  const element = useMemo(
    () => (
      <>
        <ContentEditable
          isReadOnly={isReadOnly}
          rootElementRef={rootElementRef}
        />
        {showPlaceholder && <Placeholder>Enter some plain text...</Placeholder>}
        {decorators}
        {mentionsTypeahead}
        {(isCharLimit || isCharLimitUtf8) && (
          <CharacterLimit
            editor={editor}
            charset={isCharLimit ? 'UTF-16' : 'UTF-8'}
          />
        )}
        {isAutocomplete && <Typeahead editor={editor} />}
        <div className="actions">
          <button
            className="action-button clear"
            onClick={() => {
              clear();
              editor.focus();
            }}>
            Clear
          </button>
          <button
            className="action-button lock"
            onClick={() => setIsReadyOnly(!isReadOnly)}>
            <i className={isReadOnly ? 'unlock' : 'lock'} />
          </button>
        </div>
      </>
    ),
    [
      isReadOnly,
      rootElementRef,
      showPlaceholder,
      decorators,
      mentionsTypeahead,
      isCharLimit,
      isCharLimitUtf8,
      editor,
      isAutocomplete,
      clear,
    ],
  );

  return [editor, element];
};
