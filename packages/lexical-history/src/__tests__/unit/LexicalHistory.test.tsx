/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createEmptyHistoryState, registerHistory} from '@lexical/history';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {$createQuoteNode} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {
  $createNodeSelection,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $isNodeSelection,
  $setSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  LexicalEditor,
  REDO_COMMAND,
  SerializedElementNode,
  SerializedTextNode,
  UNDO_COMMAND,
} from 'lexical/src';
import {createTestEditor, TestComposer} from 'lexical/src/__tests__/utils';
import React from 'react';
import {createRoot, Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';

describe('LexicalHistory tests', () => {
  let container: HTMLDivElement | null = null;
  let reactRoot: Root;

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
      <TestComposer>
        <RichTextPlugin
          contentEditable={<ContentEditable />}
          placeholder={
            <div className="editor-placeholder">Enter some text...</div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <TestPlugin />
        <HistoryPlugin />
      </TestComposer>
    );
  }

  test('LexicalHistory after clearing', async () => {
    let canRedo = true;
    let canUndo = true;

    ReactTestUtils.act(() => {
      reactRoot.render(<Test key="smth" />);
    });

    editor.registerCommand<boolean>(
      CAN_REDO_COMMAND,
      (payload) => {
        canRedo = payload;
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    editor.registerCommand<boolean>(
      CAN_UNDO_COMMAND,
      (payload) => {
        canUndo = payload;
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    await Promise.resolve().then();

    await ReactTestUtils.act(async () => {
      editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
    });

    expect(canRedo).toBe(false);
    expect(canUndo).toBe(false);
  });

  test('LexicalHistory.Redo after Quote Node', async () => {
    ReactTestUtils.act(() => {
      reactRoot.render(<Test key="smth" />);
    });

    // Wait for update to complete
    await Promise.resolve().then();

    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        const root = $getRoot();
        const paragraph1 = $createParagraphNodeWithText('AAA');
        const paragraph2 = $createParagraphNodeWithText('BBB');

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
        $setBlocksType(selection, () => $createQuoteNode());
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

  test('LexicalHistory in sequence: change, undo, redo, undo, change', async () => {
    let canRedo = false;
    let canUndo = false;

    ReactTestUtils.act(() => {
      reactRoot.render(<Test key="smth" />);
    });

    editor.registerCommand<boolean>(
      CAN_REDO_COMMAND,
      (payload) => {
        canRedo = payload;
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    editor.registerCommand<boolean>(
      CAN_UNDO_COMMAND,
      (payload) => {
        canUndo = payload;
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    // focus (needs the focus to initialize)
    await ReactTestUtils.act(async () => {
      editor.focus();
    });

    expect(canRedo).toBe(false);
    expect(canUndo).toBe(false);

    // change
    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNodeWithText('foo');
        root.append(paragraph);
      });
    });
    expect(canRedo).toBe(false);
    expect(canUndo).toBe(true);

    // undo
    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        editor.dispatchCommand(UNDO_COMMAND, undefined);
      });
    });
    expect(canRedo).toBe(true);
    expect(canUndo).toBe(false);

    // redo
    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        editor.dispatchCommand(REDO_COMMAND, undefined);
      });
    });
    expect(canRedo).toBe(false);
    expect(canUndo).toBe(true);

    // undo
    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        editor.dispatchCommand(UNDO_COMMAND, undefined);
      });
    });
    expect(canRedo).toBe(true);
    expect(canUndo).toBe(false);

    // change
    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNodeWithText('foo');
        root.append(paragraph);
      });
    });

    expect(canRedo).toBe(false);
    expect(canUndo).toBe(true);
  });

  test('undoStack selection points to the same editor', async () => {
    const editor_ = createTestEditor({namespace: 'parent'});
    const sharedHistory = createEmptyHistoryState();
    registerHistory(editor_, sharedHistory, 1000);
    await editor_.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
    });
    await editor_.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
      const nodeSelection = $createNodeSelection();
      nodeSelection.add(paragraph.getKey());
      $setSelection(nodeSelection);
    });
    const nestedEditor = createTestEditor({namespace: 'nested'});
    await nestedEditor.update(
      () => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        paragraph.selectEnd();
      },
      {
        tag: 'history-merge',
      },
    );
    nestedEditor._parentEditor = editor_;
    registerHistory(nestedEditor, sharedHistory, 1000);

    await nestedEditor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
      paragraph.selectEnd();
    });

    expect(sharedHistory.undoStack.length).toBe(2);
    await editor_.dispatchCommand(UNDO_COMMAND, undefined);
    expect($isNodeSelection(editor_.getEditorState()._selection)).toBe(true);
  });
});

const $createParagraphNodeWithText = (text: string) => {
  const paragraph = $createParagraphNode();
  const textNode = $createTextNode(text);

  paragraph.append(textNode);
  return paragraph;
};
