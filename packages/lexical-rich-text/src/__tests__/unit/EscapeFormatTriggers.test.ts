/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  CLICK_COMMAND,
  configExtension,
  IS_CODE,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_SPACE_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
} from 'lexical';
import {invariant, KeyboardEventMock} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

describe('RichTextExtension escapeFormatTriggers', () => {
  function createEditor() {
    return buildEditorFromExtensions({
      dependencies: [
        configExtension(RichTextExtension, {
          escapeFormatTriggers: {
            code: {arrow: true, click: true, enter: true, onlyAtBoundary: true},
          },
        }),
      ],
      name: 'test',
    });
  }

  function $getFirstTextNode() {
    const node = $getRoot().getFirstDescendant();
    invariant($isTextNode(node));
    return node;
  }

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

  describe('CLICK_COMMAND', () => {
    test('clears format when clicking at the end of a code node with no next sibling', async () => {
      using editor = createEditor();
      await setupCodeTextNode(editor);

      await editor.update(() => {
        $getRoot().selectEnd();
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
      using editor = createEditor();
      await setupCodeTextNode(editor);

      await editor.update(() => {
        const textNode = $getFirstTextNode();
        textNode.selectStart();
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
      using editor = createEditor();
      await setupCodeTextNode(editor);

      await editor.update(() => {
        const textNode = $getFirstTextNode();
        const selection = textNode.select(3, 3);
        selection.format = IS_CODE;
      });

      await editor.dispatchCommand(CLICK_COMMAND, new MouseEvent('click'));

      await editor.read(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection));
        expect(selection.format).toBe(IS_CODE);
      });
    });

    test('does not clear format at end of code node when it has a next sibling', async () => {
      using editor = createEditor();

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
        const codeNode = $getFirstTextNode();
        const selection = codeNode.selectEnd();
        selection.format = IS_CODE;
      });

      await editor.dispatchCommand(CLICK_COMMAND, new MouseEvent('click'));

      await editor.read(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection));
        expect(selection.format).toBe(IS_CODE);
      });
    });
  });

  describe('KEY_ENTER_COMMAND', () => {
    test('clears format when pressing Enter at the end of a code node', async () => {
      using editor = createEditor();
      await setupCodeTextNode(editor);

      await editor.update(() => {
        const selection = $getRoot().selectEnd();
        selection.format = IS_CODE;
      });

      await editor.dispatchCommand(KEY_ENTER_COMMAND, null);

      await editor.read(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection));
        expect(selection.format).toBe(0);
        expect(selection.style).toBe('');
      });
    });

    test('clears format when pressing Enter at the start of a code node', async () => {
      using editor = createEditor();
      await setupCodeTextNode(editor);

      await editor.update(() => {
        const textNode = $getFirstTextNode();
        const selection = textNode.selectStart();
        selection.format = IS_CODE;
      });

      await editor.dispatchCommand(KEY_ENTER_COMMAND, null);

      await editor.read(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection));
        expect(selection.format).toBe(0);
        expect(selection.style).toBe('');
      });
    });

    test('preserves code format when pressing Enter in the middle of a code node', async () => {
      using editor = createEditor();
      await setupCodeTextNode(editor);

      await editor.update(() => {
        const textNode = $getFirstTextNode();
        const selection = textNode.select(3, 3);
        selection.format = IS_CODE;
      });

      await editor.dispatchCommand(KEY_ENTER_COMMAND, null);

      await editor.read(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection));
        expect(selection.format).not.toBe(0);
      });
    });
  });

  describe('KEY_ARROW_RIGHT_COMMAND', () => {
    test('clears format when arrowing right at the end of a code node', async () => {
      using editor = createEditor();
      await setupCodeTextNode(editor);

      await editor.update(() => {
        const selection = $getRoot().selectEnd();
        selection.format = IS_CODE;
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
      using editor = createEditor();
      await setupCodeTextNode(editor);

      await editor.update(() => {
        const selection = $getRoot().selectEnd();
        selection.format = IS_CODE;
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
      using editor = createEditor();
      await setupCodeTextNode(editor);

      await editor.update(() => {
        const textNode = $getFirstTextNode();
        const selection = textNode.select(3, 3);
        selection.format = IS_CODE;
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
      using editor = createEditor();
      await setupCodeTextNode(editor);

      await editor.update(() => {
        const textNode = $getFirstTextNode();
        const selection = textNode.selectStart();
        selection.format = IS_CODE;
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
      using editor = createEditor();
      await setupCodeTextNode(editor);

      await editor.update(() => {
        const textNode = $getFirstTextNode();
        const selection = textNode.selectStart();
        selection.format = IS_CODE;
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
      using editor = createEditor();
      await setupCodeTextNode(editor);

      await editor.update(() => {
        const textNode = $getFirstTextNode();
        const selection = textNode.select(3, 3);
        selection.format = IS_CODE;
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

describe('RichTextExtension default capitalization reset', () => {
  function createDefaultEditor() {
    return buildEditorFromExtensions({
      dependencies: [RichTextExtension],
      name: 'test',
    });
  }

  async function setupFormattedTextNode(
    editor: LexicalEditor,
    format: 'capitalize' | 'uppercase' | 'lowercase',
  ) {
    await editor.update(() => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      const textNode = $createTextNode('hello');
      textNode.toggleFormat(format);
      paragraph.append(textNode);
      root.append(paragraph);
    });
  }

  for (const format of ['capitalize', 'uppercase', 'lowercase'] as const) {
    describe(`${format} format`, () => {
      test('clears on Enter key', async () => {
        using editor = createDefaultEditor();
        await setupFormattedTextNode(editor, format);

        await editor.update(() => {
          const selection = $getRoot().selectEnd();
          selection.toggleFormat(format);
        });

        await editor.dispatchCommand(KEY_ENTER_COMMAND, null);

        await editor.read(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection));
          expect(selection.hasFormat(format)).toBe(false);
        });
      });

      test('clears on Space key', async () => {
        using editor = createDefaultEditor();
        await setupFormattedTextNode(editor, format);

        await editor.update(() => {
          const selection = $getRoot().selectEnd();
          selection.toggleFormat(format);
        });

        await editor.dispatchCommand(
          KEY_SPACE_COMMAND,
          new KeyboardEventMock(),
        );

        await editor.read(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection));
          expect(selection.hasFormat(format)).toBe(false);
        });
      });

      test('clears on Tab key', async () => {
        using editor = createDefaultEditor();
        await setupFormattedTextNode(editor, format);

        await editor.update(() => {
          const selection = $getRoot().selectEnd();
          selection.toggleFormat(format);
        });

        await editor.dispatchCommand(KEY_TAB_COMMAND, new KeyboardEventMock());

        await editor.read(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection));
          expect(selection.hasFormat(format)).toBe(false);
        });
      });
    });
  }
});

describe('RichTextExtension escapeFormatTriggers mergeConfig', () => {
  test('overriding one format preserves default capitalization resets', async () => {
    using editor = buildEditorFromExtensions({
      dependencies: [
        configExtension(RichTextExtension, {
          escapeFormatTriggers: {
            code: {enter: true, onlyAtBoundary: true},
          },
        }),
      ],
      name: 'test',
    });

    await editor.update(() => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      const textNode = $createTextNode('hello');
      textNode.toggleFormat('uppercase');
      paragraph.append(textNode);
      root.append(paragraph);
    });

    await editor.update(() => {
      const selection = $getRoot().selectEnd();
      selection.toggleFormat('uppercase');
    });

    await editor.dispatchCommand(KEY_ENTER_COMMAND, null);

    await editor.read(() => {
      const selection = $getSelection();
      invariant($isRangeSelection(selection));
      expect(selection.hasFormat('uppercase')).toBe(false);
    });
  });

  test('null disables a default format', async () => {
    using editor = buildEditorFromExtensions({
      dependencies: [
        configExtension(RichTextExtension, {
          escapeFormatTriggers: {
            capitalize: null,
          },
        }),
      ],
      name: 'test',
    });

    await editor.update(() => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      const textNode = $createTextNode('hello');
      textNode.toggleFormat('capitalize');
      paragraph.append(textNode);
      root.append(paragraph);
    });

    await editor.update(() => {
      const selection = $getRoot().selectEnd();
      selection.toggleFormat('capitalize');
    });

    await editor.dispatchCommand(KEY_ENTER_COMMAND, null);

    await editor.read(() => {
      const selection = $getSelection();
      invariant($isRangeSelection(selection));
      expect(selection.hasFormat('capitalize')).toBe(true);
    });
  });
});
