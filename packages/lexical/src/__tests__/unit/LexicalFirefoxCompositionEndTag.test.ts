/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Firefox defers its compositionend handling until the next onInput
 * (`isFirefoxEndingComposition` flag). The Chrome/Webkit path adds
 * `COMPOSITION_END_TAG` to that update via `$handleCompositionEnd`; the
 * Firefox onInput defer branch must mirror it so listeners gated on the tag
 * (markdown shortcut trigger, history merge, autocomplete post-commit) see the
 * same signal on Firefox.
 */

import {registerRichText} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  COMPOSITION_END_TAG,
  LexicalEditor,
} from 'lexical';
import {createTestEditor} from 'lexical/src/__tests__/utils';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

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
  let container: HTMLDivElement;
  let editor: LexicalEditor;

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('data-lexical-editor', 'true');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    editor = createTestEditor();
    registerRichText(editor);
    editor.setRootElement(container);
  });

  afterEach(() => {
    editor.setRootElement(null);
    document.body.removeChild(container);
  });

  test('onInput emits COMPOSITION_END_TAG after a deferred compositionend', async () => {
    editor.update(
      () => {
        const paragraph = $createParagraphNode().append($createTextNode('-'));
        $getRoot().clear().append(paragraph);
        paragraph.selectEnd();
      },
      {discrete: true},
    );

    const observedTagSets: string[][] = [];
    editor.registerUpdateListener(({tags}) => {
      observedTagSets.push(Array.from(tags));
    });

    // Firefox routes compositionend through `isFirefoxEndingComposition`; this
    // event alone doesn't run $onCompositionEndImpl yet.
    container.dispatchEvent(
      new CompositionEvent('compositionend', {bubbles: true, data: ' '}),
    );

    // The deferred composition end runs inside this onInput. The fix adds
    // COMPOSITION_END_TAG here.
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      data: ' ',
      inputType: 'insertCompositionText',
    });
    Object.defineProperty(inputEvent, 'isComposing', {value: false});
    container.dispatchEvent(inputEvent);

    // Update listeners fire on a microtask; let them flush before asserting.
    await Promise.resolve();

    expect(
      observedTagSets.some(tags => tags.includes(COMPOSITION_END_TAG)),
    ).toBe(true);
  });
});
