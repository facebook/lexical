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
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {TableCellNode, TableNode, TableRowNode} from '@lexical/table';
import {$rootTextContentCurry} from '@lexical/text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isNodeSelection,
} from 'lexical';
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import * as ReactTestUtils from 'react-dom/test-utils';

import {LexicalComposer} from '../../LexicalComposer';
import {useLexicalComposerContext} from '../../LexicalComposerContext';
import {ContentEditable} from '../../LexicalContentEditable';
import {PlainTextPlugin} from '../../LexicalPlainTextPlugin';
import {RichTextPlugin} from '../../LexicalRichTextPlugin';

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
              namespace: 'PlaygroundEditor',
              nodes:
                plugin === 'PlainTextPlugin'
                  ? []
                  : [
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
                    ],
              onError: () => {
                throw Error();
              },
              theme: {},
            }}>
            <GrabEditor />
            {plugin === 'PlainTextPlugin' ? (
              <PlainTextPlugin
                contentEditable={<ContentEditable />}
                initialEditorState={$initialEditorState}
                placeholder=""
              />
            ) : (
              <RichTextPlugin
                contentEditable={<ContentEditable />}
                initialEditorState={$initialEditorState}
                placeholder=""
              />
            )}
          </LexicalComposer>
        );
      }

      await ReactTestUtils.act(async () => {
        reactRoot.render(<App />);
      });

      const text = editor.getEditorState().read($rootTextContentCurry);

      expect(text).toBe('foo');
    });
  }

  for (const plugin of ['PlainTextPlugin', 'RichTextPlugin']) {
    it(`${plugin} custom initialEditorState`, async () => {
      let editor;
      const initialEditorStateJson = `
      {
        "_nodeMap": [
          [
            "root",
            {
              "__children": ["2"],
              "__dir": "ltr",
              "__format": 0,
              "__indent": 0,
              "__key": "root",
              "__parent": null,
              "__type": "root"
            }
          ],
          [
            "2",
            {
              "__type": "paragraph",
              "__parent": "root",
              "__key": "2",
              "__children": ["3"],
              "__format": 0,
              "__indent": 0,
              "__dir": "ltr"
            }
          ],
          [
            "3",
            {
              "__type": "text",
              "__parent": "2",
              "__key": "3",
              "__text": "foo",
              "__format": 0,
              "__style": "",
              "__mode": 0,
              "__detail": 0
            }
          ]
        ],
        "_selection": {
          "anchor": { "key": "3", "offset": 1, "type": "text" },
          "focus": { "key": "3", "offset": 1, "type": "text" },
          "type": "range"
        }
      }
      `;

      function GrabEditor() {
        [editor] = useLexicalComposerContext();
        return null;
      }

      function App() {
        return (
          <LexicalComposer
            initialConfig={{
              namespace: 'PlaygroundEditor',
              nodes:
                plugin === 'PlainTextPlugin'
                  ? []
                  : [
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
                    ],
              onError: () => {
                throw Error();
              },
              theme: {},
            }}>
            <GrabEditor />
            {plugin === 'PlainTextPlugin' ? (
              <PlainTextPlugin
                contentEditable={<ContentEditable />}
                initialEditorState={initialEditorStateJson}
                placeholder=""
              />
            ) : (
              <RichTextPlugin
                contentEditable={<ContentEditable />}
                initialEditorState={initialEditorStateJson}
                placeholder=""
              />
            )}
          </LexicalComposer>
        );
      }

      await ReactTestUtils.act(async () => {
        reactRoot.render(<App />);
      });

      await editor.getEditorState().read(() => {
        expect($rootTextContentCurry()).toBe('foo');

        const selection = $getSelection();

        if ($isNodeSelection(selection)) {
          return;
        }

        expect(selection.anchor.getNode().getTextContent()).toBe('foo');
        expect(selection.focus.getNode().getTextContent()).toBe('foo');
      });
    });
  }
});
