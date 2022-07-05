/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {AutoScrollPlugin} from '@lexical/react/LexicalAutoScrollPlugin';
import {CharacterLimitPlugin} from '@lexical/react/LexicalCharacterLimitPlugin';
import {CheckListPlugin} from '@lexical/react/LexicalCheckListPlugin';
import {ClearEditorPlugin} from '@lexical/react/LexicalClearEditorPlugin';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import {HashtagPlugin} from '@lexical/react/LexicalHashtagPlugin';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {LinkPlugin} from '@lexical/react/LexicalLinkPlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {TablePlugin} from '@lexical/react/LexicalTablePlugin';
import * as React from 'react';
import {useRef} from 'react';

import {createWebsocketProvider} from './collaboration';
import {useSettings} from './context/SettingsContext';
import {useSharedHistoryContext} from './context/SharedHistoryContext';
import ActionsPlugin from './plugins/ActionsPlugin';
import AutocompletePlugin from './plugins/AutocompletePlugin';
import AutoLinkPlugin from './plugins/AutoLinkPlugin';
import ClickableLinkPlugin from './plugins/ClickableLinkPlugin';
import CodeActionMenuPlugin from './plugins/CodeActionMenuPlugin';
import CodeHighlightPlugin from './plugins/CodeHighlightPlugin';
import CommentPlugin from './plugins/CommentPlugin';
import EmojisPlugin from './plugins/EmojisPlugin';
import EquationsPlugin from './plugins/EquationsPlugin';
import ExcalidrawPlugin from './plugins/ExcalidrawPlugin';
import HorizontalRulePlugin from './plugins/HorizontalRulePlugin';
import ImagesPlugin from './plugins/ImagesPlugin';
import KeywordsPlugin from './plugins/KeywordsPlugin';
import ListMaxIndentLevelPlugin from './plugins/ListMaxIndentLevelPlugin';
import MarkdownShortcutPlugin from './plugins/MarkdownShortcutPlugin';
import {MaxLengthPlugin} from './plugins/MaxLengthPlugin';
import MentionsPlugin from './plugins/MentionsPlugin';
import PollPlugin from './plugins/PollPlugin';
import SpeechToTextPlugin from './plugins/SpeechToTextPlugin';
import TabFocusPlugin from './plugins/TabFocusPlugin';
import TableCellActionMenuPlugin from './plugins/TableActionMenuPlugin';
import TableCellResizer from './plugins/TableCellResizer';
import TextFormatFloatingToolbarPlugin from './plugins/TextFormatFloatingToolbarPlugin';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import TwitterPlugin from './plugins/TwitterPlugin';
import YouTubePlugin from './plugins/YouTubePlugin';
import ContentEditable from './ui/ContentEditable';
import Placeholder from './ui/Placeholder';

const skipCollaborationInit =
  // @ts-ignore
  window.parent != null && window.parent.frames.right === window;

export default function Editor(): JSX.Element {
  const {historyState} = useSharedHistoryContext();
  const {
    settings: {
      isCollab,
      isAutocomplete,
      isMaxLength,
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
        ref={scrollRef}>
        {isMaxLength && <MaxLengthPlugin maxLength={30} />}
        <AutoFocusPlugin />
        <ClearEditorPlugin />
        <MentionsPlugin />
        <EmojisPlugin />
        <HashtagPlugin />
        <KeywordsPlugin />
        <SpeechToTextPlugin />
        <AutoLinkPlugin />
        <AutoScrollPlugin scrollRef={scrollRef} />
        <CommentPlugin
          providerFactory={isCollab ? createWebsocketProvider : undefined}
        />
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
              // TODO Collab support until 0.4
              initialEditorState={isCollab ? null : undefined}
            />
            <MarkdownShortcutPlugin />
            <CodeActionMenuPlugin />
            <CodeHighlightPlugin />
            <ListPlugin />
            <CheckListPlugin />
            <ListMaxIndentLevelPlugin maxDepth={7} />
            <TablePlugin />
            <TableCellActionMenuPlugin />
            <TableCellResizer />
            <ImagesPlugin />
            <LinkPlugin />
            <PollPlugin />
            <TwitterPlugin />
            <YouTubePlugin />
            <ClickableLinkPlugin />
            <HorizontalRulePlugin />
            <TextFormatFloatingToolbarPlugin />
            <EquationsPlugin />
            <ExcalidrawPlugin />
            <TabFocusPlugin />
          </>
        ) : (
          <>
            <PlainTextPlugin
              contentEditable={<ContentEditable />}
              placeholder={placeholder}
              // TODO Collab support until 0.4
              initialEditorState={isCollab ? null : undefined}
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
