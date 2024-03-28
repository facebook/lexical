/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {ListItemNode, ListNode} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {
  INDENT_CONTENT_COMMAND,
  LexicalEditor,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical/src';
import {
  expectHtmlToBeEqual,
  html,
  TestComposer,
} from 'lexical/src/__tests__/utils';
import * as React from 'react';
import {createRoot, Root} from 'react-dom/client';
import * as ReactTestUtils from 'react-dom/test-utils';

import {
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '../../../../lexical-list/src/index';

describe('@lexical/list tests', () => {
  let container: HTMLDivElement;
  let reactRoot: Root;

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    // @ts-ignore
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
      //@ts-ignore-next-line
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

    expectHtmlToBeEqual(
      container.innerHTML,
      html`
        <div
          contenteditable="true"
          role="textbox"
          spellcheck="true"
          style="user-select: text; white-space: pre-wrap; word-break: break-word;"
          data-lexical-editor="true">
          <ul>
            <li value="1">
              <br />
            </li>
          </ul>
        </div>
      `,
    );

    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        editor.focus();
        editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      });
    });

    expectHtmlToBeEqual(
      container.innerHTML,
      html`
        <div
          contenteditable="true"
          role="textbox"
          spellcheck="true"
          style="user-select: text; white-space: pre-wrap; word-break: break-word;"
          data-lexical-editor="true">
          <p>
            <br />
          </p>
        </div>
        <div class="editor-placeholder">Enter some text...</div>
      `,
    );
  });

  test('Can create a list and indent/outdent it', async () => {
    ReactTestUtils.act(() => {
      reactRoot.render(<Test key="MegaSeeds, Morty!" />);
    });

    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        editor.focus();
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
      });
    });

    expectHtmlToBeEqual(
      container.innerHTML,
      html`
        <div
          contenteditable="true"
          role="textbox"
          spellcheck="true"
          style="user-select: text; white-space: pre-wrap; word-break: break-word;"
          data-lexical-editor="true">
          <ul>
            <li value="1">
              <br />
            </li>
          </ul>
        </div>
      `,
    );

    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        editor.focus();
        editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
      });
    });

    expectHtmlToBeEqual(
      container.innerHTML,
      html`
        <div
          contenteditable="true"
          role="textbox"
          spellcheck="true"
          style="user-select: text; white-space: pre-wrap; word-break: break-word;"
          data-lexical-editor="true">
          <ul>
            <li value="1">
              <ul>
                <li value="1"><br /></li>
              </ul>
            </li>
          </ul>
        </div>
      `,
    );

    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        editor.focus();
        editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
      });
    });

    expectHtmlToBeEqual(
      container.innerHTML,
      html`
        <div
          contenteditable="true"
          role="textbox"
          spellcheck="true"
          style="user-select: text; white-space: pre-wrap; word-break: break-word;"
          data-lexical-editor="true">
          <ul>
            <li value="1">
              <br />
            </li>
          </ul>
        </div>
      `,
    );
  });
});
