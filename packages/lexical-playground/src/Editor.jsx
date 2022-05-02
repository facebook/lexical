/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {$createLinkNode} from '@lexical/link';
import {$createListItemNode, $createListNode} from '@lexical/list';
import AutoFocusPlugin from '@lexical/react/LexicalAutoFocusPlugin';
import AutoScrollPlugin from '@lexical/react/LexicalAutoScrollPlugin';
import CharacterLimitPlugin from '@lexical/react/LexicalCharacterLimitPlugin';
import LexicalClearEditorPlugin from '@lexical/react/LexicalClearEditorPlugin';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import HashtagsPlugin from '@lexical/react/LexicalHashtagPlugin';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import LinkPlugin from '@lexical/react/LexicalLinkPlugin';
import ListPlugin from '@lexical/react/LexicalListPlugin';
import PlainTextPlugin from '@lexical/react/LexicalPlainTextPlugin';
import RichTextPlugin from '@lexical/react/LexicalRichTextPlugin';
import TablesPlugin from '@lexical/react/LexicalTablePlugin';
import {$createHeadingNode, $createQuoteNode} from '@lexical/rich-text';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import * as React from 'react';
import {useRef} from 'react';

import {createWebsocketProvider} from './collaboration';
import {useSettings} from './context/SettingsContext';
import {useSharedHistoryContext} from './context/SharedHistoryContext';
import ActionsPlugin from './plugins/ActionsPlugin';
import AutocompletePlugin from './plugins/AutocompletePlugin';
import AutoLinkPlugin from './plugins/AutoLinkPlugin';
import CharacterStylesPopupPlugin from './plugins/CharacterStylesPopupPlugin';
import ClickableLinkPlugin from './plugins/ClickableLinkPlugin';
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
import MentionsPlugin from './plugins/MentionsPlugin';
import PollPlugin from './plugins/PollPlugin';
import SpeechToTextPlugin from './plugins/SpeechToTextPlugin';
import TableCellActionMenuPlugin from './plugins/TableActionMenuPlugin';
import TableCellResizer from './plugins/TableCellResizer';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import TwitterPlugin from './plugins/TwitterPlugin';
import YouTubePlugin from './plugins/YouTubePlugin';
import ContentEditable from './ui/ContentEditable';
import Placeholder from './ui/Placeholder';

const skipCollaborationInit =
  window.parent != null && window.parent.frames.right === window;

function prepopulatedRichText() {
  const root = $getRoot();
  if (root.getFirstChild() === null) {
    const heading = $createHeadingNode('h1');
    heading.append($createTextNode('Welcome to the playground'));
    root.append(heading);
    const quote = $createQuoteNode();
    quote.append(
      $createTextNode(
        `In case you were wondering what the black box at the bottom is – it's the debug view, showing the current state of editor. ` +
          `You can hide it by pressing on the settings control in the bottom-right of your screen and toggling the debug view setting.`,
      ),
    );
    root.append(quote);
    const paragraph = $createParagraphNode();
    paragraph.append(
      $createTextNode('The playground is a demo environment built with '),
      $createTextNode('@lexical/react').toggleFormat('code'),
      $createTextNode('.'),
      $createTextNode(' Try typing in '),
      $createTextNode('some text').toggleFormat('bold'),
      $createTextNode(' with '),
      $createTextNode('different').toggleFormat('italic'),
      $createTextNode(' formats.'),
    );
    root.append(paragraph);
    const paragraph2 = $createParagraphNode();
    paragraph2.append(
      $createTextNode(
        'Make sure to check out the various plugins in the toolbar. You can also use #hashtags or @-mentions too!',
      ),
    );
    root.append(paragraph2);
    const paragraph3 = $createParagraphNode();
    paragraph3.append(
      $createTextNode(`If you'd like to find out more about Lexical, you can:`),
    );
    root.append(paragraph3);
    const list = $createListNode('bullet');
    list.append(
      $createListItemNode().append(
        $createTextNode(`Visit the `),
        $createLinkNode('https://lexical.dev/').append(
          $createTextNode('Lexical website'),
        ),
        $createTextNode(` for documentation and more information.`),
      ),
      $createListItemNode().append(
        $createTextNode(`Check out the code on our `),
        $createLinkNode('https://github.com/facebook/lexical').append(
          $createTextNode('GitHub repository'),
        ),
        $createTextNode(`.`),
      ),
      $createListItemNode().append(
        $createTextNode(`Playground code can be found `),
        $createLinkNode(
          'https://github.com/facebook/lexical/tree/main/packages/lexical-playground',
        ).append($createTextNode('here')),
        $createTextNode(`.`),
      ),
      $createListItemNode().append(
        $createTextNode(`Join our `),
        $createLinkNode('https://discord.com/invite/KmG4wQnnD9').append(
          $createTextNode('Discord Server'),
        ),
        $createTextNode(` and chat with the team.`),
      ),
    );
    root.append(list);
    const paragraph4 = $createParagraphNode();
    paragraph4.append(
      $createTextNode(
        `Lastly, we're constantly adding cool new features to this playground. So make sure you check back here when you next get a chance :).`,
      ),
    );
    root.append(paragraph4);
  }
}

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
      emptyEditor,
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
        <AutoFocusPlugin />
        <LexicalClearEditorPlugin />
        <MentionsPlugin />
        <EmojisPlugin />
        <HashtagsPlugin />
        <KeywordsPlugin />
        <SpeechToTextPlugin />
        <AutoLinkPlugin />
        <AutoScrollPlugin scrollRef={scrollRef} />
        {!isCollab && <CommentPlugin />}
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
              initialEditorState={
                isCollab ? null : emptyEditor ? undefined : prepopulatedRichText
              }
            />
            <MarkdownShortcutPlugin />
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
            <YouTubePlugin />
            <ClickableLinkPlugin />
            <HorizontalRulePlugin />
            <CharacterStylesPopupPlugin />
            <EquationsPlugin />
            <ExcalidrawPlugin />
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
