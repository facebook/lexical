/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {registerEscapeFormatAtBoundary} from '@lexical/extension';
import {registerRichText} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  CLICK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  IS_CODE,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  type LexicalEditor,
} from 'lexical';
import {
  initializeUnitTest,
  invariant,
  KeyboardEventMock,
} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

describe('EscapeFormatAtBoundaryExtension', () => {
  initializeUnitTest((testEnv) => {
    async function setupCodeTextNode(editor: LexicalEditor) {
      await editor.update(() => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        const textNode = $createTextNode('code text');
        textNode.toggleFormat('code');
        paragraph.append(textNode);
        root.append(paragraph);
      });
    }

    function registerAll(editor: LexicalEditor) {
      const removeRichText = registerRichText(editor);
      const removeEscape = registerEscapeFormatAtBoundary(
        editor,
        ['code'],
        ['enter', 'click', 'arrow'],
      );
      return () => {
        removeRichText();
        removeEscape();
      };
    }

    describe('CLICK_COMMAND', () => {
      test('clears format when clicking at the end of a code node with no next sibling', async () => {
        const {editor} = testEnv;
        registerAll(editor);
        await setupCodeTextNode(editor);

        await editor.update(() => {
          const root = $getRoot();
          const textNode = root.getFirstDescendant()!;
          const selection = $createRangeSelection();
          selection.anchor.set(
            textNode.getKey(),
            textNode.getTextContentSize(),
            'text',
          );
          selection.focus.set(
            textNode.getKey(),
            textNode.getTextContentSize(),
            'text',
          );
          $setSelection(selection);
        });

        await editor.dispatchCommand(CLICK_COMMAND, new MouseEvent('click'));

        await editor.read(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection));
          expect(selection.format).toBe(0);
          expect(selection.style).toBe('');
        });
      });

      test('clears format when clicking at the start of a code node with no previous sibling', async () => {
        const {editor} = testEnv;
        registerAll(editor);
        await setupCodeTextNode(editor);

        await editor.update(() => {
          const root = $getRoot();
          const textNode = root.getFirstDescendant()!;
          const selection = $createRangeSelection();
          selection.anchor.set(textNode.getKey(), 0, 'text');
          selection.focus.set(textNode.getKey(), 0, 'text');
          $setSelection(selection);
        });

        await editor.dispatchCommand(CLICK_COMMAND, new MouseEvent('click'));

        await editor.read(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection));
          expect(selection.format).toBe(0);
          expect(selection.style).toBe('');
        });
      });

      test('does not clear format when clicking in the middle of a code node', async () => {
        const {editor} = testEnv;
        registerAll(editor);
        await setupCodeTextNode(editor);

        await editor.update(() => {
          const root = $getRoot();
          const textNode = root.getFirstDescendant()!;
          const selection = $createRangeSelection();
          selection.anchor.set(textNode.getKey(), 3, 'text');
          selection.focus.set(textNode.getKey(), 3, 'text');
          selection.format = IS_CODE;
          $setSelection(selection);
        });

        await editor.dispatchCommand(CLICK_COMMAND, new MouseEvent('click'));

        await editor.read(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection));
          expect(selection.format).toBe(IS_CODE);
        });
      });

      test('does not clear format at end of code node when it has a next sibling', async () => {
        const {editor} = testEnv;
        registerAll(editor);

        await editor.update(() => {
          const root = $getRoot();
          root.clear();
          const paragraph = $createParagraphNode();
          const codeNode = $createTextNode('code');
          codeNode.toggleFormat('code');
          const plainNode = $createTextNode(' plain');
          paragraph.append(codeNode, plainNode);
          root.append(paragraph);
        });

        await editor.update(() => {
          const root = $getRoot();
          const codeNode = root.getFirstDescendant()!;
          const selection = $createRangeSelection();
          selection.anchor.set(
            codeNode.getKey(),
            codeNode.getTextContentSize(),
            'text',
          );
          selection.focus.set(
            codeNode.getKey(),
            codeNode.getTextContentSize(),
            'text',
          );
          selection.format = IS_CODE;
          $setSelection(selection);
        });

        await editor.dispatchCommand(CLICK_COMMAND, new MouseEvent('click'));

        await editor.read(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection));
          expect(selection.format).toBe(IS_CODE);
        });
      });
    });

    describe('INSERT_PARAGRAPH_COMMAND', () => {
      test('clears format when pressing Enter at the end of a code node', async () => {
        const {editor} = testEnv;
        registerAll(editor);
        await setupCodeTextNode(editor);

        await editor.update(() => {
          const root = $getRoot();
          const textNode = root.getFirstDescendant()!;
          const selection = $createRangeSelection();
          selection.anchor.set(
            textNode.getKey(),
            textNode.getTextContentSize(),
            'text',
          );
          selection.focus.set(
            textNode.getKey(),
            textNode.getTextContentSize(),
            'text',
          );
          selection.format = IS_CODE;
          $setSelection(selection);
        });

        await editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);

        await editor.read(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection));
          expect(selection.format).toBe(0);
          expect(selection.style).toBe('');
        });
      });

      test('clears format when pressing Enter at the start of a code node', async () => {
        const {editor} = testEnv;
        registerAll(editor);
        await setupCodeTextNode(editor);

        await editor.update(() => {
          const root = $getRoot();
          const textNode = root.getFirstDescendant()!;
          const selection = $createRangeSelection();
          selection.anchor.set(textNode.getKey(), 0, 'text');
          selection.focus.set(textNode.getKey(), 0, 'text');
          selection.format = IS_CODE;
          $setSelection(selection);
        });

        await editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);

        await editor.read(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection));
          expect(selection.format).toBe(0);
          expect(selection.style).toBe('');
        });
      });

      test('preserves code format when pressing Enter in the middle of a code node', async () => {
        const {editor} = testEnv;
        registerAll(editor);
        await setupCodeTextNode(editor);

        await editor.update(() => {
          const root = $getRoot();
          const textNode = root.getFirstDescendant()!;
          const selection = $createRangeSelection();
          selection.anchor.set(textNode.getKey(), 3, 'text');
          selection.focus.set(textNode.getKey(), 3, 'text');
          selection.format = IS_CODE;
          $setSelection(selection);
        });

        await editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);

        await editor.read(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection));
          expect(selection.format).not.toBe(0);
        });
      });
    });

    describe('KEY_ARROW_RIGHT_COMMAND', () => {
      test('clears format when arrowing right at the end of a code node', async () => {
        const {editor} = testEnv;
        registerAll(editor);
        await setupCodeTextNode(editor);

        await editor.update(() => {
          const root = $getRoot();
          const textNode = root.getFirstDescendant()!;
          const selection = $createRangeSelection();
          selection.anchor.set(
            textNode.getKey(),
            textNode.getTextContentSize(),
            'text',
          );
          selection.focus.set(
            textNode.getKey(),
            textNode.getTextContentSize(),
            'text',
          );
          selection.format = IS_CODE;
          $setSelection(selection);
        });

        const keyEvent = new KeyboardEventMock();
        await editor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, keyEvent);

        await editor.read(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection));
          expect(selection.format).toBe(0);
          expect(selection.style).toBe('');
        });
      });

      test('does not clear format when shift is held (extending selection)', async () => {
        const {editor} = testEnv;
        registerAll(editor);
        await setupCodeTextNode(editor);

        await editor.update(() => {
          const root = $getRoot();
          const textNode = root.getFirstDescendant()!;
          const selection = $createRangeSelection();
          selection.anchor.set(
            textNode.getKey(),
            textNode.getTextContentSize(),
            'text',
          );
          selection.focus.set(
            textNode.getKey(),
            textNode.getTextContentSize(),
            'text',
          );
          selection.format = IS_CODE;
          $setSelection(selection);
        });

        const keyEvent = new KeyboardEventMock();
        keyEvent.shiftKey = true;
        await editor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, keyEvent);

        await editor.read(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection));
          expect(selection.format).toBe(IS_CODE);
        });
      });

      test('does not clear format in the middle of a code node', async () => {
        const {editor} = testEnv;
        registerAll(editor);
        await setupCodeTextNode(editor);

        await editor.update(() => {
          const root = $getRoot();
          const textNode = root.getFirstDescendant()!;
          const selection = $createRangeSelection();
          selection.anchor.set(textNode.getKey(), 3, 'text');
          selection.focus.set(textNode.getKey(), 3, 'text');
          selection.format = IS_CODE;
          $setSelection(selection);
        });

        const keyEvent = new KeyboardEventMock();
        await editor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, keyEvent);

        await editor.read(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection));
          expect(selection.format).toBe(IS_CODE);
        });
      });
    });

    describe('KEY_ARROW_LEFT_COMMAND', () => {
      test('clears format when arrowing left at the start of a code node', async () => {
        const {editor} = testEnv;
        registerAll(editor);
        await setupCodeTextNode(editor);

        await editor.update(() => {
          const root = $getRoot();
          const textNode = root.getFirstDescendant()!;
          const selection = $createRangeSelection();
          selection.anchor.set(textNode.getKey(), 0, 'text');
          selection.focus.set(textNode.getKey(), 0, 'text');
          selection.format = IS_CODE;
          $setSelection(selection);
        });

        const keyEvent = new KeyboardEventMock();
        await editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, keyEvent);

        await editor.read(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection));
          expect(selection.format).toBe(0);
          expect(selection.style).toBe('');
        });
      });

      test('does not clear format when shift is held (extending selection)', async () => {
        const {editor} = testEnv;
        registerAll(editor);
        await setupCodeTextNode(editor);

        await editor.update(() => {
          const root = $getRoot();
          const textNode = root.getFirstDescendant()!;
          const selection = $createRangeSelection();
          selection.anchor.set(textNode.getKey(), 0, 'text');
          selection.focus.set(textNode.getKey(), 0, 'text');
          selection.format = IS_CODE;
          $setSelection(selection);
        });

        const keyEvent = new KeyboardEventMock();
        keyEvent.shiftKey = true;
        await editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, keyEvent);

        await editor.read(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection));
          expect(selection.format).toBe(IS_CODE);
        });
      });

      test('does not clear format in the middle of a code node', async () => {
        const {editor} = testEnv;
        registerAll(editor);
        await setupCodeTextNode(editor);

        await editor.update(() => {
          const root = $getRoot();
          const textNode = root.getFirstDescendant()!;
          const selection = $createRangeSelection();
          selection.anchor.set(textNode.getKey(), 3, 'text');
          selection.focus.set(textNode.getKey(), 3, 'text');
          selection.format = IS_CODE;
          $setSelection(selection);
        });

        const keyEvent = new KeyboardEventMock();
        await editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, keyEvent);

        await editor.read(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection));
          expect(selection.format).toBe(IS_CODE);
        });
      });
    });
  });
});
