/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, assertHTML, assertSelection} from '../utils';

async function validateContent(page) {
  await assertHTML(
    page,
    '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span><span class="editor-text-hashtag" data-outline-text="true">#world</span><span data-outline-text="true">. This content </span><span class="editor-text-hashtag" data-outline-text="true">#should</span><span data-outline-text="true"> remain </span><span class="editor-text-hashtag" data-outline-text="true">#intact</span><span data-outline-text="true">.</span></p>',
  );
  await assertSelection(page, {
    anchorPath: [0, 6, 0],
    anchorOffset: 1,
    focusPath: [0, 6, 0],
    focusOffset: 1,
  });
}

describe('Mutations', () => {
  initializeE2E((e2e) => {
    it(`Can restore the DOM to the editor state state`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type(
        'Hello #world. This content #should remain #intact.',
      );

      await validateContent(page);

      // Remove the paragraph
      await await page.evaluate(() => {
        const rootElement = document.querySelector('div.editor');
        const paragraph = rootElement.firstChild;

        paragraph.remove();
      });
      await validateContent(page);

      // Remove the paragraph content
      await await page.evaluate(() => {
        const rootElement = document.querySelector('div.editor');
        const paragraph = rootElement.firstChild;

        paragraph.textContent = '';
      });
      await validateContent(page);

      // Remove the first text
      await await page.evaluate(() => {
        const rootElement = document.querySelector('div.editor');
        const firstTextNode = rootElement.firstChild.firstChild;

        firstTextNode.remove();
      });
      await validateContent(page);

      // Remove the first text contents
      await await page.evaluate(() => {
        const rootElement = document.querySelector('div.editor');
        const firstTextNode = rootElement.firstChild.firstChild;

        firstTextNode.textContent = '';
      });
      await validateContent(page);

      // Remove the second text
      await await page.evaluate(() => {
        const rootElement = document.querySelector('div.editor');
        const secondTextNode = rootElement.firstChild.firstChild.nextSibling;

        secondTextNode.remove();
      });
      await validateContent(page);

      // Remove the third text
      await await page.evaluate(() => {
        const rootElement = document.querySelector('div.editor');
        const thirdTextNode =
          rootElement.firstChild.firstChild.nextSibling.nextSibling;

        thirdTextNode.remove();
      });
      await validateContent(page);

      // Remove the forth text
      await await page.evaluate(() => {
        const rootElement = document.querySelector('div.editor');
        const forthTextNode =
          rootElement.firstChild.firstChild.nextSibling.nextSibling.nextSibling;

        forthTextNode.remove();
      });
      await validateContent(page);

      // Move last to first
      await await page.evaluate(() => {
        const rootElement = document.querySelector('div.editor');
        const paragraph = rootElement.firstChild;
        const firstTextNode = paragraph.firstChild;
        const forthTextNode =
          paragraph.firstChild.nextSibling.nextSibling.nextSibling;

        paragraph.insertBefore(forthTextNode, firstTextNode);
      });
      await validateContent(page);

      // Reverse sort all the children
      await await page.evaluate(() => {
        const rootElement = document.querySelector('div.editor');
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
      await await page.evaluate(() => {
        const rootElement = document.querySelector('div.editor');
        const span = document.createElement('span');
        const span2 = document.createElement('span');
        const text = document.createTextNode('123');
        rootElement.appendChild(span);
        rootElement.appendChild(span2);
        rootElement.appendChild(text);
      });
      await validateContent(page);

      // Adding additional nodes to paragraph
      await await page.evaluate(() => {
        const rootElement = document.querySelector('div.editor');
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
      await await page.evaluate(() => {
        const rootElement = document.querySelector('div.editor');
        const paragraph = rootElement.firstChild;
        const firstTextNode = paragraph.firstChild;
        const span = document.createElement('span');
        const text = document.createTextNode('123');
        firstTextNode.appendChild(span);
        firstTextNode.appendChild(text);
      });
      await validateContent(page);

      // Replace text nodes on text nodes #1
      await await page.evaluate(() => {
        const rootElement = document.querySelector('div.editor');
        const paragraph = rootElement.firstChild;
        const firstTextNode = paragraph.firstChild;
        const text = document.createTextNode('123');
        firstTextNode.firstChild.replaceWith(text);
      });
      await validateContent(page);

      // Replace text nodes on line break #2
      await await page.evaluate(() => {
        const rootElement = document.querySelector('div.editor');
        const paragraph = rootElement.firstChild;
        const firstTextNode = paragraph.firstChild;
        const br = document.createElement('br');
        firstTextNode.firstChild.replaceWith(br);
      });
      await validateContent(page);

      // Update text content, this should work :)
      await await page.evaluate(() => {
        const rootElement = document.querySelector('div.editor');
        const paragraph = rootElement.firstChild;
        const firstTextNode = paragraph.firstChild;
        firstTextNode.firstChild.nodeValue = 'Bonjour ';
      });
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Bonjour </span><span class="editor-text-hashtag" data-outline-text="true">#world</span><span data-outline-text="true">. This content </span><span class="editor-text-hashtag" data-outline-text="true">#should</span><span data-outline-text="true"> remain </span><span class="editor-text-hashtag" data-outline-text="true">#intact</span><span data-outline-text="true">.</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 6, 0],
        anchorOffset: 1,
        focusPath: [0, 6, 0],
        focusOffset: 1,
      });
    });
  });
});
