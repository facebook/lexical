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
  ListExtension,
} from '@lexical/list';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isRangeSelection,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

import {$createTestDecoratorNode, TestDecoratorNode} from '../utils';

const ext = defineExtension({
  dependencies: [RichTextExtension, ListExtension],
  name: '[8722]',
  nodes: [TestDecoratorNode],
});

describe('DELETE_LINE_COMMAND on empty ListItem with preceding decorator (#8722)', () => {
  test('deleteCharacter backward from empty ListItem should not remove the preceding decorator', () => {
    using editor = buildEditorFromExtensions(ext);
    editor.update(
      () => {
        const decorator = $createTestDecoratorNode().setIsInline(false);
        const list = $createListNode('bullet');
        const item = $createListItemNode();
        list.append(item);
        $getRoot().clear().append(decorator, list);
        item.select(0, 0);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const selection = $getSelection();
        assert($isRangeSelection(selection), 'Expected RangeSelection');
        selection.deleteCharacter(true);
      },
      {discrete: true},
    );

    editor.read(() => {
      const root = $getRoot();
      const children = root.getChildren();
      const hasDecorator = children.some($isDecoratorNode);
      expect(hasDecorator).toBe(true);
    });
  });

  test('deleteLine backward from empty ListItem should not remove the preceding decorator', () => {
    using editor = buildEditorFromExtensions(ext);
    editor.update(
      () => {
        const decorator = $createTestDecoratorNode().setIsInline(false);
        const list = $createListNode('bullet');
        const item = $createListItemNode();
        list.append(item);
        $getRoot().clear().append(decorator, list);
        item.select(0, 0);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const selection = $getSelection();
        assert($isRangeSelection(selection), 'Expected RangeSelection');
        selection.deleteLine(true);
      },
      {discrete: true},
    );

    editor.read(() => {
      const root = $getRoot();
      const children = root.getChildren();
      const hasDecorator = children.some($isDecoratorNode);
      expect(hasDecorator).toBe(true);
    });
  });

  test('deleteLine backward from empty paragraph should not remove the preceding decorator', () => {
    using editor = buildEditorFromExtensions(ext);
    editor.update(
      () => {
        const decorator = $createTestDecoratorNode().setIsInline(false);
        const paragraph = $createParagraphNode();
        $getRoot().clear().append(decorator, paragraph);
        paragraph.select(0, 0);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const selection = $getSelection();
        assert($isRangeSelection(selection), 'Expected RangeSelection');
        selection.deleteLine(true);
      },
      {discrete: true},
    );

    editor.read(() => {
      const root = $getRoot();
      const hasDecorator = root.getChildren().some($isDecoratorNode);
      expect(hasDecorator).toBe(true);
    });
  });

  test('deleteLine forward from empty ListItem should not remove the following decorator', () => {
    using editor = buildEditorFromExtensions(ext);
    editor.update(
      () => {
        const list = $createListNode('bullet');
        const item = $createListItemNode();
        list.append(item);
        const decorator = $createTestDecoratorNode().setIsInline(false);
        $getRoot().clear().append(list, decorator);
        item.select(0, 0);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const selection = $getSelection();
        assert($isRangeSelection(selection), 'Expected RangeSelection');
        selection.deleteLine(false);
      },
      {discrete: true},
    );

    editor.read(() => {
      const root = $getRoot();
      const hasDecorator = root.getChildren().some($isDecoratorNode);
      expect(hasDecorator).toBe(true);
    });
  });

  test('deleteLine backward from empty ListItem should not remove the preceding empty paragraph', () => {
    using editor = buildEditorFromExtensions(ext);
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        const list = $createListNode('bullet');
        const item = $createListItemNode();
        list.append(item);
        $getRoot().clear().append(paragraph, list);
        item.select(0, 0);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const selection = $getSelection();
        assert($isRangeSelection(selection), 'Expected RangeSelection');
        selection.deleteLine(true);
      },
      {discrete: true},
    );

    editor.read(() => {
      const root = $getRoot();
      const firstChild = root.getFirstChild();
      expect(firstChild).not.toBeNull();
      expect(firstChild!.getType()).toBe('paragraph');
    });
  });

  test('deleteLine backward from empty ListItem preceded by non-empty paragraph should work normally', () => {
    using editor = buildEditorFromExtensions(ext);
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('hello'));
        const list = $createListNode('bullet');
        const item = $createListItemNode();
        list.append(item);
        $getRoot().clear().append(paragraph, list);
        item.select(0, 0);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const selection = $getSelection();
        assert($isRangeSelection(selection), 'Expected RangeSelection');
        selection.deleteLine(true);
      },
      {discrete: true},
    );

    editor.read(() => {
      const root = $getRoot();
      expect(root.getTextContent()).toBe('hello');
    });
  });
});
