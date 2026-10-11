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
 * driven through Playwright's mouse. These also check that a drag past the
 * end of a line does not rewrite the selection on every move, and that the
 * presses the fallback must not track (double clicks, presses on a selection,
 * drags ended by pointercancel or dragstart, anchors edited mid-drag) are left
 * to the browser.
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
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  DecoratorNode,
  getDOMSelection,
  isDOMTextNode,
  type LexicalEditor,
  registerEventListener,
  registerEventListeners,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import {assert, describe, onTestFinished, test, vi} from 'vitest';
import {commands} from 'vitest/browser';

import {$assertNodeType} from '../utils/assertNodeType';

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
 * An unselectable (`user-select: none`) inline-block whose image sits in a
 * block wrapper, as many integrations style images. Chromium's hit test finds
 * no position inside it that a drag selection can extend to.
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
 * The same block-wrapped image, but selectable, like the playground's
 * ImageNode: Chromium's hit test can put a drag point inside it, where the
 * point resolves to no Lexical selection.
 */
class SelectableBoxedImageDecoratorNode extends BoxedImageDecoratorNode {
  $config() {
    return this.config('test_7158_mouse_selectable_boxed_image', {
      extends: BoxedImageDecoratorNode,
    });
  }
  createDOM(): HTMLElement {
    const span = super.createDOM();
    span.style.userSelect = '';
    return span;
  }
}

type DecoratorClass = typeof ImageLikeDecoratorNode;

function mount(
  textBetween: boolean,
  klass: DecoratorClass,
  trailingText: string = '',
) {
  const root = document.createElement('div');
  root.id = 'issue-7158-root';
  root.contentEditable = 'true';
  // Narrower than the test frame (414px), which would otherwise scroll
  // sideways when a drag nears its edge.
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
  const trailingTextKey = editor.read('latest', () => {
    const last = $getRoot().getLastDescendant();
    return $isTextNode(last) ? last.getKey() : null;
  });
  // Where each pointer event landed (relative to the root) and the DOM
  // selection once the browser has handled it, for the failure message.
  const pointerLog: string[] = [];
  const logPointer = (event: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    const x = Math.round(event.clientX - rect.left);
    const y = Math.round(event.clientY - rect.top);
    setTimeout(() => {
      pointerLog.push(
        `${event.type.slice(7)}(${x},${y} b${event.buttons})=` +
          describeDOMSelection(getDOMSelection(window)),
      );
    });
  };
  onTestFinished(
    registerEventListeners(
      document,
      {pointerdown: logPointer, pointermove: logPointer, pointerup: logPointer},
      true,
    ),
  );
  onTestFinished(() => {
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
    const textNode =
      trailingTextKey !== null
        ? editor.getElementByKey(trailingTextKey)?.firstChild
        : null;
    assert(isDOMTextNode(textNode), 'expected the trailing text');
    const index = textNode.data.indexOf(text);
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
  return {
    editor,
    left,
    pointerLog,
    right,
    root,
    textRect,
    trailingTextKey,
    y,
  };
}

function describeDOMPoint(node: Node | null, offset: number): string {
  if (node === null) {
    return 'null';
  }
  const name = isDOMTextNode(node)
    ? `#text(${JSON.stringify(node.data)})`
    : node.nodeName.toLowerCase();
  return `${name}:${offset}`;
}

/**
 * A real mouse drag through `points` relative to the root. It moves in steps
 * of at most half a decorator's width, so the pointer stops over each
 * decorator it crosses.
 */
function mouseDrag(
  points: Parameters<typeof commands.mouseDrag>[1],
  options?: {clickCount?: number},
): Promise<void> {
  return commands.mouseDrag('#issue-7158-root', points, {
    ...options,
    maxStep: SIZE / 2,
  });
}

function describeDOMSelection(selection: Selection | null): string {
  return selection === null
    ? 'null'
    : `${describeDOMPoint(selection.anchorNode, selection.anchorOffset)}->` +
        describeDOMPoint(selection.focusNode, selection.focusOffset);
}

/**
 * The init of a left button mouse PointerEvent at (`x`, `y`) relative to
 * `root`.
 */
function mousePointerInit(
  root: HTMLElement,
  x: number,
  y: number,
): PointerEventInit {
  const rootRect = root.getBoundingClientRect();
  return {
    bubbles: true,
    button: 0,
    buttons: 1,
    clientX: rootRect.left + x,
    clientY: rootRect.top + y,
    composed: true,
    pointerType: 'mouse',
  };
}

/** The element at the point of `init`, to dispatch a pointer event to. */
function elementAt(init: PointerEventInit): Element {
  const element = document.elementFromPoint(
    init.clientX ?? 0,
    init.clientY ?? 0,
  );
  assert(element !== null, 'expected an element at the pointer');
  return element;
}

// The last selectionchange is handled asynchronously, and on a busy runner it
// can land well after the mouse is released, so wait for the editor's
// selection to settle rather than for a fixed time. A failure reports the
// selection that was reached, to tell a selection that never extended apart
// from one that extended too far.
async function expectSelectedDecoratorCount(
  editor: LexicalEditor,
  expected: number,
  pointerLog: string[],
): Promise<void> {
  await vi.waitFor(
    () => {
      const [count, lexical] = editor.read('latest', () => {
        const selection = $getSelection();
        return $isRangeSelection(selection)
          ? [
              selection.getNodes().filter($isDecoratorNode).length,
              `${selection.anchor.key}:${selection.anchor.offset}->` +
                `${selection.focus.key}:${selection.focus.offset}`,
            ]
          : [-1, String(selection)];
      });
      assert(
        count === expected,
        `expected ${expected} selected decorators, got ${count} ` +
          `(lexical ${lexical}; ` +
          `dom ${describeDOMSelection(getDOMSelection(window))}; ` +
          `pointer ${pointerLog.join(' ')})`,
      );
    },
    {interval: 50, timeout: 2000},
  );
}

function dragFromLineEnd(klass: DecoratorClass, textBetween: boolean) {
  return async () => {
    const {editor, left, pointerLog, right, y} = mount(textBetween, klass);
    await mouseDrag([
      [right(COUNT - 1) + 30, y],
      [left(COUNT - 2) + SIZE / 2, y],
      [left(3) + SIZE / 2, y],
      [left(2) - 2, y],
    ]);
    await expectSelectedDecoratorCount(editor, COUNT - 2, pointerLog);
  };
}

function dragFromLineStart(klass: DecoratorClass, textBetween: boolean) {
  return async () => {
    const {editor, left, pointerLog, right, y} = mount(textBetween, klass);
    await mouseDrag([
      [left(0) - 5, y],
      [left(1) + SIZE / 2, y],
      [left(COUNT - 2) + SIZE / 2, y],
      [right(COUNT - 1) + 30, y],
    ]);
    await expectSelectedDecoratorCount(editor, COUNT, pointerLog);
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

// Where a line ends in the managed line break's <img> (WebKit and desktop
// Chromium), the browser puts a drag's focus below or past the end of the line
// after that <img>, which Lexical maps to the point before it. Writing that
// point back only has the browser move it again on the next pointer move, so
// each move would be two selection changes.
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
  await mouseDrag([
    [x, y],
    [x + 50, y + SIZE],
    [x + 100, y + SIZE],
    [x + 50, y + 2 * SIZE],
  ]);
  await vi.waitFor(() =>
    assert(
      editor.read('latest', () => {
        const selection = $getSelection();
        return $isRangeSelection(selection) && selection.isCollapsed();
      }),
      'expected a collapsed selection',
    ),
  );
  // Chromium changes the selection twice here (on the press and on the first
  // move) and Firefox and WebKit once. Allow one more than that, since this
  // checks for a change on every move, which would be about a dozen.
  assert(
    selectionChanges <= 3,
    `expected at most 3 selection changes, got ${selectionChanges}`,
  );
});

// No engine extends a drag across these decorators by itself, so these
// exercise the pointermove fallback. A drag that starts
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
    const {editor, left, pointerLog, right, y} = mount(
      false,
      SelectableBoxedImageDecoratorNode,
    );
    await mouseDrag([
      [right(COUNT - 1) + 30, y],
      [left(2) + SIZE / 2, y],
      [right(COUNT - 1) + 10, y],
      [left(COUNT - 1) + 5, y],
      [left(2) - 2, y],
    ]);
    await expectSelectedDecoratorCount(editor, COUNT - 2, pointerLog);
  });

  // On macOS Chrome a drag can restart from the pointer, collapsing the
  // selection inside a decorator, where it resolves to no Lexical selection.
  // Linux Chromium does not do this, so do it the way it would: after the
  // browser and Lexical have handled a pointermove. This listener bubbles to
  // the document after the root's, and its timeout runs after the one the
  // root's handler queued.
  test('a drag that restarts inside a decorator keeps its anchor', async () => {
    const {editor, left, pointerLog, right, root, y} = mount(
      false,
      SelectableBoxedImageDecoratorNode,
    );
    const decorators = root.querySelectorAll('span > div');
    let injected = false;
    const inject = (event: PointerEvent) => {
      const x = event.clientX - root.getBoundingClientRect().left;
      if (!injected && event.buttons === 1 && x < left(COUNT - 2)) {
        injected = true;
        setTimeout(() =>
          getDOMSelection(window)?.collapse(decorators[COUNT - 2], 0),
        );
      }
    };
    onTestFinished(registerEventListener(document, 'pointermove', inject));
    await mouseDrag([
      [right(COUNT - 1) + 30, y],
      [left(2) - 2, y],
    ]);
    assert(injected, 'the drag never reached the injection point');
    await expectSelectedDecoratorCount(editor, COUNT - 2, pointerLog);
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
    await mouseDrag(
      [
        [(word.left + word.right) / 2, wordY],
        [left(COUNT - 1) + SIZE / 2, y],
        [left(2) - 2, y],
      ],
      {clickCount: 2},
    );
    await vi.waitFor(() => {
      const text = editor.read('latest', () => {
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
    const {editor, left, root, textRect, trailingTextKey, y} = mount(
      false,
      ImageLikeDecoratorNode,
      ' hello world',
    );
    assert(trailingTextKey !== null, 'expected the trailing text');
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => errors.push(event.error);
    onTestFinished(registerEventListener(window, 'error', onError));
    let edited = false;
    const edit = () => {
      const drag = editor._inputState.mouseSelectionDrag;
      if (!edited && drag !== null && Array.isArray(drag.anchor)) {
        edited = true;
        editor.update(
          () => {
            $assertNodeType(
              $getNodeByKey(trailingTextKey),
              $isTextNode,
            ).setTextContent(' hi');
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.anchor.set(trailingTextKey, 3, 'text');
              if (selection.focus.key === trailingTextKey) {
                selection.focus.set(trailingTextKey, 3, 'text');
              }
            }
          },
          {discrete: true},
        );
      }
    };
    onTestFinished(registerEventListener(root, 'pointermove', edit, true));
    const end = textRect('world').right + 30;
    await mouseDrag([
      [end, y],
      [end - 30, y],
      [left(COUNT - 1) + SIZE / 2, y],
      [left(2) - 2, y],
    ]);
    assert(edited, 'the drag never recorded its anchor');
    assert(errors.length === 0, `uncaught errors: ${errors.join(', ')}`);
    await vi.waitFor(() => {
      const anchor = editor.read('latest', () => {
        const selection = $getSelection();
        return $isRangeSelection(selection)
          ? `${selection.anchor.key}:${selection.anchor.offset}`
          : String(selection);
      });
      assert(
        anchor === `${trailingTextKey}:3`,
        `expected the anchor at the end of the edited text, got ${anchor}`,
      );
    });
  });

  // A press on an inline decorator never starts a selection drag, so these
  // press the text after the decorators.
  test('a press on a non-collapsed selection is not tracked as a selection drag', () => {
    const {editor, root, textRect, trailingTextKey} = mount(
      false,
      ImageLikeDecoratorNode,
      ' hello world',
    );
    assert(trailingTextKey !== null, 'expected the trailing text');
    editor.update(
      () => {
        $assertNodeType($getNodeByKey(trailingTextKey), $isTextNode).select(
          1,
          6,
        );
      },
      {discrete: true},
    );
    const press = (text: string) => {
      const rect = textRect(text);
      const init = mousePointerInit(
        root,
        (rect.left + rect.right) / 2,
        (rect.top + rect.bottom) / 2,
      );
      const target = elementAt(init);
      target.dispatchEvent(new PointerEvent('pointerdown', init));
      const tracked = editor._inputState.mouseSelectionDrag !== null;
      target.dispatchEvent(new PointerEvent('pointerup', init));
      return tracked;
    };
    assert(!press('hello'), 'a press on the selection would drag it');
    assert(press('world'), 'a press beside the selection selects');
  });

  // A move with no button pressed ends a press whose pointerup never reached
  // the document.
  test.each(['pointercancel', 'dragstart', 'a move with no button'])(
    'a press ended by %s lets a NodeSelection remove the DOM selection',
    type => {
      const {editor, root, textRect} = mount(
        false,
        ImageLikeDecoratorNode,
        ' hello world',
      );
      editor.update(
        () => {
          $getRoot().selectEnd();
        },
        {discrete: true},
      );
      const rect = textRect('world');
      const init = (dx: number) =>
        mousePointerInit(root, rect.left + dx, (rect.top + rect.bottom) / 2);
      const target = elementAt(init(0));
      target.dispatchEvent(new PointerEvent('pointerdown', init(0)));
      target.dispatchEvent(new PointerEvent('pointermove', init(10)));
      assert(
        Array.isArray(editor._inputState.mouseSelectionDrag?.anchor),
        'the press never became a selection drag',
      );
      target.dispatchEvent(
        type === 'dragstart'
          ? new DragEvent(type, {bubbles: true, cancelable: true})
          : type === 'pointercancel'
            ? new PointerEvent(type, {bubbles: true, pointerType: 'mouse'})
            : new PointerEvent('pointermove', {...init(20), buttons: 0}),
      );
      editor.update(
        () => {
          const selection = $createNodeSelection();
          selection.add(
            $assertNodeType(
              $getRoot().getFirstDescendant(),
              $isDecoratorNode,
            ).getKey(),
          );
          $setSelection(selection);
        },
        {discrete: true},
      );
      const domSelection = getDOMSelection(window);
      assert(
        domSelection !== null && domSelection.rangeCount === 0,
        'expected the DOM selection to be removed',
      );
    },
  );
});
