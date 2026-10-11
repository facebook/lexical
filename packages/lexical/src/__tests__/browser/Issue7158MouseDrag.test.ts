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
 * driven through Playwright's mouse. These also check that a click beside
 * those decorators puts the caret beside them, that a drag past the end or
 * start of a line does not rewrite the selection on every move, that a Shift
 * drag keeps the selection's anchor, and that the presses the fallback must
 * not track (double clicks, presses on a selection, drags ended by
 * pointercancel or dragstart, anchors edited mid-drag) are left to the
 * browser.
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $create,
  $createLineBreakNode,
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  DecoratorNode,
  ElementNode,
  getDOMSelection,
  isDOMTextNode,
  type LexicalEditor,
  registerEventListener,
  registerEventListeners,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import {assert, describe, expect, onTestFinished, test, vi} from 'vitest';
import {commands, server} from 'vitest/browser';

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

/**
 * An unselectable inline decorator whose box is a nested editor's root
 * element, like the caption of the playground's ImageNode, so that the
 * pointer moves over it are aimed at that editor.
 */
class NestedEditorDecoratorNode extends ImageLikeDecoratorNode {
  $config() {
    return this.config('test_7158_mouse_nested_editor', {
      extends: ImageLikeDecoratorNode,
    });
  }
  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.style.cssText = 'display:inline-block;user-select:none';
    const div = document.createElement('div');
    div.style.cssText = `width:${SIZE}px;height:${SIZE}px;background:#888`;
    span.appendChild(div);
    return span;
  }
}

/** An inline element, like a link or a mark, to put a decorator in. */
class InlineWrapperNode extends ElementNode {
  $config() {
    return this.config('test_7158_inline_wrapper', {extends: ElementNode});
  }
  createDOM(): HTMLElement {
    return document.createElement('a');
  }
  updateDOM(): false {
    return false;
  }
  isInline(): true {
    return true;
  }
}

type DecoratorClass = typeof ImageLikeDecoratorNode;

interface MountOptions {
  /** Text after the decorators. */
  trailingText?: string;
  /** A line before the decorators, ended by a line break. */
  leadingLine?: string;
  /** A line after the decorators, after a line break. */
  trailingLine?: string;
  /** Whether each decorator is in an inline element of its own. */
  inInlineElements?: boolean;
}

function mount(
  textBetween: boolean,
  klass: DecoratorClass,
  {
    trailingText = '',
    leadingLine = '',
    trailingLine = '',
    inInlineElements = false,
  }: MountOptions = {},
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
        if (leadingLine !== '') {
          // The decorators start the paragraph's second line.
          paragraph.append(
            $createTextNode(leadingLine),
            $createLineBreakNode(),
          );
        }
        for (let i = 0; i < COUNT; i++) {
          if (textBetween) {
            paragraph.append($createTextNode(' '));
          }
          paragraph.append(
            inInlineElements
              ? $create(InlineWrapperNode).append($create(klass))
              : $create(klass),
          );
        }
        if (trailingText !== '') {
          paragraph.append($createTextNode(trailingText));
        }
        if (trailingLine !== '') {
          // The decorators end the paragraph's first line.
          paragraph.append(
            $createLineBreakNode(),
            $createTextNode(trailingLine),
          );
        }
        $getRoot().clear().append(paragraph);
      },
      dependencies: [RichTextExtension],
      name: '[7158-mouse]',
      nodes: [
        ImageLikeDecoratorNode,
        BoxedImageDecoratorNode,
        SelectableBoxedImageDecoratorNode,
        NestedEditorDecoratorNode,
        InlineWrapperNode,
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
  // The box inside each decorator.
  const images = Array.from(
    root.querySelectorAll('[data-lexical-decorator] > :first-child'),
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
  options?: Omit<
    NonNullable<Parameters<typeof commands.mouseDrag>[2]>,
    'maxStep'
  >,
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
        // A caret beside a decorator "selects" it as far as getNodes() is
        // concerned, so it counts as none.
        return $isRangeSelection(selection)
          ? [
              selection.isCollapsed()
                ? 0
                : selection.getNodes().filter($isDecoratorNode).length,
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

function dragFromLineEnd(
  klass: DecoratorClass,
  textBetween: boolean,
  options?: MountOptions,
) {
  return async () => {
    const {editor, left, pointerLog, right, y} = mount(
      textBetween,
      klass,
      options,
    );
    await mouseDrag([
      [right(COUNT - 1) + 30, y],
      [left(COUNT - 2) + SIZE / 2, y],
      [left(3) + SIZE / 2, y],
      [left(2) - 2, y],
    ]);
    await expectSelectedDecoratorCount(editor, COUNT - 2, pointerLog);
  };
}

function dragFromLineStart(
  klass: DecoratorClass,
  textBetween: boolean,
  options?: MountOptions,
) {
  return async () => {
    const {editor, left, pointerLog, right, y} = mount(
      textBetween,
      klass,
      options,
    );
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

// As at the end of the line, a drag above the start of a line that starts with
// an inline decorator must not change the selection on every move.
test('Issue #7158: a drag past the start of the line does not keep changing the selection', async () => {
  const {editor, left, y} = mount(false, ImageLikeDecoratorNode);
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
  const x = left(0) + SIZE / 2;
  await mouseDrag([
    [left(0) - 5, y],
    [x, y - SIZE],
    [x + 50, y - SIZE],
    [x + 100, y - SIZE],
    [x + 50, y - SIZE / 2],
  ]);
  await vi.waitFor(() =>
    assert(
      editor.read('latest', () => {
        const selection = $getSelection();
        return $isRangeSelection(selection);
      }),
      'expected a RangeSelection',
    ),
  );
  assert(
    selectionChanges <= 3,
    `expected at most 3 selection changes, got ${selectionChanges}`,
  );
});

// No engine extends a drag across these decorators by itself, so these
// exercise the pointermove fallback.
describe('Issue #7158: mouse drag over unselectable inline decorators', () => {
  test(
    'a drag from right of the last decorator selects back to the third',
    dragFromLineEnd(BoxedImageDecoratorNode, false),
  );
  test(
    'a drag from left of the first decorator selects to the end of the line',
    dragFromLineStart(BoxedImageDecoratorNode, false),
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

// A decorator can be in an inline element, such as a link or a mark, including
// at either end of the line.
describe.each([
  ['inline', ImageLikeDecoratorNode],
  ['unselectable boxed inline', BoxedImageDecoratorNode],
])(
  'Issue #7158: mouse drag over %s decorators that are each in an inline element',
  (_name, klass) => {
    test(
      'a drag from right of the last decorator selects back to the third',
      dragFromLineEnd(klass, false, {inInlineElements: true}),
    );
    test(
      'a drag from left of the first decorator selects to the end of the line',
      dragFromLineStart(klass, false, {inInlineElements: true}),
    );
    test(
      'with text between, a drag from right of the last decorator selects back to the third',
      dragFromLineEnd(klass, true, {inInlineElements: true}),
    );
    test(
      'with text between, a drag from left of the first text selects to the end of the line',
      dragFromLineStart(klass, true, {inInlineElements: true}),
    );
  },
);

// A Shift press extends the selection to the press, so its drag keeps the
// selection's anchor. Chromium and WebKit do that even for a press on the
// selection, where Firefox drags the selection, with or without Shift.
describe('Issue #7158: Shift mouse drag over unselectable inline decorators', () => {
  test.skipIf(server.browser === 'firefox')(
    'a drag from inside the selection extends it back to the third decorator',
    async () => {
      const {editor, left, pointerLog, root, textRect, trailingTextKey, y} =
        mount(false, BoxedImageDecoratorNode, {trailingText: ' hello world'});
      assert(trailingTextKey !== null, 'expected the trailing text');
      root.focus();
      editor.update(
        () => {
          $assertNodeType($getNodeByKey(trailingTextKey), $isTextNode).select(
            1,
            12,
          );
        },
        {discrete: true},
      );
      const hello = textRect('hello');
      await mouseDrag(
        [
          [(hello.left + hello.right) / 2, (hello.top + hello.bottom) / 2],
          [left(COUNT - 1) + SIZE / 2, y],
          [left(3) + SIZE / 2, y],
          [left(2) - 2, y],
        ],
        {modifiers: ['Shift']},
      );
      await expectSelectedDecoratorCount(editor, COUNT - 2, pointerLog);
    },
  );

  test('a drag keeps a caret anchor before a decorator the press is beyond', async () => {
    const {editor, left, pointerLog, root, textRect, y} = mount(
      false,
      BoxedImageDecoratorNode,
      {trailingText: ' hello world'},
    );
    root.focus();
    editor.update(
      () => {
        $assertNodeType($getRoot().getFirstChild(), $isParagraphNode).select(
          1,
          1,
        );
      },
      {discrete: true},
    );
    const world = textRect('world');
    await mouseDrag(
      [
        [(world.left + world.right) / 2, (world.top + world.bottom) / 2],
        [left(COUNT - 1) + SIZE / 2, y],
        [left(4) - 2, y],
      ],
      {modifiers: ['Shift']},
    );
    // From before the second decorator to before the fifth.
    await expectSelectedDecoratorCount(editor, 3, pointerLog);
  });
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

// A nested editor handles the pointer events aimed at its root, as the
// caption of the playground's ImageNode does, and the drag must still see the
// moves over it. The drag ends over one, where only the drag's own handling
// can put the focus before that decorator. Firefox aims the moves of a drag
// at the element that was pressed, so there the nested editors never see
// them.
describe('Issue #7158: mouse drag over inline decorators that hold a nested editor', () => {
  test.each([
    ['an editable', true],
    ['a read-only', false],
  ])(
    'a drag from right of the last decorator to %s nested editor in the third selects back to it',
    async (_name, isEditable) => {
      const {editor, left, pointerLog, right, root, y} = mount(
        false,
        NestedEditorDecoratorNode,
      );
      for (const box of root.querySelectorAll<HTMLElement>(
        '[data-lexical-decorator] > div',
      )) {
        const nested = buildEditorFromExtensions(
          defineExtension({
            dependencies: [RichTextExtension],
            name: '[7158-mouse-nested]',
          }),
        );
        box.contentEditable = 'true';
        nested.setRootElement(box);
        nested.setEditable(isEditable);
        onTestFinished(() => nested.dispose());
      }
      await mouseDrag([
        [right(COUNT - 1) + 30, y],
        [left(COUNT - 2) + SIZE / 2, y],
        [left(3) + SIZE / 2, y],
        [left(2) + SIZE / 4, y],
      ]);
      await expectSelectedDecoratorCount(editor, COUNT - 2, pointerLog);
    },
  );
});

// A click beside the first or last inline decorator of a line puts the caret
// beside it, not inside its contentEditable=false DOM, where it would resolve
// to no selection at all; with a caret elsewhere already, Lexical would then
// remove the DOM selection too.
describe.each([
  ['inline decorators', ImageLikeDecoratorNode, false],
  ['unselectable boxed inline decorators', BoxedImageDecoratorNode, false],
  [
    'selectable boxed inline decorators',
    SelectableBoxedImageDecoratorNode,
    false,
  ],
  [
    'unselectable boxed inline decorators each in an inline element',
    BoxedImageDecoratorNode,
    true,
  ],
])('Issue #7158: mouse click beside %s', (_name, klass, inInlineElements) => {
  test.each([
    ['', 'left of the first', 'start', 0, false],
    ['', 'right of the last', 'end', COUNT, false],
    ['with a caret at the other end, ', 'left of the first', 'start', 0, true],
    [
      'with a caret at the other end, ',
      'right of the last',
      'end',
      COUNT,
      true,
    ],
  ])(
    '%sa click %s decorator puts the caret at the %s of the line',
    async (_caret, _side, _edge, offset, hasCaret) => {
      const {editor, left, pointerLog, right, root, y} = mount(false, klass, {
        inInlineElements,
      });
      if (hasCaret) {
        root.focus();
        editor.update(
          () => {
            if (offset === 0) {
              $getRoot().selectEnd();
            } else {
              $getRoot().selectStart();
            }
          },
          {discrete: true},
        );
      }
      await mouseDrag([
        [offset === 0 ? left(0) - 5 : right(COUNT - 1) + 30, y],
      ]);
      // In an inline element at the edge of the line, the caret can also be
      // at the edge of that element.
      const carets = [
        `paragraph:${offset}`,
        ...(inInlineElements
          ? [`test_7158_inline_wrapper:${offset === 0 ? 0 : 1}`]
          : []),
      ];
      await vi.waitFor(
        () => {
          const caret = editor.read('latest', () => {
            const selection = $getSelection();
            return $isRangeSelection(selection) && selection.isCollapsed()
              ? `${selection.anchor.getNode().getType()}:${selection.anchor.offset}`
              : String(selection);
          });
          assert(
            carets.includes(caret),
            `expected the caret at ${carets.join(' or ')}, got ${caret} ` +
              `(dom ${describeDOMSelection(getDOMSelection(window))}; ` +
              `pointer ${pointerLog.join(' ')})`,
          );
        },
        {interval: 50, timeout: 2000},
      );
    },
  );
});

// The reconciler renders an edge box only after the decorator that ends a
// paragraph, so a line that a line break ends has none.
describe.each([
  ['', false],
  [' that are each in an inline element', true],
])(
  'Issue #7158: mouse drag over inline decorators%s beside a line break',
  (_name, inInlineElements) => {
    test('on a line a line break starts, a drag from left of the first decorator selects to the end of the line', async () => {
      const {editor, left, pointerLog, right, y} = mount(
        false,
        ImageLikeDecoratorNode,
        {inInlineElements, leadingLine: 'text'},
      );
      await mouseDrag([
        [left(0) - 5, y],
        [left(1) + SIZE / 2, y],
        [left(COUNT - 2) + SIZE / 2, y],
        [right(COUNT - 1) + 30, y],
      ]);
      await expectSelectedDecoratorCount(editor, COUNT, pointerLog);
      assert(
        editor.read('latest', () => {
          const selection = $getSelection();
          return (
            $isRangeSelection(selection) &&
            !selection.getNodes().some($isLineBreakNode)
          );
        }),
        `expected the line break to stay unselected (dom ` +
          `${describeDOMSelection(getDOMSelection(window))}; ` +
          `pointer ${pointerLog.join(' ')})`,
      );
    });
    test('on a line a line break ends, a drag from right of the last decorator selects back to the third', async () => {
      const {editor, left, pointerLog, right, y} = mount(
        false,
        ImageLikeDecoratorNode,
        {inInlineElements, trailingLine: 'text'},
      );
      await mouseDrag([
        [right(COUNT - 1) + 30, y],
        [left(COUNT - 2) + SIZE / 2, y],
        [left(3) + SIZE / 2, y],
        [left(2) - 2, y],
      ]);
      await expectSelectedDecoratorCount(editor, COUNT - 2, pointerLog);
      assert(
        editor.read('latest', () => {
          const selection = $getSelection();
          return (
            $isRangeSelection(selection) &&
            !selection.getNodes().some($isLineBreakNode)
          );
        }),
        `expected the line break to stay unselected (dom ` +
          `${describeDOMSelection(getDOMSelection(window))}; ` +
          `pointer ${pointerLog.join(' ')})`,
      );
    });
  },
);

describe('Issue #7158: mouse presses the drag fallback leaves alone', () => {
  // A double-click drag extends the selection by words, keeping the word it
  // selected; the drag's anchor moves to whichever end of that word is
  // farther from the pointer.
  test('a double-click drag keeps the double-clicked word', async () => {
    const {editor, left, textRect, y} = mount(false, ImageLikeDecoratorNode, {
      trailingText: ' hello world',
    });
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

  // Something can cancel a press after Lexical has started tracking it (a
  // check list item's check mark does on pointerdown, the playground's card
  // chrome on mousedown), and the browser then starts no selection drag.
  test.each([
    ['pointerdown', true],
    ['mousedown', false],
  ])('a press whose %s is cancelled selects nothing', async (type, capture) => {
    const {editor, left, root, textRect, y} = mount(
      false,
      BoxedImageDecoratorNode,
      {trailingText: ' hello world'},
    );
    root.focus();
    editor.update(
      () => {
        $getRoot().selectEnd();
      },
      {discrete: true},
    );
    onTestFinished(
      registerEventListener(
        root,
        type,
        event => event.preventDefault(),
        capture,
      ),
    );
    const world = textRect('world');
    await mouseDrag([
      [(world.left + world.right) / 2, (world.top + world.bottom) / 2],
      [left(COUNT - 1) + SIZE / 2, y],
      [left(2) - 2, y],
    ]);
    assert(
      editor.read('latest', () => {
        const selection = $getSelection();
        return $isRangeSelection(selection) && selection.isCollapsed();
      }),
      `expected the caret to stay put, got ${describeDOMSelection(getDOMSelection(window))}`,
    );
  });

  // A collaborator's edit (simulated here) can change the text at the drag's
  // anchor mid-drag, and move the editor's selection with it.
  test('a drag whose anchor text changes mid-drag continues from the moved anchor', async () => {
    const {editor, left, root, textRect, trailingTextKey, y} = mount(
      false,
      ImageLikeDecoratorNode,
      {trailingText: ' hello world'},
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
      {trailingText: ' hello world'},
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
    const press = (text: string, shiftKey = false) => {
      const rect = textRect(text);
      const init = {
        ...mousePointerInit(
          root,
          (rect.left + rect.right) / 2,
          (rect.top + rect.bottom) / 2,
        ),
        shiftKey,
      };
      const target = elementAt(init);
      target.dispatchEvent(new PointerEvent('pointerdown', init));
      const tracked = editor._inputState.mouseSelectionDrag !== null;
      target.dispatchEvent(new PointerEvent('pointerup', init));
      return tracked;
    };
    assert(!press('hello'), 'a press on the selection would drag it');
    assert(press('world'), 'a press beside the selection selects');
    // Firefox drags the selection with Shift too.
    assert(
      press('hello', true) === (server.browser !== 'firefox'),
      'a Shift press on the selection extends it, except in Firefox',
    );
  });

  // A move with no button pressed ends a press whose pointerup never reached
  // the document.
  test.each([
    'pointercancel',
    'dragstart',
    'a move with no button',
    'the window losing focus',
  ])(
    'a press ended by %s lets a NodeSelection remove the DOM selection',
    type => {
      const {editor, root, textRect} = mount(false, ImageLikeDecoratorNode, {
        trailingText: ' hello world',
      });
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
      if (type === 'the window losing focus') {
        window.dispatchEvent(new FocusEvent('blur'));
      } else {
        target.dispatchEvent(
          type === 'dragstart'
            ? new DragEvent(type, {bubbles: true, cancelable: true})
            : type === 'pointercancel'
              ? new PointerEvent(type, {bubbles: true, pointerType: 'mouse'})
              : new PointerEvent('pointermove', {...init(20), buttons: 0}),
        );
      }
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

  // A press on a selection measures only the part of it in the pressed
  // element, however much of the document is selected.
  test('a press on a selection measures only the pressed element', () => {
    const {editor, root, textRect} = mount(false, ImageLikeDecoratorNode, {
      trailingText: ' hello world',
    });
    editor.update(
      () => {
        const paragraph = $assertNodeType(
          $getRoot().getFirstChild(),
          $isParagraphNode,
        );
        paragraph.select(0, paragraph.getChildrenSize());
      },
      {discrete: true},
    );
    const spy = vi.spyOn(Range.prototype, 'getClientRects');
    onTestFinished(() => spy.mockRestore());
    const rect = textRect('hello');
    const init = mousePointerInit(
      root,
      (rect.left + rect.right) / 2,
      (rect.top + rect.bottom) / 2,
    );
    const target = elementAt(init);
    target.dispatchEvent(new PointerEvent('pointerdown', init));
    const tracked = editor._inputState.mouseSelectionDrag !== null;
    target.dispatchEvent(new PointerEvent('pointerup', init));
    assert(!tracked, 'a press on the selection would drag it');
    assert(spy.mock.contexts.length > 0, 'expected the selection measured');
    for (const range of spy.mock.contexts) {
      assert(range instanceof Range, 'expected a Range');
      assert(
        target.contains(range.commonAncestorContainer),
        `measured ${describeDOMPoint(range.startContainer, range.startOffset)}` +
          ` to ${describeDOMPoint(range.endContainer, range.endOffset)}`,
      );
    }
  });

  // Past the end of a line that ends in an inline decorator, Chromium and
  // WebKit put a drag's focus after the managed line break's <img> and
  // Firefox after its <br>, which are the same Lexical point as before the
  // line break, so the decorator before them is the one the pointer passes.
  test('a drag focus after the line break moves before a decorator the pointer has passed', async () => {
    const {editor, left, pointerLog, right, root, y} = mount(
      true,
      ImageLikeDecoratorNode,
    );
    root.focus();
    editor.update(
      () => {
        $getRoot().selectEnd();
      },
      {discrete: true},
    );
    const paragraph = root.querySelector('p');
    const domSelection = getDOMSelection(window);
    assert(paragraph !== null && domSelection !== null, 'expected the line');
    const press = mousePointerInit(root, right(COUNT - 1) + 30, y);
    paragraph.dispatchEvent(new PointerEvent('pointerdown', press));
    paragraph.dispatchEvent(
      new PointerEvent('pointermove', {
        ...press,
        clientX: (press.clientX ?? 0) + 10,
      }),
    );
    assert(
      Array.isArray(editor._inputState.mouseSelectionDrag?.anchor),
      'the press never became a selection drag',
    );
    // Lexical would handle the selectionchange for this point first and
    // write the point before the line break back, which would hide whether
    // the drag looks past the line break, so keep the selection changes that
    // leave the focus there from Lexical.
    onTestFinished(
      registerEventListener(
        window,
        'selectionchange',
        event => {
          if (
            domSelection.focusNode === paragraph &&
            domSelection.focusOffset === paragraph.childNodes.length
          ) {
            event.stopImmediatePropagation();
          }
        },
        true,
      ),
    );
    // What the browser's hit test does for a pointer past the end of the
    // line, which synthetic events don't make it do.
    domSelection.extend(paragraph, paragraph.childNodes.length);
    // Over the text between the last two decorators.
    const move = mousePointerInit(root, left(COUNT - 1) - 2, y);
    elementAt(move).dispatchEvent(new PointerEvent('pointermove', move));
    await expectSelectedDecoratorCount(editor, 1, pointerLog);
  });

  // The browser moves a drag's selection in each move's default action, and
  // the drag adjusts it after that, so the moves that arrive before it has
  // do not each adjust it, with a position that is already stale.
  test('moves that arrive before the drag adjusts adjust it once, for the latest', async () => {
    const {editor, left, root, textRect, y} = mount(
      false,
      BoxedImageDecoratorNode,
      {trailingText: ' hello world'},
    );
    root.focus();
    editor.update(
      () => {
        $getRoot().selectEnd();
      },
      {discrete: true},
    );
    const world = textRect('world');
    const press = mousePointerInit(
      root,
      (world.left + world.right) / 2,
      (world.top + world.bottom) / 2,
    );
    const target = elementAt(press);
    target.dispatchEvent(new PointerEvent('pointerdown', press));
    target.dispatchEvent(
      new PointerEvent('pointermove', {
        ...press,
        clientX: (press.clientX ?? 0) - 10,
      }),
    );
    assert(
      Array.isArray(editor._inputState.mouseSelectionDrag?.anchor),
      'the press never became a selection drag',
    );
    const spy = vi.spyOn(Selection.prototype, 'extend');
    onTestFinished(() => spy.mockRestore());
    // The left half of the third decorator, then its right half.
    for (const x of [left(3) + 5, left(3) + SIZE - 5]) {
      const move = mousePointerInit(root, x, y);
      elementAt(move).dispatchEvent(new PointerEvent('pointermove', move));
    }
    await new Promise(resolve => setTimeout(resolve, 0));
    const decoratorDOM = root.querySelectorAll('[data-lexical-decorator]')[3];
    const paragraph = decoratorDOM.parentNode;
    assert(paragraph !== null, 'expected the line');
    expect(spy.mock.calls).toEqual([
      [paragraph, Array.from(paragraph.childNodes).indexOf(decoratorDOM) + 1],
    ]);
  });
});
