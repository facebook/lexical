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
import {useEffect, useMemo} from 'react';
import useOutlineRichText from 'outline-react/useOutlineRichText';
import useEmojis from './useEmojis';
import useMentions from './useMentions';
import useOutlineEditor from 'outline-react/useOutlineEditor';
import usePlainText from 'outline-react/useOutlinePlainText';
import useOutlineAutoFormatter from 'outline-react/useOutlineAutoFormatter';
import useOutlineDecorators from 'outline-react/useOutlineDecorators';
import {ImageNode, createImageNode} from './ImageNode';
import {insertNodes} from 'outline/SelectionHelpers';
import useFloatingToolbar from './useFloatingToolbar';
import useHashtags from './useHashtags';
import useKeywords from './useKeywords';
import useNestedList from './useNestedList';
import BlockControls from './BlockControls';
import CharacterLimit from './CharacterLimit';
import {Typeahead} from './Typeahead';
import yellowFlowerImage from './images/image/yellow-flower.jpg';

const editorStyle = {
  outline: 0,
  overflowWrap: 'break-word',
  padding: '10px',
  userSelect: 'text',
  whiteSpace: 'pre-wrap',
};

type Props = {
  onError: (Error, string) => void,
  isReadOnly: boolean,
  isCharLimit?: boolean,
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
      overflowed: 'editor-text-overflowed',
      underline: 'editor-text-underline',
      strikethrough: 'editor-text-strikethrough',
      underlineStrikethrough: 'editor-text-underlineStrikethrough',
      code: 'editor-text-code',
    },
    hashtag: 'editor-text-hashtag',
    code: 'editor-code',
    link: 'editor-text-link',
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

export const useRichTextEditor = ({
  onError,
  isReadOnly,
  isCharLimit,
  isAutocomplete,
}: Props): [OutlineEditor, React.MixedElement] => {
  const [editor, rootElementRef, showPlaceholder] = useOutlineEditor(
    onError,
    editorConfig,
  );
  const mentionsTypeahead = useMentions(editor);
  const clear = useOutlineRichText(editor, isReadOnly);
  const floatingToolbar = useFloatingToolbar(editor);
  const decorators = useOutlineDecorators(editor);
  const [indent, outdent] = useNestedList(editor);
  useEmojis(editor);
  useHashtags(editor);
  useOutlineAutoFormatter(editor);
  useKeywords(editor);
  useEffect(() => {
    editor.registerNodeType('image', ImageNode);
  }, [editor]);

  const element = useMemo(() => {
    const handleAddImage = () => {
      editor.update((view) => {
        const selection = view.getSelection();
        if (selection !== null) {
          const imageNode = createImageNode(
            yellowFlowerImage,
            'Yellow flower in tilt shift lens',
          );
          insertNodes(selection, [imageNode]);
        }
      }, 'handleAddImage');
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
        {isCharLimit && <CharacterLimit editor={editor} />}
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
          <button className="action-button" onClick={() => clear()}>
            Clear
          </button>
        </div>
      </>
    );
  }, [
    isReadOnly,
    rootElementRef,
    showPlaceholder,
    clear,
    decorators,
    mentionsTypeahead,
    floatingToolbar,
    editor,
    isCharLimit,
    isAutocomplete,
    outdent,
    indent,
  ]);

  return [editor, element];
};

function Placeholder({children}: {children: string}): React.Node {
  return <div className="editor-placeholder">{children}</div>;
}

export const usePlainTextEditor = ({
  onError,
  isReadOnly,
  isCharLimit,
  isAutocomplete,
}: Props): [OutlineEditor, React.MixedElement] => {
  const [editor, rootElementRef, showPlaceholder] = useOutlineEditor(
    onError,
    editorConfig,
  );
  const mentionsTypeahead = useMentions(editor);
  const clear = usePlainText(editor, isReadOnly);
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
        {isCharLimit && <CharacterLimit editor={editor} />}
        {isAutocomplete && <Typeahead editor={editor} />}
        <div className="actions">
          <button className="action-button" onClick={() => clear()}>
            Clear
          </button>
        </div>
      </>
    ),
    [
      isReadOnly,
      rootElementRef,
      showPlaceholder,
      clear,
      decorators,
      mentionsTypeahead,
      isCharLimit,
      editor,
      isAutocomplete,
    ],
  );

  return [editor, element];
};
