/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * #7158: a real mouse drag that starts beside the first or last inline
 * decorator of a line must extend across the decorators it crosses. jsdom
 * cannot model this (it has no hit testing, and a browser's mouse drag keeps
 * its own anchor regardless of later Selection API calls), so the drag is
 * driven through Playwright's mouse.
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isRangeSelection,
  DecoratorNode,
  type LexicalEditor,
} from 'lexical';
import {describe, expect, onTestFinished, test} from 'vitest';
import {commands} from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    mouseDrag: (
      selector: string,
      points: [x: number, y: number][],
    ) => Promise<void>;
  }
}

const COUNT = 6;
const SIZE = 40;

class ImageLikeDecoratorNode extends DecoratorNode<null> {
  $config() {
    return this.config('test_7158_mouse_image', {extends: DecoratorNode});
  }
  createDOM(): HTMLElement {
    const span = document.createElement('span');
    const img = document.createElement('img');
    img.alt = '';
    img.style.cssText = `display:inline-block;width:${SIZE}px;height:${SIZE}px;background:#888`;
    span.appendChild(img);
    return span;
  }
  updateDOM(): false {
    return false;
  }
  isInline(): true {
    return true;
  }
  decorate(): null {
    return null;
  }
}

function mount(textBetween: boolean) {
  const root = document.createElement('div');
  root.id = 'issue-7158-root';
  root.contentEditable = 'true';
  root.style.cssText = 'width:600px;padding:10px;font-size:16px';
  document.body.appendChild(root);
  const editor = buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => {
        const paragraph = $createParagraphNode();
        for (let i = 0; i < COUNT; i++) {
          if (textBetween) {
            paragraph.append($createTextNode(' '));
          }
          paragraph.append($create(ImageLikeDecoratorNode));
        }
        $getRoot().clear().append(paragraph);
      },
      dependencies: [RichTextExtension],
      name: '[7158-mouse]',
      nodes: [ImageLikeDecoratorNode],
    }),
  );
  editor.setRootElement(root);
  onTestFinished(() => {
    editor.dispose();
    root.remove();
  });
  const images = Array.from(root.querySelectorAll('span > img'));
  const rootRect = root.getBoundingClientRect();
  // Points relative to the root's top-left, on the images' center line.
  const y = images[0].getBoundingClientRect().top + SIZE / 2 - rootRect.top;
  const left = (i: number) =>
    images[i].getBoundingClientRect().left - rootRect.left;
  const right = (i: number) =>
    images[i].getBoundingClientRect().right - rootRect.left;
  return {editor, left, right, y};
}

async function selectedDecoratorCount(
  editor: LexicalEditor,
): Promise<number | string> {
  // Let the last selectionchange be handled and committed.
  await new Promise(resolve => setTimeout(resolve, 50));
  return editor.read(() => {
    const selection = $getSelection();
    return $isRangeSelection(selection)
      ? selection.getNodes().filter($isDecoratorNode).length
      : String(selection);
  });
}

describe.each([
  ['only inline decorators', false],
  ['text between inline decorators', true],
])('Issue #7158: mouse drag over %s', (_name, textBetween) => {
  test('a drag from right of the last decorator selects back to the third', async () => {
    const {editor, left, right, y} = mount(textBetween);
    await commands.mouseDrag('#issue-7158-root', [
      [right(COUNT - 1) + 30, y],
      [left(COUNT - 2) + SIZE / 2, y],
      [left(2) - 2, y],
    ]);
    expect(await selectedDecoratorCount(editor)).toBe(COUNT - 2);
  });

  test('a drag from left of the first decorator selects to the end of the line', async () => {
    const {editor, left, right, y} = mount(textBetween);
    await commands.mouseDrag('#issue-7158-root', [
      [left(0) - 5, y],
      [left(1) + SIZE / 2, y],
      [right(COUNT - 1) + 30, y],
    ]);
    expect(await selectedDecoratorCount(editor)).toBe(COUNT);
  });
});
