/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {expect, test as base} from '@playwright/test';
import prettier from 'prettier';
import {URLSearchParams} from 'url';
import {v4 as uuidv4} from 'uuid';

import {selectAll} from '../keyboardShortcuts/index.mjs';

export const E2E_PORT = process.env.E2E_PORT || 3000;
export const E2E_BROWSER = process.env.E2E_BROWSER;
export const IS_MAC = process.platform === 'darwin';
export const IS_WINDOWS = process.platform === 'win32';
export const IS_LINUX = !IS_MAC && !IS_WINDOWS;
export const IS_COLLAB =
  process.env.E2E_EDITOR_MODE === 'rich-text-with-collab';
const IS_RICH_TEXT = process.env.E2E_EDITOR_MODE !== 'plain-text';
const IS_PLAIN_TEXT = process.env.E2E_EDITOR_MODE === 'plain-text';
export const LEGACY_EVENTS = process.env.E2E_EVENTS_MODE === 'legacy-events';
export const SAMPLE_IMAGE_URL =
  E2E_PORT === 3000
    ? '/src/images/yellow-flower.jpg'
    : '/assets/yellow-flower.a2a7c7a2.jpg';
export const SAMPLE_LANDSCAPE_IMAGE_URL =
  E2E_PORT === 3000
    ? '/src/images/landscape.jpg'
    : '/assets/landscape.21352c66.jpg';

export async function initialize({
  page,
  isCollab,
  isAutocomplete,
  isCharLimit,
  isCharLimitUtf8,
  isMaxLength,
  showNestedEditorTreeView,
}) {
  const appSettings = {};
  appSettings.isRichText = IS_RICH_TEXT;
  appSettings.emptyEditor = true;
  appSettings.disableBeforeInput = LEGACY_EVENTS;
  if (isCollab) {
    appSettings.isCollab = isCollab;
    appSettings.collabId = uuidv4();
  }
  if (showNestedEditorTreeView === undefined) {
    appSettings.showNestedEditorTreeView = true;
  }
  appSettings.isAutocomplete = !!isAutocomplete;
  appSettings.isCharLimit = !!isCharLimit;
  appSettings.isCharLimitUtf8 = !!isCharLimitUtf8;
  appSettings.isMaxLength = !!isMaxLength;

  const urlParams = appSettingsToURLParams(appSettings);
  const url = `http://localhost:${E2E_PORT}/${
    isCollab ? 'split/' : ''
  }?${urlParams.toString()}`;

  // Having more horizontal space prevents redundant text wraps for tests
  // which affects CMD+ArrowRight/Left navigation
  page.setViewportSize({height: 1000, width: isCollab ? 2000 : 1000});
  await page.goto(url);

  await exposeLexicalEditor(page);
}

async function exposeLexicalEditor(page) {
  let leftFrame = page;
  if (IS_COLLAB) {
    leftFrame = await page.frame('left');
  }
  await leftFrame.waitForSelector('.tree-view-output pre');
  await leftFrame.evaluate(() => {
    window.lexicalEditor = document.querySelector(
      '.tree-view-output pre',
    ).__lexicalEditor;
  });
}

export const test = base.extend({
  isCharLimit: false,
  isCharLimitUtf8: false,
  isCollab: IS_COLLAB,
  isMaxLength: false,
  isPlainText: IS_PLAIN_TEXT,
  isRichText: IS_RICH_TEXT,
  legacyEvents: LEGACY_EVENTS,
});

export {expect} from '@playwright/test';

function appSettingsToURLParams(appSettings) {
  const params = new URLSearchParams();
  Object.entries(appSettings).forEach(([setting, value]) => {
    params.append(setting, value);
  });
  return params;
}

export async function repeat(times, cb) {
  for (let i = 0; i < times; i++) {
    await cb();
  }
}

export async function clickSelectors(page, selectors) {
  for (let i = 0; i < selectors.length; i++) {
    await click(page, selectors[i]);
  }
}

async function assertHTMLOnPageOrFrame(
  pageOrFrame,
  expectedHtml,
  ignoreClasses,
  ignoreInlineStyles,
) {
  const actualHtml = await pageOrFrame.innerHTML('div[contenteditable="true"]');
  const actual = prettifyHTML(actualHtml.replace(/\n/gm, ''), {
    ignoreClasses,
    ignoreInlineStyles,
  });
  const expected = prettifyHTML(expectedHtml.replace(/\n/gm, ''), {
    ignoreClasses,
    ignoreInlineStyles,
  });
  expect(actual).toEqual(expected);
}

export async function assertHTML(
  page,
  expectedHtml,
  expectedHtmlFrameRight = expectedHtml,
  {ignoreClasses = false, ignoreInlineStyles = false} = {},
) {
  if (IS_COLLAB) {
    const withRetry = async (fn) => await retryAsync(page, fn, 5);
    await Promise.all([
      withRetry(async () => {
        const leftFrame = await page.frame('left');
        return assertHTMLOnPageOrFrame(
          leftFrame,
          expectedHtml,
          ignoreClasses,
          ignoreInlineStyles,
        );
      }),
      withRetry(async () => {
        const rightFrame = await page.frame('right');
        return assertHTMLOnPageOrFrame(
          rightFrame,
          expectedHtmlFrameRight,
          ignoreClasses,
          ignoreInlineStyles,
        );
      }),
    ]);
  } else {
    await assertHTMLOnPageOrFrame(
      page,
      expectedHtml,
      ignoreClasses,
      ignoreInlineStyles,
    );
  }
}

async function retryAsync(page, fn, attempts) {
  while (attempts > 0) {
    let failed = false;
    try {
      await fn();
    } catch (e) {
      if (attempts === 1) {
        throw e;
      }
      failed = true;
    }
    if (!failed) {
      break;
    }
    attempts--;
    await sleep(500);
  }
}

async function assertSelectionOnPageOrFrame(page, expected) {
  // Assert the selection of the editor matches the snapshot
  const selection = await page.evaluate(() => {
    const rootElement = document.querySelector('div[contenteditable="true"]');

    const getPathFromNode = (node) => {
      const path = [];
      if (node === rootElement) {
        return [];
      }
      while (node !== null) {
        const parent = node.parentNode;
        if (parent === null || node === rootElement) {
          break;
        }
        path.push(Array.from(parent.childNodes).indexOf(node));
        node = parent;
      }
      return path.reverse();
    };

    const {anchorNode, anchorOffset, focusNode, focusOffset} =
      window.getSelection();

    return {
      anchorOffset,
      anchorPath: getPathFromNode(anchorNode),
      focusOffset,
      focusPath: getPathFromNode(focusNode),
    };
  }, expected);
  expect(selection.anchorPath).toEqual(expected.anchorPath);
  expect(selection.focusPath).toEqual(expected.focusPath);
  if (Array.isArray(expected.anchorOffset)) {
    const [start, end] = expected.anchorOffset;
    expect(selection.anchorOffset).toBeGreaterThanOrEqual(start);
    expect(selection.anchorOffset).toBeLessThanOrEqual(end);
  } else {
    expect(selection.anchorOffset).toEqual(expected.anchorOffset);
  }
  if (Array.isArray(expected.focusOffset)) {
    const [start, end] = expected.focusOffset;
    expect(selection.focusOffset).toBeGreaterThanOrEqual(start);
    expect(selection.focusOffset).toBeLessThanOrEqual(end);
  } else {
    expect(selection.focusOffset).toEqual(expected.focusOffset);
  }
}

export async function assertSelection(page, expected) {
  if (IS_COLLAB) {
    const frame = await page.frame('left');
    await assertSelectionOnPageOrFrame(frame, expected);
  } else {
    await assertSelectionOnPageOrFrame(page, expected);
  }
}

export async function isMac(page) {
  return page.evaluate(
    () =>
      typeof window !== 'undefined' &&
      /Mac|iPod|iPhone|iPad/.test(window.navigator.platform),
  );
}

export async function supportsBeforeInput(page) {
  return page.evaluate(() => {
    if ('InputEvent' in window) {
      return 'getTargetRanges' in new window.InputEvent('input');
    }
    return false;
  });
}

export async function keyDownCtrlOrMeta(page) {
  if (await isMac(page)) {
    await page.keyboard.down('Meta');
  } else {
    await page.keyboard.down('Control');
  }
}

export async function keyUpCtrlOrMeta(page) {
  if (await isMac(page)) {
    await page.keyboard.up('Meta');
  } else {
    await page.keyboard.up('Control');
  }
}

export async function keyDownCtrlOrAlt(page) {
  if (await isMac(page)) {
    await page.keyboard.down('Alt');
  } else {
    await page.keyboard.down('Control');
  }
}

export async function keyUpCtrlOrAlt(page) {
  if (await isMac(page)) {
    await page.keyboard.up('Alt');
  } else {
    await page.keyboard.up('Control');
  }
}

async function copyToClipboardPageOrFrame(pageOrFrame) {
  return await pageOrFrame.evaluate(() => {
    const clipboardData = {};
    const editor = document.querySelector('div[contenteditable="true"]');
    const copyEvent = new ClipboardEvent('copy');
    Object.defineProperty(copyEvent, 'clipboardData', {
      value: {
        setData(type, value) {
          clipboardData[type] = value;
        },
      },
    });
    editor.dispatchEvent(copyEvent);
    return clipboardData;
  });
}

export async function copyToClipboard(page) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    return await copyToClipboardPageOrFrame(leftFrame);
  } else {
    return await copyToClipboardPageOrFrame(page);
  }
}

async function pasteFromClipboardPageOrFrame(pageOrFrame, clipboardData) {
  const canUseBeforeInput = supportsBeforeInput(pageOrFrame);
  await pageOrFrame.evaluate(
    async ({
      clipboardData: _clipboardData,
      canUseBeforeInput: _canUseBeforeInput,
    }) => {
      const editor = document.querySelector('div[contenteditable="true"]');
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData(type, value) {
            return _clipboardData[type];
          },
        },
      });
      editor.dispatchEvent(pasteEvent);
      if (!pasteEvent.defaultPrevented) {
        if (_canUseBeforeInput) {
          const inputEvent = new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
          });
          Object.defineProperty(inputEvent, 'inputType', {
            value: 'insertFromPaste',
          });
          Object.defineProperty(inputEvent, 'dataTransfer', {
            value: {
              getData(type, value) {
                return _clipboardData[type];
              },
            },
          });
          editor.dispatchEvent(inputEvent);
        }
      }
    },
    {canUseBeforeInput, clipboardData},
  );
}

export async function pasteFromClipboard(page, clipboardData) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    await pasteFromClipboardPageOrFrame(leftFrame, clipboardData);
  } else {
    await pasteFromClipboardPageOrFrame(page, clipboardData);
  }
}

export async function sleep(delay) {
  await new Promise((resolve) => setTimeout(resolve, delay));
}

export async function focusEditor(page, parentSelector = '.editor-shell') {
  const selector = `${parentSelector} div[contenteditable="true"]`;
  if (IS_COLLAB) {
    await page.waitForSelector('iframe[name="left"]');
    const leftFrame = page.frame('left');
    if ((await leftFrame.$$('.loading').length) !== 0) {
      await leftFrame.waitForSelector('.loading', {
        state: 'detached',
      });
      await sleep(500);
    }
    await leftFrame.focus(selector);
  } else {
    await page.focus(selector);
  }
}

export async function getHTML(page, selector = 'div[contenteditable="true"]') {
  const pageOrFrame = IS_COLLAB ? await page.frame('left') : page;
  const element = await pageOrFrame.locator(selector);
  return element.innerHTML();
}

export async function getEditorElement(page, parentSelector = '.editor-shell') {
  const selector = `${parentSelector} div[contenteditable="true"]`;

  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    return leftFrame.locator(selector);
  } else {
    return page.locator(selector);
  }
}

export async function waitForSelector(page, selector, options) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    await leftFrame.waitForSelector(selector, options);
  } else {
    await page.waitForSelector(selector, options);
  }
}

export async function selectorBoundingBox(page, selector) {
  let leftFrame = page;
  if (IS_COLLAB) {
    leftFrame = await page.frame('left');
  }
  const node = await leftFrame.locator(selector);
  return await node.boundingBox();
}

export async function click(page, selector, options) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    await leftFrame.waitForSelector(selector, options);
    await leftFrame.click(selector, options);
  } else {
    await page.waitForSelector(selector, options);
    await page.click(selector, options);
  }
}

export async function focus(page, selector, options) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    await leftFrame.focus(selector, options);
  } else {
    await page.focus(selector, options);
  }
}

export async function selectOption(page, selector, options) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    await leftFrame.selectOption(selector, options);
  } else {
    await page.selectOption(selector, options);
  }
}

export async function textContent(page, selector, options) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    return await leftFrame.textContent(selector, options);
  } else {
    return await page.textContent(selector, options);
  }
}

export async function evaluate(page, fn, args) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    return await leftFrame.evaluate(fn, args);
  } else {
    return await page.evaluate(fn, args);
  }
}

export async function clearEditor(page) {
  await selectAll(page);
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
}

export async function insertSampleImage(page, modifier) {
  await selectFromInsertDropdown(page, '.image');
  if (modifier === 'alt') {
    await page.keyboard.down('Alt');
  }
  await click(page, 'button[data-test-id="image-modal-option-sample"]');
  if (modifier === 'alt') {
    await page.keyboard.up('Alt');
  }
}

export async function insertUrlImage(page, url, altText) {
  await selectFromInsertDropdown(page, '.image');
  await click(page, 'button[data-test-id="image-modal-option-url"]');
  await focus(page, 'input[data-test-id="image-modal-url-input"]');
  await page.keyboard.type(url);
  if (altText) {
    await focus(page, 'input[data-test-id="image-modal-alt-text-input"]');
    await page.keyboard.type(altText);
  }
  await click(page, 'button[data-test-id="image-modal-confirm-btn"]');
}

export async function insertUploadImage(page, files, altText) {
  await selectFromInsertDropdown(page, '.image');
  await click(page, 'button[data-test-id="image-modal-option-file"]');

  const frame = IS_COLLAB ? await page.frame('left') : page;
  await frame.setInputFiles(
    'input[data-test-id="image-modal-file-upload"]',
    files,
  );

  if (altText) {
    await focus(page, 'input[data-test-id="image-modal-alt-text-input"]');
    await page.keyboard.type(altText);
  }
  await click(page, 'button[data-test-id="image-modal-file-upload-btn"]');
}

export async function insertYouTubeEmbed(page, url) {
  await selectFromInsertDropdown(page, '.youtube');
  await focus(page, 'input[data-test-id="youtube-video-embed-modal-url"]');
  await page.keyboard.type(url);
  await click(
    page,
    'button[data-test-id="youtube-video-embed-modal-submit-btn"]',
  );
}

export async function insertHorizontalRule(page) {
  await selectFromInsertDropdown(page, '.horizontal-rule');
}

export async function insertImageCaption(page, caption) {
  await click(page, '.editor-image img');
  await click(page, '.image-caption-button');
  await waitForSelector(page, '.editor-image img.focused', {
    state: 'detached',
  });
  await focusEditor(page, '.image-caption-container');
  await page.keyboard.type(caption);
}

export async function mouseMoveToSelector(page, selector) {
  const {x, width, y, height} = await selectorBoundingBox(page, selector);
  await page.mouse.move(x + width / 2, y + height / 2);
}

export async function dragMouse(
  page,
  fromBoundingBox,
  toBoundingBox,
  positionStart = 'middle',
  positionEnd = 'middle',
  mouseUp = true,
) {
  let fromX = fromBoundingBox.x;
  let fromY = fromBoundingBox.y;
  if (positionStart === 'middle') {
    fromX += fromBoundingBox.width / 2;
    fromY += fromBoundingBox.height / 2;
  } else if (positionStart === 'end') {
    fromX += fromBoundingBox.width;
    fromY += fromBoundingBox.height;
  }
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();

  let toX = toBoundingBox.x;
  let toY = toBoundingBox.y;
  if (positionEnd === 'middle') {
    toX += toBoundingBox.width / 2;
    toY += toBoundingBox.height / 2;
  } else if (positionEnd === 'end') {
    toX += toBoundingBox.width;
    toY += toBoundingBox.height;
  }

  await page.mouse.move(toX, toY);

  if (mouseUp) {
    await page.mouse.up();
  }
}

export async function dragImage(
  page,
  toSelector,
  positionStart = 'middle',
  positionEnd = 'middle',
) {
  await dragMouse(
    page,
    await selectorBoundingBox(page, '.editor-image img'),
    await selectorBoundingBox(page, toSelector),
    positionStart,
    positionEnd,
  );
}

export function prettifyHTML(string, {ignoreClasses, ignoreInlineStyles} = {}) {
  let output = string;

  if (ignoreClasses) {
    output = output.replace(/\sclass="([^"]*)"/g, '');
  }

  if (ignoreInlineStyles) {
    output = output.replace(/\sstyle="([^"]*)"/g, '');
  }

  return prettier
    .format(output, {
      attributeGroups: ['$DEFAULT', '^data-'],
      attributeSort: 'ASC',
      bracketSameLine: true,
      htmlWhitespaceSensitivity: 'ignore',
      parser: 'html',
    })
    .trim();
}

// This function does not suppose to do anything, it's only used as a trigger
// for prettier auto-formatting (https://prettier.io/blog/2020/08/24/2.1.0.html#api)
export function html(partials, ...params) {
  let output = '';
  for (let i = 0; i < partials.length; i++) {
    output += partials[i];
    if (i < partials.length - 1) {
      output += params[i];
    }
  }
  return output;
}

export async function selectFromAdditionalStylesDropdown(page, selector) {
  await click(
    page,
    '.toolbar-item[aria-label="Formatting options for additional text styles"]',
  );
  await click(page, '.dropdown ' + selector);
}

export async function selectFromBackgroundColorPicker(page) {
  await click(page, '.toolbar-item[aria-label="Formatting background color"]');
  await click(page, '.color-picker-basic-color button:first-child'); //Defaulted to red
}

export async function selectFromColorPicker(page) {
  await click(page, '.toolbar-item[aria-label="Formatting text color"]');
  await click(page, '.color-picker-basic-color button:first-child'); //Defaulted to red
}
export async function selectFromFormatDropdown(page, selector) {
  await click(
    page,
    '.toolbar-item[aria-label="Formatting options for text style"]',
  );
  await click(page, '.dropdown ' + selector);
}

export async function selectFromInsertDropdown(page, selector) {
  await click(
    page,
    '.toolbar-item[aria-label="Insert specialized editor node"]',
  );
  await click(page, '.dropdown ' + selector);
}

export async function selectFromAlignDropdown(page, selector) {
  await click(
    page,
    '.toolbar-item[aria-label="Formatting options for text alignment"]',
  );
  await click(page, '.dropdown ' + selector);
}

export async function insertTable(page) {
  await selectFromInsertDropdown(page, '.item .table');
  await click(
    page,
    'div[data-test-id="table-model-confirm-insert"] > .Button__root',
  );
}

export async function selectCellsFromTableCords(page, firstCords, secondCords) {
  let leftFrame = page;
  if (IS_COLLAB) {
    await focusEditor(page);
    leftFrame = await page.frame('left');
  }

  const firstRowFirstColumnCell = await leftFrame.locator(
    `table:first-of-type > tr:nth-child(${firstCords.y + 1}) > th:nth-child(${
      firstCords.x + 1
    })`,
  );
  const secondRowSecondCell = await leftFrame.locator(
    `table:first-of-type > tr:nth-child(${secondCords.y + 1}) > td:nth-child(${
      secondCords.x + 1
    })`,
  );

  // Focus on inside the iFrame or the boundingBox() below returns null.
  await firstRowFirstColumnCell.click({clickCount: 2});

  await dragMouse(
    page,
    await firstRowFirstColumnCell.boundingBox(),
    await secondRowSecondCell.boundingBox(),
  );
}

export async function enableCompositionKeyEvents(page) {
  const targetPage = IS_COLLAB ? await page.frame('left') : page;
  await targetPage.evaluate(() => {
    window.addEventListener(
      'compositionstart',
      () => {
        document.activeElement.dispatchEvent(
          new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Unidentified',
            keyCode: 220,
          }),
        );
      },
      true,
    );
  });
}

export async function pressToggleBold(page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('b');
  await keyUpCtrlOrMeta(page);
}

export async function pressToggleItalic(page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('b');
  await keyUpCtrlOrMeta(page);
}

export async function pressToggleUnderline(page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('u');
  await keyUpCtrlOrMeta(page);
}
