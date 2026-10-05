/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Regression tests for #7158 — "Decorator nodes are not selectable with
 * mouse".
 *
 * In a paragraph made only of inline decorators, a mouse drag that starts at
 * the edge of the line can leave both DOM selection endpoints inside two
 * different decorators' DOM. `$internalResolveSelectionPoints` rejected any
 * selection whose endpoints were both inside decorators, which is only meant
 * to keep Lexical out of a selection *within one* decorator's own content. The
 * update then committed a null selection and removed the DOM ranges, so the
 * highlight blinked and was lost.
 *
 * A click beside such a decorator at the start or end of the line also put
 * the caret on the decorator's own (non-editable) element; that caret now
 * resolves next to the decorator and is written back to the editable parent,
 * so a drag can start from it. Block decorators and selections inside a
 * decorator's content still resolve to null, as before.
 *
 * jsdom has no hit testing, so the DOM anchors that let a real browser start a
 * drag at either edge of the line are covered by Issue8922Repro.test.ts.
 */

import {
  buildEditorFromExtensions,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {
  $create,
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isRangeSelection,
  $setSelection,
  DecoratorNode,
  defineExtension,
  getDOMSelection,
  type LexicalEditor,
} from 'lexical';
import {
  afterEach,
  assert,
  describe,
  expect,
  onTestFinished,
  test,
  vi,
} from 'vitest';

// Shaped like the node in the issue: an inline, isolated decorator whose DOM
// holds an image (React would portal the <img> into the span).
class ImageLikeDecoratorNode extends DecoratorNode<null> {
  $config() {
    return this.config('test_7158_image', {extends: DecoratorNode});
  }
  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.appendChild(document.createElement('img'));
    return span;
  }
  updateDOM(): false {
    return false;
  }
  isKeyboardSelectable(): boolean {
    return false;
  }
  isIsolated(): boolean {
    return true;
  }
  decorate(): null {
    return null;
  }
}

class BlockDecoratorNode extends DecoratorNode<null> {
  $config() {
    return this.config('test_7158_block', {extends: DecoratorNode});
  }
  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.appendChild(document.createElement('img'));
    return div;
  }
  updateDOM(): false {
    return false;
  }
  isInline(): false {
    return false;
  }
  decorate(): null {
    return null;
  }
}

const DECORATOR_COUNT = 6;

describe('Issue #7158: mouse selection across inline decorators', () => {
  const mounted: HTMLElement[] = [];
  afterEach(() => {
    for (const root of mounted.splice(0)) {
      root.remove();
    }
  });

  function setUp(): {
    editor: LexicalEditorWithDispose;
    decoratorDOMs: HTMLElement[];
    decoratorKeys: string[];
    paragraphDOM: HTMLElement;
  } {
    const editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append(
                ...Array.from({length: DECORATOR_COUNT}, () =>
                  $create(ImageLikeDecoratorNode),
                ),
              ),
            );
        },
        name: '[7158]',
        nodes: [ImageLikeDecoratorNode, BlockDecoratorNode],
      }),
    );
    onTestFinished(() => editor.dispose());
    const root = document.createElement('div');
    document.body.appendChild(root);
    mounted.push(root);
    editor.setRootElement(root);
    const decoratorKeys = editor.read(() => {
      const paragraph = $getRoot().getFirstChild();
      assert($isElementNode(paragraph));
      return paragraph.getChildren().map(node => node.getKey());
    });
    const decoratorDOMs = decoratorKeys.map(key => {
      const dom = editor.getElementByKey(key);
      assert(dom !== null);
      return dom;
    });
    const paragraphDOM = decoratorDOMs[0].parentElement;
    assert(paragraphDOM !== null);
    return {decoratorDOMs, decoratorKeys, editor, paragraphDOM};
  }

  function dragTo(
    editor: LexicalEditor,
    anchorNode: Node,
    anchorOffset: number,
    focusNode: Node,
    focusOffset: number,
  ): void {
    const domSelection = getDOMSelection(window);
    assert(domSelection !== null);
    domSelection.setBaseAndExtent(
      anchorNode,
      anchorOffset,
      focusNode,
      focusOffset,
    );
    document.dispatchEvent(new Event('selectionchange'));
    // Each selectionchange is its own task in a browser, so the update it
    // started commits before the next one; flush it the same way here.
    editor.read(() => {});
  }

  function selectParagraphStart(editor: LexicalEditor): void {
    editor.update(
      () => {
        $getRoot().selectStart();
      },
      {discrete: true},
    );
  }

  function selectedDecoratorKeys(editor: LexicalEditor): string[] | null {
    return editor.read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || selection.isCollapsed()) {
        return null;
      }
      return selection
        .getNodes()
        .filter($isDecoratorNode)
        .map(node => node.getKey());
    });
  }

  test('dragging backward from inside the last decorator to inside an earlier one selects the decorators in between', () => {
    const {editor, decoratorDOMs, decoratorKeys} = setUp();
    // Drag starts after the last image (the end of the line) and ends before
    // the third image.
    dragTo(editor, decoratorDOMs[5], 1, decoratorDOMs[2], 0);
    expect(selectedDecoratorKeys(editor)).toEqual(decoratorKeys.slice(2));
    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.isBackward()).toBe(true);
    });
  });

  test('dragging forward from inside the first decorator to inside the last one selects every decorator', () => {
    const {editor, decoratorDOMs, decoratorKeys} = setUp();
    dragTo(editor, decoratorDOMs[0], 0, decoratorDOMs[5], 1);
    expect(selectedDecoratorKeys(editor)).toEqual(decoratorKeys);
    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.isBackward()).toBe(false);
    });
  });

  test('endpoints on the images inside two decorators also resolve', () => {
    const {editor, decoratorDOMs, decoratorKeys} = setUp();
    const img = (i: number) => decoratorDOMs[i].firstChild as Node;
    dragTo(editor, img(1), 0, img(4), 0);
    // An <img> has no inner positions, so a point on one resolves to just
    // before its decorator: this drag covers decorators 2 through 4.
    expect(selectedDecoratorKeys(editor)).toEqual(decoratorKeys.slice(1, 4));
  });

  test('a caret placed inside the last decorator (click at the end of the line) keeps the DOM selection', () => {
    const {editor, decoratorDOMs, decoratorKeys, paragraphDOM} = setUp();
    selectParagraphStart(editor);
    const removeAllRanges = vi.spyOn(Selection.prototype, 'removeAllRanges');
    onTestFinished(() => removeAllRanges.mockRestore());
    dragTo(editor, decoratorDOMs[5], 1, decoratorDOMs[5], 1);
    // Lexical used to resolve this caret to null, and the commit then removed
    // every DOM range, so a drag that started here had nothing to extend.
    expect(removeAllRanges).not.toHaveBeenCalled();
    // ...and the DOM caret is moved out of the non-editable decorator.
    expect(getDOMSelection(window)?.anchorNode).toBe(paragraphDOM);
    // (+1: the leading boundary anchor parked before the first decorator.)
    expect(getDOMSelection(window)?.anchorOffset).toBe(
      decoratorKeys.length + 1,
    );
    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.isCollapsed()).toBe(true);
      expect(selection.anchor.type).toBe('element');
      expect(selection.anchor.offset).toBe(decoratorKeys.length);
    });
  });

  // Models a real mouse drag: mousedown puts a caret somewhere, then each
  // mousemove extends the selection from the browser's current anchor. If
  // the anchor were left inside a contentEditable=false decorator, a browser
  // would not extend past that decorator, so this asserts the anchor has been
  // moved out to the paragraph.
  function mouseDrag(
    editor: LexicalEditor,
    paragraphDOM: HTMLElement,
    mouseDown: [Node, number],
    moves: [Node, number][],
  ): void {
    dragTo(editor, mouseDown[0], mouseDown[1], mouseDown[0], mouseDown[1]);
    const domSelection = getDOMSelection(window);
    assert(domSelection !== null);
    expect(domSelection.anchorNode).toBe(paragraphDOM);
    for (const [focusNode, focusOffset] of moves) {
      domSelection.extend(focusNode, focusOffset);
      document.dispatchEvent(new Event('selectionchange'));
      editor.read(() => {});
      expect(domSelection.anchorNode).toBe(paragraphDOM);
      expect(domSelection.focusNode).toBe(paragraphDOM);
    }
  }

  test('a mouse drag that starts at the end of the line selects every decorator it crosses', () => {
    const {editor, decoratorDOMs, decoratorKeys, paragraphDOM} = setUp();
    selectParagraphStart(editor);
    const removeAllRanges = vi.spyOn(Selection.prototype, 'removeAllRanges');
    onTestFinished(() => removeAllRanges.mockRestore());
    mouseDrag(
      editor,
      paragraphDOM,
      [decoratorDOMs[5], 1], // mousedown: caret after the last image
      [
        [decoratorDOMs[5], 0], // still over the last image
        [decoratorDOMs[4], 0],
        [decoratorDOMs[2], 0], // mouseup before the third image
      ],
    );
    expect(removeAllRanges).not.toHaveBeenCalled();
    expect(selectedDecoratorKeys(editor)).toEqual(decoratorKeys.slice(2));
  });

  test('a mouse drag that starts at the start of the line selects every decorator it crosses', () => {
    const {editor, decoratorDOMs, decoratorKeys, paragraphDOM} = setUp();
    mouseDrag(
      editor,
      paragraphDOM,
      [decoratorDOMs[0], 0], // mousedown: caret before the first image
      [
        [decoratorDOMs[0], 1],
        [decoratorDOMs[3], 1],
        [decoratorDOMs[5], 1], // mouseup after the last image
      ],
    );
    expect(selectedDecoratorKeys(editor)).toEqual(decoratorKeys);
  });

  test('a selection of text inside a single decorator is still left to the decorator', () => {
    const {editor, decoratorDOMs} = setUp();
    const label = document.createTextNode('label');
    decoratorDOMs[3].appendChild(label);
    dragTo(editor, label, 1, label, 4);
    editor.read(() => {
      expect($isRangeSelection($getSelection())).toBe(false);
    });
  });

  test('a drag over a single decorator resolves to the positions around it', () => {
    const {editor, decoratorDOMs, decoratorKeys} = setUp();
    dragTo(editor, decoratorDOMs[3], 0, decoratorDOMs[3], 1);
    expect(selectedDecoratorKeys(editor)).toEqual([decoratorKeys[3]]);
  });

  // Unchanged behavior: everything below resolved to null before #7158 and
  // still does.

  test('a caret on an element inside a single decorator content is still left to the decorator', () => {
    const {editor, decoratorDOMs} = setUp();
    const inner = document.createElement('b');
    inner.appendChild(document.createElement('i'));
    decoratorDOMs[3].appendChild(inner);
    dragTo(editor, inner, 0, inner, 1);
    editor.read(() => {
      expect($isRangeSelection($getSelection())).toBe(false);
    });
  });

  test('a selection inside a block decorator is still left to the decorator', () => {
    const {editor} = setUp();
    let blockKey = '';
    editor.update(
      () => {
        const block = $create(BlockDecoratorNode);
        $getRoot().append(block);
        blockKey = block.getKey();
        $setSelection(null);
      },
      {discrete: true},
    );
    const blockDOM = editor.getElementByKey(blockKey);
    assert(blockDOM !== null);
    dragTo(editor, blockDOM, 0, blockDOM, 1);
    editor.read(() => {
      expect($isRangeSelection($getSelection())).toBe(false);
    });
  });

  test('a drag between two block decorators is still left alone', () => {
    const {editor} = setUp();
    const keys: string[] = [];
    editor.update(
      () => {
        for (let i = 0; i < 2; i++) {
          const block = $create(BlockDecoratorNode);
          $getRoot().append(block);
          keys.push(block.getKey());
        }
        $setSelection(null);
      },
      {discrete: true},
    );
    const [first, second] = keys.map(key => {
      const dom = editor.getElementByKey(key);
      assert(dom !== null);
      return dom;
    });
    dragTo(editor, first, 0, second, 1);
    editor.read(() => {
      expect($isRangeSelection($getSelection())).toBe(false);
    });
  });
});
