/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {expect} from '@playwright/test';

import {
  assertHTML,
  assertSelection,
  evaluate,
  focusEditor,
  html,
  initialize,
  test,
} from '../utils/index.mjs';

test.describe('Events', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Autocapitalization (MacOS specific)', async ({page, isPlainText}) => {
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
      const replacementCharacter = 'I';
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', replacementCharacter);
      dataTransfer.setData('text/html', replacementCharacter);
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
        clipboardData: dataTransfer,
        data: replacementCharacter,
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
      editable.dispatchEvent(replacementBeforeInputEvent);
      editable.dispatchEvent(characterInputEvent);
    });

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">IS</span>
        </p>
      `,
    );
  });

  test('Caret ends after text replacement acceptance boundary - using Space (MacOS specific)', async ({
    page,
    isPlainText,
    browserName,
  }) => {
    const textToReplace = 'omw';
    const replacementText = 'On my way!';
    await focusEditor(page);
    await page.keyboard.type(textToReplace);
    await evaluate(
      page,
      args => {
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
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', args.replacementText);
        dataTransfer.setData('text/html', args.replacementText);
        const replacementBeforeInputEvent = new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          // `data` is `null` for real `insertReplacementText` events, but that breaks the test.
          data: args.replacementText,
          dataTransfer:
            args.browserName === 'chromium' ? undefined : dataTransfer,
          inputType:
            args.browserName === 'chromium'
              ? 'insertText'
              : 'insertReplacementText',
        });
        const fireSpaceFirst = args.browserName !== 'webkit';
        replacementBeforeInputEvent.getTargetRanges = singleRangeFn(
          textNode,
          0,
          textNode,
          // Chromium actually returns `0` here (for some reason), but that breaks the test.
          args.textToReplace.length,
        );
        const spaceBeforeInputEvent = new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          data: ' ',
          inputType: 'insertText',
        });
        const spaceKeyDownEvent = new KeyboardEvent('keydown', {
          bubbles: true,
          key: ' ',
        });
        const spaceOffset = fireSpaceFirst
          ? args.textToReplace.length
          : args.replacementText.length;
        spaceBeforeInputEvent.getTargetRanges = singleRangeFn(
          textNode,
          spaceOffset,
          textNode,
          spaceOffset,
        );
        const orderedEvents = fireSpaceFirst
          ? [spaceBeforeInputEvent, replacementBeforeInputEvent]
          : [replacementBeforeInputEvent, spaceBeforeInputEvent];

        for (const event of orderedEvents) {
          if (event === spaceBeforeInputEvent) {
            editable.dispatchEvent(spaceKeyDownEvent);
          }
          editable.dispatchEvent(event);
          if (event === replacementBeforeInputEvent) {
            textNode.textContent = fireSpaceFirst
              ? `${args.replacementText} `
              : args.replacementText;
          } else if (event === spaceBeforeInputEvent) {
            textNode.textContent += ' ';
          } else {
            throw new Error('Invalid event');
          }
        }
      },
      {browserName, replacementText, textToReplace},
    );

    const textContent = await evaluate(page, () => {
      const editable = document.querySelector('[contenteditable="true"]');
      return editable?.textContent ?? null;
    });
    expect(textContent).toBe(`${replacementText} `);

    await assertSelection(page, {
      anchorOffset: `${replacementText} `.length,
      anchorPath: [0, 0, 0],
      focusOffset: `${replacementText} `.length,
      focusPath: [0, 0, 0],
    });
  });

  test('Caret ends after text replacement acceptance boundary - using Enter (MacOS specific)', async ({
    page,
    isPlainText,
    browserName,
  }) => {
    const textToReplace = 'omw';
    const replacementText = 'On my way!';

    await focusEditor(page);
    await page.keyboard.type(textToReplace);

    await evaluate(
      page,
      args => {
        const editable = document.querySelector('[contenteditable="true"]');
        const firstParagraph = editable.querySelector('p');
        const firstSpan = firstParagraph.querySelector('span');
        const textNode = firstSpan.firstChild;

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

        const enterKeyDownEvent = new KeyboardEvent('keydown', {
          bubbles: true,
          key: 'Enter',
        });
        const enterBeforeInputEvent = new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          inputType: args.isPlainText ? 'insertLineBreak' : 'insertParagraph',
        });
        enterBeforeInputEvent.getTargetRanges = singleRangeFn(
          textNode,
          args.textToReplace.length,
          textNode,
          args.textToReplace.length,
        );

        editable.dispatchEvent(enterKeyDownEvent);
        if (args.browserName === 'webkit') {
          editable.dispatchEvent(enterBeforeInputEvent);
        }
      },
      {browserName, isPlainText, textToReplace},
    );

    await evaluate(
      page,
      args => {
        const editable = document.querySelector('[contenteditable="true"]');
        const firstParagraph = editable.querySelector('p');
        const firstSpan = firstParagraph.querySelector('span');
        const textNode = firstSpan.firstChild;

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

        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', args.replacementText);
        dataTransfer.setData('text/html', args.replacementText);

        const replacementBeforeInputEvent = new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          data: args.replacementText,
          dataTransfer:
            args.browserName === 'chromium' ? undefined : dataTransfer,
          inputType:
            args.browserName === 'chromium'
              ? 'insertText'
              : 'insertReplacementText',
        });
        replacementBeforeInputEvent.getTargetRanges = singleRangeFn(
          textNode,
          0,
          textNode,
          args.textToReplace.length,
        );

        editable.dispatchEvent(replacementBeforeInputEvent);

        const updatedFirstParagraph = editable.querySelector('p');
        const updatedFirstSpan = updatedFirstParagraph.querySelector('span');
        updatedFirstSpan.firstChild.textContent = args.replacementText;
      },
      {browserName, replacementText, textToReplace},
    );

    if (isPlainText) {
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">${replacementText}</span>
            <br />
            <br />
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 2,
        anchorPath: [0],
        focusOffset: 2,
        focusPath: [0],
      });
    } else {
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">${replacementText}</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <br />
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [1],
        focusOffset: 0,
        focusPath: [1],
      });
    }
  });

  test('Add period with double-space after emoji (MacOS specific) #3953', async ({
    page,
    isPlainText,
  }) => {
    await focusEditor(page);
    await page.keyboard.type(':)');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
        </p>
      `,
    );
    await page.keyboard.type(' ');

    await evaluate(page, () => {
      const editable = document.querySelector('[contenteditable="true"]');
      const spans = editable.querySelectorAll('span');
      const lastSpan = spans[spans.length - 1];
      const lastSpanTextNode = lastSpan.firstChild;
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
      const characterBeforeInputEvent = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: '. ',
        inputType: 'insertText',
      });
      characterBeforeInputEvent.getTargetRanges = singleRangeFn(
        lastSpanTextNode,
        0,
        lastSpanTextNode,
        1,
      );
      // We don't do textNode.textContent += character; intentionally; if the code prevents default
      // Lexical should add it via controlled mode.
      editable.dispatchEvent(characterBeforeInputEvent);
    });
    await page.pause();

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
          <span data-lexical-text="true">.</span>
        </p>
      `,
    );
  });
});
