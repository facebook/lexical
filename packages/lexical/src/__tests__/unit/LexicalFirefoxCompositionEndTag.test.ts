/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Firefox defers its compositionend handling until the next onInput
 * (the `'ending-firefox'` composition phase). The Chrome/Webkit path adds
 * `COMPOSITION_END_TAG` to that update via `$handleCompositionEnd`; the
 * Firefox onInput defer branch must mirror it so listeners gated on the tag
 * (markdown shortcut trigger, history merge, autocomplete post-commit) see the
 * same signal on Firefox.
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  COMPOSITION_END_TAG,
} from 'lexical';
import {describe, expect, onTestFinished, test, vi} from 'vitest';

vi.mock('lexical/src/environment', () => ({
  CAN_USE_BEFORE_INPUT: true,
  CAN_USE_DOM: true,
  IS_ANDROID: false,
  IS_ANDROID_CHROME: false,
  IS_APPLE: false,
  IS_APPLE_WEBKIT: false,
  IS_CHROME: false,
  IS_FIREFOX: true,
  IS_IOS: false,
  IS_SAFARI: false,
}));

describe('Firefox composition-end tag forwarding', () => {
  test('onInput emits COMPOSITION_END_TAG after a deferred compositionend', async () => {
    const container = document.createElement('div');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    const editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const paragraph = $createParagraphNode().append($createTextNode('-'));
        $getRoot().append(paragraph);
        paragraph.selectEnd();
      },
      dependencies: [RichTextExtension],
      name: 'test',
    });
    editor.setRootElement(container);
    onTestFinished(() => {
      editor.setRootElement(null);
      document.body.removeChild(container);
    });

    const observedTagSets: string[][] = [];
    editor.registerUpdateListener(({tags}) => {
      observedTagSets.push(Array.from(tags));
    });

    container.dispatchEvent(
      new CompositionEvent('compositionend', {bubbles: true, data: ' '}),
    );

    const inputEvent = new InputEvent('input', {
      bubbles: true,
      data: ' ',
      inputType: 'insertCompositionText',
    });
    Object.defineProperty(inputEvent, 'isComposing', {value: false});
    container.dispatchEvent(inputEvent);

    await Promise.resolve();

    expect(
      observedTagSets.some(tags => tags.includes(COMPOSITION_END_TAG)),
    ).toBe(true);
  });

  // The test above goes through onInput's `!handled` branch. A multi-character
  // commit — which is what CJK input produces most of the time — goes through
  // the `handled` one instead ($shouldPreventDefaultAndInsertText is true for a
  // dirty node receiving more than one character), and that branch only tagged
  // the update when the commit was redirected onto a token node. For an ordinary
  // TextNode, which is the common case, the composition ended untagged.
  test('onInput emits COMPOSITION_END_TAG for a multi-character commit', async () => {
    const container = document.createElement('div');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    const editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const paragraph = $createParagraphNode().append($createTextNode('-'));
        $getRoot().append(paragraph);
        paragraph.selectEnd();
      },
      dependencies: [RichTextExtension],
      name: 'test',
    });
    editor.setRootElement(container);
    onTestFinished(() => {
      editor.setRootElement(null);
      document.body.removeChild(container);
    });

    container.dispatchEvent(
      new CompositionEvent('compositionstart', {bubbles: true, data: ''}),
    );
    await Promise.resolve();

    // One composing keystroke, so the anchor TextNode is dirty.
    const composing = new InputEvent('input', {
      bubbles: true,
      data: 'す',
      inputType: 'insertCompositionText',
    });
    Object.defineProperty(composing, 'isComposing', {value: true});
    container.dispatchEvent(composing);
    await Promise.resolve();

    const observedTagSets: string[][] = [];
    editor.registerUpdateListener(({tags}) => {
      observedTagSets.push(Array.from(tags));
    });

    // Firefox defers the commit to the input that follows.
    container.dispatchEvent(
      new CompositionEvent('compositionend', {bubbles: true, data: 'すし'}),
    );
    const commit = new InputEvent('input', {
      bubbles: true,
      data: 'すし',
      inputType: 'insertCompositionText',
    });
    Object.defineProperty(commit, 'isComposing', {value: false});
    // The target range a real insertCompositionText carries: it spans the text
    // being replaced, so it is not collapsed. That is what sends the commit down
    // onInput's `handled` branch — without it the event takes the `!handled` one
    // and this test would not be exercising the path it claims to.
    const domText = container.querySelector('[data-lexical-text]')!
      .firstChild as Text;
    Object.defineProperty(commit, 'getTargetRanges', {
      value: () => [
        new StaticRange({
          endContainer: domText,
          endOffset: domText.nodeValue!.length,
          startContainer: domText,
          startOffset: 0,
        }),
      ],
    });
    container.dispatchEvent(commit);
    await Promise.resolve();

    expect(
      observedTagSets.some(tags => tags.includes(COMPOSITION_END_TAG)),
    ).toBe(true);
  });
});
