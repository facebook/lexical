/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $isTextNode,
  $setSlot,
  ElementNode,
  type LexicalEditor,
} from 'lexical';
import {assert, describe, expect, onTestFinished, test} from 'vitest';
import {userEvent} from 'vitest/browser';

class TestShadowRootNode extends ElementNode {
  $config() {
    return this.config('test_slot_word_shadow_root', {extends: ElementNode});
  }
  createDOM() {
    return document.createElement('div');
  }
  updateDOM() {
    return false;
  }
  isShadowRoot() {
    return true;
  }
}

type Layout = 'root slot' | 'element host' | 'slot-only host';

// Each layout records the text node of every region by name. The slot is
// 'note'; 'sibling' is the content next to it in the DOM: after it for the
// root and element hosts (slots-first), and after the host for a host with
// no children of its own.
function mountEditor(layout: Layout) {
  const rootElement = document.createElement('div');
  rootElement.contentEditable = 'true';
  document.body.append(rootElement);
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [RichTextExtension],
      name: '[slot-word-deletion]',
      nodes: [TestShadowRootNode],
    }),
  );
  editor.setRootElement(rootElement);
  onTestFinished(() => {
    editor.dispose();
    rootElement.remove();
    window.getSelection()?.removeAllRanges();
  });
  const keys: Record<string, string> = {};
  editor.update(
    () => {
      const text = (name: string, value: string) => {
        const node = $createTextNode(value);
        keys[name] = node.getKey();
        return node;
      };
      const note = new TestShadowRootNode().append(
        $createParagraphNode().append(text('note', 'Footnote words')),
      );
      const root = $getRoot().clear();
      if (layout === 'root slot') {
        root.append(
          $createParagraphNode().append(text('sibling', 'Body words')),
        );
        $setSlot(root, 'footnotes', note);
      } else if (layout === 'slot-only host') {
        const host = $createParagraphNode();
        root.append(
          $createParagraphNode().append(text('before', 'Before words')),
          host,
          $createParagraphNode().append(text('sibling', 'After words')),
        );
        $setSlot(host, 'note', note);
      } else {
        const host = $createParagraphNode().append(
          text('sibling', 'After words'),
        );
        root.append(
          $createParagraphNode().append(text('before', 'Before words')),
          host,
        );
        $setSlot(host, 'note', note);
      }
    },
    {discrete: true},
  );
  return {editor, keys, rootElement};
}

function snapshot(editor: LexicalEditor, keys: Record<string, string>) {
  return editor.read(() =>
    Object.fromEntries(
      Object.entries(keys).map(([name, key]) => {
        const node = $getNodeByKey(key);
        return [name, $isTextNode(node) ? node.getTextContent() : null];
      }),
    ),
  );
}

describe('Ctrl+Backspace at a slot boundary', () => {
  test.each([
    ['root slot', 'sibling'],
    ['element host', 'note'],
    ['element host', 'sibling'],
    ['slot-only host', 'note'],
    ['slot-only host', 'sibling'],
  ] as const)(
    '%s: at the start of the %s deletes nothing across the slot',
    async (layout, region) => {
      const {editor, keys, rootElement} = mountEditor(layout);
      const original = snapshot(editor, keys);
      editor.update(
        () => {
          const node = $getNodeByKey(keys[region]);
          assert($isTextNode(node));
          node.select(0, 0);
        },
        {discrete: true},
      );
      rootElement.focus();
      const textDOM = editor.getElementByKey(keys[region])?.firstChild;
      assert(textDOM);
      const native = window.getSelection()!;
      await expect
        .poll(() => [native.anchorNode, native.anchorOffset])
        .toEqual([textDOM, 0]);

      await userEvent.keyboard('{Control>}{Backspace}{/Control}');

      expect(snapshot(editor, keys)).toEqual(original);
    },
  );
});
