/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  configExtension,
  defineExtension,
} from '@lexical/extension';
import {domOverride, DOMRenderExtension} from '@lexical/html';
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

type Layout = 'root slot' | 'element host' | 'slot-only host' | 'inline slot';

// Each layout records the text node of every region by name. The slot is
// 'note'; 'sibling' is the content next to it in the DOM: after it for the
// root and element hosts (slots-first), and after the host for a host with
// no children of its own. The 'inline' slot and its paragraph are styled
// inline, so its text and the host's run together as one word.
function mountEditor(layout: Layout) {
  const rootElement = document.createElement('div');
  rootElement.contentEditable = 'true';
  const style = document.createElement('style');
  style.textContent =
    '[data-lexical-slot="inline"], [data-lexical-slot="inline"] > * { display: inline }';
  document.body.append(style, rootElement);
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        RichTextExtension,
        // Reveal every slot container in its default slots-first position.
        configExtension(DOMRenderExtension, {
          overrides: [
            domOverride('*', {
              $getSlotTargetElement: (_node, _slotName, hostDOM) => hostDOM,
            }),
          ],
        }),
      ],
      name: '[slot-word-deletion]',
      nodes: [TestShadowRootNode],
    }),
  );
  editor.setRootElement(rootElement);
  onTestFinished(() => {
    editor.dispose();
    rootElement.remove();
    style.remove();
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
      } else if (layout === 'inline slot') {
        const host = $createParagraphNode().append(text('sibling', 'bar'));
        root.append(host);
        $setSlot(
          host,
          'inline',
          $createParagraphNode().append(text('note', 'foo')),
        );
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

async function pressAt(
  layout: Layout,
  region: string,
  offset: number,
  keys: string,
) {
  const mounted = mountEditor(layout);
  const {editor, rootElement} = mounted;
  editor.update(
    () => {
      const node = $getNodeByKey(mounted.keys[region]);
      assert($isTextNode(node));
      node.select(offset, offset);
    },
    {discrete: true},
  );
  rootElement.focus();
  const textDOM = editor.getElementByKey(mounted.keys[region])?.firstChild;
  assert(textDOM);
  const native = window.getSelection()!;
  await expect
    .poll(() => [native.anchorNode, native.anchorOffset])
    .toEqual([textDOM, offset]);
  const original = snapshot(editor, mounted.keys);
  await userEvent.keyboard(keys);
  return {original, result: snapshot(editor, mounted.keys)};
}

describe('word deletion at a slot boundary', () => {
  test.each([
    ['root slot', 'sibling'],
    ['element host', 'note'],
    ['element host', 'sibling'],
    ['slot-only host', 'note'],
    ['slot-only host', 'sibling'],
  ] as const)(
    '%s: Ctrl+Backspace at the start of the %s deletes nothing across the slot',
    async (layout, region) => {
      const {original, result} = await pressAt(
        layout,
        region,
        0,
        '{Control>}{Backspace}{/Control}',
      );
      expect(result).toEqual(original);
    },
  );

  test('Ctrl+Backspace in a word that starts in an inline slot deletes up to the slot', async () => {
    const {result} = await pressAt(
      'inline slot',
      'sibling',
      2,
      '{Control>}{Backspace}{/Control}',
    );
    expect(result).toEqual({note: 'foo', sibling: 'r'});
  });

  test('Ctrl+Delete in an inline slot word that continues past the slot deletes to the slot end', async () => {
    const {result} = await pressAt(
      'inline slot',
      'note',
      1,
      '{Control>}{Delete}{/Control}',
    );
    expect(result).toEqual({note: 'f', sibling: 'bar'});
  });
});
