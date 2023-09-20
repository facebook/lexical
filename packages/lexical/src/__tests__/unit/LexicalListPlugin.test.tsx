/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {ListItemNode, ListNode} from '@lexical/list';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {useLexicalComposerContext} from '@lexical/react/src/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/src/LexicalContentEditable';
import LexicalErrorBoundary from '@lexical/react/src/LexicalErrorBoundary';
import {RichTextPlugin} from '@lexical/react/src/LexicalRichTextPlugin';
import {LexicalEditor} from 'lexical/src';
import {TestComposer} from 'lexical/src/__tests__/utils';
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import * as ReactTestUtils from 'react-dom/test-utils';

import {INSERT_UNORDERED_LIST_COMMAND} from '../../../../lexical-list/src/index';

describe('@lexical/list tests', () => {
  let container: HTMLDivElement | null = null;
  let reactRoot;

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container !== null) {
      document.body.removeChild(container);
    }
    container = null;

    jest.restoreAllMocks();
  });

  // Shared instance across tests
  let editor: LexicalEditor;

  function Test(): JSX.Element {
    function TestPlugin() {
      // Plugin used just to get our hands on the Editor object
      [editor] = useLexicalComposerContext();
      return null;
    }

    return (
      <TestComposer config={{nodes: [ListNode, ListItemNode], theme: {}}}>
        <RichTextPlugin
          contentEditable={<ContentEditable />}
          placeholder={
            <div className="editor-placeholder">Enter some text...</div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <TestPlugin />
        <ListPlugin />
      </TestComposer>
    );
  }

  test('Toggle an empty list on/off', async () => {
    ReactTestUtils.act(() => {
      reactRoot.render(<Test key="MegaSeeds, Morty!" />);
    });

    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        editor.focus();
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
      });
    });

    expect(container?.innerHTML).toBe(
      '<div contenteditable="true" role="textbox" spellcheck="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><ul><li value="1"><br></li></ul></div>',
    );
  });
});
