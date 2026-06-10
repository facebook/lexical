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
import {$isBlockFullySelected} from '@lexical/utils';
import {
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $selectAll,
  $setSelection,
  configExtension,
  createEditor,
  defineExtension,
  type ElementNode,
  type LexicalEditor,
  SELECT_ALL_COMMAND,
} from 'lexical';
import {
  $createTestDecoratorNode,
  TestDecoratorNode,
} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, test} from 'vitest';

import {PreventSelectAllExtension} from '../../PreventSelectAllExtension';
import {SelectBlockExtension} from '../../SelectBlockExtension';

function setUpEditor(
  options: {
    cascadeSelection?: boolean;
    disabled?: boolean;
  } = {},
) {
  const {cascadeSelection = false, disabled = false} = options;
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('first')),
          $createParagraphNode().append($createTextNode('second')),
        );
      },
      dependencies: [
        configExtension(SelectBlockExtension, {cascadeSelection, disabled}),
      ],
      name: 'select-block-test',
      nodes: [TestDecoratorNode],
      register: editor => {
        const rootElement = document.createElement('div');
        rootElement.contentEditable = 'true';
        document.body.appendChild(rootElement);
        editor.setRootElement(rootElement);
        return () => rootElement.remove();
      },
    }),
  );
}

function selectAllKeyboardEvent(): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ctrlKey: true,
    key: 'a',
  });
}

function $secondParagraph(): ElementNode {
  const node = $getRoot().getChildAtIndex(1);
  assert($isElementNode(node), 'second paragraph must exist');
  return node;
}

function $expectFullySelected(blockNode: ElementNode): void {
  const selection = $getSelection();
  assert($isRangeSelection(selection), 'expecting a RangeSelection');
  expect($isBlockFullySelected(blockNode, selection)).toBe(true);
}

function setUpNestedEditor(parentEditor: LexicalEditor): LexicalEditor {
  const nestedEditor = createEditor({
    namespace: 'nested',
    onError: error => {
      throw error;
    },
    parentEditor,
  });
  nestedEditor.update(
    () => {
      $getRoot().append(
        $createParagraphNode().append($createTextNode('caption')),
      );
    },
    {discrete: true},
  );
  return nestedEditor;
}

describe('SelectBlockExtension', () => {
  test('selects the block first and then the whole document', () => {
    using editor = setUpEditor();
    editor.update(
      () => {
        const text = $secondParagraph().getFirstDescendant();
        assert($isTextNode(text));
        text.select(3, 3);
      },
      {discrete: true},
    );

    expect(
      editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent()),
    ).toBe(true);
    editor.read(() => {
      $expectFullySelected($secondParagraph());
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect($isBlockFullySelected($getRoot(), selection)).toBe(false);
    });

    expect(
      editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent()),
    ).toBe(true);
    editor.read(() => {
      $expectFullySelected($getRoot());
    });
  });

  test('repeated select all does not change the selection', () => {
    using editor = setUpEditor();
    editor.update(
      () => {
        const text = $secondParagraph().getFirstDescendant();
        assert($isTextNode(text));
        text.select(3, 3);
      },
      {discrete: true},
    );
    editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent());
    editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent());
    const before = editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      return [
        selection.anchor.key,
        selection.anchor.offset,
        selection.focus.key,
        selection.focus.offset,
      ];
    });
    editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent());
    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect([
        selection.anchor.key,
        selection.anchor.offset,
        selection.focus.key,
        selection.focus.offset,
      ]).toEqual(before);
      $expectFullySelected($getRoot());
    });
  });

  test('a selection spanning multiple blocks expands to the whole document', () => {
    using editor = setUpEditor();
    editor.update(
      () => {
        const firstText = $getRoot().getFirstDescendant();
        const secondText = $secondParagraph().getFirstDescendant();
        assert($isTextNode(firstText) && $isTextNode(secondText));
        const selection = firstText.select(2, 2);
        selection.focus.set(secondText.getKey(), 3, 'text');
      },
      {discrete: true},
    );

    expect(
      editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent()),
    ).toBe(true);
    editor.read(() => {
      $expectFullySelected($getRoot());
    });
  });

  test('a selection anchored on the root still selects all', () => {
    using editor = setUpEditor();
    editor.update(
      () => {
        // A partial selection with points directly on the root, which has
        // no top level element
        $getRoot().select(0, 1);
      },
      {discrete: true},
    );

    expect(
      editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent()),
    ).toBe(true);
    editor.read(() => {
      $expectFullySelected($getRoot());
    });
  });

  test('select all works after the document changes while fully selected', () => {
    using editor = setUpEditor();
    editor.update(
      () => {
        const text = $secondParagraph().getFirstDescendant();
        assert($isTextNode(text));
        text.select(3, 3);
      },
      {discrete: true},
    );
    editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent());
    editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent());
    // Simulate a remote or programmatic change that does not touch the
    // selection, such as a collaborator appending a paragraph
    editor.update(
      () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('third')),
        );
      },
      {discrete: true},
    );

    expect(
      editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent()),
    ).toBe(true);
    editor.read(() => {
      $expectFullySelected($getRoot());
    });
  });

  test('select all preserves a manually created full selection', () => {
    using editor = setUpEditor();
    editor.update(
      () => {
        const first = $getRoot().getFirstDescendant();
        const last = $getRoot().getLastDescendant();
        assert($isTextNode(first) && $isTextNode(last));
        // a backward selection of the whole document, as if the user
        // selected from the end to the beginning
        const selection = last.select('second'.length, 'second'.length);
        selection.focus.set(first.getKey(), 0, 'text');
      },
      {discrete: true},
    );

    expect(
      editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent()),
    ).toBe(true);
    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      // the already fully selected document is not rewritten by $selectAll
      expect(selection.isBackward()).toBe(true);
      $expectFullySelected($getRoot());
    });
  });

  test('select all in a single-block document', () => {
    using editor = setUpEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root
          .clear()
          .append($createParagraphNode().append($createTextNode('only')));
        const text = root.getFirstDescendant();
        assert($isTextNode(text));
        text.select(2, 2);
      },
      {discrete: true},
    );

    // selecting the only block selects the whole document
    expect(
      editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent()),
    ).toBe(true);
    editor.read(() => {
      $expectFullySelected($getRoot());
    });

    // pressing again is still handled and remains fully selected
    expect(
      editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent()),
    ).toBe(true);
    editor.read(() => {
      $expectFullySelected($getRoot());
    });
  });

  test('a node selection of an inline decorator selects its block', () => {
    using editor = setUpEditor();
    editor.update(
      () => {
        const block = $secondParagraph();
        const decorator = $createTestDecoratorNode();
        block.append(decorator);
        const nodeSelection = $createNodeSelection();
        nodeSelection.add(decorator.getKey());
        $setSelection(nodeSelection);
      },
      {discrete: true},
    );

    expect(
      editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent()),
    ).toBe(true);
    editor.read(() => {
      $expectFullySelected($secondParagraph());
    });
  });

  test('a node selection of a top-level decorator selects all', () => {
    using editor = setUpEditor();
    editor.update(
      () => {
        const decorator = $createTestDecoratorNode().setIsInline(false);
        $getRoot().append(decorator);
        const nodeSelection = $createNodeSelection();
        nodeSelection.add(decorator.getKey());
        $setSelection(nodeSelection);
      },
      {discrete: true},
    );

    expect(
      editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent()),
    ).toBe(true);
    editor.read(() => {
      $expectFullySelected($getRoot());
    });
  });

  test('an empty node selection defers to other handlers', () => {
    using editor = setUpEditor();
    editor.update(
      () => {
        $setSelection($createNodeSelection());
      },
      {discrete: true},
    );

    expect(
      editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent()),
    ).toBe(false);
  });

  test('respects disabled config', () => {
    using editor = setUpEditor({disabled: true});
    editor.update(
      () => {
        const text = $secondParagraph().getFirstDescendant();
        assert($isTextNode(text));
        text.select(3, 3);
      },
      {discrete: true},
    );

    expect(
      editor.dispatchCommand(SELECT_ALL_COMMAND, selectAllKeyboardEvent()),
    ).toBe(false);
  });

  test('enables and disables PreventSelectAllExtension together', () => {
    using editor = setUpEditor({disabled: true});
    const selectBlockStores = getExtensionDependencyFromEditor(
      editor,
      SelectBlockExtension,
    ).output;
    const preventSelectAllStores = getExtensionDependencyFromEditor(
      editor,
      PreventSelectAllExtension,
    ).output;
    expect(preventSelectAllStores.disabled.value).toBe(true);
    selectBlockStores.disabled.value = false;
    expect(preventSelectAllStores.disabled.value).toBe(false);
    selectBlockStores.disabled.value = true;
    expect(preventSelectAllStores.disabled.value).toBe(true);
  });
});

describe('SelectBlockExtension with nested editors', () => {
  test('ignores commands bubbled from a nested editor when cascadeSelection is off', () => {
    using editor = setUpEditor();
    const nestedEditor = setUpNestedEditor(editor);
    // A stale node selection in the parent editor must not hijack the
    // nested editor's select all
    editor.update(
      () => {
        const block = $secondParagraph();
        const decorator = $createTestDecoratorNode();
        block.append(decorator);
        const nodeSelection = $createNodeSelection();
        nodeSelection.add(decorator.getKey());
        $setSelection(nodeSelection);
      },
      {discrete: true},
    );

    expect(
      nestedEditor.dispatchCommand(
        SELECT_ALL_COMMAND,
        selectAllKeyboardEvent(),
      ),
    ).toBe(false);
    editor.read(() => {
      expect($isRangeSelection($getSelection())).toBe(false);
    });
  });

  test('cascadeSelection ignores the command until the nested editor is fully selected', () => {
    using editor = setUpEditor({cascadeSelection: true});
    const nestedEditor = setUpNestedEditor(editor);
    nestedEditor.update(
      () => {
        const text = $getRoot().getFirstDescendant();
        assert($isTextNode(text));
        text.select(3, 3);
      },
      {discrete: true},
    );

    expect(
      nestedEditor.dispatchCommand(
        SELECT_ALL_COMMAND,
        selectAllKeyboardEvent(),
      ),
    ).toBe(false);

    nestedEditor.update(
      () => {
        $selectAll();
      },
      {discrete: true},
    );
    expect(
      nestedEditor.dispatchCommand(
        SELECT_ALL_COMMAND,
        selectAllKeyboardEvent(),
      ),
    ).toBe(true);
    editor.read(() => {
      $expectFullySelected($getRoot());
    });
  });

  test('cascadeSelection handles the command from an empty nested editor', () => {
    using editor = setUpEditor({cascadeSelection: true});
    const nestedEditor = createEditor({
      namespace: 'nested-empty',
      onError: error => {
        throw error;
      },
      parentEditor: editor,
    });
    nestedEditor.update(
      () => {
        $getRoot().append($createParagraphNode()).selectStart();
      },
      {discrete: true},
    );

    // An empty nested editor is fully selected by its caret
    expect(
      nestedEditor.dispatchCommand(
        SELECT_ALL_COMMAND,
        selectAllKeyboardEvent(),
      ),
    ).toBe(true);
    editor.read(() => {
      $expectFullySelected($getRoot());
    });
  });
});

describe('PreventSelectAllExtension', () => {
  test('does not intercept select all from an input inside the editor', () => {
    using editor = setUpEditor();
    const rootElement = editor.getRootElement();
    assert(rootElement !== null);
    const input = document.createElement('input');
    rootElement.appendChild(input);

    const event = selectAllKeyboardEvent();
    input.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    editor.read(() => {
      expect($isRangeSelection($getSelection())).toBe(false);
    });
  });

  test('select all targeting the editor itself is still intercepted', () => {
    using editor = setUpEditor();
    const rootElement = editor.getRootElement();
    assert(rootElement !== null);

    const event = selectAllKeyboardEvent();
    rootElement.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
