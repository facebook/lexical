/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {CodeHighlightNode, CodeNode} from '@lexical/code';
import {HashtagNode} from '@lexical/hashtag';
import {AutoLinkNode, LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {OverflowNode} from '@lexical/overflow';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {TableCellNode, TableNode, TableRowNode} from '@lexical/table';
import {$rootTextContent} from '@lexical/text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import * as ReactTestUtils from 'react-dom/test-utils';

import {LexicalComposer} from '../../LexicalComposer';
import {ContentEditable} from '../../LexicalContentEditable';
import {PlainTextPlugin} from '../../LexicalPlainTextPlugin';
import {RichTextPlugin} from '../../LexicalRichTextPlugin';

const RICH_TEXT_NODES = [
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  HashtagNode,
  CodeHighlightNode,
  AutoLinkNode,
  LinkNode,
  OverflowNode,
];

describe('LexicalNodeHelpers tests', () => {
  let container = null;
  let reactRoot;

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;

    jest.restoreAllMocks();
  });

  for (const plugin of ['PlainTextPlugin', 'RichTextPlugin']) {
    it(`${plugin} custom initialEditorState`, async () => {
      let editor;

      function GrabEditor() {
        [editor] = useLexicalComposerContext();
        return null;
      }

      const $initialEditorState = () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('foo')),
        );
      };

      function App() {
        return (
          <LexicalComposer
            initialConfig={{
              editorState: $initialEditorState,
              namespace: '',
              nodes: plugin === 'PlainTextPlugin' ? [] : RICH_TEXT_NODES,
              onError: () => {
                throw Error();
              },
              theme: {},
            }}>
            <GrabEditor />
            {plugin === 'PlainTextPlugin' ? (
              <PlainTextPlugin
                contentEditable={<ContentEditable />}
                placeholder={null}
                ErrorBoundary={LexicalErrorBoundary}
              />
            ) : (
              <RichTextPlugin
                contentEditable={<ContentEditable />}
                placeholder={null}
                ErrorBoundary={LexicalErrorBoundary}
              />
            )}
          </LexicalComposer>
        );
      }

      await ReactTestUtils.act(async () => {
        reactRoot.render(<App />);
      });

      const text = editor.getEditorState().read($rootTextContent);
      expect(text).toBe('foo');
    });
  }

  for (const plugin of ['PlainTextPlugin', 'RichTextPlugin']) {
    it(`${plugin} custom initialEditorState`, async () => {
      let editor;
      const initialEditorStateJson = `
      {"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"foo","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}
      `;

      function GrabEditor() {
        [editor] = useLexicalComposerContext();
        return null;
      }

      function App() {
        return (
          <LexicalComposer
            initialConfig={{
              editorState: initialEditorStateJson,
              namespace: '',
              nodes: plugin === 'PlainTextPlugin' ? [] : RICH_TEXT_NODES,
              onError: () => {
                throw Error();
              },
              theme: {},
            }}>
            <GrabEditor />
            {plugin === 'PlainTextPlugin' ? (
              <PlainTextPlugin
                contentEditable={<ContentEditable />}
                placeholder={null}
                ErrorBoundary={LexicalErrorBoundary}
              />
            ) : (
              <RichTextPlugin
                contentEditable={<ContentEditable />}
                placeholder={null}
                ErrorBoundary={LexicalErrorBoundary}
              />
            )}
          </LexicalComposer>
        );
      }

      await ReactTestUtils.act(async () => {
        reactRoot.render(<App />);
      });

      await editor.focus();

      await editor.getEditorState().read(() => {
        expect($rootTextContent()).toBe('foo');

        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return;
        }

        expect(selection.anchor.getNode().getTextContent()).toBe('foo');
        expect(selection.focus.getNode().getTextContent()).toBe('foo');
      });
    });
  }

  for (const plugin of ['PlainTextPlugin', 'RichTextPlugin']) {
    it(`${plugin} can hide placeholder when non-editable`, async () => {
      let editor;

      function GrabEditor() {
        [editor] = useLexicalComposerContext();
        return null;
      }

      function App() {
        return (
          <LexicalComposer
            initialConfig={{
              namespace: '',
              nodes: plugin === 'PlainTextPlugin' ? [] : RICH_TEXT_NODES,
              onError: () => {
                throw Error();
              },
              theme: {},
            }}>
            <GrabEditor />
            {plugin === 'PlainTextPlugin' ? (
              <PlainTextPlugin
                contentEditable={<ContentEditable />}
                placeholder={(isEditable) =>
                  isEditable ? (
                    <span className="placeholder">My placeholder</span>
                  ) : null
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
            ) : (
              <RichTextPlugin
                contentEditable={<ContentEditable />}
                placeholder={(isEditable) =>
                  isEditable ? (
                    <span className="placeholder">My placeholder</span>
                  ) : null
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
            )}
          </LexicalComposer>
        );
      }

      await ReactTestUtils.act(async () => {
        reactRoot.render(<App />);
      });

      function placeholderText() {
        const placeholderContainer = container.querySelector('.placeholder');
        return placeholderContainer && placeholderContainer.textContent;
      }

      expect(placeholderText()).toBe('My placeholder');
      await ReactTestUtils.act(async () => {
        editor.setEditable(false);
        reactRoot.render(<App />);
      });
      expect(placeholderText()).toBe(null);
    });
  }
});
