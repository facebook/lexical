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
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  DecoratorNode,
} from 'lexical';
import {assert, describe, expect, onTestFinished, test} from 'vitest';
import {userEvent} from 'vitest/browser';

class TestBlockDecoratorNode extends DecoratorNode<null> {
  $config() {
    return this.config('test_block_decorator', {extends: DecoratorNode});
  }

  createDOM(): HTMLElement {
    return document.createElement('div');
  }

  updateDOM(): false {
    return false;
  }

  decorate(): null {
    return null;
  }

  isInline(): false {
    return false;
  }
}

function $createTestBlockDecoratorNode(): TestBlockDecoratorNode {
  return new TestBlockDecoratorNode();
}

function mountEditor({
  adjacentElement = false,
  selectedIndex = 0,
}: {
  adjacentElement?: boolean;
  selectedIndex?: number;
} = {}) {
  const rootElement = document.createElement('div');
  rootElement.contentEditable = 'true';
  document.body.appendChild(rootElement);
  const editor = buildEditorFromExtensions({
    $initialEditorState: () => {
      const nodes = [$createTestBlockDecoratorNode()];
      if (!adjacentElement) {
        nodes.push($createTestBlockDecoratorNode());
      }
      $getRoot()
        .clear()
        .append(
          ...nodes,
          $createParagraphNode().append($createTextNode('text')),
        );
    },
    dependencies: [RichTextExtension],
    name: 'test',
    nodes: [TestBlockDecoratorNode],
  });
  editor.setRootElement(rootElement);
  rootElement.focus();
  editor.update(
    () => {
      const decorator = $getRoot().getChildAtIndex(selectedIndex)!;
      const selection = $createNodeSelection();
      selection.add(decorator.getKey());
      $setSelection(selection);
    },
    {discrete: true},
  );

  onTestFinished(() => {
    editor.setRootElement(null);
    rootElement.remove();
    editor.dispose();
  });

  return editor;
}

describe('Shift+Arrow on a NodeSelection (#9062)', () => {
  test.for(['ArrowRight', 'ArrowDown'])(
    '%s extends from the selected decorator',
    async key => {
      const editor = mountEditor();

      await userEvent.keyboard(`{Shift>}{${key}}{/Shift}`);

      editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.isCollapsed()).toBe(false);
        const selectedNodes = selection.getNodes();
        expect(selectedNodes).toContain($getRoot().getChildAtIndex(0));
        expect(selectedNodes).toContain($getRoot().getChildAtIndex(1));
        expect(selectedNodes).not.toContain($getRoot().getChildAtIndex(2));
      });
    },
  );

  test.for(['ArrowLeft', 'ArrowUp'])(
    '%s extends backward from the selected decorator',
    async key => {
      const editor = mountEditor({selectedIndex: 1});

      await userEvent.keyboard(`{Shift>}{${key}}{/Shift}`);

      editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.isCollapsed()).toBe(false);
        const selectedNodes = selection.getNodes();
        expect(selectedNodes).toContain($getRoot().getChildAtIndex(0));
        expect(selectedNodes).toContain($getRoot().getChildAtIndex(1));
        expect(selectedNodes).not.toContain($getRoot().getChildAtIndex(2));
      });
    },
  );

  test('ArrowRight extends from a decorator into an adjacent element', async () => {
    const editor = mountEditor({adjacentElement: true});

    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.isCollapsed()).toBe(false);
      const selectedNodes = selection.getNodes();
      const decorator = $getRoot().getChildAtIndex(0)!;
      const paragraph = $getRoot().getChildAtIndex(1)!;
      expect(selectedNodes).toContain(decorator);
      expect(
        selectedNodes.some(
          node => node === paragraph || node.getParent() === paragraph,
        ),
      ).toBe(true);
    });
  });
});
