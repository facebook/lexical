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
  setDOMUnmanaged,
} from 'lexical';
import {afterEach, assert, describe, expect, test, vi} from 'vitest';

import {$createTestDecoratorNode, TestDecoratorNode} from '../utils';

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

function pointerDown(target: Element, pointerType: string): void {
  // jsdom has no PointerEvent constructor, so define pointerType by hand.
  const event = new MouseEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  Object.defineProperty(event, 'pointerType', {value: pointerType});
  target.dispatchEvent(event);
}

// The pointerdown and compatibility mousedown of a press, as iOS sends them;
// returns the mousedown.
function mouseDown(target: Element, pointerType = 'touch'): MouseEvent {
  pointerDown(target, pointerType);
  const event = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    composed: true,
  });
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

  test('cancels the mousedown on SVG artwork', () => {
    const {decoratorElement, editor} = setUp();
    using _editor = editor;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.appendChild(path);
    decoratorElement.appendChild(svg);

    expect(mouseDown(path).defaultPrevented).toBe(true);
  });

  test('looks through an open shadow root', () => {
    const {decoratorElement, editor} = setUp();
    using _editor = editor;
    const host = document.createElement('div');
    decoratorElement.appendChild(host);
    const shadow = host.attachShadow({mode: 'open'});
    const img = document.createElement('img');
    const button = document.createElement('button');
    const label = document.createElement('span');
    button.appendChild(label);
    shadow.append(img, button);

    expect(mouseDown(img).defaultPrevented).toBe(true);
    expect(mouseDown(label).defaultPrevented).toBe(false);
  });

  test('keeps the default for a closed shadow host with a tabindex', () => {
    const {decoratorElement, editor} = setUp();
    using _editor = editor;
    // A closed shadow root hides its controls, so the tap is retargeted to
    // the host. A focusable host says the widget handles focus itself.
    const host = document.createElement('div');
    host.tabIndex = -1;
    decoratorElement.appendChild(host);
    const input = document.createElement('input');
    host.attachShadow({mode: 'closed'}).appendChild(input);

    expect(mouseDown(input).defaultPrevented).toBe(false);
  });

  test('keeps the default for embeds and media controls', () => {
    const {decoratorElement, editor} = setUp();
    using _editor = editor;
    const iframe = document.createElement('iframe');
    const video = document.createElement('video');
    video.controls = true;
    const summary = document.createElement('summary');
    decoratorElement.append(iframe, video, summary);

    expect(mouseDown(iframe).defaultPrevented).toBe(false);
    expect(mouseDown(video).defaultPrevented).toBe(false);
    expect(mouseDown(summary).defaultPrevented).toBe(false);
  });

  test('cancels the mousedown on a disabled control', () => {
    const {decoratorElement, editor} = setUp();
    using _editor = editor;
    const button = document.createElement('button');
    button.disabled = true;
    decoratorElement.appendChild(button);

    expect(mouseDown(button).defaultPrevented).toBe(true);
  });

  test('keeps the default for a captured widget outside a decorator', () => {
    const {editor, textElement} = setUp();
    using _editor = editor;
    const widget = document.createElement('div');
    setDOMUnmanaged(widget, {captureSelection: true});
    textElement.parentElement!.appendChild(widget);

    expect(mouseDown(widget).defaultPrevented).toBe(false);
  });

  test('reads the pointer type even when a decorator stops pointerdown', () => {
    const {decoratorElement, editor} = setUp();
    using _editor = editor;
    const handle = document.createElement('div');
    handle.addEventListener('pointerdown', event => event.stopPropagation());
    decoratorElement.appendChild(handle);

    expect(mouseDown(handle, 'mouse').defaultPrevented).toBe(false);
    expect(mouseDown(handle, 'touch').defaultPrevented).toBe(true);
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
    pointerDown(textElement, 'touch');
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

  test('leaves an iPadOS trackpad click to selectionchange', () => {
    const {editor, rootElement, textElement} = setUp();
    using _editor = editor;
    const textDOM = textElement.firstChild!;
    pointerDown(textElement, 'mouse');
    rootElement.focus();
    getDOMSelection(window)!.setBaseAndExtent(textDOM, 3, textDOM, 3);
    textElement.dispatchEvent(
      new MouseEvent('click', {bubbles: true, detail: 1}),
    );

    // The click builds no RangeSelection of its own; for a real mouse press
    // the selectionchange handler does that.
    editor.read(() => {
      expect($isRangeSelection($getSelection())).toBe(false);
    });
  });
});
