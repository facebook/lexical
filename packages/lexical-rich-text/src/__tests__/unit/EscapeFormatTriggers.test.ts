/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {EscapeFormatTriggerConfig, RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  CLICK_COMMAND,
  configExtension,
  InitialEditorStateType,
  IS_CODE,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_SPACE_COMMAND,
  KEY_TAB_COMMAND,
  RangeSelection,
  TEXT_TYPE_TO_FORMAT,
} from 'lexical';
import {KeyboardEventMock} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, test} from 'vitest';

// This simulates what the $updateSelectionFormatStyleFromTextNode infrastructure
// would normally do in response to onSelectionChange DOM events, with some extra
// constraints to ensure that tests are setup in the expected manner.
function $updateSelectionFormat(
  selection: RangeSelection,
  expectFormat: number,
) {
  assert(
    selection.anchor.type === 'text' &&
      selection.focus.type === 'text' &&
      selection.anchor.key === selection.focus.key,
    'Selection must have anchor and focus on the same TextNode',
  );
  const anchorNode = selection.anchor.getNode();
  const format = anchorNode.getFormat();
  expect(format).toBe(expectFormat);
  selection.setFormat(format);
}

describe('RichTextExtension escapeFormatTriggers', () => {
  function createEditor($initialEditorState?: InitialEditorStateType) {
    return buildEditorFromExtensions({
      $initialEditorState,
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
    assert($isTextNode(node));
    return node;
  }

  function $setupCodeTextNode() {
    $getRoot().append(
      $createParagraphNode().append(
        $createTextNode('code text').toggleFormat('code'),
      ),
    );
  }

  describe('CLICK_COMMAND', () => {
    test('clears format when clicking at the end of a code node with no next sibling', () => {
      using editor = createEditor(() => {
        $setupCodeTextNode();
        $updateSelectionFormat($getRoot().selectEnd(), IS_CODE);
      });

      editor.dispatchCommand(CLICK_COMMAND, new MouseEvent('click'));

      editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.format).toBe(0);
        expect(selection.style).toBe('');
      });
    });

    test('clears format when clicking at the start of a code node with no previous sibling', () => {
      using editor = createEditor(() => {
        $setupCodeTextNode();
        $updateSelectionFormat($getRoot().selectStart(), IS_CODE);
      });

      editor.dispatchCommand(CLICK_COMMAND, new MouseEvent('click'));

      editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.format).toBe(0);
        expect(selection.style).toBe('');
      });
    });

    test('does not clear format when clicking in the middle of a code node', () => {
      using editor = createEditor(() => {
        $setupCodeTextNode();
        $updateSelectionFormat($getFirstTextNode().select(3, 3), IS_CODE);
      });

      editor.dispatchCommand(CLICK_COMMAND, new MouseEvent('click'));

      editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.format).toBe(IS_CODE);
      });
    });

    test('does not clear format at end of code node when it has a next sibling', () => {
      using editor = createEditor(() => {
        const codeNode = $createTextNode('code').toggleFormat('code');
        $getRoot().append(
          $createParagraphNode().append(codeNode, $createTextNode(' plain')),
        );
        $updateSelectionFormat(codeNode.select(), IS_CODE);
      });

      editor.dispatchCommand(CLICK_COMMAND, new MouseEvent('click'));

      editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.format).toBe(IS_CODE);
      });
    });
  });

  describe('KEY_ENTER_COMMAND', () => {
    test('clears format when pressing Enter at the end of a code node', () => {
      using editor = createEditor(() => {
        $setupCodeTextNode();
        $updateSelectionFormat($getRoot().selectEnd(), IS_CODE);
      });

      editor.dispatchCommand(KEY_ENTER_COMMAND, null);

      editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.format).toBe(0);
        expect(selection.style).toBe('');
      });
    });

    test('clears format when pressing Enter at the start of a code node', () => {
      using editor = createEditor(() => {
        $setupCodeTextNode();
        $updateSelectionFormat($getRoot().selectStart(), IS_CODE);
      });

      editor.dispatchCommand(KEY_ENTER_COMMAND, null);

      editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.format).toBe(0);
        expect(selection.style).toBe('');
      });
    });

    test('preserves code format when pressing Enter in the middle of a code node', () => {
      using editor = createEditor(() => {
        $setupCodeTextNode();
        $updateSelectionFormat($getFirstTextNode().select(3, 3), IS_CODE);
      });

      editor.dispatchCommand(KEY_ENTER_COMMAND, null);

      editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.format).not.toBe(0);
      });
    });
  });

  describe('KEY_ARROW_RIGHT_COMMAND', () => {
    test('clears format when arrowing right at the end of a code node', () => {
      using editor = createEditor(() => {
        $setupCodeTextNode();
        $updateSelectionFormat($getRoot().selectEnd(), IS_CODE);
      });

      const keyEvent = new KeyboardEventMock();
      editor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, keyEvent);

      editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.format).toBe(0);
        expect(selection.style).toBe('');
      });
    });

    test('does not clear format when shift is held (extending selection)', () => {
      using editor = createEditor(() => {
        $setupCodeTextNode();
        $updateSelectionFormat($getRoot().selectEnd(), IS_CODE);
      });

      const keyEvent = new KeyboardEventMock();
      keyEvent.shiftKey = true;
      editor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, keyEvent);

      editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.format).toBe(IS_CODE);
      });
    });

    test('does not clear format in the middle of a code node', () => {
      using editor = createEditor(() => {
        $setupCodeTextNode();
        $updateSelectionFormat($getFirstTextNode().select(3, 3), IS_CODE);
      });

      const keyEvent = new KeyboardEventMock();
      editor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, keyEvent);

      editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.format).toBe(IS_CODE);
      });
    });
  });

  describe('KEY_ARROW_LEFT_COMMAND', () => {
    test('clears format when arrowing left at the start of a code node', () => {
      using editor = createEditor(() => {
        $setupCodeTextNode();
        $updateSelectionFormat($getRoot().selectStart(), IS_CODE);
      });

      const keyEvent = new KeyboardEventMock();
      editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, keyEvent);

      editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.format).toBe(0);
        expect(selection.style).toBe('');
      });
    });

    test('does not clear format when shift is held (extending selection)', () => {
      using editor = createEditor(() => {
        $setupCodeTextNode();
        $updateSelectionFormat($getRoot().selectStart(), IS_CODE);
      });

      const keyEvent = new KeyboardEventMock();
      keyEvent.shiftKey = true;
      editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, keyEvent);

      editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.format).toBe(IS_CODE);
      });
    });

    test('does not clear format in the middle of a code node', () => {
      using editor = createEditor(() => {
        $setupCodeTextNode();
        $updateSelectionFormat($getFirstTextNode().select(3, 3), IS_CODE);
      });

      const keyEvent = new KeyboardEventMock();
      editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, keyEvent);

      editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.format).toBe(IS_CODE);
      });
    });
  });
});

describe('RichTextExtension default capitalization reset', () => {
  for (const format of ['capitalize', 'uppercase', 'lowercase'] as const) {
    describe(`${format} format`, () => {
      function createDefaultEditor() {
        return buildEditorFromExtensions({
          $initialEditorState: () => {
            $updateSelectionFormat(
              $getRoot()
                .append(
                  $createParagraphNode().append(
                    $createTextNode('hello').toggleFormat(format),
                  ),
                )
                .selectEnd(),
              TEXT_TYPE_TO_FORMAT[format],
            );
          },
          dependencies: [RichTextExtension],
          name: 'test',
        });
      }

      for (const COMMAND of [
        KEY_ENTER_COMMAND,
        KEY_SPACE_COMMAND,
        KEY_TAB_COMMAND,
      ] as const) {
        test(`clears on ${COMMAND.type}`, () => {
          using editor = createDefaultEditor();

          editor.dispatchCommand(COMMAND, new KeyboardEventMock());

          editor.read(() => {
            const selection = $getSelection();
            assert($isRangeSelection(selection));
            expect(selection.hasFormat(format)).toBe(false);
          });
        });
      }
    });
  }
});

describe('RichTextExtension escapeFormatTriggers mergeConfig', () => {
  function buildEditorWithEscapeFormatTriggers(
    escapeFormatTriggers: EscapeFormatTriggerConfig,
  ) {
    return buildEditorFromExtensions({
      $initialEditorState: () => {
        $updateSelectionFormat(
          $getRoot()
            .append(
              $createParagraphNode().append(
                $createTextNode('hello').toggleFormat('uppercase'),
              ),
            )
            .selectEnd(),
          TEXT_TYPE_TO_FORMAT.uppercase,
        );
      },
      dependencies: [
        configExtension(RichTextExtension, {
          escapeFormatTriggers,
        }),
      ],
      name: 'test',
    });
  }
  test('overriding one format preserves default capitalization resets', () => {
    using editor = buildEditorWithEscapeFormatTriggers({
      code: {enter: true, onlyAtBoundary: true},
    });

    editor.dispatchCommand(KEY_ENTER_COMMAND, null);

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.hasFormat('uppercase')).toBe(false);
    });
  });

  test('null disables a default format', () => {
    using editor = buildEditorWithEscapeFormatTriggers({
      uppercase: null,
    });

    editor.dispatchCommand(KEY_ENTER_COMMAND, null);

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.hasFormat('uppercase')).toBe(true);
    });
  });

  test('escapeFormatTriggers can be modified as a signal', () => {
    using editor = buildEditorWithEscapeFormatTriggers({
      uppercase: null,
    });
    // re-enable the behavior here
    const dep = getExtensionDependencyFromEditor(editor, RichTextExtension);
    expect(dep.output.escapeFormatTriggers.peek().uppercase).toBe(null);
    dep.output.escapeFormatTriggers.value = {
      ...dep.output.escapeFormatTriggers.value,
      uppercase: {enter: true},
    };

    editor.dispatchCommand(KEY_ENTER_COMMAND, null);

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.hasFormat('uppercase')).toBe(false);
    });
  });
});
