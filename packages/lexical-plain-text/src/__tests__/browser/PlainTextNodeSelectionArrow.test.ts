/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createHorizontalRuleNode,
  buildEditorFromExtensions,
  HorizontalRuleExtension,
} from '@lexical/extension';
import {PlainTextExtension} from '@lexical/plain-text';
import {
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $setSelection,
  DecoratorNode,
  type ElementNode,
  type LexicalEditor,
} from 'lexical';
import {assert, describe, expect, onTestFinished, test} from 'vitest';
import {userEvent} from 'vitest/browser';

class TestInlineDecoratorNode extends DecoratorNode<null> {
  $config() {
    return this.config('test_inline_decorator', {extends: DecoratorNode});
  }

  createDOM(): HTMLElement {
    return document.createElement('span');
  }

  updateDOM(): false {
    return false;
  }

  decorate(): null {
    return null;
  }

  isInline(): true {
    return true;
  }

  getTextContent(): string {
    return '◆';
  }
}

function mountEditor($initialEditorState: () => void): LexicalEditor {
  const rootElement = document.createElement('div');
  rootElement.contentEditable = 'true';
  document.body.appendChild(rootElement);
  const editor = buildEditorFromExtensions({
    $initialEditorState,
    dependencies: [PlainTextExtension, HorizontalRuleExtension],
    name: 'test',
    nodes: [TestInlineDecoratorNode],
  });
  editor.setRootElement(rootElement);
  rootElement.focus();

  onTestFinished(() => {
    editor.setRootElement(null);
    rootElement.remove();
    editor.dispose();
  });

  return editor;
}

/**
 * `first / before / (rule) / after`, with the rule node-selected by clicking
 * it after a click in `first`, as a user would.
 */
async function mountWithSelectedRule(): Promise<LexicalEditor> {
  const editor = mountEditor(() => {
    $getRoot()
      .clear()
      .append(
        $createParagraphNode().append($createTextNode('first')),
        $createParagraphNode().append($createTextNode('before')),
        $createHorizontalRuleNode(),
        $createParagraphNode().append($createTextNode('after')),
      );
  });
  const [firstKey, ruleKey] = editor.read(() => [
    $getRoot().getChildAtIndex(0)!.getKey(),
    $getRoot().getChildAtIndex(2)!.getKey(),
  ]);
  await userEvent.click(editor.getElementByKey(firstKey)!);
  await userEvent.click(editor.getElementByKey(ruleKey)!);
  editor.read(() => {
    expect($isNodeSelection($getSelection())).toBe(true);
  });
  return editor;
}

/** `first / ab (decorator) cd`, with the inline decorator node-selected. */
function mountWithSelectedInlineDecorator(): LexicalEditor {
  const editor = mountEditor(() => {
    $getRoot()
      .clear()
      .append(
        $createParagraphNode().append($createTextNode('first')),
        $createParagraphNode().append(
          $createTextNode('ab '),
          new TestInlineDecoratorNode(),
          $createTextNode(' cd'),
        ),
      );
  });
  editor.update(
    () => {
      const decorator = $getRoot()
        .getLastChildOrThrow<ElementNode>()
        .getChildAtIndex(1)!;
      const selection = $createNodeSelection();
      selection.add(decorator.getKey());
      $setSelection(selection);
    },
    {discrete: true},
  );
  return editor;
}

/** The collapsed caret as the text it is in and its offset there. */
function describeCaret(editor: LexicalEditor): [text: string, offset: number] {
  return editor.read(() => {
    const selection = $getSelection();
    expect(
      $isNodeSelection(selection),
      'the NodeSelection is left in place',
    ).toBe(false);
    assert($isRangeSelection(selection));
    expect(selection.isCollapsed()).toBe(true);
    return [
      selection.anchor.getNode().getTextContent(),
      selection.anchor.offset,
    ];
  });
}

/** The text of each block, and the type of each block that isn't an element. */
function describeBlocks(editor: LexicalEditor): string[] {
  return editor.read(() =>
    $getRoot()
      .getChildren()
      .map(node =>
        $isElementNode(node) ? node.getTextContent() : node.getType(),
      ),
  );
}

describe('Arrow keys on a NodeSelection in plain text (#4214)', () => {
  test.for([
    {
      blocks: ['first', 'beforeq', 'horizontalrule', 'after'],
      caret: ['before', 6],
      key: 'ArrowUp',
    },
    {
      blocks: ['first', 'beforeq', 'horizontalrule', 'after'],
      caret: ['before', 6],
      key: 'ArrowLeft',
    },
    {
      blocks: ['first', 'before', 'horizontalrule', 'qafter'],
      caret: ['after', 0],
      key: 'ArrowDown',
    },
    {
      blocks: ['first', 'before', 'horizontalrule', 'qafter'],
      caret: ['after', 0],
      key: 'ArrowRight',
    },
  ] as const)(
    '$key moves the caret to the side of a node-selected rule, where typing goes',
    async ({blocks, caret, key}) => {
      const editor = await mountWithSelectedRule();

      await userEvent.keyboard(`{${key}}`);

      expect(describeCaret(editor)).toEqual(caret);

      await userEvent.keyboard('q');

      expect(describeBlocks(editor)).toEqual(blocks);
    },
  );

  test.for([
    {blocks: ['first', 'ab q◆ cd'], caret: ['ab ', 3], key: 'ArrowUp'},
    {blocks: ['first', 'ab q◆ cd'], caret: ['ab ', 3], key: 'ArrowLeft'},
    {blocks: ['first', 'ab ◆q cd'], caret: [' cd', 0], key: 'ArrowDown'},
    {blocks: ['first', 'ab ◆q cd'], caret: [' cd', 0], key: 'ArrowRight'},
  ] as const)(
    '$key moves the caret to the side of a node-selected inline decorator, where typing goes',
    async ({blocks, caret, key}) => {
      const editor = mountWithSelectedInlineDecorator();

      await userEvent.keyboard(`{${key}}`);

      expect(describeCaret(editor)).toEqual(caret);

      await userEvent.keyboard('q');

      expect(describeBlocks(editor)).toEqual(blocks);
    },
  );

  test.for(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])(
    'Shift+%s on a node-selected rule leaves a non-collapsed RangeSelection',
    async key => {
      const editor = await mountWithSelectedRule();

      await userEvent.keyboard(`{Shift>}{${key}}{/Shift}`);

      editor.read(() => {
        const selection = $getSelection();
        expect(
          $isNodeSelection(selection),
          'the NodeSelection is left in place',
        ).toBe(false);
        assert($isRangeSelection(selection));
        expect(selection.isCollapsed()).toBe(false);
      });
    },
  );
});
