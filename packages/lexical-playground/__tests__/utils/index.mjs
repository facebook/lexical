/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {expect, test as base} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import prettier from 'prettier';
import {URLSearchParams} from 'url';

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
export const LEXICAL_IMAGE_BASE64 =
  'data:image/png;base64,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';
export const YOUTUBE_SAMPLE_URL =
  'https://www.youtube-nocookie.com/embed/jNQXAC9IVRw';

function wrapAndSlowDown(method, delay) {
  return async function () {
    await new Promise((resolve) => setTimeout(resolve, delay));
    return method.apply(this, arguments);
  };
}

export async function initialize({
  page,
  isCollab,
  isAutocomplete,
  isCharLimit,
  isCharLimitUtf8,
  isMaxLength,
  showNestedEditorTreeView,
  tableCellMerge,
  tableCellBackgroundColor,
}) {
  // Tests with legacy events often fail to register keypress, so
  // slowing it down to reduce flakiness
  if (LEGACY_EVENTS) {
    page.keyboard.type = wrapAndSlowDown(page.keyboard.type, 50);
    page.keyboard.press = wrapAndSlowDown(page.keyboard.press, 50);
  }

  const appSettings = {};
  appSettings.isRichText = IS_RICH_TEXT;
  appSettings.emptyEditor = true;
  appSettings.disableBeforeInput = LEGACY_EVENTS;
  if (isCollab) {
    appSettings.isCollab = isCollab;
    appSettings.collabId = randomUUID();
  }
  if (showNestedEditorTreeView === undefined) {
    appSettings.showNestedEditorTreeView = true;
  }
  appSettings.isAutocomplete = !!isAutocomplete;
  appSettings.isCharLimit = !!isCharLimit;
  appSettings.isCharLimitUtf8 = !!isCharLimitUtf8;
  appSettings.isMaxLength = !!isMaxLength;
  if (tableCellMerge !== undefined) {
    appSettings.tableCellMerge = tableCellMerge;
  }
  if (tableCellBackgroundColor !== undefined) {
    appSettings.tableCellBackgroundColor = tableCellBackgroundColor;
  }

  const urlParams = appSettingsToURLParams(appSettings);
  const url = `http://localhost:${E2E_PORT}/${
    isCollab ? 'split/' : ''
  }?${urlParams.toString()}`;

  // Having more horizontal space prevents redundant text wraps for tests
  // which affects CMD+ArrowRight/Left navigation
  page.setViewportSize({height: 1000, width: isCollab ? 2500 : 1250});
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
      '[data-lexical-editor="true"]',
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

export async function assertTableSelectionCoordinates(page, coordinates) {
  const pageOrFrame = IS_COLLAB ? await page.frame('left') : page;

  const {_anchor, _focus} = await pageOrFrame.evaluate(() => {
    const editor = window.lexicalEditor;
    const editorState = editor.getEditorState();
    const selection = editorState._selection;
    if (!selection.tableKey) {
      throw new Error('Expected table selection');
    }
    const anchorElement = editor.getElementByKey(selection.anchor.key);
    const focusElement = editor.getElementByKey(selection.focus.key);
    return {
      _anchor: {
        x: anchorElement._cell?.x,
        y: anchorElement._cell?.y,
      },
      _focus: {
        x: focusElement._cell?.x,
        y: focusElement._cell?.y,
      },
    };
  });

  if (coordinates.anchor) {
    if (coordinates.anchor.x !== undefined) {
      expect(_anchor.x).toEqual(coordinates.anchor.x);
    }
    if (coordinates.anchor.y !== undefined) {
      expect(_anchor.y).toEqual(coordinates.anchor.y);
    }
  }
  if (coordinates.focus) {
    if (coordinates.focus.x !== undefined) {
      expect(_focus.x).toEqual(coordinates.focus.x);
    }
    if (coordinates.focus.y !== undefined) {
      expect(_focus.y).toEqual(coordinates.focus.y);
    }
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
      const files = [];
      for (const [clipboardKey, clipboardValue] of Object.entries(
        _clipboardData,
      )) {
        if (clipboardKey.startsWith('playwright/base64')) {
          delete _clipboardData[clipboardKey];
          const [base64, type] = clipboardValue;
          const res = await fetch(base64);
          const blob = await res.blob();
          files.push(new File([blob], 'file', {type}));
        }
      }
      let eventClipboardData;
      if (files.length > 0) {
        eventClipboardData = {
          files,
          getData(type, value) {
            return _clipboardData[type];
          },
          types: [...Object.keys(_clipboardData), 'Files'],
        };
      } else {
        eventClipboardData = {
          files,
          getData(type, value) {
            return _clipboardData[type];
          },
          types: Object.keys(_clipboardData),
        };
      }

      const editor = document.querySelector('div[contenteditable="true"]');
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: eventClipboardData,
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
            value: eventClipboardData,
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

// Fair time for the browser to process a newly inserted image
export async function sleepInsertImage(count = 1) {
  return await sleep(1000 * count);
}

export async function focusEditor(page, parentSelector = '.editor-shell') {
  const selector = `${parentSelector} div[contenteditable="true"]`;
  if (IS_COLLAB) {
    await page.waitForSelector('iframe[name="left"]');
    const leftFrame = page.frame('left');
    if ((await leftFrame.$$('.loading')).length !== 0) {
      await leftFrame.waitForSelector('.loading', {
        state: 'detached',
      });
    }
    // This sleep used to be "conditional" based on a broken version of
    // the above test (undefined !== 0 is always true). It turns out there
    // were tests that needed this sleep even when the left frame was not
    // in a loading state.
    await sleep(500);
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

export async function locate(page, selector) {
  let leftFrame = page;
  if (IS_COLLAB) {
    leftFrame = await page.frame('left');
  }
  return await leftFrame.locator(selector);
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
  const frame = IS_COLLAB ? await page.frame('left') : page;
  await frame.waitForSelector(selector, options);
  await frame.click(selector, options);
}

export async function focus(page, selector, options) {
  const frame = IS_COLLAB ? await page.frame('left') : page;
  await frame.focus(selector, options);
}

export async function fill(page, selector, value) {
  const frame = IS_COLLAB ? await page.frame('left') : page;
  await frame.locator(selector).fill(value);
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

  output = output.replace(/\s__playwright_target__="[^"]+"/, '');

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

export async function selectFromTableDropdown(page, selector) {
  await click(page, '.toolbar-item[aria-label="Open table toolkit"]');
  await click(page, '.dropdown ' + selector);
}

export async function insertTable(page, rows = 2, columns = 3) {
  let leftFrame = page;
  if (IS_COLLAB) {
    leftFrame = await page.frame('left');
  }
  await selectFromInsertDropdown(page, '.item .table');
  if (rows !== null) {
    await leftFrame
      .locator('input[data-test-id="table-modal-rows"]')
      .fill(String(rows));
  }
  if (columns !== null) {
    await leftFrame
      .locator('input[data-test-id="table-modal-columns"]')
      .fill(String(columns));
  }
  await click(
    page,
    'div[data-test-id="table-model-confirm-insert"] > .Button__root',
  );
}

export async function insertCollapsible(page) {
  await selectFromInsertDropdown(page, '.item .caret-right');
}

export async function selectCellsFromTableCords(
  page,
  firstCords,
  secondCords,
  isFirstHeader = false,
  isSecondHeader = false,
) {
  let leftFrame = page;
  if (IS_COLLAB) {
    await focusEditor(page);
    leftFrame = await page.frame('left');
  }

  const firstRowFirstColumnCell = await leftFrame.locator(
    `table:first-of-type > tr:nth-child(${firstCords.y + 1}) > ${
      isFirstHeader ? 'th' : 'td'
    }:nth-child(${firstCords.x + 1})`,
  );
  const secondRowSecondCell = await leftFrame.locator(
    `table:first-of-type > tr:nth-child(${secondCords.y + 1}) > ${
      isSecondHeader ? 'th' : 'td'
    }:nth-child(${secondCords.x + 1})`,
  );

  // Focus on inside the iFrame or the boundingBox() below returns null.
  await firstRowFirstColumnCell.click();

  await dragMouse(
    page,
    await firstRowFirstColumnCell.boundingBox(),
    await secondRowSecondCell.boundingBox(),
  );
}

export async function insertTableRowAbove(page) {
  await click(page, '.table-cell-action-button-container');
  await click(page, '.item[data-test-id="table-insert-row-above"]');
}

export async function insertTableRowBelow(page) {
  await click(page, '.table-cell-action-button-container');
  await click(page, '.item[data-test-id="table-insert-row-below"]');
}

export async function insertTableColumnBefore(page) {
  await click(page, '.table-cell-action-button-container');
  await click(page, '.item[data-test-id="table-insert-column-before"]');
}

export async function insertTableColumnAfter(page) {
  await click(page, '.table-cell-action-button-container');
  await click(page, '.item[data-test-id="table-insert-column-after"]');
}

export async function mergeTableCells(page) {
  await click(page, '.table-cell-action-button-container');
  await click(page, '.item[data-test-id="table-merge-cells"]');
}

export async function unmergeTableCell(page) {
  await click(page, '.table-cell-action-button-container');
  await click(page, '.item[data-test-id="table-unmerge-cells"]');
}

export async function toggleColumnHeader(page) {
  await click(page, '.table-cell-action-button-container');
  await click(page, '.item[data-test-id="table-column-header"]');
}

export async function deleteTableRows(page) {
  await click(page, '.table-cell-action-button-container');
  await click(page, '.item[data-test-id="table-delete-rows"]');
}

export async function deleteTableColumns(page) {
  await click(page, '.table-cell-action-button-container');
  await click(page, '.item[data-test-id="table-delete-columns"]');
}

export async function deleteTable(page) {
  await click(page, '.table-cell-action-button-container');
  await click(page, '.item[data-test-id="table-delete"]');
}

export async function setBackgroundColor(page) {
  await click(page, '.table-cell-action-button-container');
  await click(page, '.item[data-test-id="table-background-color"]');
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

export async function dragDraggableMenuTo(
  page,
  toSelector,
  positionStart = 'middle',
  positionEnd = 'middle',
) {
  await dragMouse(
    page,
    await selectorBoundingBox(page, '.draggable-block-menu'),
    await selectorBoundingBox(page, toSelector),
    positionStart,
    positionEnd,
  );
}
