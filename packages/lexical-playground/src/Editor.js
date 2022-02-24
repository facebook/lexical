/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';

import PlainTextPlugin from '@lexical/react/LexicalPlainTextPlugin';
import RichTextPlugin from '@lexical/react/LexicalRichTextPlugin';
import LexicalClearEditorPlugin from '@lexical/react/LexicalClearEditorPlugin';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import MentionsPlugin from './plugins/MentionsPlugin';
import EmojisPlugin from './plugins/EmojisPlugin';
import CharacterLimitPlugin from '@lexical/react/LexicalCharacterLimitPlugin';
import AutocompletePlugin from './plugins/AutocompletePlugin';
import HashtagsPlugin from '@lexical/react/LexicalHashtagPlugin';
import KeywordsPlugin from './plugins/KeywordsPlugin';
import ActionsPlugin from './plugins/ActionsPlugin';
import AutoFormatterPlugin from '@lexical/react/LexicalAutoFormatterPlugin';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import TablesPlugin from '@lexical/react/LexicalTablePlugin';
import ListPlugin from '@lexical/react/LexicalListPlugin';
import TableCellActionMenuPlugin from './plugins/TableActionMenuPlugin';
import ImagesPlugin from './plugins/ImagesPlugin';
import ExcalidrawPlugin from './plugins/ExcalidrawPlugin';
import LinkPlugin from '@lexical/react/LexicalLinkPlugin';
import SpeechToTextPlugin from './plugins/SpeechToTextPlugin';
import CodeHighlightPlugin from './plugins/CodeHighlightPlugin';
import Placeholder from './ui/Placeholder';
import {createWebsocketProvider} from './collaboration';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {useSharedHistoryContext} from './context/SharedHistoryContext';
import ContentEditable from './ui/ContentEditable';
import AutoLinkPlugin from './plugins/AutoLinkPlugin';
import PollPlugin from './plugins/PollPlugin';
import HorizontalRulePlugin from './plugins/HorizontalRulePlugin';

import CharacterStylesPopupPlugin from './plugins/CharacterStylesPopupPlugin';
import {useSettings} from './context/SettingsContext';
import AutoFocusPlugin from './plugins/AutoFocusPlugin';

const skipCollaborationInit =
  window.parent != null && window.parent.frames.right === window;

export default function Editor(): React$Node {
  const {historyState} = useSharedHistoryContext();
  const {
    settings: {
      isCollab,
      isAutocomplete,
      isCharLimit,
      isCharLimitUtf8,
      isRichText,
      showTreeView,
    },
  } = useSettings();
  const text = isCollab
    ? 'Enter some collaborative rich text...'
    : isRichText
    ? 'Enter some rich text...'
    : 'Enter some plain text...';
  const placeholder = <Placeholder>{text}</Placeholder>;

  return (
    <>
      {isRichText && <ToolbarPlugin />}
      <div
        className={`editor-container ${showTreeView ? 'tree-view' : ''} ${
          !isRichText ? 'plain-text' : ''
        }`}>
        <AutoFocusPlugin />
        <LexicalClearEditorPlugin />
        <MentionsPlugin />
        <EmojisPlugin />
        <ExcalidrawPlugin />
        <HashtagsPlugin />
        <KeywordsPlugin />
        <HorizontalRulePlugin />
        <SpeechToTextPlugin />
        <AutoLinkPlugin />
        <CharacterStylesPopupPlugin />
        {isRichText ? (
          <>
            {isCollab ? (
              <CollaborationPlugin
                id="main"
                providerFactory={createWebsocketProvider}
                shouldBootstrap={!skipCollaborationInit}
              />
            ) : (
              <HistoryPlugin externalHistoryState={historyState} />
            )}
            <RichTextPlugin
              contentEditable={<ContentEditable />}
              placeholder={placeholder}
              initialEditorState={isCollab ? null : undefined}
            />
            <AutoFormatterPlugin />
            <CodeHighlightPlugin />
            <ListPlugin />
            <TablesPlugin />
            <TableCellActionMenuPlugin />
            <ImagesPlugin />
            <LinkPlugin />
            <PollPlugin />
          </>
        ) : (
          <>
            <PlainTextPlugin
              contentEditable={<ContentEditable />}
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
