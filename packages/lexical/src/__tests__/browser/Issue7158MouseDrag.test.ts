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
  getDOMSelection,
  type LexicalEditor,
} from 'lexical';
import {assert, describe, onTestFinished, test, vi} from 'vitest';
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

/**
 * Styled like the playground's ImageNode: an unselectable inline-block whose
 * image sits in a block wrapper. Chromium's hit test finds no position inside
 * it that a drag selection can extend to.
 */
class BoxedImageDecoratorNode extends ImageLikeDecoratorNode {
  $config() {
    return this.config('test_7158_mouse_boxed_image', {
      extends: ImageLikeDecoratorNode,
    });
  }
  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.style.cssText =
      'display:inline-block;position:relative;user-select:none;overflow:hidden';
    const div = document.createElement('div');
    const img = document.createElement('img');
    img.alt = '';
    img.style.cssText = `display:block;width:${SIZE}px;height:${SIZE}px;background:#888`;
    div.appendChild(img);
    span.appendChild(div);
    return span;
  }
}

type DecoratorClass =
  | typeof ImageLikeDecoratorNode
  | typeof BoxedImageDecoratorNode;

const pointerLog: string[] = [];

function mount(textBetween: boolean, klass: DecoratorClass) {
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
          paragraph.append($create(klass));
        }
        $getRoot().clear().append(paragraph);
      },
      dependencies: [RichTextExtension],
      name: '[7158-mouse]',
      nodes: [ImageLikeDecoratorNode, BoxedImageDecoratorNode],
    }),
  );
  editor.setRootElement(root);
  // Where each pointer event landed (relative to the root) and the DOM
  // selection once the browser has handled it, for the failure message.
  pointerLog.length = 0;
  const logPointer = (event: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    const x = Math.round(event.clientX - rect.left);
    const y = Math.round(event.clientY - rect.top);
    setTimeout(() => {
      const dom = getDOMSelection(window);
      pointerLog.push(
        `${event.type.slice(7)}(${x},${y} b${event.buttons})=` +
          `${describeDOMPoint(dom?.anchorNode ?? null, dom?.anchorOffset ?? 0)}->` +
          `${describeDOMPoint(dom?.focusNode ?? null, dom?.focusOffset ?? 0)}`,
      );
    });
  };
  const pointerTypes = ['pointerdown', 'pointermove', 'pointerup'] as const;
  for (const type of pointerTypes) {
    document.addEventListener(type, logPointer, true);
  }
  onTestFinished(() => {
    for (const type of pointerTypes) {
      document.removeEventListener(type, logPointer, true);
    }
    editor.dispose();
    root.remove();
  });
  const images = Array.from(
    root.querySelectorAll(
      'img:not([data-lexical-decorator-boundary]):not([data-lexical-managed-linebreak])',
    ),
  );
  const rootRect = root.getBoundingClientRect();
  // Points relative to the root's top-left, on the images' center line.
  const y = images[0].getBoundingClientRect().top + SIZE / 2 - rootRect.top;
  const left = (i: number) =>
    images[i].getBoundingClientRect().left - rootRect.left;
  const right = (i: number) =>
    images[i].getBoundingClientRect().right - rootRect.left;
  pointerLog.push(
    `left(0)=${Math.round(left(0))} right(${COUNT - 1})=${Math.round(right(COUNT - 1))} y=${Math.round(y)} dpr=${window.devicePixelRatio}`,
  );
  return {editor, left, right, y};
}

function describeDOMPoint(node: Node | null, offset: number): string {
  if (node === null) {
    return 'null';
  }
  const name =
    node.nodeType === Node.TEXT_NODE
      ? `#text(${JSON.stringify(node.textContent)})`
      : node.nodeName.toLowerCase();
  return `${name}:${offset}`;
}

// The last selectionchange is handled asynchronously, and on a busy runner it
// can land well after the mouse is released, so wait for the editor's
// selection to settle rather than for a fixed time. A failure reports the
// selection that was reached, to tell a selection that never extended apart
// from one that extended too far.
async function expectSelectedDecoratorCount(
  editor: LexicalEditor,
  expected: number,
): Promise<void> {
  await vi.waitFor(
    () => {
      const [count, lexical] = editor.read(() => {
        const selection = $getSelection();
        return $isRangeSelection(selection)
          ? [
              selection.getNodes().filter($isDecoratorNode).length,
              `${selection.anchor.key}:${selection.anchor.offset}->` +
                `${selection.focus.key}:${selection.focus.offset}`,
            ]
          : [-1, String(selection)];
      });
      const dom = getDOMSelection(window);
      assert(
        count === expected,
        `expected ${expected} selected decorators, got ${count} ` +
          `(lexical ${lexical}; dom ` +
          `${describeDOMPoint(dom?.anchorNode ?? null, dom?.anchorOffset ?? 0)}->` +
          `${describeDOMPoint(dom?.focusNode ?? null, dom?.focusOffset ?? 0)}; ` +
          `pointer ${pointerLog.join(' ')})`,
      );
    },
    {interval: 50, timeout: 2000},
  );
}

function dragFromLineEnd(klass: DecoratorClass, textBetween: boolean) {
  return async () => {
    const {editor, left, right, y} = mount(textBetween, klass);
    await commands.mouseDrag('#issue-7158-root', [
      [right(COUNT - 1) + 30, y],
      [left(COUNT - 2) + SIZE / 2, y],
      [left(3) + SIZE / 2, y],
      [left(2) - 2, y],
    ]);
    await expectSelectedDecoratorCount(editor, COUNT - 2);
  };
}

function dragFromLineStart(klass: DecoratorClass, textBetween: boolean) {
  return async () => {
    const {editor, left, right, y} = mount(textBetween, klass);
    await commands.mouseDrag('#issue-7158-root', [
      [left(0) - 5, y],
      [left(1) + SIZE / 2, y],
      [left(COUNT - 2) + SIZE / 2, y],
      [right(COUNT - 1) + 30, y],
    ]);
    await expectSelectedDecoratorCount(editor, COUNT);
  };
}

describe.each([
  ['only inline decorators', false],
  ['text between inline decorators', true],
])('Issue #7158: mouse drag over %s', (_name, textBetween) => {
  test(
    'a drag from right of the last decorator selects back to the third',
    dragFromLineEnd(ImageLikeDecoratorNode, textBetween),
  );
  test(
    'a drag from left of the first decorator selects to the end of the line',
    dragFromLineStart(ImageLikeDecoratorNode, textBetween),
  );
});

// Chromium never extends a drag across these decorators by itself, so these
// exercise the pointermove fallback. A drag that starts left of an
// unselectable first decorator is not covered: Chromium anchors it after that
// decorator, and a drag keeps the anchor it took on mousedown.
describe('Issue #7158: mouse drag over unselectable inline decorators', () => {
  test(
    'a drag from right of the last decorator selects back to the third',
    dragFromLineEnd(BoxedImageDecoratorNode, false),
  );
  test(
    'with text between, a drag from right of the last decorator selects back to the third',
    dragFromLineEnd(BoxedImageDecoratorNode, true),
  );
  test(
    'with text between, a drag from left of the first text selects to the end of the line',
    dragFromLineStart(BoxedImageDecoratorNode, true),
  );
});
