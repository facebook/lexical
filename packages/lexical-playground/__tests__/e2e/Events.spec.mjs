/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertHTML,
  evaluate,
  focusEditor,
  html,
  initialize,
  LEGACY_EVENTS,
  test,
} from '../utils/index.mjs';

test.describe('Events', () => {
  test.beforeEach(({isCollab, page}) =>
    initialize({isAutocomplete: true, isCollab, page}),
  );
  test('Autocapitalization (MacOS specific)', async ({page, isPlainText}) => {
    if (LEGACY_EVENTS) {
      return;
    }
    await focusEditor(page);
    await page.keyboard.type('i');
    await evaluate(page, () => {
      const editable = document.querySelector('[contenteditable="true"]');
      const span = editable.querySelector('span');
      const textNode = span.firstChild;
      function singleRangeFn(
        startContainer,
        startOffset,
        endContainer,
        endOffset,
      ) {
        return () => [
          new StaticRange({
            endContainer,
            endOffset,
            startContainer,
            startOffset,
          }),
        ];
      }
      const character = 'S'; // S for space because the space itself gets trimmed in the assertHTML
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', 'I');
      dataTransfer.setData('text/html', 'I');
      const characterBeforeInputEvent = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: character,
        inputType: 'insertText',
      });
      characterBeforeInputEvent.getTargetRanges = singleRangeFn(
        textNode,
        1,
        textNode,
        1,
      );
      const replacementBeforeInputEvent = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        inputType: 'insertReplacementText',
      });
      replacementBeforeInputEvent.getTargetRanges = singleRangeFn(
        textNode,
        0,
        textNode,
        1,
      );
      const characterInputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        data: character,
        inputType: 'insertText',
      });
      editable.dispatchEvent(characterBeforeInputEvent);
      textNode.textContent += character;
      // Selection should be set with the event; this won't quite work, but not sure how to fix it..
      // document.getSelection().setBaseAndExtent(textNode, 2, textNode, 2);
      editable.dispatchEvent(replacementBeforeInputEvent);
      editable.dispatchEvent(characterInputEvent);
      // Lexical will prevent default for the replacement input event via the clipboard logic; we
      // will assume this is correct
      // editable.dispatchEvent(replacementInputEvent);
    });

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">IS</span>
        </p>
      `,
    );
  });
});
