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
  getDOMSelection,
  type NodeKey,
} from 'lexical';
import {
  $createTestDecoratorNode,
  TestDecoratorNode,
} from 'lexical/src/__tests__/utils';
import {afterEach, assert, describe, expect, test, vi} from 'vitest';

// `vi.mock` is hoisted above all imports, so LexicalEvents.ts sees iOS.
vi.mock('lexical/src/environment', async importOriginal => ({
  ...(await importOriginal<typeof import('lexical/src/environment')>()),
  IS_IOS: true,
}));

function setUp() {
  const rootElement = document.createElement('div');
  rootElement.contentEditable = 'true';
  document.body.appendChild(rootElement);
  let decoratorKey: NodeKey = '';
  let textKey: NodeKey = '';
  const editor = buildEditorFromExtensions({
    $initialEditorState: () => {
      const decorator = $createTestDecoratorNode();
      const text = $createTextNode('Hello world');
      decoratorKey = decorator.getKey();
      textKey = text.getKey();
      $getRoot().append(decorator, $createParagraphNode().append(text));
      const selection = $createNodeSelection();
      selection.add(decoratorKey);
      $setSelection(selection);
    },
    dependencies: [RichTextExtension],
    name: 'test',
    nodes: [TestDecoratorNode],
  });
  editor.setRootElement(rootElement);
  const decoratorElement = editor.getElementByKey(decoratorKey)!;
  const textElement = editor.getElementByKey(textKey)!;
  return {decoratorElement, editor, rootElement, textElement};
}

// The pointerdown and compatibility mousedown of a press, as iOS sends them;
// returns the mousedown.
function mouseDown(target: Element, pointerType = 'touch'): MouseEvent {
  const pointerDown = new MouseEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(pointerDown, 'pointerType', {value: pointerType});
  target.dispatchEvent(pointerDown);
  const event = new MouseEvent('mousedown', {bubbles: true, cancelable: true});
  target.dispatchEvent(event);
  return event;
}

afterEach(() => {
  document.body.textContent = '';
});

describe('a tap on a decorator on iOS', () => {
  test('cancels the mousedown so the editor does not take focus', () => {
    const {decoratorElement, editor} = setUp();
    using _editor = editor;
    const img = document.createElement('img');
    decoratorElement.appendChild(img);

    expect(mouseDown(img).defaultPrevented).toBe(true);
    expect(mouseDown(decoratorElement).defaultPrevented).toBe(true);
  });

  test('keeps the default for interactive elements inside the decorator', () => {
    const {decoratorElement, editor} = setUp();
    using _editor = editor;
    const button = document.createElement('button');
    const label = document.createElement('span');
    button.appendChild(label);
    const caption = document.createElement('div');
    caption.contentEditable = 'true';
    const captionText = document.createElement('p');
    caption.appendChild(captionText);
    decoratorElement.append(button, caption);

    expect(mouseDown(label).defaultPrevented).toBe(false);
    expect(mouseDown(captionText).defaultPrevented).toBe(false);
  });

  test('keeps the default for a trackpad or mouse press', () => {
    const {decoratorElement, editor} = setUp();
    using _editor = editor;
    const img = document.createElement('img');
    decoratorElement.appendChild(img);

    expect(mouseDown(img, 'mouse').defaultPrevented).toBe(false);
    expect(mouseDown(img, 'pen').defaultPrevented).toBe(true);
  });

  test('keeps the default for text', () => {
    const {editor, textElement} = setUp();
    using _editor = editor;

    expect(mouseDown(textElement).defaultPrevented).toBe(false);
  });
});

describe('a tap on text after a NodeSelection on iOS', () => {
  test('keeps the caret the tap placed', () => {
    const {editor, rootElement, textElement} = setUp();
    using _editor = editor;
    const textDOM = textElement.firstChild!;
    // iOS focuses the editor and places the caret, then fires the click
    // (reported with pointerType 'mouse') before the selectionchange.
    rootElement.focus();
    const domSelection = getDOMSelection(window)!;
    domSelection.setBaseAndExtent(textDOM, 3, textDOM, 3);
    textElement.dispatchEvent(
      new MouseEvent('click', {bubbles: true, detail: 1}),
    );

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.isCollapsed()).toBe(true);
      expect(selection.anchor.getNode().getTextContent()).toBe('Hello world');
      expect(selection.anchor.offset).toBe(3);
    });
    expect(domSelection.rangeCount).toBe(1);
    expect(domSelection.anchorNode).toBe(textDOM);
    expect(domSelection.anchorOffset).toBe(3);
  });
});
