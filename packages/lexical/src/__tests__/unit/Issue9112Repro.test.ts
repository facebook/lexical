/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Regression tests for #9112 — "Clicking on the image in mobile scrolls up".
 *
 * On iOS, a tap that focuses the contentEditable is followed by a reveal of
 * the focused element: with a DOM selection it scrolls to the selection rect,
 * with none it scrolls to the top of the whole contentEditable. Tapping a
 * decorator selects it as a NodeSelection, for which the reconciler cleared
 * the DOM selection with `removeAllRanges()` — so the reveal had nothing but
 * the editor's top edge to go to, and the tapped decorator scrolled out of
 * view. The reconciler now keeps a collapsed DOM caret beside the selected
 * node on iOS, and `$handleBeforeInput` prevents native input from editing at
 * that caret while the selection is a NodeSelection.
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $setSelection,
  getDOMSelection,
  type LexicalEditorWithDispose,
} from 'lexical';
import {
  $assertNodeType,
  $createTestDecoratorNode,
  TestDecoratorNode,
} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, test, vi} from 'vitest';

// `vi.mock` is hoisted above all imports, so LexicalSelection.ts /
// LexicalEvents.ts observe IS_IOS=true and CAN_USE_BEFORE_INPUT=true.
vi.mock('lexical/src/environment', () => ({
  CAN_USE_BEFORE_INPUT: true,
  CAN_USE_DOM: true,
  IS_ANDROID: false,
  IS_ANDROID_CHROME: false,
  IS_APPLE: true,
  IS_APPLE_WEBKIT: false,
  IS_CHROME: false,
  IS_FIREFOX: false,
  IS_IOS: true,
  IS_SAFARI: false,
}));

function createBeforeInputEvent(inputType: string, data?: string): InputEvent {
  const event = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    data,
    inputType,
  });
  // jsdom InputEvent does not expose getTargetRanges; patch it manually.
  Object.defineProperty(event, 'getTargetRanges', {value: () => []});
  return event;
}

/**
 * `[paragraph("before"), block decorator, paragraph("after")]` with the
 * caret at the end of "before", so the DOM selection is inside the editor —
 * the state a tap on the decorator leaves behind before the click selects it.
 */
function editorWithDecorator(): LexicalEditorWithDispose {
  return buildEditorFromExtensions({
    $initialEditorState: () => {
      const before = $createTextNode('before');
      const decorator = $createTestDecoratorNode().setIsInline(false);
      $getRoot().append(
        $createParagraphNode().append(before),
        decorator,
        $createParagraphNode().append($createTextNode('after')),
      );
      before.select(6, 6);
    },
    afterRegistration: editor => {
      const container = document.createElement('div');
      container.setAttribute('data-lexical-editor', 'true');
      container.contentEditable = 'true';
      document.body.appendChild(container);
      editor.setRootElement(container);
      return () => {
        editor.setRootElement(null);
        document.body.removeChild(container);
      };
    },
    dependencies: [RichTextExtension],
    name: '[9112]',
    nodes: [TestDecoratorNode],
  });
}

function getDecoratorKey(editor: LexicalEditorWithDispose): string {
  return editor.read(() =>
    $assertNodeType(
      $getRoot().getChildAtIndex(1),
      (node): node is TestDecoratorNode => node instanceof TestDecoratorNode,
    ).getKey(),
  );
}

function $selectDecorator(decoratorKey: string): void {
  const selection = $createNodeSelection();
  selection.add(decoratorKey);
  $setSelection(selection);
}

describe('NodeSelection keeps a DOM caret beside the node on iOS (#9112)', () => {
  test('the DOM selection collapses after the selected node instead of being cleared', () => {
    using editor = editorWithDecorator();
    const decoratorKey = getDecoratorKey(editor);
    const rootElement = editor.getRootElement();
    assert(rootElement !== null);
    const domSelection = getDOMSelection(editor._window);
    assert(domSelection !== null);
    expect(domSelection.rangeCount).toBe(1);
    expect(rootElement.contains(domSelection.anchorNode)).toBe(true);

    editor.update(() => $selectDecorator(decoratorKey), {discrete: true});

    editor.read(() => {
      expect($isNodeSelection($getSelection())).toBe(true);
    });
    const decoratorDOM = editor.getElementByKey(decoratorKey);
    assert(decoratorDOM !== null);
    expect(domSelection.rangeCount).toBe(1);
    expect(domSelection.isCollapsed).toBe(true);
    expect(domSelection.anchorNode).toBe(rootElement);
    expect(domSelection.anchorOffset).toBe(
      Array.from(rootElement.childNodes).indexOf(decoratorDOM) + 1,
    );
  });

  test('the caret is not left inside the editor when the DOM selection was outside it', () => {
    using editor = editorWithDecorator();
    const decoratorKey = getDecoratorKey(editor);
    const domSelection = getDOMSelection(editor._window);
    assert(domSelection !== null);
    const outside = document.createElement('div');
    outside.textContent = 'outside';
    document.body.appendChild(outside);
    try {
      domSelection.setBaseAndExtent(outside, 0, outside, 0);

      editor.update(() => $selectDecorator(decoratorKey), {discrete: true});

      expect(domSelection.anchorNode).toBe(outside);
    } finally {
      document.body.removeChild(outside);
    }
  });

  test.for(['insertText', 'deleteContentBackward', 'insertParagraph'])(
    'native %s at the kept caret is prevented while a NodeSelection stands',
    inputType => {
      using editor = editorWithDecorator();
      const decoratorKey = getDecoratorKey(editor);
      const rootElement = editor.getRootElement();
      assert(rootElement !== null);
      editor.update(() => $selectDecorator(decoratorKey), {discrete: true});
      const textBefore = editor.read(() => $getRoot().getTextContent());

      const event = createBeforeInputEvent(
        inputType,
        inputType === 'insertText' ? 'x' : undefined,
      );
      rootElement.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      editor.read(() => {
        const selection = $getSelection();
        assert($isNodeSelection(selection));
        expect(selection.has(decoratorKey)).toBe(true);
        expect($getNodeByKey(decoratorKey)).not.toBeNull();
        expect($getRoot().getTextContent()).toBe(textBefore);
      });
    },
  );
});
