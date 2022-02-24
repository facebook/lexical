/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {$textContentCurry} from '@lexical/helpers/root';
import LexicalContentEditable from '@lexical/react/LexicalContentEditable';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import ExtendedNodes from 'lexical/ExtendedNodes';
import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import LexicalComposer from '../../../src/LexicalComposer';
import RichTextPlugin from '../../../src/LexicalRichTextPlugin';
import {useLexicalComposerContext} from '../../LexicalComposerContext';

describe('LexicalNodeHelpers tests', () => {
  let container = null;
  let reactRoot;

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = ReactDOM.createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;

    jest.restoreAllMocks();
  });

  it('Custom initialEditorState', async () => {
    let editor;

    function GrabEditor() {
      [editor] = useLexicalComposerContext();
      return null;
    }

    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            namespace: 'PlaygroundEditor',
            nodes: [...ExtendedNodes],
            theme: {},
          }}>
          <GrabEditor />
          <RichTextPlugin
            contentEditable={<LexicalContentEditable />}
            initialEditorState={() => {
              $getRoot().append(
                $createParagraphNode().append($createTextNode('foo')),
              );
            }}
          />
        </LexicalComposer>
      );
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });

    const text = editor.getEditorState().read($textContentCurry);
    expect(text).toBe('foo');
  });
});
