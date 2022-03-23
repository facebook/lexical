/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {expect, test as base} from '@playwright/test';
import jestSnapshot from 'jest-snapshot';
import {JSDOM} from 'jsdom';
import prettier from 'prettier';
import {URLSearchParams} from 'url';
import {v4 as uuidv4} from 'uuid';

import {selectAll} from '../keyboardShortcuts/index.mjs';

const {toMatchInlineSnapshot} = jestSnapshot;

export const E2E_PORT = process.env.E2E_PORT || 3000;
export const E2E_BROWSER = process.env.E2E_BROWSER;
export const IS_MAC = process.platform === 'darwin';
export const IS_WINDOWS = process.platform === 'win32';
export const IS_LINUX = !IS_MAC && !IS_WINDOWS;
export const IS_COLLAB =
  process.env.E2E_EDITOR_MODE === 'rich-text-with-collab';
const IS_RICH_TEXT = process.env.E2E_EDITOR_MODE !== 'plain-text';
const IS_PLAIN_TEXT = process.env.E2E_EDITOR_MODE === 'plain-text';

export async function initialize({
  page,
  isCollab,
  isCharLimit,
  isCharLimitUtf8,
}) {
  const appSettings = {};
  appSettings.isRichText = IS_RICH_TEXT;
  appSettings.disableBeforeInput =
    process.env.E2E_EVENTS_MODE === 'legacy-events';
  if (isCollab) {
    appSettings.isCollab = isCollab;
    appSettings.collabId = uuidv4();
  }
  if (appSettings.showNestedEditorTreeView === undefined) {
    appSettings.showNestedEditorTreeView = true;
  }
  appSettings.isCharLimit = !!isCharLimit;
  appSettings.isCharLimitUtf8 = !!isCharLimitUtf8;

  const urlParams = appSettingsToURLParams(appSettings);
  const url = `http://localhost:${E2E_PORT}/${
    isCollab ? 'split/' : ''
  }?${urlParams.toString()}`;
  await page.goto(url);
}

export const test = base.extend({
  isCharLimit: false,
  isCharLimitUtf8: false,
  isCollab: IS_COLLAB,
  isPlainText: IS_PLAIN_TEXT,
  isRichText: IS_RICH_TEXT,
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
    await waitForSelector(page, selectors[i]);
    await click(page, selectors[i]);
  }
}

async function assertHTMLOnPageOrFrame(page, pageOrFrame, expectedHtml) {
  const actualHtml = await pageOrFrame.innerHTML('div[contenteditable="true"]');
  const {document} = new JSDOM().window;
  const actual = document.createElement('div');
  actual.innerHTML = actualHtml;
  const expected = document.createElement('div');
  expected.innerHTML = expectedHtml;
  expect(actual).toEqual(expected);
}

export async function assertHTML(page, expectedHtml, ignoreSecondFrame) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    await assertHTMLOnPageOrFrame(page, leftFrame, expectedHtml);
    if (!ignoreSecondFrame) {
      let attempts = 0;
      while (attempts < 4) {
        const rightFrame = await page.frame('right');
        let failed = false;
        try {
          await assertHTMLOnPageOrFrame(page, rightFrame, expectedHtml);
        } catch (e) {
          if (attempts === 5) {
            throw e;
          }
          failed = true;
        }
        if (!failed) {
          break;
        }
        attempts++;
        await sleep(500);
      }
    }
  } else {
    await assertHTMLOnPageOrFrame(page, page, expectedHtml);
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

export async function getEditorElement(page, parentSelector = '.editor-shell') {
  const selector = `${parentSelector} div[contenteditable="true"]`;

  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    await leftFrame.waitForSelector(selector);
    return leftFrame.$(selector);
  } else {
    await page.waitForSelector(selector);
    return page.$(selector);
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

export async function click(page, selector, options) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    await leftFrame.click(selector, options);
  } else {
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

export async function insertImage(page, caption = null) {
  await waitForSelector(page, 'button .image');
  await click(page, 'button .image');
  await waitForSelector(page, '.editor-image img');

  if (caption !== null) {
    await click(page, '.editor-image img');
    await click(page, '.image-caption-button');
    await waitForSelector(page, '.editor-image img.focused', {
      state: 'detached',
    });
    await focusEditor(page, '.image-caption-container');
    await page.keyboard.type(caption);
  }
}

export async function dragMouse(page, firstBoundingBox, secondBoundingBox) {
  await page.mouse.move(
    firstBoundingBox.x + firstBoundingBox.width / 2,
    firstBoundingBox.y + firstBoundingBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    secondBoundingBox.x + secondBoundingBox.width / 2,
    secondBoundingBox.y + secondBoundingBox.height / 2,
  );
  await page.mouse.up();
}

expect.extend({
  async toMatchEditorInlineSnapshot(pageOrOptions, ...args) {
    // Setting error field allows jest to know where the matcher was called
    // to populate inline snapshot during update cycle
    this.error = new Error();
    let html;

    const {
      page,
      ignoreSecondFrame,
      ignoreClasses,
      ignoreInlineStyles,
      parentSelector,
    } = isElement(pageOrOptions)
      ? {
          ignoreClasses: true,
          ignoreInlineStyles: true,
          ignoreSecondFrame: false,
          page: pageOrOptions,
          parentSelector: '.editor-shell',
        }
      : {
          ignoreClasses: pageOrOptions.ignoreClasses !== false,
          ignoreInlineStyles: pageOrOptions.ignoreInlineStyles !== false,
          ignoreSecondFrame: pageOrOptions.ignoreSecondFrame === true,
          page: pageOrOptions.page,
          parentSelector: pageOrOptions.parentSelector || '.editor-shell',
        };

    const editorSelector = `${parentSelector} div[contenteditable="true"]`;

    if (!isElement(page)) {
      throw new Error(
        'toMatchEditorInlineSnapshot expects page or options object with page property',
      );
    }

    if (IS_COLLAB) {
      // For collab we make sure that left and right sides are matching each other
      // and then asserting it to the snapshot
      const leftFrame = await page.frame('left');
      const leftFrameEditor = await leftFrame.$(editorSelector);
      const leftFrameHTML = new PrettyHTML(await leftFrameEditor.innerHTML(), {
        ignoreClasses,
        ignoreInlineStyles,
      }).prettify();

      if (!ignoreSecondFrame) {
        let attempts = 5;

        while (attempts--) {
          const rightFrame = await page.frame('right');
          const rightFrameEditor = await rightFrame.$(editorSelector);
          const rightFrameHTML = new PrettyHTML(
            await rightFrameEditor.innerHTML(),
            {ignoreClasses, ignoreInlineStyles},
          ).prettify();

          if (rightFrameHTML === leftFrameHTML) {
            break;
          }

          if (!attempts) {
            // Returning as a matcher for a nicer left vs right diff formatting
            return expect(leftFrameHTML).toBe(rightFrameHTML);
          }

          await sleep(500);
        }
      }

      html = leftFrameHTML;
    } else {
      const editor = await page.$(editorSelector);
      html = await editor.innerHTML();
    }
    return toMatchInlineSnapshot.call(
      this,
      new PrettyHTML(html, {ignoreClasses, ignoreInlineStyles}),
      ...args,
    );
  },
});

function isElement(element) {
  return element && typeof element.$ === 'function';
}

// Wrapper around HTML string that is used as indicator for snapshot serializer
// that it should use own formatter (below)
class PrettyHTML {
  constructor(html, {ignoreClasses, ignoreInlineStyles} = {}) {
    this.html = html;
    this.ignoreClasses = ignoreClasses;
    this.ignoreInlineStyles = ignoreInlineStyles;
  }

  prettify() {
    let html = this.html;

    if (this.ignoreClasses) {
      html = html.replace(/\sclass="([^"]*)"/g, '');
    }

    if (this.ignoreInlineStyles) {
      html = html.replace(/\sstyle="([^"]*)"/g, '');
    }

    return prettier
      .format(html, {
        htmlWhitespaceSensitivity: 'ignore',
        parser: 'html',
      })
      .trim();
  }
}

expect.addSnapshotSerializer({
  print: (value) => {
    return value.prettify();
  },
  test: (value) => {
    return value instanceof PrettyHTML;
  },
});
