/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';
import {useCallback} from 'react';

import PlainTextPlugin from 'lexical-react/LexicalPlainTextPlugin';
import RichTextPlugin from 'lexical-react/LexicalRichTextPlugin';
import RichTextCollabPlugin from './plugins/RichTextCollabPlugin';
import MentionsPlugin from './plugins/MentionsPlugin';
import EmojisPlugin from './plugins/EmojisPlugin';
import CharacterLimitPlugin from 'lexical-react/LexicalCharacterLimitPlugin';
import AutocompletePlugin from './plugins/AutocompletePlugin';
import HashtagsPlugin from 'lexical-react/LexicalHashtagPlugin';
import KeywordsPlugin from './plugins/KeywordsPlugin';
import ActionsPlugin from './plugins/ActionsPlugin';
import AutoFormatterPlugin from 'lexical-react/LexicalAutoFormatterPlugin';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import TablesPlugin from './plugins/TablesPlugin';
import TableCellActionMenuPlugin from './plugins/TableCellActionMenuPlugin';
import ImagesPlugin from './plugins/ImagesPlugin';
import LinksPlugin from './plugins/LinksPlugin';
import StickyPlugin from './plugins/StickyPlugin';
import SpeechToTextPlugin from './plugins/SpeechToTextPlugin';
import CodeHighlightPlugin from './plugins/CodeHighlightPlugin';
import Placeholder from './ui/Placeholder';
import ContentEditable from './ui/ContentEditable';
import useEditorListeners from './hooks/useEditorListeners';

type Props = {
  isCollab: boolean,
  isCharLimit: boolean,
  isCharLimitUtf8: boolean,
  isAutocomplete: boolean,
  isRichText: boolean,
  showTreeView: boolean,
};

function EditorContentEditable({
  rootElementRef,
  clear,
}: {
  rootElementRef: (null | HTMLElement) => void,
  clear: () => void,
}): React$Node {
  const isReadOnly = useEditorListeners(clear);

  return (
    <ContentEditable isReadOnly={isReadOnly} rootElementRef={rootElementRef} />
  );
}

export default function Editor({
  isCollab,
  isAutocomplete,
  isCharLimit,
  isCharLimitUtf8,
  isRichText,
  showTreeView,
}: Props): React$Node {
  const contentEditable = useCallback(
    (rootElementRef, clear) => (
      <EditorContentEditable rootElementRef={rootElementRef} clear={clear} />
    ),
    [],
  );

  const plainTextPlaceholder = useCallback(
    () => <Placeholder>Enter some plain text...</Placeholder>,
    [],
  );

  const richTextPlaceholder = useCallback(
    () => <Placeholder>Enter some rich text...</Placeholder>,
    [],
  );

  return (
    <>
      {isRichText && <ToolbarPlugin />}
      <div
        className={`editor-container ${showTreeView ? 'tree-view' : ''} ${
          !isRichText ? 'plain-text' : ''
        }`}>
        <StickyPlugin />
        <MentionsPlugin />
        <TablesPlugin />
        <TableCellActionMenuPlugin />
        <ImagesPlugin />
        <LinksPlugin />
        <EmojisPlugin />
        <HashtagsPlugin />
        <KeywordsPlugin />
        <SpeechToTextPlugin />
        {isRichText ? (
          <>
            {isCollab ? (
              <RichTextCollabPlugin id="main" />
            ) : (
              <RichTextPlugin
                contentEditable={contentEditable}
                placeholder={richTextPlaceholder}
              />
            )}
            <AutoFormatterPlugin />
            <CodeHighlightPlugin />
          </>
        ) : (
          <PlainTextPlugin
            contentEditable={contentEditable}
            placeholder={plainTextPlaceholder}
          />
        )}
        {(isCharLimit || isCharLimitUtf8) && (
          <CharacterLimitPlugin charset={isCharLimit ? 'UTF-16' : 'UTF-8'} />
        )}
        {isAutocomplete && <AutocompletePlugin />}
        <ActionsPlugin isRichText={isRichText} />
      </div>
      {showTreeView && <TreeViewPlugin />}
    </>
  );
}
