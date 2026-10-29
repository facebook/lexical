/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {PlainTextExtension} from '@lexical/plain-text';
import {RichTextExtension} from '@lexical/rich-text';
import {describe, expect, onTestFinished, test} from 'vitest';

import {
  assertHTML,
  assertSelection,
  html,
  setupEditor,
  typeText,
} from './utils';

describe.each([true, false])('text mutations (rich text: %s)', isRichText => {
  test(`Text mutation observers also manage the selection`, async () => {
    const {editor, root} = setupEditor([
      isRichText ? RichTextExtension : PlainTextExtension,
    ]);
    const outside = document.createElement('button');
    document.body.append(outside);
    onTestFinished(() => outside.remove());
    await typeText('Hello world.');
    await assertHTML(
      root,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">Hello world.</span>
        </p>
      `,
    );
    await assertSelection(root, {
      anchorOffset: 12,
      anchorPath: [0, 0, 0],
      focusOffset: 12,
      focusPath: [0, 0, 0],
    });
    // We need to wait at least 100msec (TEXT_MUTATION_VARIANCE) after typing,
    // otherwise the mutation will be applied to the DOM but not synchronized
    // with the lexical state (see shouldFlushTextMutations in flushMutations).
    // TODO: It might be worth tracking ignored mutations with a timeout to reconcile this edge case
    await new Promise(resolve => setTimeout(resolve, 100));
    {
      const rootElement = root;
      const textNode = rootElement.querySelector('span')!.firstChild as Text;
      textNode.nodeValue = 'Hello.';
      const domSelection = window.getSelection()!;
      const range = document.createRange();
      range.setStart(textNode, textNode.nodeValue.length);
      range.setEnd(textNode, textNode.nodeValue.length);
      domSelection.removeAllRanges();
      domSelection.addRange(range);
    }
    await assertHTML(
      root,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">Hello.</span>
        </p>
      `,
    );
    await expect
      .poll(() => editor.getEditorState().toJSON())
      .toMatchObject({
        root: {
          children: [
            {children: [{text: 'Hello.', type: 'text'}], type: 'paragraph'},
          ],
          type: 'root',
        },
      });
    await assertSelection(root, {
      anchorOffset: 6,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });

    {
      const rootElement = root;
      const textNode = rootElement.querySelector('span')!.firstChild as Text;
      textNode.nodeValue = 'Hi!';
      const domSelection = window.getSelection()!;
      const range = document.createRange();
      const uiElement = outside;
      range.setStart(uiElement, 0);
      range.setEnd(uiElement, 0);
      domSelection.removeAllRanges();
      domSelection.addRange(range);
    }

    await assertHTML(
      root,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">Hi!</span>
        </p>
      `,
    );
    await expect
      .poll(() => editor.getEditorState().toJSON())
      .toMatchObject({
        root: {
          children: [
            {children: [{text: 'Hi!', type: 'text'}], type: 'paragraph'},
          ],
          type: 'root',
        },
      });
    // This does "steal" the focus which might be unexpected? The key here
    // is that the lexical selection is modified accordingly (offset clamp)
    // even though the DOM selection was elsewhere at the time of mutation
    await assertSelection(root, {
      anchorOffset: 3,
      anchorPath: [0, 0, 0],
      focusOffset: 3,
      focusPath: [0, 0, 0],
    });
  });
});
