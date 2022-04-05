/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import AutoFocusPlugin from '@lexical/react/LexicalAutoFocusPlugin';
import AutoScrollPlugin from '@lexical/react/LexicalAutoScrollPlugin';
import CharacterLimitPlugin from '@lexical/react/LexicalCharacterLimitPlugin';
import LexicalClearEditorPlugin from '@lexical/react/LexicalClearEditorPlugin';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import HashtagsPlugin from '@lexical/react/LexicalHashtagPlugin';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import LinkPlugin from '@lexical/react/LexicalLinkPlugin';
import ListPlugin from '@lexical/react/LexicalListPlugin';
import LexicalMarkdownShortcutPlugin from '@lexical/react/LexicalMarkdownShortcutPlugin';
import PlainTextPlugin from '@lexical/react/LexicalPlainTextPlugin';
import RichTextPlugin from '@lexical/react/LexicalRichTextPlugin';
import TablesPlugin from '@lexical/react/LexicalTablePlugin';
import * as React from 'react';
import {useRef} from 'react';

import {createWebsocketProvider} from './collaboration';
import {useSettings} from './context/SettingsContext';
import {useSharedHistoryContext} from './context/SharedHistoryContext';
import ActionsPlugin from './plugins/ActionsPlugin';
import AutocompletePlugin from './plugins/AutocompletePlugin';
import AutoLinkPlugin from './plugins/AutoLinkPlugin';
import CharacterStylesPopupPlugin from './plugins/CharacterStylesPopupPlugin';
import CodeHighlightPlugin from './plugins/CodeHighlightPlugin';
import EmojisPlugin from './plugins/EmojisPlugin';
import EquationsPlugin from './plugins/EquationsPlugin';
import ExcalidrawPlugin from './plugins/ExcalidrawPlugin';
import HorizontalRulePlugin from './plugins/HorizontalRulePlugin';
import ImagesPlugin from './plugins/ImagesPlugin';
import KeywordsPlugin from './plugins/KeywordsPlugin';
import ListMaxIndentLevelPlugin from './plugins/ListMaxIndentLevelPlugin';
import MentionsPlugin from './plugins/MentionsPlugin';
import PollPlugin from './plugins/PollPlugin';
import SpeechToTextPlugin from './plugins/SpeechToTextPlugin';
import TableCellActionMenuPlugin from './plugins/TableActionMenuPlugin';
import TableCellResizer from './plugins/TableCellResizer';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import TwitterPlugin from './plugins/TwitterPlugin';
import ContentEditable from './ui/ContentEditable';
import Placeholder from './ui/Placeholder';

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
  const scrollRef = useRef(null);

  return (
    <>
      {isRichText && <ToolbarPlugin />}
      <div
        className={`editor-container ${showTreeView ? 'tree-view' : ''} ${
          !isRichText ? 'plain-text' : ''
        }`}
        ref={scrollRef}
      >
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
        <EquationsPlugin />
        <AutoScrollPlugin scrollRef={scrollRef} />
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
            <LexicalMarkdownShortcutPlugin />
            <CodeHighlightPlugin />
            <ListPlugin />
            <ListMaxIndentLevelPlugin maxDepth={7} />
            <TablesPlugin />
            <TableCellActionMenuPlugin />
            <TableCellResizer />
            <ImagesPlugin />
            <LinkPlugin />
            <PollPlugin />
            <TwitterPlugin />
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
