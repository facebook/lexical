/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {
  $createListItemNode,
  $createListNode,
  $isListNode,
  ListExtension,
  type ListType,
} from '@lexical/list';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  KEY_BACKSPACE_COMMAND,
} from 'lexical';
import {
  $createTestDecoratorNode,
  invariant,
  TestDecoratorNode,
} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, test} from 'vitest';

class IsolatedTestDecoratorNode extends TestDecoratorNode {
  $config() {
    return this.config('isolated_test_decorator', {
      extends: TestDecoratorNode,
    });
  }
  isIsolated(): boolean {
    return true;
  }
}

function $createIsolatedTestDecoratorNode(): IsolatedTestDecoratorNode {
  return new IsolatedTestDecoratorNode().setIsInline(false);
}

function backspaceEvent(): KeyboardEvent {
  return new KeyboardEvent('keydown', {cancelable: true, key: 'Backspace'});
}

const testExtension = defineExtension({
  dependencies: [ListExtension],
  name: '[root]',
  nodes: [TestDecoratorNode, IsolatedTestDecoratorNode],
});

describe('registerList — Backspace adjacent to DecoratorNode (#5072)', () => {
  describe('preserves the decorator and demotes the first list item', () => {
    test.for<{name: string; listType: ListType; inline: boolean}>([
      {
        inline: false,
        listType: 'bullet',
        name: 'block decorator + bullet list',
      },
      {
        inline: false,
        listType: 'number',
        name: 'block decorator + numbered list',
      },
      {
        inline: false,
        listType: 'check',
        name: 'block decorator + check list',
      },
      {
        inline: true,
        listType: 'bullet',
        name: 'inline keyboard-selectable decorator + bullet list',
      },
    ])('$name', ({listType, inline}) => {
      using editor = buildEditorFromExtensions(testExtension);

      let handled = false;
      const event = backspaceEvent();
      editor.update(
        () => {
          const root = $getRoot();
          root.clear();
          const decorator = $createTestDecoratorNode().setIsInline(inline);
          const list = $createListNode(listType).append(
            $createListItemNode().append($createTextNode('first')),
            $createListItemNode().append($createTextNode('second')),
          );
          root.append(decorator, list);
          list.getFirstChildOrThrow().selectStart();
          handled = editor.dispatchCommand(KEY_BACKSPACE_COMMAND, event);
        },
        {discrete: true},
      );

      expect(handled).toBe(true);
      expect(event.defaultPrevented).toBe(true);

      editor.read(() => {
        const children = $getRoot().getChildren();
        expect(children).toHaveLength(3);
        if (inline) {
          assert(
            $isParagraphNode(children[0]),
            'Expected leading ParagraphNode wrapping inline TestDecoratorNode',
          );
          expect(
            children[0].getChildren().map(n => n instanceof TestDecoratorNode),
          ).toEqual([true]);
        } else {
          invariant(
            children[0] instanceof TestDecoratorNode,
            'Expected leading TestDecoratorNode',
          );
        }
        const paragraph = children[1];
        invariant(
          $isParagraphNode(paragraph),
          'Expected demoted ParagraphNode',
        );
        expect(paragraph.getTextContent()).toBe('first');
        const tail = children[2];
        invariant($isListNode(tail), 'Expected trailing ListNode');
        expect(tail.getListType()).toBe(listType);
        expect(tail.getChildrenSize()).toBe(1);
        expect(tail.getTextContent()).toBe('second');

        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'Expected RangeSelection');
        expect(selection.isCollapsed()).toBe(true);
        expect(selection.anchor.key).toBe(
          paragraph.getFirstChildOrThrow().getKey(),
        );
        expect(selection.anchor.offset).toBe(0);
      });
    });

    test('block decorator + single-item list — list is removed', () => {
      using editor = buildEditorFromExtensions(testExtension);

      let handled = false;
      const event = backspaceEvent();
      editor.update(
        () => {
          const root = $getRoot();
          root.clear();
          const decorator = $createTestDecoratorNode().setIsInline(false);
          const list = $createListNode('bullet').append(
            $createListItemNode().append($createTextNode('only')),
          );
          root.append(decorator, list);
          list.getFirstChildOrThrow().selectStart();
          handled = editor.dispatchCommand(KEY_BACKSPACE_COMMAND, event);
        },
        {discrete: true},
      );

      expect(handled).toBe(true);
      expect(event.defaultPrevented).toBe(true);

      editor.read(() => {
        const children = $getRoot().getChildren();
        expect(children).toHaveLength(2);
        invariant(
          children[0] instanceof TestDecoratorNode,
          'Expected leading TestDecoratorNode',
        );
        invariant(
          $isParagraphNode(children[1]),
          'Expected demoted ParagraphNode',
        );
        expect(children[1].getTextContent()).toBe('only');
      });
    });

    test('two adjacent block decorators + list — both preserved', () => {
      using editor = buildEditorFromExtensions(testExtension);

      let handled = false;
      const event = backspaceEvent();
      editor.update(
        () => {
          const root = $getRoot();
          root.clear();
          const first = $createTestDecoratorNode().setIsInline(false);
          const second = $createTestDecoratorNode().setIsInline(false);
          const list = $createListNode('bullet').append(
            $createListItemNode().append($createTextNode('hello')),
          );
          root.append(first, second, list);
          list.getFirstChildOrThrow().selectStart();
          handled = editor.dispatchCommand(KEY_BACKSPACE_COMMAND, event);
        },
        {discrete: true},
      );

      expect(handled).toBe(true);
      expect(event.defaultPrevented).toBe(true);

      editor.read(() => {
        const children = $getRoot().getChildren();
        expect(children).toHaveLength(3);
        invariant(
          children[0] instanceof TestDecoratorNode,
          'Expected first TestDecoratorNode',
        );
        invariant(
          children[1] instanceof TestDecoratorNode,
          'Expected second TestDecoratorNode',
        );
        invariant(
          $isParagraphNode(children[2]),
          'Expected demoted ParagraphNode',
        );
        expect(children[2].getTextContent()).toBe('hello');
      });
    });
  });

  describe('returns false (defers to the default Backspace path)', () => {
    test('no decorator before the list', () => {
      using editor = buildEditorFromExtensions(testExtension);

      let handled = true;
      const event = backspaceEvent();
      editor.update(
        () => {
          const root = $getRoot();
          root.clear();
          const paragraph = $createParagraphNode().append(
            $createTextNode('intro'),
          );
          const list = $createListNode('bullet').append(
            $createListItemNode().append($createTextNode('first')),
          );
          root.append(paragraph, list);
          list.getFirstChildOrThrow().selectStart();
          handled = editor.dispatchCommand(KEY_BACKSPACE_COMMAND, event);
        },
        {discrete: true},
      );

      expect(handled).toBe(false);
      expect(event.defaultPrevented).toBe(false);

      editor.read(() => {
        const children = $getRoot().getChildren();
        expect(children).toHaveLength(2);
        invariant(
          $isParagraphNode(children[0]),
          'Expected leading ParagraphNode',
        );
        invariant($isListNode(children[1]), 'Expected trailing ListNode');
      });
    });

    test('caret on the second list item', () => {
      using editor = buildEditorFromExtensions(testExtension);

      let handled = true;
      editor.update(
        () => {
          const root = $getRoot();
          root.clear();
          const decorator = $createTestDecoratorNode().setIsInline(false);
          const list = $createListNode('bullet').append(
            $createListItemNode().append($createTextNode('first')),
            $createListItemNode().append($createTextNode('second')),
          );
          root.append(decorator, list);
          const secondItem = list.getChildAtIndex(1);
          invariant(secondItem !== null, 'Expected a second list item');
          secondItem.selectStart();
          handled = editor.dispatchCommand(
            KEY_BACKSPACE_COMMAND,
            backspaceEvent(),
          );
        },
        {discrete: true},
      );

      expect(handled).toBe(false);

      editor.read(() => {
        const list = $getRoot().getChildAtIndex(1);
        invariant($isListNode(list), 'Expected ListNode at index 1');
        expect(list.getChildrenSize()).toBe(2);
      });
    });

    test('caret in the middle of the first list item', () => {
      using editor = buildEditorFromExtensions(testExtension);

      let handled = true;
      editor.update(
        () => {
          const root = $getRoot();
          root.clear();
          const decorator = $createTestDecoratorNode().setIsInline(false);
          const text = $createTextNode('first');
          const list = $createListNode('bullet').append(
            $createListItemNode().append(text),
          );
          root.append(decorator, list);
          text.select(2, 2);
          handled = editor.dispatchCommand(
            KEY_BACKSPACE_COMMAND,
            backspaceEvent(),
          );
        },
        {discrete: true},
      );

      expect(handled).toBe(false);

      editor.read(() => {
        invariant(
          $isListNode($getRoot().getChildAtIndex(1)),
          'Expected ListNode at index 1',
        );
      });
    });

    test('nested list — no decorator before the inner list', () => {
      using editor = buildEditorFromExtensions(testExtension);

      let handled = true;
      editor.update(
        () => {
          const root = $getRoot();
          root.clear();
          const decorator = $createTestDecoratorNode().setIsInline(false);
          const innerLi = $createListItemNode().append(
            $createTextNode('nested'),
          );
          const innerList = $createListNode('bullet').append(innerLi);
          const outerLi = $createListItemNode().append(innerList);
          const outerList = $createListNode('bullet').append(outerLi);
          root.append(decorator, outerList);
          innerLi.selectStart();
          handled = editor.dispatchCommand(
            KEY_BACKSPACE_COMMAND,
            backspaceEvent(),
          );
        },
        {discrete: true},
      );

      expect(handled).toBe(false);
    });

    test('isolated decorator before the list', () => {
      using editor = buildEditorFromExtensions(testExtension);

      let handled = true;
      editor.update(
        () => {
          const root = $getRoot();
          root.clear();
          const decorator = $createIsolatedTestDecoratorNode();
          const list = $createListNode('bullet').append(
            $createListItemNode().append($createTextNode('first')),
          );
          root.append(decorator, list);
          list.getFirstChildOrThrow().selectStart();
          handled = editor.dispatchCommand(
            KEY_BACKSPACE_COMMAND,
            backspaceEvent(),
          );
        },
        {discrete: true},
      );

      expect(handled).toBe(false);

      editor.read(() => {
        const children = $getRoot().getChildren();
        expect(children).toHaveLength(2);
        invariant(
          children[0] instanceof IsolatedTestDecoratorNode,
          'Expected leading IsolatedTestDecoratorNode',
        );
        invariant($isListNode(children[1]), 'Expected trailing ListNode');
      });
    });

    test('empty first list item — defers to core for decorator NodeSelection', () => {
      using editor = buildEditorFromExtensions(testExtension);

      let handled = true;
      editor.update(
        () => {
          const root = $getRoot();
          root.clear();
          const decorator = $createTestDecoratorNode().setIsInline(false);
          const emptyItem = $createListItemNode();
          const list = $createListNode('bullet').append(
            emptyItem,
            $createListItemNode().append($createTextNode('second')),
          );
          root.append(decorator, list);
          emptyItem.select();
          handled = editor.dispatchCommand(
            KEY_BACKSPACE_COMMAND,
            backspaceEvent(),
          );
        },
        {discrete: true},
      );

      expect(handled).toBe(false);

      editor.read(() => {
        const children = $getRoot().getChildren();
        expect(children).toHaveLength(2);
        invariant(
          children[0] instanceof TestDecoratorNode,
          'Expected leading TestDecoratorNode',
        );
        const list = children[1];
        invariant($isListNode(list), 'Expected trailing ListNode');
        expect(list.getChildrenSize()).toBe(2);
      });
    });
  });
});
