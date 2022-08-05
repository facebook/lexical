/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/src/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/src/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/src/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/src/LexicalRichTextPlugin';
import {$createQuoteNode} from '@lexical/rich-text/src';
import {$wrapLeafNodesInElements} from '@lexical/selection/src';
import {
  $createRangeSelection,
  LexicalEditor,
  SerializedElementNode,
  SerializedTextNode,
  UNDO_COMMAND,
} from 'lexical/src';
import {TestComposer} from 'lexical/src/__tests__/utils';
import {$getRoot, $setSelection} from 'lexical/src/LexicalUtils';
import {$createParagraphNode} from 'lexical/src/nodes/LexicalParagraphNode';
import {$createTextNode} from 'lexical/src/nodes/LexicalTextNode';
import React from 'react';
import {createRoot} from 'react-dom/client';
import * as ReactTestUtils from 'react-dom/test-utils';

describe('LexicalHistory tests', () => {
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

  test('LexicalHistory.Redo after Quote Node', async () => {
    function Test(): JSX.Element {
      function TestPlugin() {
        // Plugin used just to get our hands on the Editor object
        [editor] = useLexicalComposerContext();
        return null;
      }

      return (
        <TestComposer>
          <RichTextPlugin
            contentEditable={<ContentEditable />}
            placeholder={
              <div className="editor-placeholder">Enter some text...</div>
            }
          />
          <TestPlugin />
          <HistoryPlugin />
        </TestComposer>
      );
    }

    ReactTestUtils.act(() => {
      reactRoot.render(<Test key="smth" />);
    });

    // Wait for update to complete
    await Promise.resolve().then();

    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        const root = $getRoot();
        const paragraph1 = createParagraphNode('AAA');
        const paragraph2 = createParagraphNode('BBB');

        // The editor has one child that is an empty
        // paragraph Node.
        root.getChildAtIndex(0)?.replace(paragraph1);
        root.append(paragraph2);
      });
    });

    const initialJSONState = editor.getEditorState().toJSON();

    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        const root = $getRoot();
        const selection = $createRangeSelection();

        const firstTextNode = root.getAllTextNodes()[0];
        selection.anchor.set(firstTextNode.getKey(), 0, 'text');
        selection.focus.set(firstTextNode.getKey(), 3, 'text');

        $setSelection(selection);
        $wrapLeafNodesInElements(selection, () => $createQuoteNode());
      });
    });

    const afterQuoteInsertionJSONState = editor.getEditorState().toJSON();
    expect(afterQuoteInsertionJSONState.root.children.length).toBe(2);
    expect(afterQuoteInsertionJSONState.root.children[0].type).toBe('quote');

    expect(
      (afterQuoteInsertionJSONState.root.children as SerializedElementNode[])[0]
        .children.length,
    ).toBe(1);
    expect(
      (afterQuoteInsertionJSONState.root.children as SerializedElementNode[])[0]
        .children[0].type,
    ).toBe('text');
    expect(
      (
        (
          afterQuoteInsertionJSONState.root.children as SerializedElementNode[]
        )[0].children[0] as SerializedTextNode
      ).text,
    ).toBe('AAA');

    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        editor.dispatchCommand(UNDO_COMMAND, undefined);
      });
    });

    expect(JSON.stringify(initialJSONState)).toBe(
      JSON.stringify(editor.getEditorState().toJSON()),
    );
  });
});

const createParagraphNode = (text: string) => {
  const paragraph = $createParagraphNode();
  const textNode = $createTextNode(text);

  paragraph.append(textNode);
  return paragraph;
};
