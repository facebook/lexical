/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  defineExtension,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

import {DragonExtension} from '../../index';

function setUpEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Hello world')),
        );
      },
      dependencies: [DragonExtension],
      name: 'dragon-test',
      register: editor => {
        const rootElement = document.createElement('div');
        rootElement.setAttribute('contenteditable', 'true');
        rootElement.tabIndex = 0;
        document.body.appendChild(rootElement);
        editor.setRootElement(rootElement);
        rootElement.focus();
        return () => rootElement.remove();
      },
    }),
  );
}

function $selectStartOfFirstTextNode() {
  const paragraph = $getRoot().getFirstChild();
  assert($isParagraphNode(paragraph));
  const textNode = paragraph.getFirstChild();
  assert($isTextNode(textNode));
  textNode.select(0, 0);
}

// The Dragon NaturallySpeaking web extension sends makeChanges messages with
// args [elementStart, elementLength, text, selStart, selLength]. A text of -1
// (a number, not a string) means "change the selection without touching the
// text", which is how Select-and-Say corrections and cursor moves by voice
// arrive.
function dispatchMakeChanges(args: unknown): void {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: JSON.stringify({
        payload: {args, functionId: 'makeChanges'},
        protocol: 'nuanria_messaging',
        type: 'request',
      }),
      origin: window.location.origin,
    }),
  );
}

describe('DragonExtension', () => {
  test('replaces the addressed range on makeChanges', () => {
    using editor = setUpEditor();
    editor.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges([0, 5, 'Howdy', 5, 0]);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Howdy world');
    });
  });

  test('moves the selection without touching the text when text is -1', () => {
    using editor = setUpEditor();
    editor.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges([0, 5, -1, 6, 5]);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Hello world');
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.anchor.offset).toBe(6);
      expect(selection.focus.offset).toBe(11);
    });
  });

  test('applies a correction after a selection-only makeChanges', () => {
    using editor = setUpEditor();
    editor.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges([0, 5, -1, 0, 5]);
    dispatchMakeChanges([0, 5, 'Howdy', 5, 0]);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Howdy world');
    });
  });

  test('collapses a final selection whose end precedes its start', () => {
    using editor = setUpEditor();
    editor.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges([0, 5, -1, 8, -3]);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Hello world');
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.anchor.offset).toBe(8);
      expect(selection.focus.offset).toBe(8);
    });
  });

  test('collapses a final selection with negative offsets', () => {
    using editor = setUpEditor();
    editor.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges([0, 5, -1, -5, 100]);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Hello world');
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.anchor.offset).toBe(0);
      expect(selection.focus.offset).toBe(0);
    });
  });

  test('ignores malformed makeChanges payloads', () => {
    using editor = setUpEditor();
    editor.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges('garbage');
    dispatchMakeChanges({blockStart: 4});
    dispatchMakeChanges(['4', '9', 'Hi', 0, 0]);
    dispatchMakeChanges([0, 5, 5, 0, 0]);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Hello world');
    });
  });
});
