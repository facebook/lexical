/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority} from 'lexical';

import * as React from 'react';
import {useCallback, useEffect, useState} from 'react';

import PlainTextPlugin from 'lexical-react/LexicalPlainTextPlugin';
import RichTextPlugin from 'lexical-react/LexicalRichTextPlugin';
import {CollaborationPlugin} from 'lexical-react/LexicalCollaborationPlugin';
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
import {useLexicalComposerContext} from 'lexical-react/LexicalComposerContext';
import {createWebsocketProvider} from './collaboration';
import HistoryPlugin from 'lexical-react/LexicalHistoryPlugin';
import {useSharedHistoryContext} from './context/SharedHistoryContext';

type Props = {
  isCollab: boolean,
  isCharLimit: boolean,
  isCharLimitUtf8: boolean,
  isAutocomplete: boolean,
  isRichText: boolean,
  showTreeView: boolean,
};

const EditorPriority: CommandListenerEditorPriority = 0;

const skipCollaborationInit =
  window.parent != null && window.parent.frames.right === window;

function EditorContentEditable({
  rootElementRef,
}: {
  rootElementRef: (null | HTMLElement) => void,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  const [isReadOnly, setIsReadyOnly] = useState(false);

  useEffect(() => {
    return editor.addListener(
      'command',
      (type, payload) => {
        if (type === 'readOnly') {
          const readOnly = payload;
          setIsReadyOnly(readOnly);
        }
        return false;
      },
      EditorPriority,
    );
  }, [editor]);

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
  const {historyState} = useSharedHistoryContext();

  const contentEditable = useCallback(
    (rootElementRef) => (
      <EditorContentEditable rootElementRef={rootElementRef} />
    ),
    [],
  );

  const placeholder = useCallback(() => {
    const text = isCollab
      ? 'Enter some collaborative rich text...'
      : isRichText
      ? 'Enter some rich text...'
      : 'Enter some plain text...';
    return <Placeholder>{text}</Placeholder>;
  }, [isCollab, isRichText]);

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
              <CollaborationPlugin
                id="main"
                providerFactory={createWebsocketProvider}
                skipInit={skipCollaborationInit}
              />
            ) : (
              <HistoryPlugin externalHistoryState={historyState} />
            )}
            <RichTextPlugin
              contentEditable={contentEditable}
              placeholder={placeholder}
              skipInit={isCollab}
            />
            <AutoFormatterPlugin />
            <CodeHighlightPlugin />
          </>
        ) : (
          <>
            <PlainTextPlugin
              contentEditable={contentEditable}
              placeholder={placeholder}
            />
            <HistoryPlugin externalHistoryState={historyState} />
          </>
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
