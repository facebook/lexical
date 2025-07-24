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
  sleep,
  test,
} from '../utils/index.mjs';

async function validateContent(page) {
  await assertHTML(
    page,
    html`
      <p
        class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
        dir="ltr">
        <span data-lexical-text="true">Hello</span>
        <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
          #world
        </span>
        <span data-lexical-text="true">. This content</span>
        <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
          #should
        </span>
        <span data-lexical-text="true">remain</span>
        <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
          #intact
        </span>
        <span data-lexical-text="true">.</span>
      </p>
    `,
  );
  await assertSelection(page, {
    anchorOffset: 1,
    anchorPath: [0, 6, 0],
    focusOffset: 1,
    focusPath: [0, 6, 0],
  });
}

test.describe('Mutations', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Text mutation observers also manage the selection`, async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('Hello world.');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello world.</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 12,
      anchorPath: [0, 0, 0],
      focusOffset: 12,
      focusPath: [0, 0, 0],
    });
    // We need to wait at least 100msec (TEXT_MUTATION_VARIANCE) after typing,
    // otherwise the mutation will be applied to the DOM but not synchronized
    // with the lexical state (see shouldFlushTextMutations in flushMutations).
    // TODO: It might be worth tracking ignored mutations with a timeout to reconcile this edge case
    await sleep(100);
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const textNode = rootElement.querySelector('span').firstChild;
      textNode.nodeValue = 'Hello.';
      const domSelection = window.getSelection();
      const range = document.createRange();
      range.setStart(textNode, textNode.nodeValue.length);
      range.setEnd(textNode, textNode.nodeValue.length);
      domSelection.removeAllRanges();
      domSelection.addRange(range);
    });
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello.</span>
        </p>
      `,
    );
    let editorStateJSON = await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      return rootElement.__lexicalEditor.getEditorState().toJSON();
    });
    expect(editorStateJSON).toMatchObject({
      root: {
        children: [
          {children: [{text: 'Hello.', type: 'text'}], type: 'paragraph'},
        ],
        type: 'root',
      },
    });
    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });

    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const textNode = rootElement.querySelector('span').firstChild;
      textNode.nodeValue = 'Hi!';
      const domSelection = window.getSelection();
      const range = document.createRange();
      const uiElement = document.querySelector('i.mic');
      range.setStart(uiElement, 0);
      range.setEnd(uiElement, 0);
      domSelection.removeAllRanges();
      domSelection.addRange(range);
    });

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hi!</span>
        </p>
      `,
    );
    editorStateJSON = await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      return rootElement.__lexicalEditor.getEditorState().toJSON();
    });
    expect(editorStateJSON).toMatchObject({
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
    await assertSelection(page, {
      anchorOffset: 3,
      anchorPath: [0, 0, 0],
      focusOffset: 3,
      focusPath: [0, 0, 0],
    });
    await page.pause();
  });
  test(`Can restore the DOM to the editor state state`, async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type(
      'Hello #world. This content #should remain #intact.',
    );

    await validateContent(page);

    // Remove the paragraph
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const paragraph = rootElement.firstChild;

      paragraph.remove();
    });
    await validateContent(page);

    // Remove the paragraph content
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const paragraph = rootElement.firstChild;

      paragraph.textContent = '';
    });
    await validateContent(page);

    // Remove the first text
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const firstTextNode = rootElement.firstChild.firstChild;

      firstTextNode.remove();
    });
    await validateContent(page);

    // Remove the first text contents
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const firstTextNode = rootElement.firstChild.firstChild;

      firstTextNode.textContent = '';
    });
    await validateContent(page);

    // Remove the second text
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const secondTextNode = rootElement.firstChild.firstChild.nextSibling;

      secondTextNode.remove();
    });
    await validateContent(page);

    // Remove the third text
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const thirdTextNode =
        rootElement.firstChild.firstChild.nextSibling.nextSibling;

      thirdTextNode.remove();
    });
    await validateContent(page);

    // Remove the forth text
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const forthTextNode =
        rootElement.firstChild.firstChild.nextSibling.nextSibling.nextSibling;

      forthTextNode.remove();
    });
    await validateContent(page);

    // Move last to first
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const paragraph = rootElement.firstChild;
      const firstTextNode = paragraph.firstChild;
      const forthTextNode =
        paragraph.firstChild.nextSibling.nextSibling.nextSibling;

      paragraph.insertBefore(forthTextNode, firstTextNode);
    });
    await validateContent(page);

    // Reverse sort all the children
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const paragraph = rootElement.firstChild;
      const firstTextNode = paragraph.firstChild;
      const secondTextNode = paragraph.firstChild.nextSibling;
      const thirdTextNode = paragraph.firstChild.nextSibling.nextSibling;
      const forthTextNode =
        paragraph.firstChild.nextSibling.nextSibling.nextSibling;

      paragraph.insertBefore(forthTextNode, firstTextNode);
      paragraph.insertBefore(thirdTextNode, firstTextNode);
      paragraph.insertBefore(secondTextNode, firstTextNode);
    });
    await validateContent(page);

    // Adding additional nodes to root
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const span = document.createElement('span');
      const span2 = document.createElement('span');
      const text = document.createTextNode('123');
      rootElement.appendChild(span);
      rootElement.appendChild(span2);
      rootElement.appendChild(text);
    });
    await validateContent(page);

    // Adding additional nodes to paragraph
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const paragraph = rootElement.firstChild;
      const firstTextNode = paragraph.firstChild;
      const span = document.createElement('span');
      const span2 = document.createElement('span');
      const text = document.createTextNode('123');
      paragraph.appendChild(span);
      paragraph.appendChild(text);
      paragraph.insertBefore(span2, firstTextNode);
    });
    await validateContent(page);

    // Adding additional nodes to text nodes
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const paragraph = rootElement.firstChild;
      const firstTextNode = paragraph.firstChild;
      const span = document.createElement('span');
      const text = document.createTextNode('123');
      firstTextNode.appendChild(span);
      firstTextNode.appendChild(text);
    });
    await validateContent(page);

    // Replace text nodes on text nodes #1
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const paragraph = rootElement.firstChild;
      const firstTextNode = paragraph.firstChild;
      const text = document.createTextNode('123');
      firstTextNode.firstChild.replaceWith(text);
    });
    await validateContent(page);

    // Replace text nodes on line break #2
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const paragraph = rootElement.firstChild;
      const firstTextNode = paragraph.firstChild;
      const br = document.createElement('br');
      firstTextNode.firstChild.replaceWith(br);
    });
    await validateContent(page);

    // Update text content, this should work :)
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const paragraph = rootElement.firstChild;
      const firstTextNode = paragraph.firstChild;
      firstTextNode.firstChild.nodeValue = 'Bonjour ';
    });
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Bonjour</span>
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #world
          </span>
          <span data-lexical-text="true">. This content</span>
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #should
          </span>
          <span data-lexical-text="true">remain</span>
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #intact
          </span>
          <span data-lexical-text="true">.</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 6, 0],
      focusOffset: 1,
      focusPath: [0, 6, 0],
    });
  });
});
