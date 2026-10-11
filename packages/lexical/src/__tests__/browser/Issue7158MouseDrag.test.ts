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
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  DecoratorNode,
  getDOMSelection,
  type LexicalEditor,
  type ParagraphNode,
  SELECTION_CHANGE_COMMAND,
  type TextNode,
} from 'lexical';
import {assert, describe, onTestFinished, test, vi} from 'vitest';
import {commands} from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    mouseDrag: (
      selector: string,
      points: [x: number, y: number][],
      options?: {clickCount?: number},
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

/**
 * The same block-wrapped image, but selectable: Chromium's hit test can put
 * a drag point inside it, where the point resolves to no Lexical selection.
 */
class SelectableBoxedImageDecoratorNode extends ImageLikeDecoratorNode {
  $config() {
    return this.config('test_7158_mouse_selectable_boxed_image', {
      extends: ImageLikeDecoratorNode,
    });
  }
  createDOM(): HTMLElement {
    const span = new BoxedImageDecoratorNode().createDOM();
    span.style.userSelect = '';
    return span;
  }
}

type DecoratorClass =
  | typeof ImageLikeDecoratorNode
  | typeof BoxedImageDecoratorNode
  | typeof SelectableBoxedImageDecoratorNode;

const pointerLog: string[] = [];

function mount(
  textBetween: boolean,
  klass: DecoratorClass,
  trailingText: string = '',
) {
  const root = document.createElement('div');
  root.id = 'issue-7158-root';
  root.contentEditable = 'true';
  // Narrower than the test frame (414px), which would scroll sideways when a
  // drag nears its edge, or to show a point mouseDrag hovers.
  root.style.cssText = 'width:380px;padding:10px;font-size:16px';
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
        if (trailingText !== '') {
          paragraph.append($createTextNode(trailingText));
        }
        $getRoot().clear().append(paragraph);
      },
      dependencies: [RichTextExtension],
      name: '[7158-mouse]',
      nodes: [
        ImageLikeDecoratorNode,
        BoxedImageDecoratorNode,
        SelectableBoxedImageDecoratorNode,
      ],
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
  // The box of `text` within the trailing text, relative to the root.
  const textRect = (text: string) => {
    const textNode = root.lastChild!.lastChild!.firstChild!;
    const index = textNode.textContent!.indexOf(text);
    const range = document.createRange();
    range.setStart(textNode, index);
    range.setEnd(textNode, index + text.length);
    const rect = range.getBoundingClientRect();
    return {
      bottom: rect.bottom - rootRect.top,
      left: rect.left - rootRect.left,
      right: rect.right - rootRect.left,
      top: rect.top - rootRect.top,
    };
  };
  pointerLog.push(
    `left(0)=${Math.round(left(0))} right(${COUNT - 1})=${Math.round(right(COUNT - 1))} y=${Math.round(y)} dpr=${window.devicePixelRatio}`,
  );
  return {editor, left, right, root, textRect, y};
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

// The browser puts a drag's focus below or past the end of the line after the
// managed line break's <img>, which Lexical maps to the point before it.
// Writing that point back only has the browser move it again on the next
// pointer move, so each move would be two selection changes.
test('Issue #7158: a drag past the end of the line does not keep changing the selection', async () => {
  const {editor, right, y} = mount(false, ImageLikeDecoratorNode);
  let selectionChanges = 0;
  onTestFinished(
    editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        selectionChanges++;
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    ),
  );
  const x = right(COUNT - 1) + 30;
  await commands.mouseDrag('#issue-7158-root', [
    [x, y],
    [x + 50, y + SIZE],
    [x + 100, y + SIZE],
    [x + 50, y + 2 * SIZE],
  ]);
  await vi.waitFor(() =>
    assert(
      editor.read(() => {
        const selection = $getSelection();
        return $isRangeSelection(selection) && selection.isCollapsed();
      }),
      'expected a collapsed selection',
    ),
  );
  // The press and the first move can each change the selection once; the
  // other ten or so moves must not.
  assert(
    selectionChanges <= 3,
    `expected at most 3 selection changes, got ${selectionChanges}`,
  );
});

// Chromium and Firefox never extend a drag across these decorators by
// themselves, so these exercise the pointermove fallback. A drag that starts
// left of an unselectable first decorator is not covered: Chromium anchors it
// after that decorator, and a drag keeps the anchor it took on mousedown.
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

describe('Issue #7158: mouse drag over selectable boxed inline decorators', () => {
  test(
    'a drag from right of the last decorator selects back to the third',
    dragFromLineEnd(SelectableBoxedImageDecoratorNode, false),
  );
  test(
    'a drag from left of the first decorator selects to the end of the line',
    dragFromLineStart(SelectableBoxedImageDecoratorNode, false),
  );
  test('a drag that returns to its start and leaves again keeps its anchor', async () => {
    const {editor, left, right, y} = mount(
      false,
      SelectableBoxedImageDecoratorNode,
    );
    await commands.mouseDrag('#issue-7158-root', [
      [right(COUNT - 1) + 30, y],
      [left(2) + SIZE / 2, y],
      [right(COUNT - 1) + 10, y],
      [left(COUNT - 1) + 5, y],
      [left(2) - 2, y],
    ]);
    await expectSelectedDecoratorCount(editor, COUNT - 2);
  });

  // On macOS Chrome a drag can restart from the pointer, collapsing the
  // selection inside a decorator, where it resolves to no Lexical selection.
  // Linux Chromium does not do this, so do it the way it would: after the
  // browser and Lexical have handled a pointermove.
  test('a drag that restarts inside a decorator keeps its anchor', async () => {
    const {editor, left, right, y} = mount(
      false,
      SelectableBoxedImageDecoratorNode,
    );
    const root = document.getElementById('issue-7158-root')!;
    const decorators = root.querySelectorAll('span > div');
    let injected = false;
    const inject = (event: PointerEvent) => {
      const x = event.clientX - root.getBoundingClientRect().left;
      if (!injected && event.buttons === 1 && x < left(COUNT - 2)) {
        injected = true;
        requestAnimationFrame(() =>
          getDOMSelection(window)?.collapse(decorators[COUNT - 2], 0),
        );
      }
    };
    document.addEventListener('pointermove', inject, true);
    onTestFinished(() =>
      document.removeEventListener('pointermove', inject, true),
    );
    await commands.mouseDrag('#issue-7158-root', [
      [right(COUNT - 1) + 30, y],
      [left(2) - 2, y],
    ]);
    assert(injected, 'the drag never reached the injection point');
    await expectSelectedDecoratorCount(editor, COUNT - 2);
  });
});

describe('Issue #7158: mouse presses the drag fallback leaves alone', () => {
  // A double-click drag extends the selection by words, keeping the word it
  // selected; the drag's anchor moves to whichever end of that word is
  // farther from the pointer.
  test('a double-click drag keeps the double-clicked word', async () => {
    const {editor, left, textRect, y} = mount(
      false,
      ImageLikeDecoratorNode,
      ' hello world',
    );
    const word = textRect('world');
    const wordY = (word.top + word.bottom) / 2;
    await commands.mouseDrag(
      '#issue-7158-root',
      [
        [(word.left + word.right) / 2, wordY],
        [left(COUNT - 1) + SIZE / 2, y],
        [left(2) - 2, y],
      ],
      {clickCount: 2},
    );
    await vi.waitFor(() => {
      const text = editor.read(() => {
        const selection = $getSelection();
        return $isRangeSelection(selection) ? selection.getTextContent() : '';
      });
      assert(
        text.endsWith(' hello world'),
        `expected the selection to end with the double-clicked word, got ${JSON.stringify(text)}`,
      );
    });
  });

  // A collaborator's edit (simulated here) can change the text at the drag's
  // anchor mid-drag, and move the editor's selection with it.
  test('a drag whose anchor text changes mid-drag continues from the moved anchor', async () => {
    const {editor, left, root, textRect, y} = mount(
      false,
      ImageLikeDecoratorNode,
      ' hello world',
    );
    const textKey = editor.read(() =>
      $getRoot()
        .getFirstChildOrThrow<ParagraphNode>()
        .getLastChildOrThrow()
        .getKey(),
    );
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => errors.push(event.error);
    window.addEventListener('error', onError);
    onTestFinished(() => window.removeEventListener('error', onError));
    let edited = false;
    const edit = () => {
      const drag = editor._inputState.mouseSelectionDrag;
      if (!edited && drag !== null && Array.isArray(drag.anchor)) {
        edited = true;
        editor.update(
          () => {
            const textNode = $getNodeByKey<TextNode>(textKey)!;
            textNode.setTextContent(' hi');
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.anchor.set(textKey, 3, 'text');
              if (selection.focus.key === textKey) {
                selection.focus.set(textKey, 3, 'text');
              }
            }
          },
          {discrete: true},
        );
      }
    };
    root.addEventListener('pointermove', edit, true);
    onTestFinished(() => root.removeEventListener('pointermove', edit, true));
    const end = textRect('world').right + 30;
    await commands.mouseDrag('#issue-7158-root', [
      [end, y],
      [end - 30, y],
      [left(COUNT - 1) + SIZE / 2, y],
      [left(2) - 2, y],
    ]);
    assert(edited, 'the drag never recorded its anchor');
    assert(errors.length === 0, `uncaught errors: ${errors.join(', ')}`);
    await vi.waitFor(() => {
      const anchor = editor.read(() => {
        const selection = $getSelection();
        return $isRangeSelection(selection)
          ? `${selection.anchor.key}:${selection.anchor.offset}`
          : String(selection);
      });
      assert(
        anchor === `${textKey}:3`,
        `expected the anchor at the end of the edited text, got ${anchor}`,
      );
    });
  });

  // A press on an inline decorator never starts a selection drag, so these
  // press the text after the decorators.
  test('a press on a non-collapsed selection is not tracked as a selection drag', async () => {
    const {editor, root, textRect} = mount(
      false,
      ImageLikeDecoratorNode,
      ' hello world',
    );
    const textKey = editor.read(() =>
      $getRoot()
        .getFirstChildOrThrow<ParagraphNode>()
        .getLastChildOrThrow()
        .getKey(),
    );
    editor.update(
      () => {
        $getNodeByKey<TextNode>(textKey)!.select(1, 6);
      },
      {discrete: true},
    );
    const press = (text: string) => {
      const rect = textRect(text);
      const rootRect = root.getBoundingClientRect();
      const init = {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: rootRect.left + (rect.left + rect.right) / 2,
        clientY: rootRect.top + (rect.top + rect.bottom) / 2,
        composed: true,
        pointerType: 'mouse',
      };
      const target = document.elementFromPoint(init.clientX, init.clientY)!;
      target.dispatchEvent(new PointerEvent('pointerdown', init));
      const tracked = editor._inputState.mouseSelectionDrag !== null;
      target.dispatchEvent(new PointerEvent('pointerup', init));
      return tracked;
    };
    assert(!press('hello'), 'a press on the selection would drag it');
    assert(press('world'), 'a press beside the selection selects');
  });

  test.each(['pointercancel', 'dragstart'])(
    'a press ended by %s lets a NodeSelection remove the DOM selection',
    async type => {
      const {editor, root, textRect} = mount(
        false,
        ImageLikeDecoratorNode,
        ' hello world',
      );
      editor.update(
        () => {
          $getRoot().getFirstChildOrThrow<ParagraphNode>().selectEnd();
        },
        {discrete: true},
      );
      const rect = textRect('world');
      const rootRect = root.getBoundingClientRect();
      const init = (dx: number) => ({
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: rootRect.left + rect.left + dx,
        clientY: rootRect.top + (rect.top + rect.bottom) / 2,
        composed: true,
        pointerType: 'mouse',
      });
      const target = document.elementFromPoint(
        init(0).clientX,
        init(0).clientY,
      )!;
      target.dispatchEvent(new PointerEvent('pointerdown', init(0)));
      target.dispatchEvent(new PointerEvent('pointermove', init(10)));
      assert(
        Array.isArray(editor._inputState.mouseSelectionDrag?.anchor),
        'the press never became a selection drag',
      );
      target.dispatchEvent(
        type === 'dragstart'
          ? new DragEvent(type, {bubbles: true, cancelable: true})
          : new PointerEvent(type, {bubbles: true, pointerType: 'mouse'}),
      );
      editor.update(
        () => {
          const selection = $createNodeSelection();
          selection.add(
            $getRoot()
              .getFirstChildOrThrow<ParagraphNode>()
              .getFirstChildOrThrow()
              .getKey(),
          );
          $setSelection(selection);
        },
        {discrete: true},
      );
      assert(
        getDOMSelection(window)!.rangeCount === 0,
        'expected the DOM selection to be removed',
      );
    },
  );
});
