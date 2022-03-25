/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {CodeHighlightNode, CodeNode} from '@lexical/code';
import {HashtagNode} from '@lexical/hashtag';
import {AutoLinkNode, LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {OverflowNode} from '@lexical/overflow';
import LexicalContentEditable from '@lexical/react/LexicalContentEditable';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {TableCellNode, TableNode, TableRowNode} from '@lexical/table';
import {$rootTextContentCurry} from '@lexical/text';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import React from 'react';
import {createRoot} from 'react-dom/client';
import ReactTestUtils from 'react-dom/test-utils';

import LexicalComposer from '../../../src/LexicalComposer';
import PlainTextPlugin from '../../../src/LexicalPlainTextPlugin';
import RichTextPlugin from '../../../src/LexicalRichTextPlugin';
import {useLexicalComposerContext} from '../../LexicalComposerContext';

// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;

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
              theme: {},
            }}>
            <GrabEditor />
            {plugin === 'PlainTextPlugin' ? (
              <PlainTextPlugin
                contentEditable={<LexicalContentEditable />}
                initialEditorState={$initialEditorState}
              />
            ) : (
              <RichTextPlugin
                contentEditable={<LexicalContentEditable />}
                initialEditorState={$initialEditorState}
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
});
